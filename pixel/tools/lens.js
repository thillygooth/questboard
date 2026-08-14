// Render the magnifying glass offline, so the optics can be looked at without a
// browser and the magnification can be measured rather than eyeballed.
//
//   node tools/lens.js [mode] [isoDate]
//
// Writes a composite per mode: the raw field at 1:1 with the glass sitting on
// it, exactly as the player sees it.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MODE_IDS, getMode } from '../src/modes.js';
import { generateField } from '../src/maze.js';
import { bfsFrom, pathFrom } from '../src/solver.js';
import { dailySeed } from '../src/rng.js';
import { FieldRenderer } from '../src/render.js';
import { Lens } from '../src/lens.js';
import { FIELD_W, FIELD_H } from '../src/field.js';
import { encodeRgbPng } from './png.js';

const isoDate = process.argv[3] ?? '2026-08-14';
const only = process.argv[2];
const outDir = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(outDir, { recursive: true });

const CROP = 520; // area of field shown around the glass

for (const id of only ? [only] : MODE_IDS) {
  const mode = getMode(id);
  const seed = dailySeed(isoDate, id);
  const field = generateField(seed, mode);

  const renderer = new FieldRenderer(field, mode);
  const dist = bfsFrom(field.grid, field.spawnIdx);
  const path = pathFrom(dist, field.exitIdx);
  const playerIdx = path[Math.floor(path.length * 0.45)];
  renderer.paintAll({ playerIdx, blink: true, t: 250 });

  const cx = playerIdx % FIELD_W;
  const cy = (playerIdx / FIELD_W) | 0;

  if (!mode.lens) {
    console.log(`${mode.name.padEnd(13)} no glass — the player supplies their own`);
    continue;
  }

  const lens = new Lens(mode.lens, seed);
  const glass = lens.render(renderer.pixels, FIELD_W, FIELD_H, cx, cy);

  // Composite: field crop with the glass laid over it.
  const x0 = Math.min(Math.max(cx - CROP / 2, 0), FIELD_W - CROP);
  const y0 = Math.min(Math.max(cy - CROP / 2, 0), FIELD_H - CROP);
  const out = new Uint32Array(CROP * CROP);
  for (let y = 0; y < CROP; y++) {
    for (let x = 0; x < CROP; x++) out[y * CROP + x] = renderer.pixels[(y0 + y) * FIELD_W + (x0 + x)];
  }
  for (let ly = 0; ly < lens.size; ly++) {
    for (let lx = 0; lx < lens.size; lx++) {
      const c = glass[ly * lens.size + lx];
      if ((c >>> 24) === 0) continue; // outside the glass
      const x = cx - lens.radius + lx - x0;
      const y = cy - lens.radius + ly - y0;
      if (x < 0 || y < 0 || x >= CROP || y >= CROP) continue;
      out[y * CROP + x] = c;
    }
  }

  const file = join(outDir, `lens-${id}.png`);
  writeFileSync(file, encodeRgbPng(out, CROP, CROP));

  // Measure what the optics actually do, rather than trusting the constants.
  const { magnification: mag, distortion: k } = mode.lens;
  const rimScale = (1 + k) / mag;
  console.log(
    `${mode.name.padEnd(13)} r=${lens.radius}  centre ${mag.toFixed(1)}x  ` +
    `rim ${(1 / rimScale).toFixed(2)}x  ` +
    `sees a ${(2 * lens.radius * rimScale).toFixed(0)}px-wide patch through a ${2 * lens.radius}px glass  ` +
    `${mode.lens.dirt ? `dirty (${mode.lens.dirt.smudges} smudges, ${mode.lens.dirt.specks} specks)` : 'clean'}`
  );
}
