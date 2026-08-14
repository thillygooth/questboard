// Deterministic PRNG. Nothing in this project may call Math.random(): a run must
// be exactly reproducible from (seed, mode, input ticks) so that leaderboard
// entries can be revalidated by replay. See DESIGN.md §12.

/** mulberry32 — small, fast, good enough for maze generation. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a. Turns "2026-08-14:hard" into a seed integer. */
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** The seed everyone in the world plays on a given date, for a given mode. */
export function dailySeed(isoDate, mode) {
  return hashString(`${isoDate}:${mode}`);
}

/** Integer in [0, n). */
export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

/** Integer in [lo, hi], inclusive. */
export function randRange(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
