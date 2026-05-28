// Lazy singleton AudioContext, created on first use to satisfy browser autoplay policy.
let ctx = null;

// Mute state
let muted = JSON.parse(localStorage.getItem('questboard_muted') || 'false');

export function setMuted(val) {
  muted = val;
  localStorage.setItem('questboard_muted', JSON.stringify(val));
}

export function isMuted() {
  return muted;
}

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

// Plays a single chiptune beep. freq=Hz, dur=seconds, type=oscillator waveform, vol=peak gain.
function beep(freq, dur, type = 'square', vol = 0.12) {
  if (muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  } catch (_) {}
}

// Two-tone hit sound; pitch scales with chore point value.
export function playHit(pts) {
  const freq = 200 + Math.min(pts, 5) * 45;
  beep(freq, 0.1);
  setTimeout(() => beep(freq * 1.4, 0.07), 55);
}

// Ascending 4-note fanfare played when a player defeats their monster.
export function playKill() {
  [330, 415, 494, 659].forEach((f, i) => setTimeout(() => beep(f, 0.18), i * 85));
}

// 8-note arpeggio celebration played when all players defeat their monsters on the same day.
export function playFanfare() {
  [261, 329, 392, 523, 659, 784, 1047, 1047].forEach((f, i) =>
    setTimeout(() => beep(f, i === 7 ? 0.55 : 0.18, 'square', 0.11), i * 75)
  );
}

// Descending two-tone played when a chore claim is undone.
export function playUndo() {
  beep(440, 0.07);
  setTimeout(() => beep(330, 0.1), 55);
}

// 3-note rising chime played when a reward is redeemed.
export function playRedeem() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.13), i * 65));
}

// Sharp 5-note ascending arpeggio on a critical hit, higher and brighter than the kill fanfare.
export function playCrit() {
  [494, 659, 880, 1175, 1568].forEach((f, i) =>
    setTimeout(() => beep(f, i === 4 ? 0.3 : 0.1, 'square', 0.15), i * 50)
  );
}

// Bright double-ding when a dungeon key is picked up.
export function playKeyPickup() {
  beep(1320, 0.14, 'sine', 0.18);
  setTimeout(() => beep(1760, 0.20, 'sine', 0.15), 120);
}
