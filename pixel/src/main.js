// Browser shell: screens, the animation loop, and the wiring between the
// simulation, the renderer and the leaderboard. See DESIGN.md §10.
//
// Everything that decides anything lives elsewhere. This file owns no rules.

import { MODE_IDS, getMode } from './modes.js';
import { generateField } from './maze.js';
import { Game, STATE, TICK_HZ } from './game.js';
import { FieldRenderer, createCanvasSink, drawHud, blinkOn } from './render.js';
import { Lens, createLensLayer } from './lens.js';
import { dailySeed } from './rng.js';
import { Sonar } from './audio.js';
import { hasPlayedToday, recordRun, boardsFor, allTime, todayIso, stats } from './board.js';
import { FIELD_W, FIELD_H } from './field.js';

const MS_PER_TICK = 1000 / TICK_HZ;
const $ = (id) => document.getElementById(id);
const screens = ['menu', 'rules', 'board', 'result'];

let game = null;
let renderer = null;
let sink = null;
let sonar = null;
let glass = null;
let raf = 0;

// Where the magnifying glass is pointed, in field pixels. The mouse is a viewing
// device only — it never reaches the simulation, so replay validation (§12) is
// unaffected by it.
let lensAt = { x: FIELD_W / 2, y: FIELD_H / 2 };
let lastMapping = '';
let current = { mode: null, ranked: true, seed: 0, par: 0 };

function show(name) {
  for (const s of screens) $(s).classList.toggle('hidden', s !== name);
  $('overlay').classList.toggle('hidden', name === null);
  $('hud').classList.toggle('hidden', name !== null);
}

const fmt = (n) => n.toLocaleString('en-US');
const secs = (ms) => `${(ms / 1000).toFixed(2)}s`;

// ── Starting a run ──────────────────────────────────────────────────────────

function begin(modeId, ranked) {
  const mode = getMode(modeId);
  const isoDate = todayIso();

  if (ranked && hasPlayedToday(modeId, isoDate)) {
    $('menu-note').textContent = `${mode.name} is spent for today. One life. Free Play is unlimited.`;
    return;
  }

  const seed = ranked ? dailySeed(isoDate, modeId) : (Math.random() * 2 ** 32) >>> 0;
  const field = generateField(seed, mode);

  current = { mode, ranked, seed, isoDate, par: 0 };
  game = new Game(field, mode, { seed });
  current.par = game.startDistance;

  renderer = new FieldRenderer(field, mode);
  sink = createCanvasSink($('field'), renderer);
  sonar = new Sonar(mode.sonar);
  sonar.start();

  // Start the glass over the player, so there is something to look at before the
  // mouse has moved at all.
  lensAt = { x: game.idx % FIELD_W, y: (game.idx / FIELD_W) | 0 };
  glass = mode.lens
    ? createLensLayer($('lens'), new Lens(mode.lens, seed), FIELD_W, FIELD_H)
    : null;
  if (!mode.lens) $('lens').getContext('2d').clearRect(0, 0, FIELD_W, FIELD_H);
  document.body.classList.toggle('playing', Boolean(mode.lens));

  const rects = renderer.paintAll({ playerIdx: game.idx, blink: true, t: 0 });
  sink.blit(rects);
  if (mode.remapControls) {
    drawHud(sink.ctx, game.controls.mapping);
    lastMapping = JSON.stringify(game.controls.mapping);
  }

  show(null);
  cancelAnimationFrame(raf);
  let last = performance.now();
  let acc = 0;

  const frame = (now) => {
    acc += Math.min(now - last, 250); // a stalled tab must not fast-forward a run
    last = now;

    const collapsed = [];
    while (acc >= MS_PER_TICK && !game.finished) {
      game.tick();
      acc -= MS_PER_TICK;
      if (game.collapsed.length > 0) collapsed.push(...game.collapsed);
    }

    const snap = game.snapshot();
    const painted = renderer.paintFrame(
      { playerIdx: snap.playerIdx, blink: blinkOn(snap.runMs), t: snap.runMs },
      collapsed,
    );
    sink.blit(painted);

    if (mode.remapControls) {
      const now2 = JSON.stringify(snap.mapping);
      if (now2 !== lastMapping || sink.touchedHud(painted)) {
        drawHud(sink.ctx, snap.mapping);
        lastMapping = now2;
      }
    }

    // The glass is drawn after the field, from the field's own pixels, so it
    // magnifies exactly what is really there — blink, false blinks and all.
    glass?.draw(renderer.pixels, lensAt.x, lensAt.y);

    sonar?.update(snap);
    updateHud(snap);

    if (game.finished) return finish();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

function updateHud(snap) {
  $('hud-time').textContent = snap.state === STATE.COUNTDOWN ? '—' : secs(snap.runMs);
  $('hud-moves').textContent = fmt(snap.moves);
  $('hud-speed').textContent = `${snap.speed} px/s`;
}

// ── Ending a run ────────────────────────────────────────────────────────────

function finish() {
  cancelAnimationFrame(raf);
  sonar?.stop();
  glass?.clear();
  glass = null;
  document.body.classList.remove('playing');

  const won = game.state === STATE.WON;
  const record = {
    modeId: current.mode.id,
    isoDate: current.isoDate,
    seed: current.seed,
    ranked: current.ranked,
    escaped: won,
    timeMs: Math.round(game.runMs),
    moves: game.moves,
    par: current.par,
    closest: game.closest,
  };
  recordRun(record);

  $('result-title').textContent = won ? 'YOU WIN' : 'YOU LOSE';
  $('result-title').className = won ? 'win' : 'lose';

  const lines = [];
  if (won) {
    lines.push(`${secs(record.timeMs)}`);
    lines.push(`${fmt(record.moves)} moves against a par of ${fmt(record.par)}`);
    if (record.moves === record.par) lines.push('a perfect route');
  } else {
    lines.push(game.cause);
    lines.push(`${fmt(record.moves)} moves, ${secs(record.timeMs)}`);
    const closed = record.par - record.closest;
    lines.push(`closest approach: ${fmt(record.closest)} moves from the exit — you closed ${fmt(closed)} of ${fmt(record.par)}`);
  }
  if (current.ranked) lines.push(`${current.mode.name} is spent until tomorrow.`);
  else lines.push('Free Play — unranked, unlimited.');

  $('result-body').innerHTML = lines.map((l) => `<p>${l}</p>`).join('');
  show('result');
}

// ── Screens ─────────────────────────────────────────────────────────────────

function renderMenu() {
  const s = stats();
  $('menu-stats').textContent = s.total === 0
    ? 'No runs yet.'
    : `${fmt(s.escapes)} escaped, ${fmt(s.deaths)} died, ${fmt(s.total)} attempts.`;

  $('modes').innerHTML = MODE_IDS.map((id) => {
    const mode = getMode(id);
    const spent = hasPlayedToday(id);
    return `<div class="mode">
      <div class="mode-head"><b>${mode.name}</b><span>${mode.tagline}</span></div>
      <div class="mode-actions">
        <button data-mode="${id}" data-ranked="1" ${spent ? 'disabled' : ''}>
          ${spent ? 'spent today' : 'Begin — one life'}
        </button>
        <button data-mode="${id}" data-ranked="0" class="ghost">Free Play</button>
      </div>
    </div>`;
  }).join('');
  $('menu-note').textContent = '';
}

function renderBoard() {
  const iso = todayIso();
  $('board-body').innerHTML = MODE_IDS.map((id) => {
    const mode = getMode(id);
    const { escapes, progress } = boardsFor(id, iso);
    const best = allTime(id);
    const rows = escapes.length > 0
      ? escapes.map((r, i) => `<tr><td>${i + 1}</td><td>${secs(r.timeMs)}</td><td>${fmt(r.moves)} moves</td></tr>`).join('')
      : progress.map((r, i) => `<tr class="dim"><td>${i + 1}</td><td>${fmt(r.closest)} from the exit</td><td>${r.escaped ? '' : 'died'}</td></tr>`).join('');
    return `<section>
      <h3>${mode.name} <span class="dim">${escapes.length > 0 ? 'escapes' : 'closest approaches'} · ${iso}</span></h3>
      <table>${rows || '<tr class="dim"><td>—</td><td>nothing yet</td><td></td></tr>'}</table>
      <p class="dim">all-time best: ${best ? `${secs(best.timeMs)} on ${best.isoDate}` : 'none'}</p>
    </section>`;
  }).join('');
}

// ── Wiring ──────────────────────────────────────────────────────────────────

$('modes').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-mode]');
  if (btn && !btn.disabled) begin(btn.dataset.mode, btn.dataset.ranked === '1');
});

$('to-rules').onclick = () => show('rules');
$('to-board').onclick = () => { renderBoard(); show('board'); };
for (const id of ['rules-back', 'board-back', 'result-back']) {
  $(id).onclick = () => { renderMenu(); show('menu'); };
}

addEventListener('keydown', (e) => {
  if (!game || game.finished) return;
  if (e.code.startsWith('Arrow')) e.preventDefault();
  game.keyDown(e.code);
});
addEventListener('keyup', (e) => game?.keyUp(e.code));

addEventListener('mousemove', (e) => {
  const rect = $('field').getBoundingClientRect();
  if (rect.width === 0) return;
  lensAt = {
    x: (e.clientX - rect.left) * (FIELD_W / rect.width),
    y: (e.clientY - rect.top) * (FIELD_H / rect.height),
  };
});
addEventListener('blur', () => game?.blur());

renderMenu();
show('menu');
