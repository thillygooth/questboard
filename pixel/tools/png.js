// Minimal indexed-colour PNG encoder, for looking at generated fields offline.
// Not part of the game — the game renders to a canvas. This exists so that
// `npm run preview` can produce something a human can actually inspect.

import { deflateSync } from 'node:zlib';

export const PALETTE = [
  [0x00, 0x00, 0x00], // 0 corridor
  [0xff, 0xff, 0xff], // 1 wall
  [0x00, 0xff, 0x40], // 2 spawn
  [0xff, 0x20, 0x20], // 3 exit
  [0xff, 0xa0, 0x00], // 4 decoy
  [0x30, 0x60, 0xff], // 5 solution path
  [0x60, 0x00, 0x90], // 6 player region tint
];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/**
 * Encode `indices` (Uint8Array of palette indices, width*height) as a PNG.
 */
export function encodePng(indices, width, height, palette = PALETTE) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // colour type: indexed
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const plte = Buffer.alloc(palette.length * 3);
  palette.forEach(([r, g, b], i) => {
    plte[i * 3] = r;
    plte[i * 3 + 1] = g;
    plte[i * 3 + 2] = b;
  });

  // One filter byte (0 = none) per scanline.
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0;
    Buffer.from(indices.buffer, indices.byteOffset + y * width, width)
      .copy(raw, y * (width + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Nearest-neighbour crop-and-zoom, so 1px detail survives being looked at. */
export function zoom(indices, width, cropX, cropY, cropW, cropH, factor) {
  const out = new Uint8Array(cropW * factor * cropH * factor);
  for (let y = 0; y < cropH * factor; y++) {
    const sy = cropY + ((y / factor) | 0);
    for (let x = 0; x < cropW * factor; x++) {
      const sx = cropX + ((x / factor) | 0);
      out[y * cropW * factor + x] = indices[sy * width + sx];
    }
  }
  return out;
}
