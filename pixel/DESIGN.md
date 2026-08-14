# PIXEL — Design Document

> A maze game in which you are one white pixel, the maze is one pixel wide, and
> the only way out is the single missing pixel in the wall that surrounds the world.

**Status:** generator, solver, collapse and renderer built and verified; game loop
and input not yet written. See §15 for what exists.
**Scope:** standalone project. No dependency on Questboard; lives in `pixel/` for now.

---

## 1. Concept

The field is 1920 × 1080 pixels. Every pixel is one of three things: wall, corridor, or
you. Walls are one pixel wide. Corridors are one pixel wide. You are one pixel.

A solid unbroken wall surrounds the entire field. Exactly one pixel of that wall is
missing. That gap is the exit. Reaching it wins. Moving into any wall, or out of the
field anywhere else, kills you instantly and permanently — you get one life.

Two consequences of that spec do most of the design work, and both are free:

**The win condition and the death condition are the same action.** Leaving the world
kills you everywhere except one pixel, where instead it wins. The exit is not a door
you unlock. It is the one place where the thing that always kills you doesn't.

**You look exactly like a wall.** A white pixel sitting in a black corridor reads as a
wall segment. You are camouflaged as an obstacle, and you misread the maze most badly
in the immediate neighbourhood of yourself. This is why the player pixel blinks — the
blink is the only thing that distinguishes you from the world, and it makes you a
twinkle that alternates between "wall here" and "gap here."

---

## 2. The field

| Property | Value |
|---|---|
| Field | 1920 × 1080, exactly 1 maze cell per device pixel |
| Corridor lattice | odd coordinates only → 959 × 539 = **516,901** potential corridor cells |
| Wall | `#ffffff` |
| Corridor | `#000000` |
| Player | `#ffffff`, blinking (see §6) |
| Exit | a single `#000000` pixel in the border ring |

### Rendering

Canvas backing store is exactly 1920 × 1080. CSS size is set to
`1920 / devicePixelRatio` × `1080 / devicePixelRatio` so that **one maze cell maps to
exactly one physical device pixel**. `image-rendering: pixelated`,
`imageSmoothingEnabled = false`. Any fractional scaling destroys the game — 1px lines
alias into grey mush and the player pixel stops being findable.

This means the game requires a display of at least 1920 × 1080 physical pixels and
should run fullscreen. On a 2× HiDPI display the field occupies a 960 × 540 CSS-pixel
window: physically small, pixel-exact, and correct.

A 2× zoom accessibility option is allowed but is **separately ranked** — magnification
is a straightforward difficulty reduction and should not share a leaderboard.

### Frame budget

Do not re-blit 2.07M pixels per frame. Maintain a `Uint8Array(1920*1080)` grid and a
`Uint32Array` framebuffer, and push **dirty rectangles** only: the player's previous
and current cell, the blink toggle, any cells filled by collapse, and the fog window
edge. Typical frame touches a few hundred pixels. Full `putImageData` happens once, on
generation.

---

## 3. Anatomy of a field

```
┌────────────────────────────────────────────┐  ← border ring: solid wall, 1px,
│ ████ ██   ███ █ ████  ██ ███████  ███ ████ │    unbroken except for ONE pixel
│ █  █    █   █   █   █    █     █  █      █ │
│ █ ██ ████ █ ███ █ █ ████ █ ███ ████ ████ █ │
│ █    █    █     █ █      █   █      █    █ │
│ ███████████████████████████████████████████│
│                                    ┌──────┐│  ← HUD reserve (Hard mode):
│ ██ ████ █ ████ ███ █ ████ ██ ███   │ ▲    ││    240 × 140 of solid wall,
│ █     █ █ █      █ █    █  █   █   │◀ ▼ ▶ ││    generated as dead space so
└────────────────────────────────────┴──────┘│    the HUD occludes nothing playable
                                     ▲
                                     └ exit: one missing pixel in the ring
```

- **Border ring** — `x = 0`, `x = 1918`, `y = 0`, `y = 1078`. Solid wall. Never carved,
  except for the exit and any decoy gaps. Column 1919 and row 1079 are painted wall as
  well and are simply extra thickness: 1920 and 1080 are even, so a ring at 1919 would
  sit one wall pixel away from the last corridor and the exit would be two pixels deep.
  See the parity note at the top of `src/field.js`.
- **Exit** — one border pixel set to corridor, adjacent to a reachable corridor cell.
  Entering that pixel wins immediately; nothing beyond it ever matters.
- **Spawn** — a random corridor cell adjacent to the border ring, i.e. on the periphery,
  on a *different edge* from the exit and at least 900px away from it (§4.3).
- **HUD reserve** — bottom-right 240 × 140 block, held as solid wall at generation time
  so that the Hard-mode control display never covers playable space.

---

## 4. Generation

### 4.1 The problem that shapes everything

A single connected recursive-backtracker maze over the full 959 × 539 lattice was
measured at:

| Lattice | Cells | Mean solution from a corner | Corner to corner |
|---|---|---|---|
| 959 × 539 (full field) | 516,901 | **64,787** | 93,488 |
| 240 × 135 | 32,400 | 6,165 | 10,507 |
| 120 × 67 | 8,040 | 1,718 | 2,793 |

At a playable auto-run speed of ~20 cells/s, a full-field maze is a **54-minute
flawless run on one life.** That is not a difficulty setting, it is a different genre.

### 4.2 The solution: disconnected regions

Fill the entire field with maze, but **do not make it one maze.** Partition the lattice
into 12–20 irregular regions and generate an independent perfect maze inside each. The
boundaries between regions are ordinary 1px wall — visually indistinguishable from any
other wall in the field.

The player and the exit live in one region. Every other region is unreachable.

This is the best idea in the design, and it is worth being explicit about why:

> **In Easy mode you can see the entire map, and it is almost entirely useless.**
> 1920 × 1080 of visible maze, and you cannot tell by looking which corridors connect
> to you. Route planning becomes reasoning about connectivity under uncertainty. The
> map is complete, honest, and nearly worthless — the game never lies to you, it just
> shows you far more truth than you can use.

It also makes run length a tunable parameter without compromising the spec: walls are
still 1px, corridors are still 1px, the field is still full.

### 4.3 Algorithm

The order matters, and the obvious order is wrong. Growing the player's region first
and then looking inside it for two periphery points produces a compact blob that only
touches **one edge**: spawn, exit and every decoy end up on the same side of the field a
couple of hundred pixels apart. The path between them is still thousands of moves long,
but the entire run happens in one small patch of a 1920 × 1080 screen, and "spawns
randomly on the periphery, same with the exit" stops being true in any meaningful sense.

So the two periphery points are chosen **first**, and the region is grown to connect them:

```
1.  grid ← Uint8Array(1920 × 1080), all WALL
2.  Mark the border ring and the 240 × 140 HUD reserve as never-carved
3.  Lattice = cells at odd (x, y) outside those areas                 → 959 × 539
4.  Pick SPAWN and EXIT: random lattice cells on two *different* edges,
    at least 900px apart (Manhattan)
5.  SPINE ← drunken walk from SPAWN to EXIT: ~68% biased toward the
    target, ~32% random. Typically ~1,160 lattice cells.
6.  Player region ← claim every spine cell, then thicken outward by
    randomised-frontier growth until it reaches mode.regionCells
7.  Remaining lattice → 12–20 decorative regions by randomised
    multi-source flood fill; sweep stragglers so nothing is left over
8.  For each region independently: iterative recursive backtracker,
    restricted to that region. Never carve across a region boundary.
9.  BFS from SPAWN → distance field d[]. Reject the field if
    d[EXIT] + 1 falls outside the mode's solution band (§7).
10. Carve the single ring pixel adjacent to EXIT → the exit gap
11. Place decoy gaps per mode (§8.2)
12. Validate (§4.4), then freeze
```

Two details that are load-bearing:

**Spine cells are claimed unconditionally in step 6**, not popped at random off the
frontier like everything else. Losing part of the spine would disconnect the spawn from
the exit and quietly produce an unwinnable field.

**Growth uses a randomised frontier**, not FIFO. FIFO growth produces suspiciously
circular regions, and a player who learns to recognise region shapes by eye has beaten
the central mechanic.

Because the spine is connected and each region is spanned by a single tree, the exit is
reachable by construction — solution length is the only thing step 9 needs to filter.

Recursive backtracker is the right generator here, not Prim's or Wilson's: it produces
long winding corridors and few short stubs, which is what makes auto-run lethal and
what makes dead-end collapse (§9) visually dramatic.

Performance: ~517k cells of iterative DFS on typed arrays is 100–300 ms in JS. Budget
one second for generation including validation, and show the countdown over it.

### 4.4 Validation

Every seed is verified before it is played, by simulating a perfect player **under that
mode's actual rules** — including collapse timing, no-reversal if set, and fog. If a
theoretically perfect player cannot escape, the seed is rejected.

This is the line between the hardest game and a broken one. Without it, Hard mode is a
random number generator that sometimes kills you. With it, every death is provably the
player's, and the claim "this is beatable" is a fact rather than a hope.

The same solver yields the **par time** for each seed, displayed beside the leaderboard.

---

## 5. Movement and death

**Death** is: moving into a wall pixel, moving into the border ring, or moving outside
the field. There is no health, no shield, no second chance. One life.

**Win** is: moving into the exit pixel.

**Corridor following.** In auto-run modes the pixel advances one cell per tick along its
heading and *automatically follows the corridor around corners when there is only one
way to go.* You steer only at junctions — cells with three or more open neighbours.
Without this, a 1-wide winding maze at 20 cells/s would demand 20 inputs per second and
the game would be a typing test. With it, decisions arrive at a human rate of roughly
2–5 per second.

**Reversal.** Turning back the way you came. Allowed in all three modes. It is tempting
to forbid it in Hard, and it was considered and rejected — see §13.

---

## 6. The player pixel

The player blinks in every mode: **400 ms on, 200 ms off.**

While on, you are `#ffffff` and read as a wall. While off, you are `#000000` and read as
open corridor. The pixel therefore flickers between "blocked" and "clear," which is both
how you locate yourself in a field of half a million pixels and why the maze immediately
around you is the part you read worst.

The blink is not a difficulty setting. It is the only thing that makes a single pixel
findable in a 1920 × 1080 static field, and removing it would not make the game harder,
only unplayable.

Off-phase is cosmetic only. Collision is continuous — you can die during the dark phase.

---

## 7. Modes

One life in all three. Timer starts when the countdown reaches zero and stops on win or
death.

| | **EASY** | **MEDIUM** | **HARD** |
|---|---|---|---|
| Movement | discrete step, 25 cells/s repeat | auto-run 18 cells/s, +1 every 20 s | auto-run 20 cells/s, +1 every 20 s |
| Stop and think | yes, indefinitely | no | no |
| Corridor following | n/a | yes | yes |
| Input policy | free | 1-tick buffer | strict — turn lands on the exact tick or not at all |
| Reversal | yes | yes | yes |
| Study countdown | 3 s | 1 s | single frame |
| Visibility | whole field | whole field | 70 px lit radius |
| Sonar | no | no | yes (§8.3) |
| Controls | fixed arrows | fixed arrows | **displayed HUD, randomly reassigned** (§8.1) |
| Decoy gaps | none | 1–2, unreachable | 2–3, reachable and lethal (§8.2) |
| Dead-end collapse | no | no | yes, local (§9) |
| Blur / tab-out | ignored | **ends the run** | **ends the run** |
| Pause | yes | no | no |
| Target solution | 800–2,000 cells | 2,000–4,000 cells | 3,000–6,000 cells |
| Par time | ~35–80 s | ~110–220 s | ~150–300 s |

**Easy — brutal but fair.** Nothing surprises you and nothing moves without your input.
The whole field is visible. It is hard for exactly two reasons: 1px corridors punish
imprecise reading, and the visible map is mostly unreachable regions you cannot identify.
Finding the exit means scanning ~6,000 border pixels for the single black one.

**Medium — fair core, cruel garnish.** You can no longer stop. Speed ramps. The false
gaps waste your time but cannot kill you — they belong to regions you can never reach,
which you have no way to determine except by trying. No pause, and leaving the window
ends the run.

**Hard — actively hostile.** Fog reduces you to a 70 px disc of local knowledge. Controls
are reassigned at random intervals and shown, not announced. Decoy gaps kill. Dead ends
collapse around you. Sonar is your only global information.

---

## 8. Hard mode systems

### 8.1 The control display

The bottom-right corner shows the current key mapping as a compass cross, drawn in the
HUD reserve so it occludes nothing playable:

```
        ┌──────────────────┐
        │        [W]       │
        │         ▲        │
        │   [A] ◀   ▶ [D]  │      current mapping:
        │         ▼        │      W→up  A→left  S→down  D→right
        │        [S]       │
        └──────────────────┘
```

At random intervals of **15–35 seconds**, the mapping is reassigned to a new permutation
of the four directions. The HUD updates instantly. There is no flash, no sound, no
announcement, and no transition — the widget simply *is* what it is at any moment.

This is the fair version of control corruption. The information is always on screen and
always accurate. The difficulty is that reading it costs you the attention you were
spending on a blinking single pixel 1500 pixels away, at 20 cells per second, with no
ability to stop. You are never lied to; you are only asked to be in two places at once.

Constraints: never reassign to the identity permutation, never reassign within 3 seconds
of a previous change, and never reassign while the player is inside a dead-end stub with
collapse pending — that combination produces deaths a perfect player could not avoid,
which §4.4 exists to prevent.

### 8.2 Decoy gaps

Two or three additional black pixels are carved into the border ring, adjacent to
corridor cells **inside the player's own region** — so they are genuinely reachable.

Entering a decoy displays `YOU WIN` for 600 ms, then `YOU LOSE`. The run is over.

This is the one deliberately dishonest mechanic in the game, and it is confined to Hard
mode by design. It is survivable knowledge: a player who has seen it once knows that a
gap is not a guarantee, and sonar (§8.3) distinguishes the true exit from a decoy for
anyone paying attention. It is cruel, not unfair.

### 8.3 Sonar

A soft tick sounds once per cell travelled. Its pitch rises as your BFS distance to the
true exit falls — roughly 200 Hz at maximum distance to 1200 Hz at the exit.

Under fog this is the only global information in the game, and it is what makes Hard
theoretically completable: it converts blind junction guesses into informed ones and
lets a careful player distinguish the real exit from a decoy before committing.

It is also, deliberately, hard to use — you are parsing pitch derivative at 20 ticks per
second while watching a HUD that may have just changed.

---

## 9. Dead-end collapse

Every 8 seconds, the maze eats its own dead ends. Any corridor cell with one or fewer
open neighbours becomes wall — excluding the player's current cell and the exit.

This is provably safe, and that is the whole reason to use it: **in a perfect maze,
dead-end filling is a solving algorithm.** It can never sever the unique path between
two cells. The maze closes in on you and remains solvable by construction, with no
verification needed and no possibility of the game stranding you.

The threat is that it closes in on *you*, not on the exit. Standing in a stub when it
fills is death. Lingering, hesitating, and backtracking all become materially dangerous
without any explicit timer.

**Local by default.** In Hard, collapse only applies within 300 px of the player. Global
collapse would eventually reduce the whole region to a single winding line from you to
the exit — the maze would solve itself for anyone who survived long enough. That is a
beautiful arc and probably too generous; it is reserved for a separate "Collapse"
variant where it is the point rather than a side effect.

Rendering: collapsed cells flip from black to white. At 1px, a collapse round reads as
the maze visibly *breathing inward*, which is the best-looking thing in the game.

Two things the implementation makes non-negotiable:

**The exit and every decoy must be protected explicitly.** They sit in the border ring
with exactly one corridor neighbour, so they are permanently degree-1 — without an
exemption the very first tick quietly walls up the way out. A protected pixel also
anchors its whole branch against collapse, so what survives at the fixpoint is the union
of the routes joining the player, the exit and each decoy.

**A tick fills one layer, collected before anything is filled.** Iterating to a fixpoint
instead reduces the region to the bare solution corridor in a single frame and hands the
player the answer.

Verified directly (`npm run verify`): collapsing a Hard field to its fixpoint fills
~1,005,000 pixels — 98.8% of the maze — and leaves the solution length **exactly
unchanged**, with zero dead ends remaining.

---

## 10. Screens

```
MENU ──┬── BEGIN ──→ MODE SELECT ──→ COUNTDOWN ──→ PLAYING ──┬──→ YOU WIN ──┐
       ├── RULES                                             └──→ YOU LOSE ─┤
       ├── LEADERBOARD                                                      │
       └── SETTINGS                          RESULT ←────────────────────────┘
                                               └──→ MENU
```

**Rules** is a menu item, per the spec, and states the rules per mode — including,
explicitly, that Hard mode contains gaps in the wall that are not the exit. The game is
allowed to kill you with a decoy; it is not allowed to have never told you decoys exist.

**Countdown** doubles as study time and as cover for generation. Mode-dependent: 3 s, 1 s,
or a single frame.

**Result** shows elapsed time, moves taken versus par, and — on a death — your closest
approach, the minimum BFS distance to the exit you reached. On most Hard runs this is
the only number anyone will have.

---

## 11. One life, daily seeds, leaderboards

Random mazes make times incomparable, so the ranked game is built on a **daily seed**:
`hash(YYYY-MM-DD + mode)` produces the same field for everyone, worldwide, that day.

Combined with one life this gives the shape the game wants: **one attempt per mode per
day.** You die, that mode is gone until tomorrow.

- **Free Play** — unlimited random seeds, unranked. This is where you practise, and it is
  what makes one-life-per-day tolerable rather than merely punishing. It is also, on Hard,
  almost certainly how anyone who ever finishes will have prepared.
- **Escape board** — per mode, per day, ranked by time ascending. Fields: name, mode,
  seed date, time, moves, par moves.
- **Progress board** — per mode, per day, ranked by closest approach. This exists because
  on Hard the escape board will frequently be empty, and a leaderboard of people who
  nearly made it is still a leaderboard.
- **All-time** — best time per mode across all daily seeds, with the seed date shown.

Storage is `localStorage` for v1.

**Validation.** A run is completely described by `(seed, mode, input events with tick
numbers)`. A server can replay it deterministically and confirm the time. That is roughly
forty lines, and it is the entire reason §12 insists on determinism from the first commit.

---

## 12. Determinism

Same seed plus same input tick sequence must produce the same run, always, on every
machine.

- Seeded PRNG (mulberry32) for generation, region partition, control reassignment
  schedule, and decoy placement. No `Math.random()` anywhere.
- Fixed-timestep simulation. Input is recorded against tick numbers, never wall-clock
  time. Rendering may interpolate; simulation may not.
- No floating-point in collision or movement.

This costs nothing up front and buys shareable seeds, replay validation, reproducible
bug reports, and the §4.4 solver.

---

## 13. Decisions taken, with reasons

**No-reversal in Hard was rejected.** It is the most obviously brutal modifier available
and it does not survive arithmetic. Measured on generated fields, junctions fall roughly
one per 21–31 pixels of solution, so a Hard run presents **400–700 junctions** (not the
~1,000 first estimated from a guessed junction density — the real figure is lower because
recursive-backtracker mazes run long and straight). It changes nothing: without reversal
every junction must be guessed correctly on first contact, and 2⁻⁴⁰⁰ is not meaningfully
better than 2⁻¹⁰⁰⁰. That is not a hard game, it is a game with no win state, and the
leaderboard would never populate. It is available as an unranked **IMPOSSIBLE** modifier
for people who want to see it.

**Full-field connected mazes were rejected as the default** for the reason in §4.1, and
kept as an unranked **FULL BLEED** modifier: one region, the entire field, a ~65,000-cell
solution, one life, no pause. Somebody will want it. Nobody will finish it.

**Fog plus no-reversal must never combine.** Either alone is survivable; together they
produce deaths a perfect player cannot avoid, which §4.4 would reject anyway.

**Zoom is allowed but separately ranked.** Magnification makes the game easier in a way
that is not interesting to argue about.

---

## 14. Tuning constants

Values marked ✓ are the ones the generator currently runs and `tools/verify.js`
confirms. The active field is 1919 × 1079 inside the 1920 × 1080 canvas — see the parity
note at the top of `src/field.js` for why, and why the wall reads 2px thick on two edges.

| Constant | Value | Notes |
|---|---|---|
| `FIELD_W`, `FIELD_H` | 1920, 1080 | must be device pixels |
| `ACTIVE_W`, `ACTIVE_H` | 1919, 1079 ✓ | border ring at 0 and 1918 / 1078 |
| `LAT_W`, `LAT_H` | 959, 539 ✓ | 516,901 cells, odd coordinates only |
| `HUD_RESERVE` | 240 × 140 ✓ | bottom-right, solid wall |
| `REGION_COUNT` | 12–20 ✓ | decorative regions, seeded random |
| `MIN_END_SEPARATION` | 900 px ✓ | spawn to exit, Manhattan, different edges |
| `SPINE_DRIFT` | 0.32 ✓ | share of spine steps that ignore the target |
| `BLINK_ON` / `BLINK_OFF` | 400 ms / 200 ms | all modes |
| `regionCells` | 6,000 / 14,000 / 20,000 ✓ | Easy / Medium / Hard |
| `solutionBand` | 4,000–6,400 / 7,000–12,200 / 9,800–15,500 ✓ | pixel-moves |
| `stepRate` | 40 / 45 / 60 px/s ✓ | Easy / Medium / Hard |
| `speedRamp` | +2 px/s per 20 s | Medium and Hard |
| `decoyCount` | 0 / 2 / 3 ✓ | Easy / Medium / Hard |
| `MIN_SPAWN_PIXELS` | 320 ✓ | decoy to spawn, Manhattan |
| `minSpawnMoves` | 15% of solution ✓ | lethal decoys only, along the maze |
| `FOG_RADIUS` | 70 px | Hard |
| `COLLAPSE_PERIOD` | 8 s | Hard |
| `COLLAPSE_RADIUS` | 300 px | Hard; ∞ in Collapse variant |
| `REMAP_INTERVAL` | 15–35 s | Hard, seeded random |
| `REMAP_COOLDOWN` | 3 s | minimum between reassignments |
| `SONAR_HZ` | 200 → 1200 | far → near |

### What the generator actually produces

Measured over three daily seeds per mode (`node tools/verify.js`):

| | Easy | Medium | Hard |
|---|---|---|---|
| Solution | 4,411–5,491 moves | 8,207–10,125 | 11,099–15,027 |
| Par | 110–137 s | 182–225 s | 185–250 s |
| Junctions | 226–413 | 349–477 | 402–703 |
| Decisions/sec at par | 2.0–3.0 | 1.8–2.1 | 2.2–2.8 |
| Reachable world | 12,000 px | 28,000 px | 40,003 px |
| Share of visible maze | **1.2%** | **2.8%** | **3.9%** |
| Generation | ~400 ms, 1 attempt | ~390 ms, 1 attempt | ~400 ms, 1 attempt |

The last two rows are the design working as intended and are worth stating plainly: on
Hard the player can see about a million corridor pixels and can reach 40,003 of them.
Over 96% of the maze on screen is scenery, and nothing distinguishes it from the part
that matters.

---

## 15. Build

Standalone, no build step, static hosting. Roughly 600 lines.

```
pixel/
  index.html
  style.css
  src/
    rng.js          mulberry32, string → seed              ✓ built
    field.js        geometry, parity, HUD reserve          ✓ built
    maze.js         spine, region partition, carving       ✓ built
    solver.js       BFS, par time, seed validation         ✓ built
    modes.js        the three rule sets, as data           ✓ built
    collapse.js     dead-end filling                       ✓ built
    render.js       framebuffer, dirty rects, fog, HUD     ✓ built
    game.js         fixed-timestep loop, state machine
    input.js        keymap, buffering policy, reassignment schedule
    audio.js        sonar
    board.js        leaderboards, replay encoding
  tools/
    verify.js       generation harness + invariant checks  ✓ built
    preview.js      PNG dumps of generated fields          ✓ built
    frame.js        rendered frames + dirty-rect check     ✓ built
    png.js          indexed and truecolour PNG encoders    ✓ built
```

```bash
npm run verify     # generate across all modes, assert §4.4 invariants
npm run preview    # node tools/preview.js [mode] [isoDate] → tools/out/*.png
npm run frame      # node tools/frame.js   [mode] [isoDate] → rendered frames
```

---

## 16. Idea bank — considered, not scheduled

Fair (they add information cost, not randomness):

- **Two fields, one input.** Two pixels in two different mazes, driven by the same
  keystrokes. Both must escape. Probably the hardest fair mechanic that exists.
- **Lag pixel.** You steer a cursor; the pixel follows one cell behind.
- **Input latency.** 120 ms delay. Horrible, learnable, fair.
- **Shrinking light.** Fog radius contracts 140 px → 40 px over 90 s. A soft time limit
  that never kills you outright.
- **Mirror.** The render is horizontally mirrored; collision follows the true field.

Hostile (Hard-tier only, and know what you are choosing):

- **Poisoned memory.** For one frame every 5 seconds, render a *different* randomly
  generated field. Collision unaffected. Defeats screenshots and corrupts memorisation.
- **Silent death.** No animation, no sound — the pixel simply stops being drawn. Since it
  looked like a wall, you do not immediately notice you have died.
- **Trail as wall.** Cells you left become wall after a 200-cell delay. Can strand you, so
  it requires the §4.4 solver to gate seeds.

Rejected outright: unsolvable seeds, hidden timers, and death on any wrong keypress. All
three generate deaths a perfect player could not avoid, which makes runs shorter rather
than harder. "Hardest ever" only means anything if the ceiling is skill.
