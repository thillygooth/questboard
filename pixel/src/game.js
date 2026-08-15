// The simulation. See DESIGN.md §5, §7, §10, §12.
//
// Headless on purpose — no DOM, no canvas, no timers. The browser shell drives
// it and the renderer reads it, but nothing here knows either exists. That is
// what lets tools/playthrough.js run a perfect player under each mode's real
// rules and prove a seed is escapable (§4.4).
//
// Fixed timestep, integer ticks, seeded RNG, no wall-clock anywhere: a run is
// fully described by (seed, mode, input events keyed to tick numbers), which is
// what makes leaderboard replay validation possible at all (§12).

import { FIELD_W, FIELD_H, LAT_W, LAT_H, CORRIDOR, px } from './field.js';
import { bfsFrom, UNREACHABLE } from './solver.js';
import { collapseRound } from './collapse.js';
import { Controls, DELTA, DIRS, OPPOSITE } from './input.js';
import { mulberry32 } from './rng.js';

export const TICK_HZ = 240;
const MS_PER_TICK = 1000 / TICK_HZ;

export const STATE = {
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  WON: 'won',
  DEAD: 'dead',
};

export const CAUSE = {
  WALL: 'walked into a wall',
  DECOY: 'that gap was not the exit',
  COLLAPSE: 'caught in a dead end as it filled',
  BLUR: 'left the window',
  STRICT: 'turned into a wall',
};

export class Game {
  constructor(field, mode, { seed = 1 } = {}) {
    this.field = field;
    this.mode = mode;
    this.grid = field.grid;
    this.exitIdx = field.exitIdx;
    this.decoys = new Set(field.decoyIdx);
    this.protectIdx = [field.exitIdx, ...field.decoyIdx];

    this.idx = field.spawnIdx;
    this.heading = null;
    this.heading = this.initialHeading();
    this.pending = null;        // { dir, movesLeft }
    this.held = null;           // Unpleasant only
    this.controls = new Controls(mode, mulberry32((seed ^ 0x5bf03635) >>> 0));

    this.ticks = 0;
    this.moves = 0;
    this.state = STATE.COUNTDOWN;
    this.cause = null;
    this.accumulator = 0;
    this.lastCollapseMs = 0;
    this.collapsed = [];        // pixels filled this tick, for the renderer
    this.paused = false;

    // Distance to the exit, for sonar and for the closest-approach stat that is
    // the only number most Excruciating runs will ever produce.
    this.distToExit = bfsFrom(this.grid, this.exitIdx);
    this.startDistance = this.distToExit[this.idx];
    this.closest = this.startDistance;
  }

  get elapsedMs() {
    return this.ticks * MS_PER_TICK;
  }

  /** Milliseconds since the countdown ended. Negative while still counting down. */
  get runMs() {
    return this.elapsedMs - this.mode.studyMs;
  }

  get speed() {
    const ramp = this.mode.speedRamp;
    if (!ramp) return this.mode.stepRate;
    return this.mode.stepRate + Math.floor(Math.max(0, this.runMs) / ramp.per) * ramp.add;
  }

  /** 0 at the spawn, 1 at the exit. Drives the sonar pitch. */
  get proximity() {
    const d = this.distToExit[this.idx];
    if (d === UNREACHABLE || this.startDistance <= 0) return 0;
    return 1 - d / this.startDistance;
  }

  get finished() {
    return this.state === STATE.WON || this.state === STATE.DEAD;
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  /**
   * Pause, on the modes that allow it (§7 — Unpleasant only).
   *
   * The clock is derived from the tick count and a paused game does not tick, so
   * pausing freezes elapsed time, the speed ramp and the collapse schedule
   * together. Nothing has to be adjusted afterwards.
   *
   * The renderer keeps running while paused, which means the magnifying glass
   * still works: pausing is how you stop and read the maze, which is exactly
   * what Unpleasant is for.
   */
  togglePause() {
    if (!this.mode.allowPause || this.state !== STATE.PLAYING) return false;
    this.paused = !this.paused;
    return this.paused;
  }

  keyDown(code) {
    if (this.state !== STATE.PLAYING || this.paused) return;
    const dir = this.controls.directionFor(code);
    if (!dir) return;

    if (this.mode.inputPolicy === 'free') {
      this.held = dir;
      return;
    }

    // Strict: pressing a direction that is not open right now is fatal, with no
    // buffer and no grace. The turn lands on the exact move or not at all.
    if (this.mode.inputPolicy === 'strict' && !this.isOpen(this.idx, dir)) {
      this.die(CAUSE.STRICT);
      return;
    }
    // Both policies hold a turn for exactly one move. What separates them is the
    // moment of the press, not the buffer: strict kills you for aiming at a wall,
    // buffer1 simply waits one move and then drops it.
    this.pending = { dir, movesLeft: 1 };
  }

  keyUp(code) {
    if (this.mode.inputPolicy !== 'free') return;
    const dir = this.controls.directionFor(code);
    if (dir && this.held === dir) this.held = null;
  }

  /** Window blur. Ends the run outright in Miserable and Excruciating (§7). */
  blur() {
    if (this.state === STATE.PLAYING && this.mode.blurEndsRun) this.die(CAUSE.BLUR);
  }

  // ── Simulation ────────────────────────────────────────────────────────────

  tick() {
    this.collapsed = [];
    if (this.finished || this.paused) return;

    this.ticks++;

    if (this.state === STATE.COUNTDOWN) {
      if (this.elapsedMs >= this.mode.studyMs) this.state = STATE.PLAYING;
      return;
    }

    this.controls.update(this.runMs);
    this.runCollapse();
    if (this.finished) return;

    // Unpleasant only moves while a key is held; the others never stop.
    if (this.mode.movement === 'step' && !this.held) {
      this.accumulator = 0;
      return;
    }

    this.accumulator += this.speed / TICK_HZ;
    while (this.accumulator >= 1 && this.state === STATE.PLAYING) {
      this.accumulator -= 1;
      this.step();
    }
  }

  runCollapse() {
    const cfg = this.mode.collapse;
    if (!cfg) return;
    if (this.runMs - this.lastCollapseMs < cfg.periodMs) return;
    this.lastCollapseMs = this.runMs;

    const { filled, playerDoomed } = collapseRound(this.grid, {
      playerIdx: this.idx,
      protectIdx: this.protectIdx,
      radius: cfg.radius,
    });
    this.collapsed = filled;
    if (playerDoomed) this.die(CAUSE.COLLAPSE);
  }

  /**
   * One move.
   *
   * Corridor following is what makes auto-run playable at all: a 1px winding
   * maze at 60px/s would otherwise demand 60 inputs a second. Where there is no
   * choice, the pixel takes it; the player only steers at real junctions.
   */
  step() {
    const dir = this.mode.movement === 'step' ? this.held : this.chooseRunDirection();
    if (!dir) {
      this.die(CAUSE.WALL);
      return;
    }

    if (this.pending && this.pending.dir === dir) this.pending = null;
    else if (this.pending && --this.pending.movesLeft <= 0) this.pending = null;

    const { dx, dy } = DELTA[dir];
    const x = (this.idx % FIELD_W) + dx;
    const y = ((this.idx / FIELD_W) | 0) + dy;

    if (x < 0 || y < 0 || x >= FIELD_W || y >= FIELD_H) {
      this.die(CAUSE.WALL);
      return;
    }

    const target = y * FIELD_W + x;
    if (this.grid[target] !== CORRIDOR) {
      this.die(CAUSE.WALL);
      return;
    }

    this.idx = target;
    this.heading = dir;
    this.moves++;

    const d = this.distToExit[target];
    if (d !== UNREACHABLE && d < this.closest) this.closest = d;

    // The exit is checked before the decoys: they are all gaps in the ring, and
    // only one of them is the way out.
    if (target === this.exitIdx) {
      this.state = STATE.WON;
      return;
    }
    if (this.decoys.has(target)) this.die(CAUSE.DECOY);
  }

  chooseRunDirection() {
    const open = DIRS.filter((d) => this.isOpen(this.idx, d));
    if (open.length === 0) return null;

    if (this.pending && open.includes(this.pending.dir)) return this.pending.dir;
    if (this.heading && open.includes(this.heading)) return this.heading;

    const back = this.heading ? OPPOSITE[this.heading] : null;
    const forward = open.filter((d) => d !== back);

    // Exactly one way on: follow it, no input needed. This is the degree-2 case,
    // which is most of the maze.
    if (forward.length === 1) return forward[0];

    // Dead end. Reversal is legal in every mode — see DESIGN.md §13 for why
    // forbidding it removes the win state entirely.
    if (forward.length === 0) return this.mode.allowReversal ? back : null;

    // A junction whose straight-ahead is blocked, with no input given. The
    // player had a decision to make and did not make it.
    return null;
  }

  /**
   * The heading the pixel starts with, pointing in off the periphery.
   *
   * Without this an auto-run mode kills the player on move zero: with no heading
   * and a spawn that has two ways on, chooseRunDirection sees a junction it has
   * no answer for and calls it a wall. On Excruciating, whose countdown is a single
   * frame, that is a death in 0.02s that no skill could have avoided.
   */
  initialHeading() {
    const x = this.idx % FIELD_W;
    const y = (this.idx / FIELD_W) | 0;
    const inward = [];
    if (x === px(0)) inward.push('right');
    if (x === px(LAT_W - 1)) inward.push('left');
    if (y === px(0)) inward.push('down');
    if (y === px(LAT_H - 1)) inward.push('up');

    for (const dir of inward) if (this.isOpen(this.idx, dir)) return dir;
    return DIRS.find((dir) => this.isOpen(this.idx, dir)) ?? null;
  }

  isOpen(idx, dir) {
    const { dx, dy } = DELTA[dir];
    const x = (idx % FIELD_W) + dx;
    const y = ((idx / FIELD_W) | 0) + dy;
    if (x < 0 || y < 0 || x >= FIELD_W || y >= FIELD_H) return false;
    return this.grid[y * FIELD_W + x] === CORRIDOR;
  }

  die(cause) {
    this.state = STATE.DEAD;
    this.cause = cause;
  }

  /** Everything the renderer and HUD need, and nothing else. */
  snapshot() {
    return {
      state: this.state,
      cause: this.cause,
      playerIdx: this.idx,
      mapping: this.controls.mapping,
      paused: this.paused,
      runMs: Math.max(0, this.runMs),
      moves: this.moves,
      speed: this.speed,
      proximity: this.proximity,
      closest: this.closest,
      collapsed: this.collapsed,
    };
  }
}
