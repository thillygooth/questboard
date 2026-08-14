// Dump a generated field to PNG so it can be looked at.
//
//   node tools/preview.js [mode] [isoDate]
//
// Writes three files into tools/out/:
//   *-true.png       exactly what the player sees: 1920x1080, pure black & white
//   *-annotated.png  reachable region tinted, solution path drawn, markers on
//   *-zoom.png       8x crop around the spawn, so 1px structure is visible

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getMode } from '../src/modes.js';
import { generateField } from '../src/maze.js';
import { bfsFrom, pathFrom, UNREACHABLE } from '../src/solver.js';
import { dailySeed } from '../src/rng.js';
import { FIELD_W, FIELD_H, CORRIDOR } from '../src/field.js';
import { encodePng, zoom } from './png.js';

const modeId = process.argv[2] ?? 'hard';
const isoDate = process.argv[3] ?? '2026-08-14';
const mode = getMode(modeId);
const seed = dailySeed(isoDate, modeId);

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(outDir, { recursive: true });

const field = generateField(seed, mode);
const { grid, spawnIdx, exitIdx, decoyIdx } = field;

// ── True render: wall white, corridor black, and nothing else. ───────────────
const truth = new Uint8Array(FIELD_W * FIELD_H);
for (let i = 0; i < grid.length; i++) truth[i] = grid[i] === CORRIDOR ? 0 : 1;

// ── Annotated render ────────────────────────────────────────────────────────
const dist = bfsFrom(grid, spawnIdx);
const annotated = truth.slice();
for (let i = 0; i < dist.length; i++) if (dist[i] !== UNREACHABLE) annotated[i] = 6;
for (const p of pathFrom(dist, exitIdx)) annotated[p] = 5;
for (const d of decoyIdx) blob(annotated, d, 4, 6);
blob(annotated, spawnIdx, 2, 6);
blob(annotated, exitIdx, 3, 6);

/** Markers are 1px like everything else, so fatten them for the preview only. */
function blob(buf, idx, colour, r) {
  const cx = idx % FIELD_W;
  const cy = (idx / FIELD_W) | 0;
  for (let y = Math.max(0, cy - r); y <= Math.min(FIELD_H - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(FIELD_W - 1, cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) buf[y * FIELD_W + x] = colour;
    }
  }
}

// ── Zoom on the spawn, from the true render ─────────────────────────────────
const factor = 8;
const cropW = 160;
const cropH = 90;
const cropX = Math.min(Math.max((spawnIdx % FIELD_W) - cropW / 2, 0), FIELD_W - cropW);
const cropY = Math.min(Math.max(((spawnIdx / FIELD_W) | 0) - cropH / 2, 0), FIELD_H - cropH);
const zoomed = zoom(truth, FIELD_W, cropX, cropY, cropW, cropH, factor);

const base = join(outDir, `${modeId}-${isoDate}`);
writeFileSync(`${base}-true.png`, encodePng(truth, FIELD_W, FIELD_H));
writeFileSync(`${base}-annotated.png`, encodePng(annotated, FIELD_W, FIELD_H));
writeFileSync(`${base}-zoom.png`, encodePng(zoomed, cropW * factor, cropH * factor));

const solution = dist[exitIdx];
console.log(`${mode.name}  seed ${seed}  (${isoDate})`);
console.log(`  solution   ${solution.toLocaleString()} moves, par ${(solution / mode.stepRate).toFixed(0)}s at ${mode.stepRate} px/s`);
console.log(`  spawn      (${spawnIdx % FIELD_W}, ${(spawnIdx / FIELD_W) | 0})`);
console.log(`  exit       (${exitIdx % FIELD_W}, ${(exitIdx / FIELD_W) | 0})`);
console.log(`  decoys     ${decoyIdx.map((d) => `(${d % FIELD_W}, ${(d / FIELD_W) | 0})`).join(' ') || 'none'}`);
console.log(`  zoom crop  ${cropW}x${cropH} at (${cropX}, ${cropY}) x${factor}`);
console.log(`  wrote      ${base}-{true,annotated,zoom}.png`);
