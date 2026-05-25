import React, { useEffect, useRef } from 'react';

const TILE_SRC = '/sprites/puny_dungeon.png';
const TILE_PX  = 16;   // source tile size in px
const SHEET_COLS = 26; // tiles per row in the sheet
const SCALE    = 3;    // render at 3× (48px per tile)
const DRAW_PX  = TILE_PX * SCALE;

// Gray stone floor tiles from the Puny Dungeon tileset (CC0)
const FLOOR   = [3, 4, 5];
const ACCENTS = [29, 30, 31];
const DETAILS = [0, 1, 2];

function tilePos(idx) {
  return {
    sx: (idx % SHEET_COLS) * TILE_PX,
    sy: Math.floor(idx / SHEET_COLS) * TILE_PX,
  };
}

// Deterministic per-cell random, stable across re-renders
function seeded(tx, ty) {
  let n = tx * 1619 + ty * 31337;
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  return ((n >> 16) ^ n) >>> 0;
}

function pick(arr, s) { return arr[s % arr.length]; }

export default function DungeonBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = TILE_SRC;

    function draw() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const tilesX = Math.ceil(canvas.width  / DRAW_PX) + 1;
      const tilesY = Math.ceil(canvas.height / DRAW_PX) + 1;

      ctx.globalAlpha = 0.20;
      for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
          const s   = seeded(tx, ty);
          const roll = s % 100;

          const idx = roll < 68
            ? pick(FLOOR,   s)
            : roll < 90
              ? pick(ACCENTS, s >> 3)
              : pick(DETAILS, s >> 6);

          const { sx, sy } = tilePos(idx);
          ctx.drawImage(img, sx, sy, TILE_PX, TILE_PX, tx * DRAW_PX, ty * DRAW_PX, DRAW_PX, DRAW_PX);
        }
      }

      // Vignette: darker at edges, open in the centre
      ctx.globalAlpha = 1;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r  = Math.max(canvas.width, canvas.height) * 0.75;
      const grad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
      grad.addColorStop(0, 'rgba(8,10,13,0)');
      grad.addColorStop(1, 'rgba(8,10,13,0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Torch glows in top corners
      const torchR = Math.min(canvas.width, canvas.height) * 0.38;
      const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, torchR);
      g1.addColorStop(0, 'rgba(255,140,30,0.11)');
      g1.addColorStop(1, 'rgba(255,140,30,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const g2 = ctx.createRadialGradient(canvas.width, 0, 0, canvas.width, 0, torchR);
      g2.addColorStop(0, 'rgba(255,140,30,0.09)');
      g2.addColorStop(1, 'rgba(255,140,30,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    img.onload = draw;
    if (img.complete) draw();

    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        imageRendering: 'pixelated',
      }}
    />
  );
}
