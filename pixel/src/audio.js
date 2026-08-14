// Sonar. See DESIGN.md §8.3.
//
// A tick per cell travelled, rising in pitch as the distance to the true exit
// falls. Under Hard's fog this is the only global information in the game, and
// it is what makes the mode theoretically completable: it turns blind junction
// guesses into informed ones and lets a careful player tell the real exit from a
// decoy before committing.
//
// It is also, deliberately, hard to use — you are parsing pitch derivative at 20
// ticks a second while watching a control display that may have just changed.

export class Sonar {
  constructor(config) {
    this.config = config;
    this.ctx = null;
    this.lastMoves = 0;
  }

  /** Must be called from a user gesture; browsers refuse audio otherwise. */
  start() {
    if (!this.config || this.ctx) return;
    const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.06;
    this.gain.connect(this.ctx.destination);
  }

  stop() {
    this.ctx?.close();
    this.ctx = null;
  }

  /** Call once per frame with the current snapshot. */
  update({ moves, proximity }) {
    if (!this.ctx || moves === this.lastMoves) return;
    this.lastMoves = moves;

    const { minHz, maxHz } = this.config;
    const hz = minHz + (maxHz - minHz) * Math.max(0, Math.min(1, proximity));

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = hz;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(1, now + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(env);
    env.connect(this.gain);
    osc.start(now);
    osc.stop(now + 0.035);
  }
}
