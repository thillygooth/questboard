// The three rule sets, as data. See DESIGN.md §7 and §14.
//
// `regionCells` is the size of the player's reachable region in lattice cells,
// and it is the primary control on how long a run lasts. It exists because a
// single connected maze over the whole field has a mean solution of ~65,000
// lattice steps — a ~54-minute flawless run on one life (DESIGN.md §4.1).
//
// `solutionBand` is in pixel-moves, which is what the player actually presses.

export const MODES = {
  unpleasant: {
    id: 'unpleasant',
    name: 'UNPLEASANT',
    tagline: 'brutal but fair',

    regionCells: 6000,
    solutionBand: [4000, 6400],
    decoyCount: 0,
    decoysReachable: false,

    movement: 'step',
    stepRate: 40,
    speedRamp: 0,
    corridorFollow: false,
    inputPolicy: 'free',
    allowReversal: true,

    studyMs: 3000,
    fogRadius: Infinity,
    sonar: false,
    remapControls: false,
    collapse: null,
    blurEndsRun: false,
    allowPause: true,
  },

  miserable: {
    id: 'miserable',
    name: 'MISERABLE',
    tagline: 'fair core, cruel garnish',

    regionCells: 14000,
    solutionBand: [7000, 12200],
    decoyCount: 2,
    decoysReachable: false, // time-wasters only: they open onto regions you cannot reach

    movement: 'run',
    stepRate: 45,
    speedRamp: { per: 20_000, add: 2 },
    corridorFollow: true,
    inputPolicy: 'buffer1',
    allowReversal: true,

    studyMs: 1000,
    fogRadius: Infinity,
    sonar: false,
    remapControls: false,
    collapse: null,
    blurEndsRun: true,
    allowPause: false,
  },

  excruciating: {
    id: 'excruciating',
    name: 'EXCRUCIATING',
    tagline: 'actively hostile',

    regionCells: 20000,
    solutionBand: [9800, 15500],
    decoyCount: 3,
    decoysReachable: true, // these ones kill

    movement: 'run',
    stepRate: 60,
    speedRamp: { per: 20_000, add: 2 },
    corridorFollow: true,
    inputPolicy: 'strict',
    allowReversal: true, // see DESIGN.md §13 — forbidding it removes the win state

    studyMs: 0,
    fogRadius: 70,
    sonar: { minHz: 200, maxHz: 1200 },
    // One corridor pixel in every thousand blinks exactly like you do, so the
    // blink stops telling you which pixel is you. See DESIGN.md §8.4.
    blinkDecoys: { oneIn: 1000 },
    remapControls: { minMs: 15_000, maxMs: 35_000, cooldownMs: 3000 },
    collapse: { periodMs: 8000, radius: 300 },
    blurEndsRun: true,
    allowPause: false,
  },
};

export const MODE_IDS = ['unpleasant', 'miserable', 'excruciating'];

export function getMode(id) {
  const mode = MODES[id];
  if (!mode) throw new Error(`unknown mode: ${id}`);
  return mode;
}
