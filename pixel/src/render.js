// Rendering. See DESIGN.md §2 and §6.
//
// `FieldRenderer` is pure: it owns a Uint32Array framebuffer and knows nothing
// about the DOM, so frames can be rendered and inspected offline (tools/frame.js).
// `CanvasSink` binds that framebuffer to a canvas, and `drawHud` is the only
// thing that touches the 2D context directly.
//
// The rule that governs everything here: one maze cell is one device pixel.
// Any fractional scaling turns 1px lines into grey mush and the player pixel
// stops being findable at all.

import {
  FIELD_W, FIELD_H, CORRIDOR, HUD_X0, HUD_Y0, HUD_W, HUD_H,
  RING_MIN_X, RING_MAX_X, RING_MIN_Y, RING_MAX_Y,
} from './field.js';

// ImageData is RGBA little-endian, so a packed pixel is 0xAABBGGRR.
const rgb = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(255, 255, 255);
const DIM = rgb(200, 200, 200);

/**
 * Walls are black and corridors are white, so the wall surrounding the field is
 * black and the exit is the single white opening in it.
 *
 * The player is always exactly the wall colour — that is the point of §1: you
 * are camouflaged as an obstacle. Which means the player is black, and the
 * blink shows you as a momentary wall in an open corridor.
 *
 * This pairing is forced, not chosen. The blink is only visible if the player
 * differs from the corridor it stands in, so player and corridor must be
 * opposite colours; making the player white here would render it white-on-white
 * in both blink phases and it could never be found at all.
 *
 * Excruciating dims the corridors to #c8c8c8, lowering contrast across the whole field.
 */
export const PALETTES = {
  unpleasant: { wall: BLACK, corridor: WHITE, exit: rgb(34, 255, 34), markExit: true, playerOn: BLACK, playerOff: WHITE },
  miserable: { wall: BLACK, corridor: WHITE, exit: WHITE, markExit: false, playerOn: BLACK, playerOff: WHITE },
  excruciating: { wall: BLACK, corridor: DIM, exit: DIM, markExit: false, playerOn: BLACK, playerOff: WHITE },
};

export const BLINK_ON_MS = 400;
export const BLINK_OFF_MS = 200;
const BLINK_PERIOD = BLINK_ON_MS + BLINK_OFF_MS;

/** Pixels of soft edge on the fog disc. A hard circle reads as a UI element. */
const FOG_FALLOFF = 10;

/** True while the player pixel is drawn. Off-phase renders the maze underneath. */
export function blinkOn(elapsedMs) {
  return elapsedMs % BLINK_PERIOD < BLINK_ON_MS;
}

/** True when a blinker with this phase offset is showing white. */
function showingWhite(elapsedMs, phaseMs) {
  return (elapsedMs + phaseMs) % BLINK_PERIOD >= BLINK_ON_MS;
}

/**
 * Which wall pixels blink, and out of phase by how much — derived from the pixel
 * index rather than stored, so a million of them cost no memory and stay
 * identical for everyone playing the same seed.
 */
function mix(idx, salt) {
  let h = (idx ^ salt) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export class FieldRenderer {
  constructor(field, mode) {
    this.grid = field.grid;
    this.exitIdx = field.exitIdx;
    this.mode = mode;
    this.palette = PALETTES[mode.id] ?? PALETTES.miserable;

    this.fogRadius = mode.fogRadius ?? Infinity;
    this.fogInner = Number.isFinite(this.fogRadius)
      ? Math.max(0, this.fogRadius - FOG_FALLOFF)
      : Infinity;

    // False blinks (§8.4). Seeded off the field so everyone on a daily seed sees
    // the same liars in the same places.
    this.decoyOneIn = mode.blinkDecoys?.oneIn ?? 0;
    this.decoySalt = (field.seed ^ 0x9e3779b9) >>> 0;

    this.buffer = new ArrayBuffer(FIELD_W * FIELD_H * 4);
    this.pixels = new Uint32Array(this.buffer);
    this.bytes = new Uint8ClampedArray(this.buffer);

    this.last = { playerIdx: -1, blink: false };
  }

  /**
   * A corridor pixel that blinks exactly like the player: same two colours, same
   * duty cycle, its own phase. Indistinguishable from you in a still frame.
   *
   * These sit on corridors, not on walls, and that is a safety property rather
   * than a detail. A *wall* pixel flashing white would read as an opening, and
   * under Excruciating's strict input policy pressing toward a wall is instant
   * death — so a white-flashing wall could bait a fatal keypress, which is a
   * death caused by the renderer lying rather than by the player. §4.4 rules
   * that out. A corridor pixel drawn black merely looks blocked: steering around
   * it costs time, and pressing into it anyway is perfectly safe, because
   * collision is read from the grid and never from what is on screen.
   *
   * It is also the only version that actually confuses anyone. Blinking walls
   * would flash white-in-black while the player flashes black-in-white — read as
   * opposites at a glance rather than as candidates.
   *
   * The border ring is excluded: a flashing pixel there would read as the exit.
   */
  isBlinkDecoy(x, y, idx) {
    if (this.decoyOneIn === 0 || this.grid[idx] !== CORRIDOR) return false;
    if (idx === this.exitIdx) return false;
    if (x <= RING_MIN_X || x >= RING_MAX_X || y <= RING_MIN_Y || y >= RING_MAX_Y) return false;
    return mix(idx, this.decoySalt) % this.decoyOneIn === 0;
  }

  /** Whether a given false blink is in its white phase at time `t`. */
  decoyShowingWhite(idx, t) {
    return showingWhite(t, mix(idx, 0x51ed270b) % BLINK_PERIOD);
  }

  colorAt(x, y, state) {
    const idx = y * FIELD_W + x;

    let base;
    // The player is always drawn explicitly, in its own two colours — never by
    // falling through to whatever is underneath. Deriving the off-phase from the
    // corridor made the pixel blink black against the dimmed #c8c8c8 corridors of
    // Excruciating rather than black against white, and there the blink is the
    // only way to find it.
    if (idx === state.playerIdx) base = state.blink ? this.palette.playerOn : this.palette.playerOff;
    else if (idx === this.exitIdx && this.palette.markExit) base = this.palette.exit;
    else if (this.isBlinkDecoy(x, y, idx)) {
      base = this.decoyShowingWhite(idx, state.t ?? 0) ? this.palette.playerOff : this.palette.playerOn;
    } else base = this.grid[idx] === CORRIDOR ? this.palette.corridor : this.palette.wall;

    if (this.fogRadius === Infinity) return base;

    const pxx = state.playerIdx % FIELD_W;
    const pyy = (state.playerIdx / FIELD_W) | 0;
    const dx = x - pxx;
    const dy = y - pyy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= this.fogRadius * this.fogRadius) return BLACK;
    if (d2 <= this.fogInner * this.fogInner) return base;

    const t = 1 - (Math.sqrt(d2) - this.fogInner) / (this.fogRadius - this.fogInner);
    const r = ((base) & 0xff) * t;
    const g = ((base >>> 8) & 0xff) * t;
    const b = ((base >>> 16) & 0xff) * t;
    return rgb(r | 0, g | 0, b | 0);
  }

  paintRect(x0, y0, x1, y1, state) {
    const ax = Math.max(0, x0);
    const ay = Math.max(0, y0);
    const bx = Math.min(FIELD_W - 1, x1);
    const by = Math.min(FIELD_H - 1, y1);
    for (let y = ay; y <= by; y++) {
      const row = y * FIELD_W;
      for (let x = ax; x <= bx; x++) this.pixels[row + x] = this.colorAt(x, y, state);
    }
  }

  /** Full repaint. Runs once, on generation, behind the countdown. */
  paintAll(state) {
    this.paintRect(0, 0, FIELD_W - 1, FIELD_H - 1, state);
    this.last = { playerIdx: state.playerIdx, blink: state.blink };
    return [{ x: 0, y: 0, w: FIELD_W, h: FIELD_H }];
  }

  /**
   * Repaint only what changed and return the rects touched.
   *
   * Without fog that is a couple of single pixels a frame. With fog the lit disc
   * travels with the player, so the dirty area is the box enclosing the old and
   * new discs — a few tens of thousands of pixels, still nothing.
   */
  paintFrame(state, collapsed = []) {
    const rects = [];
    const moved = state.playerIdx !== this.last.playerIdx;
    const blinked = state.blink !== this.last.blink;

    // Under fog the disc is repainted every frame, not only when the player moves
    // or blinks: the false blinks (§8.4) run on their own phases and have to be
    // animated. Everything outside the disc is black anyway, so this is the whole
    // cost of them. Blink decoys therefore require fog — without it they would
    // need a full-field repaint per frame.
    if (Number.isFinite(this.fogRadius)) {
      rects.push(discBox(this.last.playerIdx, this.fogRadius, state.playerIdx));
    } else {
      if (moved && this.last.playerIdx >= 0) rects.push(pixelRect(this.last.playerIdx));
      if (moved || blinked) rects.push(pixelRect(state.playerIdx));
    }

    if (collapsed.length > 0) rects.push(boundsOf(collapsed));

    for (const r of rects) this.paintRect(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1, state);
    this.last = { playerIdx: state.playerIdx, blink: state.blink };
    return rects;
  }
}

function pixelRect(idx) {
  return { x: idx % FIELD_W, y: (idx / FIELD_W) | 0, w: 1, h: 1 };
}

/** Box enclosing the fog discs at two positions. */
function discBox(aIdx, radius, bIdx) {
  const pts = [bIdx, aIdx].filter((i) => i >= 0);
  const xs = pts.map((i) => i % FIELD_W);
  const ys = pts.map((i) => (i / FIELD_W) | 0);
  const x = Math.max(0, Math.min(...xs) - radius - 1);
  const y = Math.max(0, Math.min(...ys) - radius - 1);
  const x1 = Math.min(FIELD_W - 1, Math.max(...xs) + radius + 1);
  const y1 = Math.min(FIELD_H - 1, Math.max(...ys) + radius + 1);
  return { x, y, w: x1 - x + 1, h: y1 - y + 1 };
}

function boundsOf(indices) {
  let minX = FIELD_W, minY = FIELD_H, maxX = 0, maxY = 0;
  for (const idx of indices) {
    const x = idx % FIELD_W;
    const y = (idx / FIELD_W) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// ── Canvas binding ──────────────────────────────────────────────────────────

/**
 * Bind a framebuffer to a canvas at exactly one device pixel per maze cell.
 *
 * The backing store is always 1920x1080; the CSS size is divided by
 * devicePixelRatio so that on a 2x display the field occupies 960x540 CSS px —
 * physically small, pixel-exact, and correct. Scaling it up to "fill the screen"
 * would destroy the game.
 */
export function createCanvasSink(canvas, renderer) {
  canvas.width = FIELD_W;
  canvas.height = FIELD_H;

  const dpr = globalThis.devicePixelRatio || 1;
  canvas.style.width = `${FIELD_W / dpr}px`;
  canvas.style.height = `${FIELD_H / dpr}px`;
  canvas.style.imageRendering = 'pixelated';

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const image = new ImageData(renderer.bytes, FIELD_W, FIELD_H);

  return {
    ctx,
    blit(rects) {
      for (const r of rects) ctx.putImageData(image, 0, 0, r.x, r.y, r.w, r.h);
    },
    /** True if any rect overlapped the HUD, meaning it needs redrawing too. */
    touchedHud(rects) {
      return rects.some((r) =>
        r.x < HUD_X0 + HUD_W && r.x + r.w > HUD_X0 &&
        r.y < HUD_Y0 + HUD_H && r.y + r.h > HUD_Y0);
    },
  };
}

// ── Excruciating control display ───────────────────────────────────────────────

/**
 * The compass cross in the bottom-right (DESIGN.md §8.1).
 *
 * It is drawn straight onto the 2D context rather than into the framebuffer
 * because the block it occupies is generated as solid wall and never holds
 * playable space — so this can never occlude anything that matters.
 *
 * `mapping` is direction -> key label, e.g. { up: 'W', down: 'S', ... }. It is
 * reassigned at random and shown with no announcement, no flash and no
 * transition. The information is always on screen and always true; the cost is
 * the attention it takes to read it.
 */
export function drawHud(ctx, mapping) {
  const cx = HUD_X0 + HUD_W / 2;
  const cy = HUD_Y0 + HUD_H / 2;

  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(HUD_X0, HUD_Y0, HUD_W, HUD_H);
  ctx.strokeStyle = '#404040';
  ctx.lineWidth = 1;
  ctx.strokeRect(HUD_X0 + 0.5, HUD_Y0 + 0.5, HUD_W - 1, HUD_H - 1);

  ctx.font = '600 20px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const arms = [
    { dir: 'up', glyph: '▲', dx: 0, dy: -1 },
    { dir: 'down', glyph: '▼', dx: 0, dy: 1 },
    { dir: 'left', glyph: '◀', dx: -1, dy: 0 },
    { dir: 'right', glyph: '▶', dx: 1, dy: 0 },
  ];

  for (const { dir, glyph, dx, dy } of arms) {
    ctx.fillStyle = '#787878';
    ctx.fillText(glyph, cx + dx * 30, cy + dy * 30);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillText(mapping[dir] ?? '?', cx + dx * 58, cy + dy * 52);
  }
  ctx.restore();
}
