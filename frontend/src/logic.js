import { MONSTERS, REWARDS } from './data';

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function weekKey() {
  const d = new Date();
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  return `${s.getFullYear()}-${s.getMonth()}-${s.getDate()}`;
}

export function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function todayDow() {
  return new Date().getDay();
}

// player is a full player object with .id and .mode ('kids' | 'adults')
export function randomMonster(player) {
  const m = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
  return { ...m, maxHP: player.mode === 'kids' ? m.kidHP : m.adultHP };
}

export function dateSeededMonster(player, dateKey) {
  const hash = `${player.id}${dateKey}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const m = MONSTERS[hash % MONSTERS.length];
  return { ...m, maxHP: player.mode === 'kids' ? m.kidHP : m.adultHP };
}

// chores: the active chore list (already filtered by enabledChores + customChores)
export function getChoresFor(player, chores) {
  const dow = todayDow();
  const isKid = player.mode === 'kids';
  return chores
    .filter(c => c.who === 'all' || (isKid ? c.who === 'kids' : c.who === 'adults'))
    .filter(c => c.dow === undefined || c.dow === dow);
}

export function getRewardsFor(player, rewards) {
  const isKid = player.mode === 'kids';
  return rewards.filter(r => r.who === 'all' || (isKid ? r.who === 'kids' : r.who === 'adults'));
}

export function getLevelFromXP(totalXp) {
  let xp = totalXp;
  let level = 1;
  let threshold = 10;
  while (xp >= threshold) {
    xp -= threshold;
    level++;
    threshold = Math.floor(10 + 5 * (level - 1) * (level - 1));
  }
  return { level, xpInLevel: xp, xpNeeded: threshold };
}

export function critChanceForLevel(level) {
  return 0.05 + (level - 1) * 0.01;
}

export function luckForLevel(level) {
  return Math.min(0.5, 0.05 + (level - 1) * 0.02);
}
