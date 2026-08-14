// Dead-end filling as a timed hazard. See DESIGN.md §9.
//
// Every collapse tick, the maze eats one layer of its own dead ends: corridor
// pixels with one or fewer corridor neighbours become wall.
//
// ── Why this is safe, and why that matters ──────────────────────────────────
// In a perfect maze, dead-end filling is a *solving* algorithm. Every pixel on
// the unique path between two points has degree >= 2 — a predecessor and a
// successor — so it can never be a dead end and can never be filled. The only
// degree-1 pixels on that path are its two endpoints.
//
// So as long as the player's pixel and the exit are excluded, collapse cannot
// sever the route to the exit. No solvability check is needed and the game can
// never strand anybody. The maze closes in and stays winnable by construction.
//
// The exit and the decoy gaps sit in the border ring with exactly one corridor
// neighbour, so they are permanently degree-1 and MUST be protected explicitly
// or the first tick would quietly wall up the way out.

import { FIELD_W, FIELD_H, WALL, CORRIDOR } from './field.js';

/** Number of corridor neighbours. Off-field counts as wall. */
export function degreeAt(grid, idx) {
  const x = idx % FIELD_W;
  const y = (idx / FIELD_W) | 0;
  let d = 0;
  if (x > 0 && grid[idx - 1] === CORRIDOR) d++;
  if (x < FIELD_W - 1 && grid[idx + 1] === CORRIDOR) d++;
  if (y > 0 && grid[idx - FIELD_W] === CORRIDOR) d++;
  if (y < FIELD_H - 1 && grid[idx + FIELD_W] === CORRIDOR) d++;
  return d;
}

/**
 * One collapse tick.
 *
 * Dead ends are collected before any of them are filled, so a tick removes
 * exactly one layer. Iterating to a fixpoint instead would reduce the region to
 * the bare solution corridor in a single frame and hand the player the answer.
 *
 * @param grid        Uint8Array, mutated in place
 * @param playerIdx   never filled; if it is itself a dead end the player dies
 * @param protectIdx  exit and decoy gaps — permanently degree-1, must survive
 * @param radius      pixels around the player; Infinity collapses the whole field
 * @returns { filled: number[], playerDoomed: boolean }
 */
export function collapseRound(grid, { playerIdx, protectIdx = [], radius = Infinity }) {
  const protectedSet = new Set(protectIdx);
  const filled = [];

  const pxx = playerIdx % FIELD_W;
  const pyy = (playerIdx / FIELD_W) | 0;
  const finite = Number.isFinite(radius);
  const x0 = finite ? Math.max(0, pxx - radius) : 0;
  const x1 = finite ? Math.min(FIELD_W - 1, pxx + radius) : FIELD_W - 1;
  const y0 = finite ? Math.max(0, pyy - radius) : 0;
  const y1 = finite ? Math.min(FIELD_H - 1, pyy + radius) : FIELD_H - 1;
  const r2 = finite ? radius * radius : Infinity;

  for (let y = y0; y <= y1; y++) {
    const dy = y - pyy;
    for (let x = x0; x <= x1; x++) {
      const idx = y * FIELD_W + x;
      if (grid[idx] !== CORRIDOR) continue;
      if (idx === playerIdx || protectedSet.has(idx)) continue;
      if (finite) {
        const dx = x - pxx;
        if (dx * dx + dy * dy > r2) continue;
      }
      if (degreeAt(grid, idx) <= 1) filled.push(idx);
    }
  }

  // Caught in a stub when it fills. The player's own pixel is never walled up —
  // the run just ends, which reads better than entombing them for a few frames
  // until their next move happens to hit a wall.
  const playerDoomed = degreeAt(grid, playerIdx) <= 1;

  for (const idx of filled) grid[idx] = WALL;
  return { filled, playerDoomed };
}

/** Dead ends currently present. Diagnostics and tests only. */
export function deadEndCount(grid, protectIdx = []) {
  const protectedSet = new Set(protectIdx);
  let n = 0;
  for (let idx = 0; idx < grid.length; idx++) {
    if (grid[idx] !== CORRIDOR || protectedSet.has(idx)) continue;
    if (degreeAt(grid, idx) <= 1) n++;
  }
  return n;
}

/**
 * Run collapse to a fixpoint. This is the endgame of the unranked Collapse
 * variant, where the maze reduces itself to the bare solution corridor — and the
 * cheapest way to assert the safety property in tests.
 *
 * Uses a worklist rather than repeated full scans: once the first pass has found
 * every dead end, the only cells that can *become* dead ends are the neighbours
 * of cells just filled. Filling order does not matter — dead-end filling is
 * confluent, so the fixpoint is the same either way.
 *
 * What survives is the union of the paths joining the player, the exit and every
 * protected gap: each protected pixel anchors its own branch against collapse.
 */
export function collapseToFixpoint(grid, { playerIdx, protectIdx = [] }) {
  const protectedSet = new Set(protectIdx);
  const keep = (idx) => idx === playerIdx || protectedSet.has(idx);

  const work = [];
  for (let idx = 0; idx < grid.length; idx++) {
    if (grid[idx] === CORRIDOR && !keep(idx) && degreeAt(grid, idx) <= 1) work.push(idx);
  }

  let total = 0;
  while (work.length > 0) {
    const idx = work.pop();
    if (grid[idx] !== CORRIDOR || keep(idx)) continue;
    if (degreeAt(grid, idx) > 1) continue;

    grid[idx] = WALL;
    total++;

    const x = idx % FIELD_W;
    const y = (idx / FIELD_W) | 0;
    if (x > 0) work.push(idx - 1);
    if (x < FIELD_W - 1) work.push(idx + 1);
    if (y > 0) work.push(idx - FIELD_W);
    if (y < FIELD_H - 1) work.push(idx + FIELD_W);
  }
  return { total };
}
