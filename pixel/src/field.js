// Field geometry. See DESIGN.md §2 and §3.
//
// The field is 1920 x 1080 device pixels. Walls are 1px, corridors are 1px.
// Corridor cells sit at odd coordinates; the pixels between them are the walls
// that the maze generator either carves through or leaves standing.
//
// ── A parity note, because 1920 and 1080 are even ────────────────────────────
// For the exit to be a single missing pixel in the border ring, the ring must be
// directly adjacent to a corridor cell on every edge. With corridors at odd x,
// that works at x=0 (adjacent to corridor x=1) but not at x=1919, because the
// last corridor column is x=1917 and x=1918 is a wall pixel in between — an exit
// there would be two pixels deep, and exits would only ever appear on the left
// and top edges. A player would learn that.
//
// So the active field is 1919 x 1079 with its border ring at x=0, x=1918, y=0,
// y=1078. Column 1919 and row 1079 are painted as wall and are simply extra
// border thickness on two edges. The wall reads as 2px there instead of 1px,
// which is invisible at this scale, and all four edges can host the exit.
//
// Winning is entering the gap pixel, so nothing beyond it ever matters.

export const FIELD_W = 1920;
export const FIELD_H = 1080;

// The active field: border ring inclusive.
export const ACTIVE_W = 1919;
export const ACTIVE_H = 1079;

// Border ring coordinates.
export const RING_MIN_X = 0;
export const RING_MAX_X = ACTIVE_W - 1; // 1918
export const RING_MIN_Y = 0;
export const RING_MAX_Y = ACTIVE_H - 1; // 1078

// Corridor lattice: cell (lx, ly) lives at pixel (2*lx+1, 2*ly+1).
export const LAT_W = 959; // px 1 .. 1917
export const LAT_H = 539; // px 1 .. 1077

// Bottom-right block held as solid wall so the Excruciating control HUD never
// occludes playable space (DESIGN.md §8.1).
export const HUD_W = 240;
export const HUD_H = 140;
export const HUD_X0 = FIELD_W - HUD_W; // 1680
export const HUD_Y0 = FIELD_H - HUD_H; // 940

// Grid cell values.
export const WALL = 0;
export const CORRIDOR = 1;

export const px = (lx) => 2 * lx + 1;
export const latIndex = (lx, ly) => ly * LAT_W + lx;
export const pixIndex = (x, y) => y * FIELD_W + x;

/** True if a lattice cell falls inside the HUD reserve and must stay wall. */
export function inHudReserve(lx, ly) {
  return px(lx) >= HUD_X0 && px(ly) >= HUD_Y0;
}

/**
 * Lattice cells touching the border ring, i.e. candidates for the spawn and the
 * exit. A cell at lx=0 sits at pixel x=1, adjacent to the ring at x=0; a cell at
 * lx=LAT_W-1 sits at x=1917, adjacent to the ring at x=1918.
 */
export function borderSide(lx, ly) {
  if (ly === 0) return 'top';
  if (ly === LAT_H - 1) return 'bottom';
  if (lx === 0) return 'left';
  if (lx === LAT_W - 1) return 'right';
  return null;
}

export function isBorderAdjacent(lx, ly) {
  return borderSide(lx, ly) !== null;
}

/** The single ring pixel that a border-adjacent lattice cell opens onto. */
export function ringPixelFor(lx, ly) {
  const side = borderSide(lx, ly);
  switch (side) {
    case 'top': return { x: px(lx), y: RING_MIN_Y };
    case 'bottom': return { x: px(lx), y: RING_MAX_Y };
    case 'left': return { x: RING_MIN_X, y: px(ly) };
    case 'right': return { x: RING_MAX_X, y: px(ly) };
    default: return null;
  }
}
