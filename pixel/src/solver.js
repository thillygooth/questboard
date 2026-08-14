// Breadth-first search over the pixel grid, plus seed validation. See DESIGN.md §4.4.
//
// BFS runs on pixels rather than on the lattice because that is what the player
// actually traverses: a step from one corridor cell to the next is two pixel
// moves, and the final step into the exit gap is one more. Distances out of here
// are therefore real move counts, directly comparable to par.

import {
  FIELD_W, FIELD_H, CORRIDOR, pixIndex,
  RING_MIN_X, RING_MAX_X, RING_MIN_Y, RING_MAX_Y,
} from './field.js';

export const UNREACHABLE = -1;

/**
 * Distance in pixel-moves from `startIdx` to every reachable corridor pixel.
 * Returns Int32Array(FIELD_W*FIELD_H) with UNREACHABLE for everything else.
 */
export function bfsFrom(grid, startIdx) {
  const dist = new Int32Array(FIELD_W * FIELD_H).fill(UNREACHABLE);
  if (grid[startIdx] !== CORRIDOR) return dist;

  const queue = new Int32Array(FIELD_W * FIELD_H);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;
  dist[startIdx] = 0;

  while (head < tail) {
    const c = queue[head++];
    const x = c % FIELD_W;
    const y = (c / FIELD_W) | 0;
    const d = dist[c] + 1;

    if (x > 0) { const n = c - 1; if (grid[n] === CORRIDOR && dist[n] === UNREACHABLE) { dist[n] = d; queue[tail++] = n; } }
    if (x < FIELD_W - 1) { const n = c + 1; if (grid[n] === CORRIDOR && dist[n] === UNREACHABLE) { dist[n] = d; queue[tail++] = n; } }
    if (y > 0) { const n = c - FIELD_W; if (grid[n] === CORRIDOR && dist[n] === UNREACHABLE) { dist[n] = d; queue[tail++] = n; } }
    if (y < FIELD_H - 1) { const n = c + FIELD_W; if (grid[n] === CORRIDOR && dist[n] === UNREACHABLE) { dist[n] = d; queue[tail++] = n; } }
  }
  return dist;
}

/** Reconstruct the shortest path from `fromIdx` by descending a distance field. */
export function pathFrom(distField, fromIdx) {
  const path = [fromIdx];
  let c = fromIdx;
  let d = distField[c];
  while (d > 0) {
    const x = c % FIELD_W;
    const y = (c / FIELD_W) | 0;
    let next = -1;
    if (x > 0 && distField[c - 1] === d - 1) next = c - 1;
    else if (x < FIELD_W - 1 && distField[c + 1] === d - 1) next = c + 1;
    else if (y > 0 && distField[c - FIELD_W] === d - 1) next = c - FIELD_W;
    else if (y < FIELD_H - 1 && distField[c + FIELD_W] === d - 1) next = c + FIELD_W;
    else break;
    path.push(next);
    c = next;
    d--;
  }
  return path;
}

/** Count corridor pixels reachable from a start — the size of the player's world. */
export function reachableCount(distField) {
  let n = 0;
  for (let i = 0; i < distField.length; i++) if (distField[i] !== UNREACHABLE) n++;
  return n;
}

/**
 * Junctions on the solution path: corridor pixels with three or more corridor
 * neighbours. This is the count of real decisions a run demands, and it is the
 * number that killed the no-reversal variant of Excruciating mode (DESIGN.md §13).
 */
export function countJunctions(grid, path) {
  let junctions = 0;
  for (const c of path) {
    const x = c % FIELD_W;
    const y = (c / FIELD_W) | 0;
    let open = 0;
    if (x > 0 && grid[c - 1] === CORRIDOR) open++;
    if (x < FIELD_W - 1 && grid[c + 1] === CORRIDOR) open++;
    if (y > 0 && grid[c - FIELD_W] === CORRIDOR) open++;
    if (y < FIELD_H - 1 && grid[c + FIELD_W] === CORRIDOR) open++;
    if (open >= 3) junctions++;
  }
  return junctions;
}

/**
 * Validate a generated field. A seed that fails any of these must never be
 * played: the difference between the hardest game and a broken one is that every
 * death is provably the player's.
 */
export function validate(field) {
  const { grid, spawnIdx, exitIdx, decoyIdx, mode } = field;
  const problems = [];

  const dist = bfsFrom(grid, spawnIdx);

  if (dist[exitIdx] === UNREACHABLE) problems.push('exit is not reachable from spawn');
  const solution = dist[exitIdx];
  if (solution !== UNREACHABLE) {
    if (solution < mode.solutionBand[0] || solution > mode.solutionBand[1]) {
      problems.push(`solution ${solution} outside band ${mode.solutionBand.join('..')}`);
    }
  }

  // Excruciating's decoys must be reachable or they can never lie to anyone. Miserable's
  // must NOT be, because there they are only meant to cost time.
  for (const d of decoyIdx) {
    const reachable = dist[d] !== UNREACHABLE;
    if (mode.decoysReachable && !reachable) problems.push('lethal decoy is unreachable');
    if (!mode.decoysReachable && reachable) problems.push('time-waster decoy is reachable, so it kills');
  }
  if (decoyIdx.length !== mode.decoyCount) {
    problems.push(`placed ${decoyIdx.length} decoys, wanted ${mode.decoyCount}`);
  }

  // The border ring must be solid apart from the exit and its decoys, or the
  // player can leave the world somewhere the design never sanctioned.
  const sanctioned = new Set([exitIdx, ...decoyIdx]);
  let leaks = 0;
  for (const [x, y] of ringPixels()) {
    const i = pixIndex(x, y);
    if (grid[i] === CORRIDOR && !sanctioned.has(i)) leaks++;
  }
  if (leaks > 0) problems.push(`${leaks} unsanctioned gap(s) in the border ring`);

  return { ok: problems.length === 0, problems, solution, dist };
}

/** Every pixel of the border ring, once each. */
export function* ringPixels() {
  for (let x = RING_MIN_X; x <= RING_MAX_X; x++) {
    yield [x, RING_MIN_Y];
    yield [x, RING_MAX_Y];
  }
  for (let y = RING_MIN_Y + 1; y < RING_MAX_Y; y++) {
    yield [RING_MIN_X, y];
    yield [RING_MAX_X, y];
  }
}
