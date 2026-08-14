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
- **Canonical generator: randomized DFS**, for the surrounding maze. It
  maximizes corridor length and dead-end density, which is what we want for
  everything that is *not* the solution. Kruskal and Wilson's are exposed for
  comparison. The solution path itself is not left to the generator — see
  below.
- **The maze is generated in full at t=0.** The beam only *reveals*; it never
  *creates*. Collision tests against the true maze, so you can die against a
  wall that has not been drawn yet. Without this rule the collision model is
  undefined.
- Spawn and exit are uniformly random periphery gaps, each connected to the
  lattice. **No minimum path length is enforced** — see §9.

### The solution path is constructed first

Pure random generation would produce solutions with hundreds or thousands of
branch decisions, which no input device can express in one frame (§5). So
generation is inverted:

1. Route a solution path between two periphery gaps with **at most
   `DECISION_BUDGET` junction decisions** (133 — see §5).
2. Grow the remainder of the maze around it as a spanning tree.

The result is still a full 320 x 240 perfect maze with 1px corridors and the
usual thicket of dead ends. Only its *solution* is constrained. The maze does
not look easier, and under fog it does not play easier — it is simply
expressible.

**The same constraint applies at every difficulty**, so a given seed is the
same maze on EASY and on ONE FRAME. You can study a seed at leisure and then
attempt it at 1x.

---

## 5. Player and input

- One white pixel. 4-connected movement, no diagonals. A 1px corridor admits
  nothing else.
- **Always in motion.** Once the run starts you cannot stop, only steer.
- Initial direction is auto-set inward from the spawn gap. There is exactly
  one legal choice.
- Step period is per-difficulty (§7). At 1x it is the pixel period, 164.4 ns.

### Buffered junction input

Input does **not** take effect at a timestamp. It is buffered and consumed at
the next branch:

- **Forced bend** — the corridor turns but offers only one continuation. The
  pixel follows it automatically. **Costs no input.**
- **Junction** — two or more continuations. Consumes one buffered direction.
- **Dead end** — no continuation. This is a wall, and walls kill.

This is load-bearing, not a convenience. See the derivation below.

### Why timing-precise input is impossible

The obvious model — a timestamped sequence of direction changes — cannot
work at 1x. If a turn must land within one step period, the player can only
move one pixel per input opportunity. At the USB ceiling of 125 us that is
**133 pixels per frame**, and crossing a 320 x 240 field takes at least 560
pixels of Manhattan distance. The player could not reach the far edge, let
alone navigate.

Buffering decouples input rate from movement rate. The pixel runs at the
full 164.4 ns step period while inputs arrive at whatever rate the hardware
allows, so route *length* stops mattering and only **decision count** does.

### The decision budget

USB HID delivers at most one report per poll interval, which caps decisions
per frame regardless of the movement model:

| USB HID mode | Poll interval | Inputs per 16.6833 ms frame |
|---|---|---|
| USB 1.1 legacy | 8 ms | 2 |
| USB 2.0 full-speed | 1 ms | 16 |
| **USB 2.0 high-speed** | **125 us** | **133** |

**`DECISION_BUDGET = 133`**, taken from the USB 2.0 high-speed ceiling —
the real limit of the fastest keyboard that exists. Maze generation is
constrained to it (§4).

A report is a full state snapshot of which keys are down, so any of the four
directions (or none) is expressible on any poll. Consecutive *different*
directions cost one report each.

### Input is a tape

Input is still modelled as a **tape** — now a sequence of junction decisions
rather than timestamped direction changes. Live arrow-key play writes one in
real time; Compile Mode (§8) authors one at leisure.

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

**As a floor** (ONE FRAME only): **you may not occupy a pixel the beam
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

Three rungs. Every difficulty plays the **same maze** for a given seed
(§4) — only the clock and the step period change.

| Level | Step period | Time limit | Beam role | Winnable by |
|---|---|---|---|---|
| **EASY** | ~12 ms | none | intro flourish | anyone patient |
| **MEDIUM** | ~12 ms | reaction-par (~47 s) | intro flourish | a *perfect* human |
| **ONE FRAME** | 164.4 ns | 16.6833 ms | light + floor | a machine driving an 8 kHz USB keyboard |

EASY and MEDIUM are parameterized around human reaction time. ONE FRAME is
parameterized around the USB HID ceiling. They are not a single scalar; see
below.

### Why the rungs are not one parameter

Preserving the ONE FRAME beam relationship (~423 steps per row) at a
reaction-calibrated step period of ~12 ms requires a row period of ~5 s,
which makes the frame **20 minutes**. Compressing the frame to a playable
~1 minute instead makes the beam far *more* binding than at 1x, so the
wavefront rather than reaction sets the pace.

Either way, reaction stops being the binding constraint — which contradicts
the definition of MEDIUM. **The causality rule is therefore exclusive to
ONE FRAME.** It is a mechanic that only exists at machine timescales,
because it requires the player to be much faster than the beam, which only a
human is not.

### The rung that was removed

An earlier draft had a fourth rung, HARD, defined as "dilated until a 1 kHz
keyboard can just express a turn." Calibrating ONE FRAME to the USB ceiling
absorbed that principle — the keyboard floor *is* ONE FRAME now — and with
forced bends costing no input (§5), HARD's arithmetic (~33 s) collapsed into
MEDIUM's (~47 s) anyway.

Arbitrary intermediate timescales remain available through the dilation
control (§10), which is a continuous knob and does not need to be a rung.

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

Because forced bends auto-follow (§5), only genuine branches cost the player
anything:

| Event | What the player does | Cost |
|---|---|---|
| Straight corridor | nothing | 0 |
| Forced bend | nothing — the pixel follows the corridor | **0** |
| **Junction** | choice reaction, 2-3 live options (Hick's law) | **~350 ms** |
| Dead end | never occurs on the optimal route | — |

```
T_par = t_start + SUM(junctions x 350ms)

s     = T_par / path_length          (step period)
```

The second equation is not an independent choice. Dividing the deadline by
the route length automatically makes the median run *between junctions* take
exactly one reaction interval — so reaction is the binding constraint by
construction, and the two parameters are self-consistent.

**Illustrative numbers** (route stats are placeholders until the analyzer
exists — see §12):

| | |
|---|---|
| Route | 4,000 px, at the 133-junction budget |
| 133 junctions x 350 ms | 46.6 s |
| **T_par** | **~47 s** |
| Step period `s` | ~12 ms (~86 px/s) |
| Mean run between junctions | ~30 px = ~350 ms |
| Shipped deadline (k = 1.15) | ~54 s |

So MEDIUM is roughly a **one-minute sustained precision run at the edge of
human reaction, with one life.** Failing at junction 132 returns you to the
start. In shape it is a no-miss rhythm chart with instant death.

Auto-follow shortened this level considerably — an earlier draft charged
150 ms per forced bend and landed near three minutes. Charging only for real
decisions is both more honest and a tighter level.

**Slack.** `k = 1.15` ships as default. `k = 1.0` — the literal
reaction-optimum, with no room for a single stutter across 133 decisions —
is exposed as **MEDIUM (PAR)** and is the scored mode.

---

### ONE FRAME — the top rung

1x. The full premise: fog of war, beam as light and floor, 16.6833 ms,
one life.

**ONE FRAME is calibrated to the USB HID ceiling, not beyond it.** The level
is defined as *the hardest maze a USB keyboard can express in one frame* —
a principled boundary rather than an arbitrary impossibility. The maze
generator is constrained to exactly that budget (§4).

| | |
|---|---|
| Decisions required | 133 |
| Delivered over | 16.6833 ms |
| **Required input rate** | **~7,980 decisions/second** |
| 8 kHz USB HID supplies | 8,000 polls/second |

The margin is about 20 polls across the whole frame. Nothing is wasted, and
nothing is impossible.

**It is solvable, and not human-playable.** That distinction is the entire
point of the project, and the name is a constraint rather than a verdict:

- The maze is a spanning tree, so a path always exists.
- A winning tape always exists and can be computed.
- That tape fits inside the decision budget by construction, so **commodity
  hardware can execute it** — an 8 kHz keyboard driven by a machine, no
  custom silicon required.
- No human can produce 7,980 correct decisions per second. The ceiling is
  roughly 20 keypresses per second, and far fewer when each one is a choice.

The gap is about **400x on raw keypress rate and ~2,000x on decisions**, and
it is the only thing standing between a player and a win. Every other barrier
has been removed deliberately.

The tape replay mode (§10) is therefore not a curiosity — it is the
**demonstration that the level is real.** It shows YOU WIN, at full speed,
in one frame.

---

## 8. Compile Mode

An orthogonal axis, not a difficulty. You pick a **level** and an **input
method** (live arrows / authored tape). It is the intended way to beat
ONE FRAME.

**Three phases**

1. **STUDY** — untimed. Full maze, spawn, exit. Pan, zoom, trace routes. Take
   a week.
2. **COMPILE** — author the tape. Nothing executes.
3. **RUN** — one frame, real time, at 1x.

At 1x the RUN phase is literally one frame of light: the screen flashes and
you get an answer. That is correct and should stay that way. **The execution
is a flash; the replay is the spectacle.**

### The tape

Because forced bends auto-follow and only junctions consume input (§5), the
tape is simply the sequence of branch decisions along your route:

```
NORTH
WEST
NORTH
EAST
...
```

No step counts, no timestamps. **At most 133 entries.**

The whole game in one sentence:

> Find a path from spawn to exit that makes at most `DECISION_BUDGET`
> branch decisions and whose beam-adjusted execution fits in one frame.

### The budget is hardware, par is the route

Two different numbers, and the distinction matters:

- **`DECISION_BUDGET` = 133** is a hardware constant (§5). It is a hard
  ceiling on any tape, and maze generation is constrained to respect it.
- **Par** is the junction count of the cheapest time-feasible route on
  *this* seed, computed by the solver. Always <= 133.

The solver still works a Pareto frontier over (decisions, beam-adjusted
time), because the objectives fight: the minimum-decision route tends to be
long and may blow the frame, while the shortest route tends to branch more.
Par is the decision count of the cheapest route that is still time-feasible —
computed, provably optimal, tight.

Par plus ~5-10% slack is the shipped budget, giving a scoring gradient. You
cannot beat par; you can only reach it.

Seeds with no feasible route are rejected at generation. A toggle exposes the
raw distribution — the proportion of dead-on-arrival seeds is itself an
interesting number.

### What makes it hard

- **Routing is genuinely hard.** Minimum-decision pathfinding under a time
  constraint on a ~19,000-cell lattice is not a BFS you do in your head.
- **Descent scheduling.** Every first-descent stalls you, and stall cost is
  invisible on the map. You must reason about paint times.
- **Cold run** (below).

Note what is *not* on this list any more. An earlier draft used run-length
encoded instructions with explicit step counts, which made a single
off-by-one anywhere in the tape fatal. Buffered junction input removes step
counts entirely. That was tedium rather than difficulty, and losing it is a
straightforward improvement.

It also makes Compile Mode considerably lighter than previously planned: a
133-entry decision list is not hard to author. **The hard part was never
authoring the tape — it was executing it**, and Compile Mode exists to move
execution off human hands and onto the input hardware.

### Two categories

- **DEBUG** — unlimited simulation during COMPILE. This is the puzzle game,
  and it is how real TAS work is done. Legitimate.
- **COLD** — author blind, one execution, no test runs. Honors the one-life
  constraint. The scoring mode of record.

Optional middle tier: three test runs, then commit.

**Scoring:** decisions used against par, with time remaining at the exit as
tiebreak.

### Authoring interface

- **Route drawing** (primary) — trace the path on the maze; the game derives
  the decision list and shows the count against par live.
- **Raw tape text** (expert) — type the decision sequence directly.

Route drawing must include a **stall overlay**: where along the route the
beam will hold you, and for how long. Without it the time budget is opaque
guesswork rather than reasoning.

---

## 9. Feasibility analysis

The project's actual payload.

Two of the three barriers an earlier draft relied on have been **deliberately
removed**, so that exactly one thing stands between a player and a win.

| Barrier | Status | Why |
|---|---|---|
| **Turn precision** | *removed* | Buffered junction input (§5). No timestamp has to be hit. |
| **Route complexity** | *removed* | Generation is capped at the decision budget (§4). The route is always expressible. |
| **Decision rate** | **the wall** | 133 decisions in 16.6833 ms = ~7,980 per second. |

That leaves a single, clean statement of the problem:

> ONE FRAME requires ~7,980 correct branch decisions per second.
> An 8 kHz USB keyboard supplies 8,000 polls per second.
> A human supplies about 20 — and far fewer when each is a choice.

### The machine boundary

The line is not the display, and it is no longer custom silicon. It is
whether a *machine* is driving the keys.

| Player | Decisions/second | ONE FRAME |
|---|---|---|
| Human, raw keypress ceiling | ~20 | no |
| Human, choice reactions | ~3-4 | no |
| USB 1.1 legacy (125 Hz) | 125 | no |
| USB 2.0 full-speed (1 kHz) | 1,000 | no |
| **USB 2.0 high-speed (8 kHz), machine-driven** | **8,000** | **yes** |

The gap is **~400x on raw keypress rate and ~2,000x on decisions.** No FPGA,
no custom timing hardware, no direct API access — a commodity 8 kHz keyboard
and something other than hands.

This is what "theoretically possible, just not for a human" means precisely,
and calibrating the level to the hardware ceiling rather than past it makes
the claim tight instead of merely large.

### Why the top rung is no longer over-determined

Piling up independent impossibilities makes a level *unwinnable*, which is a
weaker and less interesting claim than *exactly at the limit*. Removing the
precision and complexity walls costs nothing — no human was ever going to
clear the decision-rate wall — and it buys a level whose difficulty is a
measured hardware property rather than a designer's assertion.

### The merciful case

No minimum path length is enforced, so with vanishing probability the spawn
gap sits adjacent to the exit gap with zero junctions between them, and
simply holding the initial direction wins.

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
- **Compile** — decision-list editor, count vs. par and vs. `DECISION_BUDGET`,
  stall overlay, time projection
- **Run** — 320 x 240, 1:1 pixels, phosphor persistence, optional
  scanline/bloom/barrel treatment
- **Verdict** — YOU WIN / YOU LOSE, 8x8 bitmap font, on the following frame
- **Autopsy** — dilated replay with scrubber; death timestamp in us, beam
  position at death, the decision index that killed you, stall accounting,
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
2. **Solver + analyzer** — Pareto frontier over (decisions, beam-adjusted
   time); emits winning tapes; batch-runs N seeds for route statistics.
   Also supplies the decision-budget-constrained path used by generation
   (§4), so it is entangled with Phase 1 rather than strictly after it.
3. **Renderer** — canvas, phosphor persistence, beam reveal, CRT treatment.
4. **Shell** — title, rules, study, verdict, autopsy, dilation, seed entry.
5. **Compile UI** — tape editor, route drawing, stall overlay. The largest
   single surface in the project.
6. **Writeup** — seed distribution study and the feasibility argument.

### Phase 2 is a hard dependency, not a nice-to-have

MEDIUM's deadline **cannot be computed** without per-seed route statistics:
optimal path length and junction count. Compile Mode's par needs the same
solver.

The decision-budget constraint (§4) tightened this further: **maze generation
itself now needs a decision-counting router**, so no difficulty ships without
at least that much of Phase 2. Full Pareto analysis is still only required
for MEDIUM and Compile Mode.

---

## 14. Open parameters

Everything below is a placeholder pending measurement. None of it is a
constant.

| Parameter | Working value | Needs |
|---|---|---|
| `DECISION_BUDGET` | 133 (8 kHz USB) | fixed by hardware, not tunable |
| Route length under the budget | ~4,000 px | Phase 2 measurement |
| Junctions on the optimal route | <= 133 by construction | Phase 2 measurement |
| Mean run between junctions | ~30 px | Phase 2 measurement |
| Junction reaction cost | 350 ms | calibration against real play |
| MEDIUM slack `k` | 1.15 (1.0 scored) | playtest |
| Compile par slack | 5-10% | playtest |
| Infeasible-seed policy | reject at generation | open |

`DECISION_BUDGET` is the one genuinely fixed number here — it is a property
of USB HID, not a design choice. Everything else is provisional. The reaction
constant is a literature value, not a measurement, and ships as config.

**Whether 133 is the right canonical ceiling is a judgement call**, not a
measurement: 8 kHz is the fastest keyboard that exists, but 1 kHz (16
decisions) is what nearly everyone actually owns. Dropping to 1 kHz would
make the maze solution drastically simpler and the level correspondingly
less interesting, which is why the ceiling was chosen. Worth revisiting.

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

DECISION_BUDGET       133             (8 kHz USB HID over one frame)
Required input rate   ~7,980 /s
8 kHz USB supplies    8,000 /s
Human ceiling         ~20 /s raw, ~3-4 /s for choices
```
