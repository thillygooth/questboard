// Leaderboards and the one-life-per-day rule. See DESIGN.md §11.
//
// Ranked play runs on a daily seed, so everyone faces the same field and times
// are comparable. Combined with one life that gives the intended shape: one
// attempt per mode per day, and when you die that mode is gone until tomorrow.
//
// Free Play uses random seeds, is unranked and unlimited. It is what makes
// one-life-per-day tolerable rather than merely punishing — and on Excruciating it is
// almost certainly how anyone who ever finishes will have prepared.

const KEY = 'pixel.runs.v1';

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function load() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(runs) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(runs));
  } catch { /* private browsing, incognito, quota — the game still plays */ }
}

/** One life per mode per day. Free Play is exempt. */
export function hasPlayedToday(modeId, isoDate = todayIso()) {
  return load().some((r) => r.ranked && r.modeId === modeId && r.isoDate === isoDate);
}

export function recordRun(run) {
  const runs = load();
  runs.push({ ...run, at: Date.now() });
  save(runs);
  return run;
}

/**
 * Both boards for a mode on a date. The progress board exists because on Excruciating
 * the escape board will frequently be empty, and a list of people who nearly
 * made it is still a leaderboard.
 */
export function boardsFor(modeId, isoDate = todayIso()) {
  const runs = load().filter((r) => r.ranked && r.modeId === modeId && r.isoDate === isoDate);
  return {
    escapes: runs.filter((r) => r.escaped).sort((a, b) => a.timeMs - b.timeMs),
    progress: runs.filter((r) => !r.escaped).sort((a, b) => a.closest - b.closest),
  };
}

/** Best escape per mode across every daily seed. */
export function allTime(modeId) {
  return load()
    .filter((r) => r.ranked && r.modeId === modeId && r.escaped)
    .sort((a, b) => a.timeMs - b.timeMs)[0] ?? null;
}

export function stats() {
  const runs = load();
  return {
    total: runs.length,
    escapes: runs.filter((r) => r.escaped).length,
    deaths: runs.filter((r) => !r.escaped).length,
  };
}

/**
 * A run is fully described by its seed, mode and input ticks, so a server can
 * replay it deterministically to confirm the time. That is the whole reason the
 * simulation is built the way it is (DESIGN.md §12). Nothing consumes this yet.
 */
export function encodeReplay({ seed, modeId, events }) {
  return { v: 1, seed, modeId, events };
}
