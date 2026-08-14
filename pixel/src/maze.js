// Field generation. See DESIGN.md §4.
//
// The field is filled edge to edge with maze, but it is not one maze. It is
// partitioned into a player region of a chosen size plus a dozen or so
// decorative regions, each an independent perfect maze, never connected to each
// other. Region boundaries are ordinary 1px wall and are indistinguishable from
// any other wall in the field.
//
// This is what makes run length tunable without compromising the spec — and it
// is the central mechanic: in Easy the whole map is visible and almost entirely
// unreachable, with no way to tell which corridors connect to you.

import { mulberry32, randInt, randRange } from './rng.js';
import { bfsFrom, UNREACHABLE } from './solver.js';
import {
  FIELD_W, FIELD_H, LAT_W, LAT_H, WALL, CORRIDOR,
  px, latIndex, pixIndex, inHudReserve, isBorderAdjacent, ringPixelFor,
} from './field.js';

const EXCLUDED = -2; // HUD reserve: never part of any region
const UNASSIGNED = -1;
const PLAYER_REGION = 0;

/**
 * Generate a complete, validated field.
 * Returns { grid, spawnIdx, exitIdx, decoyIdx, regionOf, mode, seed, stats }.
 */
export function generateField(seed, mode, { maxAttempts = 8 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Vary the seed per attempt so a retry explores a different field rather
    // than redoing the same one. Still fully deterministic in `seed`.
    const rng = mulberry32((seed + attempt * 0x9e3779b9) >>> 0);
    const field = tryGenerate(rng, seed, mode);
    if (field) return { ...field, attempts: attempt + 1 };
  }
  throw new Error(`could not generate a ${mode.id} field for seed ${seed}`);
}

function tryGenerate(rng, seed, mode) {
  const ends = choosePeripheryPair(rng);
  if (!ends) return null;

  const spine = walkSpine(rng, ends.spawnCell, ends.exitCell);
  const regionOf = partition(rng, mode, spine);
  const grid = carveRegions(rng, regionOf);

  // The spine is connected and the region is spanned by a single tree, so the
  // exit is always reachable. Solution length is the only thing left to filter.
  const spawnIdx = pixIndexOfCell(ends.spawnCell);
  const dist = bfsFrom(grid, spawnIdx);
  const solution = dist[pixIndexOfCell(ends.exitCell)];
  if (solution === UNREACHABLE) return null;
  if (solution + 1 < mode.solutionBand[0] || solution + 1 > mode.solutionBand[1]) return null;

  const ring = ringPixelFor(ends.exitCell % LAT_W, (ends.exitCell / LAT_W) | 0);
  const exitIdx = pixIndex(ring.x, ring.y);
  grid[exitIdx] = CORRIDOR;

  const decoyIdx = placeDecoys(rng, grid, regionOf, mode, exitIdx, dist, spawnIdx, solution);

  return {
    grid, regionOf, spawnIdx, exitIdx, decoyIdx, mode, seed,
    stats: {
      solution: solution + 1,
      playerRegionCells: countRegion(regionOf, PLAYER_REGION),
      spineCells: spine.length,
    },
  };
}

// ── Spawn and exit come first, and the region is grown to connect them ──────
//
// Growing a compact blob from a single border seed puts the spawn, the exit and
// every decoy on the same edge a couple of hundred pixels apart: the path
// between them is long, but the whole run happens in one small patch of a
// 1920x1080 field. So instead, pick the two periphery points first — on
// different edges — lay a wandering spine between them, and grow the region
// outward from that. The region ends up a sprawling band across the field, and
// the spec's "randomly on the periphery, same with the exit" actually holds.

const SIDES = ['top', 'bottom', 'left', 'right'];
const MIN_END_SEPARATION = 900; // pixels, Manhattan — keeps adjacent-edge pairs honest

function choosePeripheryPair(rng, tries = 60) {
  for (let i = 0; i < tries; i++) {
    const a = SIDES[randInt(rng, 4)];
    let b = SIDES[randInt(rng, 4)];
    if (a === b) continue;

    const spawnCell = randomCellOnSide(rng, a);
    const exitCell = randomCellOnSide(rng, b);
    if (spawnCell < 0 || exitCell < 0) continue;

    const ax = px(spawnCell % LAT_W), ay = px((spawnCell / LAT_W) | 0);
    const bx = px(exitCell % LAT_W), by = px((exitCell / LAT_W) | 0);
    if (Math.abs(ax - bx) + Math.abs(ay - by) < MIN_END_SEPARATION) continue;

    return { spawnCell, exitCell };
  }
  return null;
}

function randomCellOnSide(rng, side) {
  for (let i = 0; i < 200; i++) {
    let lx, ly;
    switch (side) {
      case 'top': lx = randInt(rng, LAT_W); ly = 0; break;
      case 'bottom': lx = randInt(rng, LAT_W); ly = LAT_H - 1; break;
      case 'left': lx = 0; ly = randInt(rng, LAT_H); break;
      default: lx = LAT_W - 1; ly = randInt(rng, LAT_H); break;
    }
    if (!inHudReserve(lx, ly)) return latIndex(lx, ly);
  }
  return -1;
}

/**
 * A drunken walk from one periphery cell to the other: mostly toward the target,
 * sometimes not. The wandering is what stops the region from being an obvious
 * straight band between two points.
 */
function walkSpine(rng, fromCell, toCell, drift = 0.32) {
  const cells = [];
  const seen = new Set();
  let lx = fromCell % LAT_W;
  let ly = (fromCell / LAT_W) | 0;
  const tx = toCell % LAT_W;
  const ty = (toCell / LAT_W) | 0;

  const push = () => {
    const cell = latIndex(lx, ly);
    if (!seen.has(cell)) { seen.add(cell); cells.push(cell); }
  };
  push();

  const cap = LAT_W * LAT_H;
  for (let step = 0; step < cap && (lx !== tx || ly !== ty); step++) {
    let dx = 0;
    let dy = 0;
    if (rng() < drift) {
      if (rng() < 0.5) dx = rng() < 0.5 ? -1 : 1;
      else dy = rng() < 0.5 ? -1 : 1;
    } else if (lx !== tx && (ly === ty || rng() < 0.5)) {
      dx = Math.sign(tx - lx);
    } else {
      dy = Math.sign(ty - ly);
    }

    const nx = lx + dx;
    const ny = ly + dy;
    if (nx < 0 || ny < 0 || nx >= LAT_W || ny >= LAT_H) continue;
    if (inHudReserve(nx, ny)) continue;
    lx = nx;
    ly = ny;
    push();
  }
  return cells;
}

// ── Region partition ────────────────────────────────────────────────────────

/**
 * Grow the player's region to a target size from a random border-adjacent seed,
 * then fill the remainder with decorative regions.
 *
 * Growth pops a *random* cell from the frontier rather than the oldest. FIFO
 * growth produces suspiciously circular regions, and a player who learns to
 * recognise region shapes by eye has beaten the central mechanic.
 */
function partition(rng, mode, spine) {
  const regionOf = new Int16Array(LAT_W * LAT_H).fill(UNASSIGNED);

  for (let ly = 0; ly < LAT_H; ly++) {
    for (let lx = 0; lx < LAT_W; lx++) {
      if (inHudReserve(lx, ly)) regionOf[latIndex(lx, ly)] = EXCLUDED;
    }
  }

  // The spine already connects the two periphery points, so growing outward from
  // every one of its cells thickens it into a region that spans the field.
  const target = Math.max(mode.regionCells, spine.length);
  growRegion(rng, regionOf, PLAYER_REGION, spine, target);

  // Everything else becomes decoration, grown from many seeds at once.
  const decorCount = randRange(rng, 12, 20);
  const seeds = [];
  for (let i = 0; i < decorCount; i++) {
    const cell = randomUnassignedCell(rng, regionOf);
    if (cell >= 0) seeds.push({ cell, region: i + 1 });
  }
  growMultiRegion(rng, regionOf, seeds);

  // Randomised growth can strand small pockets. Sweep them into a region so no
  // lattice cell is left unassigned and therefore uncarved.
  sweepStragglers(regionOf, decorCount);
  return regionOf;
}

/**
 * Claim every seed cell unconditionally, then thicken outward at random until
 * the region hits its target size.
 *
 * The seeds go in first rather than being popped at random off the frontier
 * because the spine must survive intact — losing part of it would disconnect the
 * spawn from the exit and quietly break the field.
 */
function growRegion(rng, regionOf, region, seedCells, targetSize) {
  let count = 0;
  const frontier = [];

  for (const cell of seedCells) {
    if (regionOf[cell] !== UNASSIGNED) continue;
    regionOf[cell] = region;
    count++;
  }
  for (const cell of seedCells) {
    for (const n of latNeighbours(cell)) {
      if (regionOf[n] === UNASSIGNED) frontier.push(n);
    }
  }

  while (frontier.length > 0 && count < targetSize) {
    const i = randInt(rng, frontier.length);
    const cell = frontier[i];
    frontier[i] = frontier[frontier.length - 1];
    frontier.pop();
    if (regionOf[cell] !== UNASSIGNED) continue;

    regionOf[cell] = region;
    count++;
    for (const n of latNeighbours(cell)) {
      if (regionOf[n] === UNASSIGNED) frontier.push(n);
    }
  }
  return count;
}

function growMultiRegion(rng, regionOf, seeds) {
  const frontier = [];
  for (const { cell, region } of seeds) {
    if (regionOf[cell] === UNASSIGNED) frontier.push(cell | (region << 24));
  }
  while (frontier.length > 0) {
    const i = randInt(rng, frontier.length);
    const packed = frontier[i];
    frontier[i] = frontier[frontier.length - 1];
    frontier.pop();

    const cell = packed & 0xffffff;
    const region = packed >>> 24;
    if (regionOf[cell] !== UNASSIGNED) continue;

    regionOf[cell] = region;
    for (const n of latNeighbours(cell)) {
      if (regionOf[n] === UNASSIGNED) frontier.push(n | (region << 24));
    }
  }
}

/** Attach any leftover cell to a neighbouring region, or give it its own. */
function sweepStragglers(regionOf, decorCount) {
  let orphanRegion = decorCount + 1;
  for (let cell = 0; cell < regionOf.length; cell++) {
    if (regionOf[cell] !== UNASSIGNED) continue;
    let adopted = -1;
    for (const n of latNeighbours(cell)) {
      // Never adopt into the player's region: that would silently inflate it
      // past its target size and lengthen the run.
      if (regionOf[n] > PLAYER_REGION) { adopted = regionOf[n]; break; }
    }
    regionOf[cell] = adopted >= 0 ? adopted : orphanRegion++;
  }
}

// ── Maze carving ────────────────────────────────────────────────────────────

/**
 * Every lattice cell is a corridor pixel from the outset; the maze is formed by
 * carving the wall pixels *between* cells. A recursive backtracker runs
 * independently inside each region and never carves across a boundary.
 *
 * Recursive backtracker rather than Prim's: it produces long winding corridors
 * and few short stubs, which is what makes auto-run lethal and what makes
 * dead-end collapse dramatic to look at.
 */
function carveRegions(rng, regionOf) {
  const grid = new Uint8Array(FIELD_W * FIELD_H).fill(WALL);

  for (let ly = 0; ly < LAT_H; ly++) {
    for (let lx = 0; lx < LAT_W; lx++) {
      if (regionOf[latIndex(lx, ly)] === EXCLUDED) continue;
      grid[pixIndex(px(lx), px(ly))] = CORRIDOR;
    }
  }

  const visited = new Uint8Array(LAT_W * LAT_H);
  const stack = new Int32Array(LAT_W * LAT_H);
  const candidates = new Int32Array(4);

  for (let cell = 0; cell < regionOf.length; cell++) {
    if (visited[cell] || regionOf[cell] === EXCLUDED) continue;

    const region = regionOf[cell];
    let sp = 0;
    stack[sp++] = cell;
    visited[cell] = 1;

    while (sp > 0) {
      const c = stack[sp - 1];
      let n = 0;
      for (const nb of latNeighbours(c)) {
        if (!visited[nb] && regionOf[nb] === region) candidates[n++] = nb;
      }
      if (n === 0) { sp--; continue; }

      const next = candidates[randInt(rng, n)];
      carveBetween(grid, c, next);
      visited[next] = 1;
      stack[sp++] = next;
    }
  }
  return grid;
}

/** Open the single wall pixel sitting between two adjacent lattice cells. */
function carveBetween(grid, a, b) {
  const ax = a % LAT_W, ay = (a / LAT_W) | 0;
  const bx = b % LAT_W, by = (b / LAT_W) | 0;
  grid[pixIndex(px(ax) + (bx - ax), px(ay) + (by - ay))] = CORRIDOR;
}

// ── Spawn, exit, decoys ─────────────────────────────────────────────────────

/**
 * Extra gaps in the ring. In Hard they open onto the player's own region and
 * kill; in Medium they open onto regions that can never be reached, so they cost
 * only time. Both are kept well away from the true exit so that a gap spotted at
 * distance is a real decision rather than a coin flip.
 */
function placeDecoys(rng, grid, regionOf, mode, exitIdx, dist, spawnIdx, solution) {
  if (mode.decoyCount === 0) return [];

  // A decoy near the spawn kills a second into the run, before the player has
  // oriented — a death no amount of skill avoids. Keep them away from the start
  // both on screen and along the maze.
  const spawnX = spawnIdx % FIELD_W;
  const spawnY = (spawnIdx / FIELD_W) | 0;
  const MIN_SPAWN_PIXELS = 320;
  const minSpawnMoves = Math.round(solution * 0.15);

  const wanted = mode.decoysReachable ? PLAYER_REGION : null;
  const pool = [];
  for (let ly = 0; ly < LAT_H; ly++) {
    for (let lx = 0; lx < LAT_W; lx++) {
      if (!isBorderAdjacent(lx, ly) || inHudReserve(lx, ly)) continue;
      const cell = latIndex(lx, ly);
      const region = regionOf[cell];
      if (region === EXCLUDED) continue;
      if (wanted === PLAYER_REGION ? region !== PLAYER_REGION : region === PLAYER_REGION) continue;

      const ring = ringPixelFor(lx, ly);
      const idx = pixIndex(ring.x, ring.y);
      if (idx === exitIdx) continue;
      if (Math.abs(ring.x - spawnX) + Math.abs(ring.y - spawnY) < MIN_SPAWN_PIXELS) continue;

      if (mode.decoysReachable) {
        const d = dist[pixIndexOfCell(cell)];
        if (d === UNREACHABLE || d < minSpawnMoves) continue;
      }
      pool.push(idx);
    }
  }

  // Keep decoys away from the true exit so that a gap spotted at distance is a
  // real decision rather than a coin flip. The player region only touches the
  // ring in a handful of places though, so relax the spacing rather than give up
  // and ship a Hard field with one decoy instead of three.
  const exitX = exitIdx % FIELD_W;
  const exitY = (exitIdx / FIELD_W) | 0;
  const chosen = [];

  for (const minGap of [240, 140, 80, 30, 0]) {
    const remaining = pool.filter((idx) => !chosen.includes(idx));
    while (chosen.length < mode.decoyCount && remaining.length > 0) {
      let picked = -1;
      for (let tries = 0; tries < 60 && picked < 0; tries++) {
        const k = randInt(rng, remaining.length);
        const idx = remaining[k];
        const x = idx % FIELD_W;
        const y = (idx / FIELD_W) | 0;
        const far = (ax, ay) => Math.abs(x - ax) + Math.abs(y - ay) >= minGap;
        if (far(exitX, exitY) && chosen.every((c) => far(c % FIELD_W, (c / FIELD_W) | 0))) picked = k;
      }
      if (picked < 0) break;
      chosen.push(remaining[picked]);
      remaining.splice(picked, 1);
    }
    if (chosen.length >= mode.decoyCount) break;
  }

  for (const idx of chosen) grid[idx] = CORRIDOR;
  return chosen;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function* latNeighbours(cell) {
  const lx = cell % LAT_W;
  const ly = (cell / LAT_W) | 0;
  if (lx > 0) yield cell - 1;
  if (lx < LAT_W - 1) yield cell + 1;
  if (ly > 0) yield cell - LAT_W;
  if (ly < LAT_H - 1) yield cell + LAT_W;
}

const pixIndexOfCell = (cell) => pixIndex(px(cell % LAT_W), px((cell / LAT_W) | 0));

function randomUnassignedCell(rng, regionOf) {
  for (let tries = 0; tries < 500; tries++) {
    const cell = randInt(rng, regionOf.length);
    if (regionOf[cell] === UNASSIGNED) return cell;
  }
  for (let cell = 0; cell < regionOf.length; cell++) {
    if (regionOf[cell] === UNASSIGNED) return cell;
  }
  return -1;
}

function countRegion(regionOf, region) {
  let n = 0;
  for (let i = 0; i < regionOf.length; i++) if (regionOf[i] === region) n++;
  return n;
}
