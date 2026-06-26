import React, { useEffect, useRef } from 'react';

const NEAR_IMG_SIZE = 224; // near.png original px (square)

// Each parallax layer scrolls exactly ONE tile-width per cycle, so it loops
// seamlessly at any viewport size. Tile width = aspect * viewport height, so
// the scroll distance is expressed in vh and stays correct on resize.
// `perTile` is the original full-loop duration / 100 (every layer scrolled
// 100 tiles over its old duration). Animating transform (not background-position)
// keeps each layer on its own GPU compositor layer: no per-frame repaint, and
// the colour `filter` is rasterised into the texture once instead of every frame.
const LAYERS = [
  { name: 'back',       perTile: '24s',    aspect: 32 / 224,  filter: 'hue-rotate(150deg) saturate(0.9) brightness(0.30)' },
  { name: 'far',        perTile: '10.6s',  aspect: 32 / 224,  filter: 'hue-rotate(150deg) saturate(0.9) brightness(0.30)' },
  { name: 'middle',     perTile: '13.75s', aspect: 80 / 224,  filter: 'hue-rotate(150deg) saturate(0.9) brightness(0.35)' },
  { name: 'near',       perTile: '20.7s',  aspect: 224 / 224, filter: 'saturate(0.8) brightness(0.38)'                    },
  { name: 'foreground', perTile: '12.25s', aspect: 224 / 224, filter: 'hue-rotate(150deg) saturate(0.4) brightness(0.10)' },
];

const KEYFRAMES = LAYERS.map(l =>
  `@keyframes scroll-${l.name}{from{transform:translate3d(0,0,0)}` +
  `to{transform:translate3d(-${(l.aspect * 100).toFixed(4)}vh,0,0)}}`
).join('\n');

// Torch scroll is locked to the near layer: one tile (= viewport height) per perTile.
const NEAR_TILE_SECONDS = 20.7;

const TORCH_CX_ORIG   = 146;
const TORCH_TY_ORIG   =  86;
const TORCH_SPRITE_PX = 32;
const TORCH_FRAMES    = 4;
const TORCH_FPS       = 6;

const APP_TORCH_Y = 70;
const APP_TORCH_DX = 58; // distance from each edge

function layerStyle({ name, perTile, aspect, filter }) {
  return {
    position: 'absolute', top: 0, left: 0, height: '100%',
    width: `calc(100vw + ${(aspect * 100).toFixed(4)}vh)`, // viewport + one extra tile of headroom
    backgroundImage: `url('/sprites/layers/${name}.png')`,
    backgroundRepeat: 'repeat-x',
    backgroundSize: 'auto 100%',
    backgroundPosition: '0 0',
    imageRendering: 'pixelated',
    filter,
    animation: `scroll-${name} ${perTile} linear infinite`,
    willChange: 'transform',
    zIndex: 0, pointerEvents: 'none',
  };
}

export default function DungeonBackground() {
  const torchRef = useRef(null);
  const fxRef    = useRef(null);
  const sfxRef   = useRef(null);
  const stateRef = useRef({ parts: [], rafId: null, torchImg: null, startTime: null });

  useEffect(() => {
    const s       = stateRef.current;
    const tCanvas = torchRef.current;
    const fCanvas = fxRef.current;
    const sCanvas = sfxRef.current;
    const tCtx    = tCanvas.getContext('2d');
    const fCtx    = fCanvas.getContext('2d');
    const sCtx    = sCanvas.getContext('2d');

    // Static lighting (vignette + side walls + torch glows). Drawn once per
    // resize onto its own canvas; never touched by the animation loop.
    function drawStaticFX() {
      const w = sCanvas.width;
      const h = sCanvas.height;
      sCtx.clearRect(0, 0, w, h);

      const cx = w / 2, cy = h / 2;
      const r  = Math.max(w, h) * 0.68;
      const vig = sCtx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
      vig.addColorStop(0,   'rgba(6,5,10,0)');
      vig.addColorStop(0.5, 'rgba(6,5,10,0.45)');
      vig.addColorStop(0.8, 'rgba(4,3,8,0.78)');
      vig.addColorStop(1,   'rgba(2,1,5,0.97)');
      sCtx.fillStyle = vig; sCtx.fillRect(0, 0, w, h);

      const wallW = 160;
      const gL = sCtx.createLinearGradient(0, 0, wallW, 0);
      gL.addColorStop(0, 'rgba(2,1,5,0.92)'); gL.addColorStop(1, 'rgba(2,1,5,0)');
      sCtx.fillStyle = gL; sCtx.fillRect(0, 0, wallW, h);

      const gR = sCtx.createLinearGradient(w, 0, w - wallW, 0);
      gR.addColorStop(0, 'rgba(2,1,5,0.92)'); gR.addColorStop(1, 'rgba(2,1,5,0)');
      sCtx.fillStyle = gR; sCtx.fillRect(w - wallW, 0, wallW, h);

      const glowR = Math.min(w, h) * 0.42;
      const gGL = sCtx.createRadialGradient(APP_TORCH_DX, APP_TORCH_Y, 0, APP_TORCH_DX, APP_TORCH_Y, glowR);
      gGL.addColorStop(0, 'rgba(255,140,30,0.08)'); gGL.addColorStop(0.35, 'rgba(200,90,10,0.03)'); gGL.addColorStop(1, 'rgba(255,140,30,0)');
      sCtx.fillStyle = gGL; sCtx.fillRect(0, 0, w, h);

      const rxT = w - APP_TORCH_DX;
      const gGR = sCtx.createRadialGradient(rxT, APP_TORCH_Y, 0, rxT, APP_TORCH_Y, glowR);
      gGR.addColorStop(0, 'rgba(255,140,30,0.08)'); gGR.addColorStop(0.35, 'rgba(200,90,10,0.03)'); gGR.addColorStop(1, 'rgba(255,140,30,0)');
      sCtx.fillStyle = gGR; sCtx.fillRect(0, 0, w, h);
    }

    function resize() {
      tCanvas.width  = fCanvas.width  = sCanvas.width  = window.innerWidth;
      tCanvas.height = fCanvas.height = sCanvas.height = window.innerHeight;
      drawStaticFX();
    }

    function draw(ts) {
      if (!s.startTime) s.startTime = ts;
      const elapsed = (ts - s.startTime) / 1000;
      const w = fCanvas.width;
      const h = fCanvas.height;

      // ── Torch canvas — scroll locked to the near layer ────────────────
      tCtx.imageSmoothingEnabled = false; // must re-set each frame; resize() resets context state
      tCtx.clearRect(0, 0, w, h);

      if (s.torchImg) {
        const scale    = h / NEAR_IMG_SIZE;
        const tileW    = NEAR_IMG_SIZE * scale; // = h (square asset)
        const speed    = h / NEAR_TILE_SECONDS; // px/s, matches near layer at any height
        const offset   = (elapsed * speed) % tileW;
        const frameIdx = Math.floor(elapsed * TORCH_FPS) % TORCH_FRAMES;
        const dw       = TORCH_SPRITE_PX * scale;
        const dh       = TORCH_SPRITE_PX * scale;
        const tx       = TORCH_CX_ORIG * scale - dw / 2;
        const ty       = TORCH_TY_ORIG * scale;
        for (let n = -1; n <= Math.ceil(w / tileW) + 1; n++) {
          tCtx.drawImage(s.torchImg, frameIdx * 32, 0, 32, 32,
            Math.floor(n * tileW + tx - offset), Math.floor(ty),
            Math.ceil(dw), Math.ceil(dh));
        }
      }

      // ── FX canvas — embers only (static lighting lives on sCanvas) ─────
      fCtx.clearRect(0, 0, w, h);

      const torchXL = APP_TORCH_DX;
      const torchXR = w - APP_TORCH_DX;
      for (const torchX of [torchXL, torchXR]) {
        if (Math.random() < 0.14) {
          s.parts.push({
            x: torchX + (Math.random() - 0.5) * 14, y: APP_TORCH_Y,
            vx: (Math.random() - 0.5) * 0.7,
            vy: -(0.8 + Math.random() * 1.2),
            life: 1.0,
            decay: 0.018 + Math.random() * 0.02,
            size: 1.2 + Math.random() * 1.5,
          });
        }
      }
      for (let i = s.parts.length - 1; i >= 0; i--) {
        const p = s.parts[i];
        p.x += p.vx + (Math.random() - 0.5) * 0.18;
        p.y += p.vy;
        p.vy *= 0.98;
        p.life -= p.decay;
        if (p.life <= 0) { s.parts.splice(i, 1); continue; }
        fCtx.globalAlpha = p.life * 0.8;
        fCtx.fillStyle   = p.life > 0.55 ? '#ffd060' : p.life > 0.25 ? '#ff8020' : '#cc3000';
        fCtx.beginPath();
        fCtx.arc(p.x, p.y, p.size * Math.sqrt(p.life), 0, Math.PI * 2);
        fCtx.fill();
      }
      fCtx.globalAlpha = 1;

      s.rafId = requestAnimationFrame(draw);
    }

    resize();
    s.rafId = requestAnimationFrame(draw);

    const img = new window.Image();
    img.src = '/sprites/layers/torch-sheet.png';
    img.onload  = () => { s.torchImg = img; };
    img.onerror = () => console.warn('DungeonBackground: torch-sheet failed to load');

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(s.rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const canvasStyle = (zIndex) => ({
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    zIndex, pointerEvents: 'none',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      <style>{KEYFRAMES}</style>
      <div style={{ position:'absolute', inset:0, backgroundColor:'#06050a', zIndex:0 }} />
      {LAYERS.slice(0, 4).map(l => <div key={l.name} style={layerStyle(l)} />)}
      <canvas ref={torchRef} style={{ ...canvasStyle(0), imageRendering: 'pixelated' }} />
      {LAYERS.slice(4).map(l => <div key={l.name} style={layerStyle(l)} />)}
      <div style={{ position:'absolute', inset:0, backgroundColor:'rgba(0,0,0,0.35)', zIndex:0 }} />
      <canvas ref={sfxRef} style={canvasStyle(1)} />
      <canvas ref={fxRef}  style={canvasStyle(2)} />
    </div>
  );
}
