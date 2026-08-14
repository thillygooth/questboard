# ONE FRAME

A maze game where the player is a single white pixel, the maze is one pixel
wide, and the display is an NTSC CRT.

This is a thought project first and a game second. It is unrelated to the
Questboard chore tracker and shares no code, state, or backend with it.

---

## 1. Premise

- The player is one white pixel.
- The display is NTSC 240p, 320 x 240, 76,800 pixels.
- The maze has 1px walls and 1px corridors.
- Spawn and exit are both random gaps in the border wall.
- The maze is revealed by the CRT scanline, starting top-left.
- One life. Touching a wall, leaving the field, or running out of time kills you.
- At the top difficulty, the entire game lasts one frame: 16.6833 ms.

---

## 2. The conservation law

The premise contains a coincidence that turns out to be the whole design.

On real NTSC hardware the beam takes **exactly one frame** to paint the screen.
So "the maze is revealed by a scanline" and "you have one frame" describe the
same 16.6833 ms. The light source and the clock are the same object.

> **The run begins when the beam paints your spawn pixel.**
>
> Everything painted before that instant is your map.
> Everything after it is your clock.
>
> **Map + Clock = 1 frame.** Always.

Spawn is random on the periphery, so the trade is dealt, not chosen:

| Spawn | Map | Clock |
|---|---|---|
| Top-left | nothing | the full frame |
| Middle | half the maze | half the frame |
| Bottom-right | the entire maze | nothing |

This is the signature mechanic. It is not designed; it falls out of the
hardware.

---

## 3. Hardware model

NTSC 240p, as retro consoles actually output it.

| Quantity | Value |
|---|---|
| Frame (field) period | 16.6833 ms (59.94 Hz) |
| Line period | 63.5556 us (15.734 kHz) |
| Active video per line | ~52.6 us |
| Horizontal blanking | ~10.9 us |
| Visible lines / total | 240 / 262 |
| Vertical blanking | ~1.398 ms |
| **Pixel period** | **164.4 ns** |
| Total reveal time | 12.624 ms (75.7% of frame) |
| Total dark time | 4.059 ms (24.3% of frame) |

The beam is not uniform. **24% of the frame is blanking** — 240 gaps of
10.9 us each, plus one 1.398 ms void at the end. The clock runs during
blanking; nothing is revealed.

### A note on modern displays

Removing the CRT does not remove the scanline. LCD and OLED panels scan out
progressively too — that is why tearing appears as a horizontal seam and why
VRR exists. A frame drawn from black wipes in top-to-bottom on any raster
display.

The only real difference is sample-and-hold versus phosphor decay: an LCD
pixel stays lit until the next refresh, so the map *accumulates* instead of
fading. That is strictly more information, and it does not matter, because no
human can perceive any of it inside 16.6833 ms.

---

## 4. Maze

- Border wall on rows 0/239 and columns 0/319. Cells on odd coordinates,
  walls on even. Leftover row 238 and column 318 join the border.
- **159 x 119 = 18,921 cells.**
- A perfect (spanning-tree) maze has 18,920 corridor links, giving
  **37,841 lit corridor pixels — about 49% of the screen.**
- **Canonical generator: randomized DFS.** It maximizes solution length and
  turn count, which is what we want. Kruskal and Wilson's are exposed for
  comparison; both produce dramatically shorter solutions.
- **The maze is generated in full at t=0.** The beam only *reveals*; it never
  *creates*. Collision tests against the true maze, so you can die against a
  wall that has not been drawn yet. Without this rule the collision model is
  undefined.
- Spawn and exit are uniformly random periphery gaps, each connected to the
  lattice. **No minimum path length is enforced** — see §9.

---

## 5. Player and input

- One white pixel. 4-connected movement, no diagonals. A 1px corridor admits
  nothing else.
- **Always in motion.** Once the run starts you cannot stop, only steer.
- Initial direction is auto-set inward from the spawn gap. There is exactly
  one legal choice.
- Step period is per-difficulty (§7). At 1x it is the pixel period, 164.4 ns.

### Input is a tape

Input is modelled as a **timestamped sequence of direction changes**. Live
arrow-key play writes a tape in real time; Compile Mode (§8) authors one at
leisure. A human keyboard is simply a device that writes very bad tapes.

This single abstraction gives the solver, the replay, and the feasibility
argument for free.

### Death

- Any step into a wall
- Any step outside the field
- Time expires
- (Compile Mode) tape exhausted before reaching the exit

One life, at every difficulty. Verdict renders on the following frame — the
game is one frame, the answer is the next one.

---

## 6. The beam has two possible roles

The same mechanic does opposite jobs depending on whether the player knows
the maze.

**As a light** (ONE FRAME): the beam rations information. You navigate what
you can see, and you can only see what has been painted.

**As a floor** (ONE FRAME and HARD): **you may not occupy a pixel the beam
has not yet painted.** Attempting to does not kill you — you *stall in place*
until it is painted, then continue. Free, automatic, costs no instruction.

The floor rule only makes sense when the player is faster than the beam:

| | Rate |
|---|---|
| Player at 1x | 1 px per **164.4 ns** |
| Beam descends | 1 row per **63.5556 us** |
| **Ratio** | **~423 player-steps per row of descent** |

Lateral and upward movement is effectively free. **Downward movement is
rate-limited to the beam.** Two consequences:

- **Re-descent is free.** Paint is permanent, so only *first* descents into
  fresh territory can stall you.
- **Vertical blanking is total freedom.** All 240 rows are painted at
  15.253 ms; the frame ends at 16.6833 ms. That leaves **1.398 ms — about
  8,500 steps — in a fully-painted maze with no wavefront at all.**

### Emergent consequences of the beam-as-light

All of these are free consequences of a raster scan. None were designed.

- **Directional illumination.** Everything above you is lit; everything below
  is not. **North is illuminated, south is blind.** West is partially lit
  (the current line is already painted), east is not.
- **You are drawn once.** The beam crosses your position exactly once per
  frame, and the game is one frame. You are visible for 164 nanoseconds — and
  if you have already moved past that raster coordinate, **you are never
  rendered at all.** A bottom-edge spawn lives and dies entirely in darkness.
- **Phosphor is your only memory.** Since you are rendered once, what you
  actually see is your decaying trail: a glowing worm on the persistence
  curve.
- **The exit may not exist yet.** If the exit's raster index falls after your
  spawn's, you are navigating toward a destination that has not been
  revealed — and it may be revealed after you have already passed it.

---

## 7. Difficulty

Four rungs in **two families**. They are not a single parameter; see the
derivation below.

| Level | Step period | Time limit | Beam role | Winnable by |
|---|---|---|---|---|
| **EASY** | ~42 ms | none | intro flourish | anyone patient |
| **MEDIUM** | ~42 ms | reaction-par | intro flourish | a *perfect* human |
| **HARD** | 1 ms | 101.5 s | light + floor | a memorized or scripted run |
| **ONE FRAME** | 164.4 ns | 16.6833 ms | light + floor | hardware at >=6 MHz |

**Family A — ONE FRAME and HARD** are true uniform dilations of each other.
Every constant scales by the same factor; the beam relationship is preserved
exactly.

**Family B — EASY and MEDIUM** are a separate parameterization built around
human reaction time. The causality rule is absent (see below).

### Why the families cannot be unified

Preserving the ONE FRAME beam relationship (~423 steps per row) at a
reaction-calibrated step period of ~42 ms requires a row period of ~17.8 s,
which makes the frame **84 minutes**. Compressing the frame to a playable
~3 minutes instead makes the beam ~28x *more* binding than at 1x, so the
wavefront rather than reaction sets the pace.

Either way, reaction stops being the binding constraint — which contradicts
the definition of MEDIUM. **The causality rule is therefore exclusive to
Family A.** It is a mechanic that only exists at machine timescales, because
it requires the player to be much faster than the beam, which only a human
is not.

---

### EASY — no clock

- Beam sweeps once at a comfortable rate (~3-5 s) revealing the maze, then
  **the clock stops.**
- No deadline, no causality rule, full map visible for the whole run.
- **You still die on any wall contact. One life.**

That last rule carries the level. A 159 x 119 lattice with 1px corridors,
instant death on contact, and no checkpoints is not trivial with unlimited
time and a full map. EASY is a steadiness test, and it teaches that the maze
itself is an opponent before any clock is added.

EASY is exactly MEDIUM without the deadline, at the same step period, so
motor skill transfers directly between them.

---

### MEDIUM — the deadline is a perfect human

**You must play as well as a theoretically optimal human.** Not faster. But
zero hesitation, zero wrong turns, zero wasted milliseconds, for the entire
route.

**Structure**

1. **STUDY** — untimed, full map, plan your route. Shared with Compile Mode.
2. **RUN** — real-time, one life, deadline enforced.

STUDY is a fairness requirement, not a kindness. A deadline set to the
optimal route is only fair if the optimal route is knowable. Under fog you
cannot route optimally even in principle, so a single wrong branch would be
death by timeout with no information that could have prevented it. STUDY
makes MEDIUM a pure execution test, which is what a reaction-derived deadline
actually measures.

**Deriving the deadline**

Decision points on a 1px perfect maze are not equal:

| Event | What the player does | Cost |
|---|---|---|
| Straight corridor | nothing | 0 |
| **Forced bend** | correct key at the right pixel, no choice; anticipatory motor act | **~150 ms** |
| **Junction** | choice reaction, 2-3 live options (Hick's law) | **~350 ms** |
| Dead end | never occurs on the optimal route | — |

```
T_par = t_start + SUM(bends x 150ms) + SUM(junctions x 350ms)

s     = T_par / path_length          (step period)
```

The second equation is not an independent choice. Dividing the deadline by
the route length automatically makes the median straight run take exactly one
reaction interval — so reaction is the binding constraint by construction,
and the two parameters are self-consistent.

**Illustrative numbers** (route stats are placeholders until the analyzer
exists — see §12):

| | |
|---|---|
| Route | 4,000 steps, 800 turns (560 bends / 240 junctions) |
| 560 bends x 150 ms | 84 s |
| 240 junctions x 350 ms | 84 s |
| **T_par** | **168 s** |
| Step period `s` | 42 ms (~24 px/s) |
| Shipped deadline (k = 1.15) | 193 s |

So MEDIUM is roughly a **three-minute sustained precision run at the edge of
human reaction, with one life.** Failing at turn 799 returns you to the
start. In shape it is a no-miss rhythm chart with instant death.

**Slack.** `k = 1.15` ships as default. `k = 1.0` — the literal
reaction-optimum, with no room for a single stutter across ~800 events — is
exposed as **MEDIUM (PAR)** and is the scored mode.

---

### HARD — the hardware floor

A uniform dilation of ONE FRAME by **6,083x**, chosen as the point where a
1 kHz keyboard can just express a turn.

| | ONE FRAME | HARD |
|---|---|---|
| Step period | 164.4 ns | **1 ms** |
| Frame | 16.6833 ms | **101.5 s** |
| Row period | 69.5 us | **423 ms** |
| Steps per row | 423 | 423 |

Everything scales together, so the beam-as-floor mechanic behaves
identically. Too fast to react to, slow enough for the input hardware to
express.

Which makes HARD **the level Compile Mode exists to beat.** Author a tape at
leisure, execute it at 6,083x. That is the intended solution, not a
workaround.

> HARD was not requested. It costs one scalar and completes the ladder, but
> it is trivially removable if the ladder is better at three rungs.

---

### ONE FRAME — the top rung

1x. The full premise: fog of war, beam as light and floor, 16.6833 ms,
one life.

**ONE FRAME is solvable. It is not human-playable.** The distinction is the
entire point of the project, and the name is a constraint rather than a
verdict:

- The maze is a spanning tree, so a path always exists.
- A winning tape always exists and can be computed.
- That tape executes correctly on hardware with sufficient timestamp
  resolution (~6 MHz).
- No human and no USB HID device can express it.

The tape replay mode (§10) is therefore not a curiosity — it is the
**demonstration that the level is real.** It shows YOU WIN, at full speed,
in one frame.

---

## 8. Compile Mode

An orthogonal axis, not a difficulty. You pick a **level** and an **input
method** (live arrows / authored tape). It is the intended way to beat HARD.

**Three phases**

1. **STUDY** — untimed. Full maze, spawn, exit. Pan, zoom, trace routes. Take
   a week.
2. **COMPILE** — author the tape against a budget. Nothing executes.
3. **RUN** — one frame, real time, at 1x.

At 1x the RUN phase is literally one frame of light: the screen flashes and
you get an answer. That is correct and should stay that way. **The execution
is a flash; the replay is the spectacle.**

### The tape

```
NORTH 47
EAST   12
NORTH   3
WEST  118
```

Each instruction is a direction and a step count — which means **the tape is
the run-length encoding of your route, and the instruction budget is a
compression limit.** Minimum instruction count = straight segments = turns + 1.

The whole game in one sentence:

> Find a path from spawn to exit whose RLE fits in N instructions and whose
> beam-adjusted execution fits in one frame.

**Counts are in steps, not time.** A stall consumes wall clock but not step
count, so `NORTH 47` always moves 47 pixels, however long that takes.

### The budget is par

`N` comes from the solver's Pareto frontier over (instruction count,
beam-adjusted execution time). The objectives fight: the minimum-turn route
tends to be long and may blow the frame; the shortest route tends to have far
too many turns. `N` is the instruction count of the cheapest route that is
still time-feasible — **computed, provably optimal, tight.**

Par plus ~5-10% slack is the shipped budget, giving a scoring gradient. You
cannot beat par; you can only reach it.

Seeds with no feasible route are rejected at generation. A toggle exposes the
raw distribution — the proportion of dead-on-arrival seeds is itself an
interesting number.

### What makes it hard

- **Routing is genuinely hard.** Minimum-turn pathfinding under a time
  constraint on a ~19,000-cell lattice is not a BFS you do in your head.
- **Descent scheduling.** Every first-descent stalls you, and stall cost is
  invisible on the map. You must reason about paint times.
- **Every count must be exact.** In text-authoring mode one off-by-one
  anywhere in several hundred instructions is a wall collision.
- **Cold run** (below).

### Two categories

- **DEBUG** — unlimited simulation during COMPILE. This is the puzzle game,
  and it is how real TAS work is done. Legitimate.
- **COLD** — author blind, one execution, no test runs. Honors the one-life
  constraint. The scoring mode of record.

Optional middle tier: three test runs, then commit.

**Scoring:** instructions used against par, with time remaining at the exit
as tiebreak.

### Authoring interface

Difficulty and tedium are separable, so there are two modes:

- **Route drawing** (primary) — trace the path on the maze; the game derives
  the RLE and shows instruction count against par live. Keeps the real
  difficulty (finding a cheap route), removes transcription error.
- **Raw tape text** (expert) — type the instructions. Restores the
  off-by-one death, for those who want it.

Route drawing must include a **stall overlay**: where along the route the
beam will hold you, and for how long. Without it the time budget is opaque
guesswork rather than reasoning.

---

## 9. Feasibility analysis

The project's actual payload. Three walls, and the CRT is responsible for
only one.

| Wall | Requirement | Human capacity | Gap |
|---|---|---|---|
| **Perception / reaction** | react inside 16.6833 ms | simple visual RT 200-250 ms; 4-choice RT 300-400 ms; route-planning a maze: seconds | **0 reactive inputs possible** |
| **Input rate** | ~500-3,000 direction changes per frame = 30-180 kHz | ~20 Hz elite sustained → **0.33 keypresses per frame** | 1,500-9,000x |
| **Turn precision** | 164.4 ns window (one step period) | 1 kHz keyboard = 1 ms; 8 kHz = 125 us | 760-6,083x |

Three independent impossibilities, each sufficient on its own.

### The machine boundary

The real line is not the display — it is whether input passes through USB HID.

| Player | Timestamp resolution | ONE FRAME |
|---|---|---|
| Human | ~250 ms | no |
| 1 kHz keyboard | 1 ms | no |
| 8 kHz keyboard | 125 us | no |
| FPGA / MCU direct | <100 ns | **yes** |

USB HID caps out at 8 kHz and loses. Silicon at >=6 MHz wins. This is what
"theoretically possible, just not for a human" means precisely.

### The merciful case

No minimum path length is enforced, so with vanishing probability the spawn
gap sits adjacent to the exit gap with zero turns between them, and simply
holding the initial direction wins.

**The only human-winnable ONE FRAME instances are the degenerate ones.** That
mercy stays in the distribution.

---

## 10. Modes

| Mode | What it is |
|---|---|
| **Live** | Real-time arrow keys at the selected difficulty. |
| **Compile** | STUDY / COMPILE / RUN (§8). |
| **Tape replay** | Load a solver tape, run at 1x. Proves solvability. |
| **Dilation** | Time scaled up to 10^6x. An **oscilloscope, not an easy mode** — the HUD reports canonical microseconds and a win logs as *observed, not achieved*. |
| **Autopsy** | Step the recorded trace nanosecond by nanosecond. Deaths happen in microseconds, so this is where the content of the game actually lives. |

---

## 11. Screens

- **Title** — BEGIN / RULES / difficulty / seed entry
- **Rules** — the mechanics, the rate table, and the §9 numbers. The rules
  screen *is* the thesis statement.
- **Study** — full maze, pan/zoom, route tools (MEDIUM and Compile only)
- **Compile** — tape editor, count vs. par, stall overlay, time projection
- **Run** — 320 x 240, 1:1 pixels, phosphor persistence, optional
  scanline/bloom/barrel treatment
- **Verdict** — YOU WIN / YOU LOSE, 8x8 bitmap font, on the following frame
- **Autopsy** — dilated replay with scrubber; death timestamp in us, beam
  position at death, instruction index that killed you, stall accounting,
  % of route completed, and the instance's Map/Clock split

---

## 12. Architecture

Canonical mode is **not a game loop.** 16.6833 ms of simulation computes in
microseconds of CPU, and in a browser the first keydown event arrives after
the run is already over. The honest model is a pure function:

```
sim(seed, tape) -> trace      pure, deterministic, headless
render(trace, dilation)       separate replay of a finished trace
```

Live play writes a tape in real time and feeds the same function. This makes
the sim trivially testable and makes the solver, analyzer, and autopsy fall
out for free.

**Location:** standalone `games/oneframe/` — its own Vite app, its own
`index.html`, **no backend and no shared state with the chore tracker.**
Optional localStorage for seeds and tapes.

---

## 13. Build phases

1. **Sim core** — maze generation, beam model, kinematics, collision,
   causality/stall semantics, verdict. Headless, seeded, unit-tested.
2. **Solver + analyzer** — Pareto frontier over (turns, beam-adjusted time);
   emits winning tapes; batch-runs N seeds for route statistics.
3. **Renderer** — canvas, phosphor persistence, beam reveal, CRT treatment.
4. **Shell** — title, rules, study, verdict, autopsy, dilation, seed entry.
5. **Compile UI** — tape editor, route drawing, stall overlay. The largest
   single surface in the project.
6. **Writeup** — seed distribution study and the feasibility argument.

### Phase 2 is a hard dependency, not a nice-to-have

MEDIUM's deadline **cannot be computed** without per-seed route statistics:
optimal path length, turn count, and bend/junction split. Compile Mode's par
needs the same solver.

**EASY and ONE FRAME can ship without Phase 2. MEDIUM and Compile Mode
cannot.**

---

## 14. Open parameters

Everything below is a placeholder pending measurement. None of it is a
constant.

| Parameter | Working value | Needs |
|---|---|---|
| Route length (DFS, 159x119) | 2,000-16,000 steps | Phase 2 measurement |
| Turn count | 500-3,000 | Phase 2 measurement |
| Bend / junction split | 70 / 30 | Phase 2 measurement |
| Mean straight run | ~5 px | Phase 2 measurement |
| Forced-bend reaction cost | 150 ms | calibration against real play |
| Junction reaction cost | 350 ms | calibration against real play |
| MEDIUM slack `k` | 1.15 (1.0 scored) | playtest |
| Compile par slack | 5-10% | playtest |
| Infeasible-seed policy | reject at generation | open |
| Explicit `HOLD` instruction | omitted from canonical | open |

The reaction constants are literature values, not measurements. They ship as
config, not constants, and the defaults are provisional.

---

## Appendix: constants

```
Frame period          16.6833 ms      (59.94 Hz)
Line period           63.5556 us      (15.734 kHz)
Active video / line   52.6 us
Horizontal blanking   10.9 us
Vertical blanking     1.398 ms
Visible lines         240 of 262
Pixel period          164.4 ns
Reveal time           12.624 ms       (75.7%)
Dark time             4.059 ms        (24.3%)

Field                 320 x 240       = 76,800 px
Cell lattice          159 x 119       = 18,921 cells
Corridor pixels       37,841          (~49% of field)
Step budget @ 1x      101,479 steps
Steps per beam row    ~423
HARD dilation         6,083x
```
