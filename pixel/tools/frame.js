// Render real frames offline and check the renderer against itself.
//
//   node tools/frame.js [mode] [isoDate]
//
// FieldRenderer is deliberately DOM-free so this can exist: it paints into a
// plain Uint32Array, which means fog, blink and collapse can all be inspected
// and asserted without a browser.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getMode } from '../src/modes.js';
import { generateField } from '../src/maze.js';
import { bfsFrom, pathFrom } from '../src/solver.js';
import { dailySeed } from '../src/rng.js';
import { FieldRenderer, blinkOn } from '../src/render.js';
import { collapseRound, deadEndCount } from '../src/collapse.js';
import { FIELD_W, FIELD_H } from '../src/field.js';
import { encodeRgbPng, zoomRgb } from './png.js';

const modeId = process.argv[2] ?? 'hard';
const isoDate = process.argv[3] ?? '2026-08-14';
const mode = getMode(modeId);

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(outDir, { recursive: true });

const field = generateField(dailySeed(isoDate, modeId), mode);
const protectIdx = [field.exitIdx, ...field.decoyIdx];

// Put the player partway along the solution so the fog disc is fully on-field
// and surrounded by real maze, rather than clipped against the border.
const dist = bfsFrom(field.grid, field.spawnIdx);
const path = pathFrom(dist, field.exitIdx);
const playerIdx = path[Math.floor(path.length * 0.45)];

const renderer = new FieldRenderer(field, mode);
const cropW = 240;
const cropH = 160;
const cropX = Math.min(Math.max((playerIdx % FIELD_W) - cropW / 2, 0), FIELD_W - cropW);
const cropY = Math.min(Math.max(((playerIdx / FIELD_W) | 0) - cropH / 2, 0), FIELD_H - cropH);

const shots = [];
function shot(name, factor = 4) {
  const zoomed = zoomRgb(renderer.pixels, FIELD_W, cropX, cropY, cropW, cropH, factor);
  const file = join(outDir, `frame-${modeId}-${name}.png`);
  writeFileSync(file, encodeRgbPng(zoomed, cropW * factor, cropH * factor));
  shots.push(file);
}

// Blink on, then off: the player is the wall colour, so the off-phase should
// leave a corridor pixel and the on-phase should leave something wall-coloured.
renderer.paintAll({ playerIdx, blink: true });
const litOn = renderer.pixels[playerIdx];
shot('blink-on');

renderer.paintAll({ playerIdx, blink: false });
const litOff = renderer.pixels[playerIdx];
shot('blink-off');

// Collapse: watch the maze breathe inward around a stationary player.
renderer.paintAll({ playerIdx, blink: true });
shot('collapse-0');

const opts = { playerIdx, protectIdx, radius: mode.collapse?.radius ?? Infinity };
let filledTotal = 0;
let doomedAt = -1;
for (let round = 1; round <= 40; round++) {
  const { filled, playerDoomed } = collapseRound(field.grid, opts);
  filledTotal += filled.length;
  if (playerDoomed && doomedAt < 0) doomedAt = round;
  if (round === 8) { renderer.paintAll({ playerIdx, blink: true }); shot('collapse-8'); }
  if (round === 40) { renderer.paintAll({ playerIdx, blink: true }); shot('collapse-40'); }
}

// ── Dirty-rect equivalence ──────────────────────────────────────────────────
// Incremental painting must be indistinguishable from a full repaint, or the
// display drifts away from the simulation over a run.
const a = new FieldRenderer(field, mode);
const b = new FieldRenderer(field, mode);
let start = path[Math.floor(path.length * 0.45)];
a.paintAll({ playerIdx: start, blink: true });
b.paintAll({ playerIdx: start, blink: true });

let cursor = Math.floor(path.length * 0.45);
for (let step = 0; step < 60; step++) {
  cursor = Math.max(0, cursor - 1);
  const idx = path[cursor];
  const blink = blinkOn(step * 33);
  a.paintFrame({ playerIdx: idx, blink });          // incremental
  b.paintAll({ playerIdx: idx, blink });            // ground truth
}
let mismatches = 0;
for (let i = 0; i < a.pixels.length; i++) if (a.pixels[i] !== b.pixels[i]) mismatches++;

const hex = (c) => `#${(c & 0xff).toString(16).padStart(2, '0')}${((c >>> 8) & 0xff).toString(16).padStart(2, '0')}${((c >>> 16) & 0xff).toString(16).padStart(2, '0')}`;

console.log(`${mode.name}  ${isoDate}`);
console.log(`  player at    (${playerIdx % FIELD_W}, ${(playerIdx / FIELD_W) | 0}), ${Math.round(path.length * 0.45)} moves along a ${path.length}-move solution`);
console.log(`  blink on     ${hex(litOn)}   blink off ${hex(litOff)}  ${litOn !== litOff ? '(differ, correct)' : '(IDENTICAL — blink invisible)'}`);
console.log(`  fog radius   ${mode.fogRadius}`);
console.log(`  collapse     40 rounds filled ${filledTotal.toLocaleString()}px within r=${opts.radius}, dead ends left ${deadEndCount(field.grid, protectIdx).toLocaleString()}`);
console.log(`  player doomed at round ${doomedAt < 0 ? 'never (not in a stub)' : doomedAt}`);
console.log(`  dirty-rect equivalence over 60 frames: ${mismatches === 0 ? 'exact match' : `${mismatches} MISMATCHED PIXELS`}`);
console.log(`  wrote        ${shots.length} frames to tools/out/`);

if (mismatches > 0) process.exit(1);
