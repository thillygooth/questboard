// Drive a perfect player through the real simulation, under each mode's actual
// rules — collapse ticking, speed ramping, controls reassigning underneath them.
//
//   node tools/playthrough.js [isoDate]
//
// This is DESIGN.md §4.4 made executable. The claim that separates the hardest
// game from a broken one is that a theoretically perfect player can escape; this
// asserts it rather than assuming it. A mode that cannot be completed here is a
// mode with no win state, and no amount of tuning elsewhere fixes that.

import { MODE_IDS, getMode } from '../src/modes.js';
import { generateField } from '../src/maze.js';
import { bfsFrom, pathFrom } from '../src/solver.js';
import { dailySeed } from '../src/rng.js';
import { Game, STATE, TICK_HZ } from '../src/game.js';
import { DELTA, DIRS } from '../src/input.js';
import { FIELD_W } from '../src/field.js';

const isoDate = process.argv[2] ?? '2026-08-14';
const CODE_FOR_GLYPH = { '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight' };
const MAX_TICKS = TICK_HZ * 900;

const fmt = (n) => n.toLocaleString('en-US');
let failures = 0;

function directionBetween(from, to) {
  const dx = (to % FIELD_W) - (from % FIELD_W);
  const dy = ((to / FIELD_W) | 0) - ((from / FIELD_W) | 0);
  return DIRS.find((d) => DELTA[d].dx === dx && DELTA[d].dy === dy) ?? null;
}

console.log(`perfect-player playthrough, seeds for ${isoDate}\n`);

for (const id of MODE_IDS) {
  const mode = getMode(id);
  const seed = dailySeed(isoDate, id);
  const field = generateField(seed, mode);

  // The route is computed once, before collapse starts eating the maze. It stays
  // valid for the whole run because dead-end filling provably cannot touch it.
  const path = pathFrom(bfsFrom(field.grid, field.spawnIdx), field.exitIdx).reverse();
  const par = path.length - 1;

  const game = new Game(field, mode, { seed });
  let cursor = 0;
  let remaps = 0;
  let collapses = 0;
  let collapsedPx = 0;
  let lastMapping = JSON.stringify(game.controls.mapping);
  let offPath = 0;

  while (!game.finished && game.ticks < MAX_TICKS) {
    if (game.state === STATE.PLAYING) {
      if (game.idx === path[cursor + 1]) cursor++;
      else if (game.idx !== path[cursor]) offPath++;

      const next = path[cursor + 1];
      if (next !== undefined) {
        const want = directionBetween(game.idx, next);
        // A perfect player reads the HUD and presses whichever key currently
        // produces the direction they want.
        if (want) game.keyDown(CODE_FOR_GLYPH[game.controls.mapping[want]]);
      }
    }

    game.tick();

    if (game.collapsed.length > 0) { collapses++; collapsedPx += game.collapsed.length; }
    const now = JSON.stringify(game.controls.mapping);
    if (now !== lastMapping) { remaps++; lastMapping = now; }
  }

  const won = game.state === STATE.WON;
  if (!won) failures++;
  if (offPath > 0) { failures++; }

  const secs = (game.runMs / 1000).toFixed(1);
  console.log(`── ${mode.name.padEnd(6)} ${won ? 'ESCAPED' : 'FAILED '}  seed ${seed}`);
  console.log(`   time      ${secs}s over ${fmt(game.ticks)} ticks`);
  console.log(`   moves     ${fmt(game.moves)} vs par ${fmt(par)}${game.moves === par ? ' (optimal)' : ''}`);
  console.log(`   speed     ${mode.stepRate} → ${game.speed} px/s`);
  console.log(`   collapse  ${collapses} rounds, ${fmt(collapsedPx)}px filled`);
  console.log(`   remaps    ${remaps} control reassignments survived`);
  if (!won) console.log(`   cause     ${game.cause} at ${fmt(game.moves)} moves, closest approach ${fmt(game.closest)}`);
  if (offPath > 0) console.log(`   ! left the intended route on ${offPath} ticks`);
  console.log();
}

// ── Idle survival ───────────────────────────────────────────────────────────
// A player who presses nothing should die at a junction they failed to steer
// through — not on move zero, before they could physically have reacted.

console.log('── idle player (no input at all)');
for (const id of MODE_IDS) {
  const mode = getMode(id);
  if (mode.movement !== 'run') continue;
  const seed = dailySeed(isoDate, id);
  const game = new Game(generateField(seed, mode), mode, { seed });
  while (!game.finished && game.ticks < TICK_HZ * 30) game.tick();

  const ok = game.moves > 0;
  if (!ok) failures++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${mode.name.padEnd(6)} survived ${fmt(game.moves)} moves ` +
              `(${(game.runMs / 1000).toFixed(2)}s) before "${game.cause}"`);
  if (!ok) console.log('        ! died on move zero — an unavoidable death');
}
console.log();

if (failures > 0) {
  console.error(`${failures} failure(s) — a mode that cannot be completed has no win state`);
  process.exit(1);
}
console.log('every mode is completable under its own rules');
