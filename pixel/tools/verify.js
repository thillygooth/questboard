// Generation harness: builds fields across every mode and asserts the
// invariants that DESIGN.md §4.4 says a playable seed must satisfy.
//
//   node tools/verify.js [seedsPerMode]

import { MODE_IDS, getMode } from '../src/modes.js';
import { generateField } from '../src/maze.js';
import { validate, bfsFrom, pathFrom, countJunctions, reachableCount, UNREACHABLE } from '../src/solver.js';
import { dailySeed } from '../src/rng.js';
import { LAT_W, LAT_H, CORRIDOR, FIELD_W } from '../src/field.js';
import { collapseToFixpoint, degreeAt } from '../src/collapse.js';

const seedsPerMode = Number(process.argv[2] ?? 3);
let failures = 0;

const pct = (n, d) => `${((100 * n) / d).toFixed(1)}%`;
const fmt = (n) => n.toLocaleString('en-US');

console.log(`lattice ${LAT_W} x ${LAT_H} = ${fmt(LAT_W * LAT_H)} cells\n`);

for (const id of MODE_IDS) {
  const mode = getMode(id);
  console.log(`── ${mode.name} — ${mode.tagline}`);
  console.log(`   target region ${fmt(mode.regionCells)} cells, solution band ${mode.solutionBand.map(fmt).join('..')} moves`);

  const solutions = [];
  for (let i = 0; i < seedsPerMode; i++) {
    const seed = dailySeed(`2026-08-${String(14 + i).padStart(2, '0')}`, id);
    const t0 = performance.now();
    const field = generateField(seed, mode);
    const genMs = performance.now() - t0;

    const result = validate(field);
    const dist = result.dist;
    const path = pathFrom(dist, field.exitIdx);
    const junctions = countJunctions(field.grid, path);
    const reachable = reachableCount(dist);

    let corridors = 0;
    for (let k = 0; k < field.grid.length; k++) if (field.grid[k] === CORRIDOR) corridors++;

    solutions.push(result.solution);

    const parSec = result.solution / mode.stepRate;
    const status = result.ok ? 'ok  ' : 'FAIL';
    if (!result.ok) failures++;

    // Decisions per second is the number that actually sets difficulty: it is
    // how often the player must choose, not how fast the pixel moves.
    const perJunction = result.solution / Math.max(junctions, 1);
    const decisionsPerSec = mode.stepRate / perJunction;

    console.log(
      `   ${status} seed ${String(seed).padStart(10)}  ` +
      `solution ${String(fmt(result.solution)).padStart(6)} moves  ` +
      `par ${String(parSec.toFixed(0)).padStart(3)}s  ` +
      `junctions ${String(fmt(junctions)).padStart(4)} (1 per ${perJunction.toFixed(0)} px, ${decisionsPerSec.toFixed(1)}/s)  ` +
      `region ${String(fmt(field.stats.playerRegionCells)).padStart(6)} cells  ` +
      `reachable ${String(fmt(reachable)).padStart(7)}px (${pct(reachable, corridors).padStart(5)})  ` +
      `decoys ${field.decoyIdx.length}  ` +
      `att ${field.attempts}  ` +
      `${genMs.toFixed(0)}ms`
    );
    for (const p of result.problems) console.log(`        ! ${p}`);

    // Spawn must genuinely sit on the periphery, and the exit must be the only
    // way out that is not instant death.
    const sx = field.spawnIdx % FIELD_W;
    const sy = (field.spawnIdx / FIELD_W) | 0;
    if (sx !== 1 && sx !== 1917 && sy !== 1 && sy !== 1077) {
      console.log(`        ! spawn (${sx},${sy}) is not on the periphery`);
      failures++;
    }
    if (dist[field.exitIdx] === UNREACHABLE) {
      console.log('        ! exit unreachable');
      failures++;
    }
  }

  const mean = solutions.reduce((a, b) => a + b, 0) / solutions.length;
  console.log(`   mean solution ${fmt(Math.round(mean))} moves ≈ ${(mean / mode.stepRate).toFixed(0)}s at ${mode.stepRate} px/s\n`);
}

// ── Collapse safety (DESIGN.md §9) ──────────────────────────────────────────
//
// The claim that makes dead-end collapse usable is that it cannot sever the
// route to the exit. Assert it directly: collapse a Excruciating field all the way to
// its fixpoint and check the solution is still there, and still the same length.

console.log('── COLLAPSE — dead-end filling must preserve the solution');
{
  const mode = getMode('excruciating');
  for (let i = 0; i < 3; i++) {
    const seed = dailySeed(`2026-09-0${1 + i}`, 'excruciating');
    const field = generateField(seed, mode);
    const protectIdx = [field.exitIdx, ...field.decoyIdx];

    const before = bfsFrom(field.grid, field.spawnIdx)[field.exitIdx];
    let corridorsBefore = 0;
    for (let k = 0; k < field.grid.length; k++) if (field.grid[k] === CORRIDOR) corridorsBefore++;

    const t0 = performance.now();
    const { total } = collapseToFixpoint(field.grid, { playerIdx: field.spawnIdx, protectIdx });
    const ms = performance.now() - t0;

    const after = bfsFrom(field.grid, field.spawnIdx)[field.exitIdx];
    let corridorsAfter = 0;
    let stragglers = 0;
    for (let k = 0; k < field.grid.length; k++) {
      if (field.grid[k] !== CORRIDOR) continue;
      corridorsAfter++;
      if (k !== field.spawnIdx && !protectIdx.includes(k) && degreeAt(field.grid, k) <= 1) stragglers++;
    }

    const preserved = after === before;
    if (!preserved) { console.log(`        ! solution changed ${before} -> ${after}`); failures++; }
    if (stragglers > 0) { console.log(`        ! ${stragglers} dead end(s) left at fixpoint`); failures++; }

    console.log(
      `   ${preserved && stragglers === 0 ? 'ok  ' : 'FAIL'} seed ${String(seed).padStart(10)}  ` +
      `solution ${fmt(before)} -> ${fmt(after)}  ` +
      `filled ${String(fmt(total)).padStart(9)}px  ` +
      `corridor ${fmt(corridorsBefore)} -> ${fmt(corridorsAfter)}  ` +
      `${ms.toFixed(0)}ms`
    );
  }
}
console.log();

if (failures > 0) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('all checks passed');
