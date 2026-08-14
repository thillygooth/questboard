// The magnifying glass. See DESIGN.md §2.
//
// A 1920x1080 field of 1px maze at 1:1 is legible in principle and miserable in
// practice — it reads as fine grey noise. The glass is what makes the field
// actually readable: a lens that follows the mouse and magnifies what is under
// it, with the optical faults of a real one.
//
//   UNPLEASANT    clean glass, mild barrel distortion
//   MISERABLE     stronger distortion, and it is filthy
//   EXCRUCIATING   no glass. Use a real one.
//
// The mouse is a viewing device and nothing else. It never touches the
// simulation, so a run is still fully described by (seed, mode, input ticks) and
// replay validation (§12) is unaffected.
//
// Pure: pixels in, pixels out, no DOM. tools/lens.js renders it to PNG offline.

import { mulberry32 } from './rng.js';

const TRANSPARENT = 0;

/** Packed 0xAABBGGRR, matching ImageData's byte order. */
const rgba = (r, g, b, a = 255) => (((a << 24) | (b << 16) | (g << 8) | r) >>> 0);

export class Lens {
  constructor(config, seed = 1) {
    this.config = config;
    this.radius = config.radius;
    this.size = config.radius * 2 + 1;
    this.out = new Uint32Array(this.size * this.size);
    this.grime = config.dirt ? buildGrime(config, seed, this.size) : null;
  }

  /**
   * Sample `src` through the lens centred on (cx, cy) and return a square RGBA
   * buffer of side `this.size`, transparent outside the glass.
   *
   * Sampling is nearest-neighbour on purpose. This is a game about individual
   * pixels; any interpolation would invent corridors that are not there.
   */
  render(src, srcW, srcH, cx, cy) {
    const { radius, size, out } = this;
    const { magnification: mag, distortion: k } = this.config;
    const r2 = radius * radius;

    for (let py = -radius; py <= radius; py++) {
      for (let px = -radius; px <= radius; px++) {
        const i = (py + radius) * size + (px + radius);
        const d2 = px * px + py * py;
        if (d2 > r2) { out[i] = TRANSPARENT; continue; }

        // Barrel distortion: the sampling reach grows with radius, so the centre
        // is magnified hardest and the rim compresses — which is what a real
        // lens does and why the edge of one is useless for reading anything.
        const rn = Math.sqrt(d2) / radius;
        const scale = (1 + k * rn * rn) / mag;

        // No chromatic aberration here, and that is a finding rather than an
        // omission. It was built, and on 1px binary detail it does not fringe
        // edges — it decorrelates the channels completely. At the rim the
        // per-channel offset works out around 4.6px against a maze whose
        // features are 1px, so red, green and blue sample unrelated corridors
        // and the glass fills with full-saturation confetti. It destroys the
        // information instead of degrading it. Grime is the honest way to make
        // glass bad: it costs contrast without inventing detail.
        let colour = sample(src, srcW, srcH, cx + px * scale, cy + py * scale);

        if (this.grime) colour = applyGrime(colour, this.grime[i]);
        out[i] = vignette(colour, rn);
      }
    }
    return out;
  }
}

/** Nearest-neighbour fetch, clamped to the field. */
function sample(src, srcW, srcH, x, y) {
  const sx = Math.round(x);
  const sy = Math.round(y);
  if (sx < 0 || sy < 0 || sx >= srcW || sy >= srcH) return rgba(0, 0, 0);
  return src[sy * srcW + sx] | 0xff000000;
}

/**
 * Grime: a few soft smudges plus scattered specks, baked once. Smudges wash out
 * contrast, which on a black-and-white maze is exactly the damage that hurts —
 * it does not hide the maze, it makes you work to resolve it.
 */
function buildGrime(config, seed, size) {
  const rng = mulberry32((seed ^ 0x7f4a7c15) >>> 0);
  const map = new Float32Array(size * size);
  const { smudges = 7, specks = 90 } = config.dirt;

  for (let s = 0; s < smudges; s++) {
    const cx = rng() * size;
    const cy = rng() * size;
    const rad = size * (0.10 + rng() * 0.22);
    const strength = 0.25 + rng() * 0.45;
    const r2 = rad * rad;
    for (let y = Math.max(0, cy - rad | 0); y < Math.min(size, cy + rad); y++) {
      for (let x = Math.max(0, cx - rad | 0); x < Math.min(size, cx + rad); x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 > r2) continue;
        const falloff = 1 - d2 / r2;
        map[y * size + x] += strength * falloff * falloff;
      }
    }
  }

  for (let s = 0; s < specks; s++) {
    const cx = (rng() * size) | 0;
    const cy = (rng() * size) | 0;
    const rad = rng() < 0.75 ? 1 : 2;
    for (let y = cy - rad; y <= cy + rad; y++) {
      for (let x = cx - rad; x <= cx + rad; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        map[y * size + x] = Math.min(1.6, map[y * size + x] + 0.9);
      }
    }
  }

  const out = new Float32Array(map.length);
  for (let i = 0; i < map.length; i++) out[i] = Math.min(1, map[i]);
  return out;
}

const GRIME_R = 118;
const GRIME_G = 112;
const GRIME_B = 96;

function applyGrime(colour, amount) {
  if (amount <= 0) return colour;
  const a = amount * 0.85;
  const r = (colour & 0xff) * (1 - a) + GRIME_R * a;
  const g = ((colour >>> 8) & 0xff) * (1 - a) + GRIME_G * a;
  const b = ((colour >>> 16) & 0xff) * (1 - a) + GRIME_B * a;
  return rgba(r | 0, g | 0, b | 0);
}

/** Darken the last stretch toward the rim, so the glass reads as an object. */
function vignette(colour, rn) {
  if (rn < 0.86) return colour;
  const t = 1 - ((rn - 0.86) / 0.14) * 0.75;
  return rgba(
    ((colour & 0xff) * t) | 0,
    (((colour >>> 8) & 0xff) * t) | 0,
    (((colour >>> 16) & 0xff) * t) | 0,
  );
}

// ── Browser binding ─────────────────────────────────────────────────────────

/**
 * The glass lives on its own canvas stacked over the field, cleared and redrawn
 * each frame. Keeping it off the field canvas matters: the field is painted by
 * dirty rectangles that only know about the player, the fog and collapse, and a
 * lens smeared into that buffer would leave a trail nothing was tracking.
 */
export function createLensLayer(canvas, lens, fieldW, fieldH) {
  canvas.width = fieldW;
  canvas.height = fieldH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const image = new ImageData(new Uint8ClampedArray(lens.out.buffer), lens.size, lens.size);
  let previous = null;

  return {
    draw(srcPixels, cx, cy) {
      if (previous) ctx.clearRect(previous.x, previous.y, lens.size, lens.size);
      lens.render(srcPixels, fieldW, fieldH, Math.round(cx), Math.round(cy));

      const x = Math.round(cx) - lens.radius;
      const y = Math.round(cy) - lens.radius;
      ctx.putImageData(image, x, y);

      // Rim, drawn after the glass so it sits on top of the vignette.
      ctx.save();
      ctx.strokeStyle = 'rgba(210,210,210,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.round(cx), Math.round(cy), lens.radius - 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      previous = { x, y };
    },
    clear() {
      if (previous) ctx.clearRect(previous.x, previous.y, lens.size, lens.size);
      previous = null;
    },
  };
}
