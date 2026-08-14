// Input handling and the Hard-mode control reassignment. See DESIGN.md §7 and §8.1.
//
// Three policies, one per mode:
//
//   free    Easy. A held key steps the pixel. Pressing into a wall is death,
//           because moving into a wall is death — but you can always just stop.
//   buffer1 Medium. A pressed direction survives one move looking for a chance
//           to be applied, then is dropped. Never fatal by itself.
//   strict  Hard. A direction pressed into a wall kills you on the spot. The
//           turn lands on the exact move or not at all.

export const DIRS = ['up', 'down', 'left', 'right'];

export const DELTA = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Physical keys the game listens to, normalised to an arrow glyph. */
export const KEY_GLYPH = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  KeyW: '↑', KeyS: '↓', KeyA: '←', KeyD: '→',
};

export const IDENTITY_MAPPING = { up: '↑', down: '↓', left: '←', right: '→' };

/**
 * Direction -> the key glyph that produces it. The HUD renders this directly,
 * so "▲ ←" reads as "to go up, press left".
 */
export class Controls {
  constructor(mode, rng, totalMs = 600_000) {
    this.mode = mode;
    this.mapping = { ...IDENTITY_MAPPING };
    this.schedule = [];

    if (mode.remapControls) {
      const { minMs, maxMs, cooldownMs } = mode.remapControls;
      let t = minMs + rng() * (maxMs - minMs);
      let previous = this.mapping;
      while (t < totalMs) {
        const next = permute(rng, previous);
        this.schedule.push({ atMs: t, mapping: next });
        previous = next;
        t += Math.max(cooldownMs, minMs + rng() * (maxMs - minMs));
      }
    }
    this.nextChange = 0;
  }

  /** Apply any reassignment due by `elapsedMs`. Returns true if it changed. */
  update(elapsedMs) {
    let changed = false;
    while (this.nextChange < this.schedule.length && this.schedule[this.nextChange].atMs <= elapsedMs) {
      this.mapping = this.schedule[this.nextChange].mapping;
      this.nextChange++;
      changed = true;
    }
    return changed;
  }

  /** Which direction a physical key currently produces. */
  directionFor(code) {
    const glyph = KEY_GLYPH[code];
    if (!glyph) return null;
    return DIRS.find((d) => this.mapping[d] === glyph) ?? null;
  }
}

/**
 * A derangement-ish shuffle: never the identity, and never equal to what it just
 * replaced — a "change" the player cannot detect is worse than no change at all.
 */
function permute(rng, previous) {
  const glyphs = DIRS.map((d) => IDENTITY_MAPPING[d]);
  for (let attempt = 0; attempt < 50; attempt++) {
    const pool = glyphs.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const candidate = Object.fromEntries(DIRS.map((d, i) => [d, pool[i]]));
    const isIdentity = DIRS.every((d) => candidate[d] === IDENTITY_MAPPING[d]);
    const isSame = DIRS.every((d) => candidate[d] === previous[d]);
    if (!isIdentity && !isSame) return candidate;
  }
  return { up: '↓', down: '↑', left: '→', right: '←' };
}
