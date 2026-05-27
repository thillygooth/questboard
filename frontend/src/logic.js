import { MONSTERS, REWARDS, LOOT_TABLE, TITLES } from './data';

// ── Dungeon map ────────────────────────────────────────────────────────────────

function roomHash(dayKey, floor, x, y) {
  return `${dayKey}_f${floor}_${x},${y}`.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0) >>> 0;
}

// Deterministic tile type for any coordinate — shared world, per-floor seed
// Distribution: corridor 24%, empty 20%, gold_s 14%, gold_l 9%, trap 8%, monster 7%, stairs 7%, chest 11%
export function getTileAt(dayKey, floor, x, y) {
  if (x === 0 && y === 0) return 'start';
  const h = roomHash(dayKey, floor, x, y);
  const r = (h >>> 0) / 0xffffffff;
  if (r < 0.24) return 'corridor';
  if (r < 0.44) return 'empty';
  if (r < 0.58) return 'gold_s';
  if (r < 0.67) return 'gold_l';
  if (r < 0.75) return 'trap';
  if (r < 0.82) return 'monster';
  if (r < 0.89) return 'stairs';
  return 'chest';
}

export function initDungeonMap(dayKey) {
  return {
    pos: [0, 0],
    explored: ['0,0'],
    pendingMoves: 0,
    activeMonster: null,
    dayKey,
    floor: 1,
  };
}

export function dungeonMoveResult(mapState, dx, dy, dayKey, playerMode, luckLevel) {
  const [px, py] = mapState.pos;
  if (mapState.pendingMoves <= 0) return null;
  const floor = mapState.floor || 1;

  const nx = px + dx;
  const ny = py + dy;
  const key = `${nx},${ny}`;
  const roomType = getTileAt(dayKey, floor, nx, ny);
  const alreadyVisited = mapState.explored.includes(key);
  const newExplored = alreadyVisited ? mapState.explored : [...mapState.explored, key];

  // Depth bonus: +10% gold per 5 tiles from origin; floor bonus: +15% per floor
  const chebDist = Math.max(Math.abs(nx), Math.abs(ny));
  const depthMult  = 1 + 0.10 * Math.floor(chebDist / 5);
  const floorMult  = 1 + 0.15 * (floor - 1);
  const luckMult   = 1 + luckLevel * 1.2;
  const totalMult  = depthMult * floorMult * luckMult;

  let goldDelta = 0;
  let newActiveMonster = null;
  let event = null;
  let newFloor = floor;
  let newPos = [nx, ny];
  let finalExplored = newExplored;

  if (!alreadyVisited) {
    const h = roomHash(dayKey, floor, nx, ny);
    switch (roomType) {
      case 'gold_s': {
        goldDelta = Math.round((4 + (h % 7)) * totalMult);
        event = { kind: 'gold', label: 'Found coins', gold: goldDelta };
        break;
      }
      case 'gold_l': {
        goldDelta = Math.round((14 + (h % 12)) * totalMult);
        event = { kind: 'gold', label: 'Found treasure', gold: goldDelta };
        break;
      }
      case 'chest': {
        goldDelta = Math.round((28 + (h % 22)) * totalMult);
        event = { kind: 'chest', label: 'Treasure chest!', gold: goldDelta };
        break;
      }
      case 'trap': {
        const raw = 3 + (h % 7) + Math.floor(floor / 2);
        const reduced = Math.max(1, Math.round(raw * (1 - luckLevel * 0.6)));
        goldDelta = -reduced;
        event = { kind: 'trap', label: 'Triggered a trap!', gold: reduced };
        break;
      }
      case 'monster': {
        const mIdx = h % MONSTERS.length;
        const m = MONSTERS[mIdx];
        const isKid = playerMode === 'kids';
        newActiveMonster = { id: m.id, name: m.name, gold: isKid ? m.kidGold : m.gold };
        event = { kind: 'monster', label: `${m.name} lurks!` };
        break;
      }
      case 'stairs': {
        newFloor = floor + 1;
        newPos = [0, 0];
        finalExplored = ['0,0'];
        event = { kind: 'stairs', label: `Descended to floor ${newFloor}` };
        break;
      }
      default: break;
    }
  }

  const newMap = {
    ...mapState,
    pos: newPos,
    explored: finalExplored,
    pendingMoves: mapState.pendingMoves - 1,
    activeMonster: newActiveMonster,
    floor: newFloor,
  };

  return { newMap, goldDelta, event };
}

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

// Re-derive HP/gold from current data.js by ID, so stale stored objects always use latest values.
export function resolveMonster(stored, player) {
  if (!stored) return null;
  const base = MONSTERS.find(m => m.id === stored.id) ?? MONSTERS[0];
  const isKid = player.mode === 'kids';
  return { ...base, maxHP: isKid ? base.kidHP : base.adultHP, gold: isKid ? base.kidGold : base.gold };
}

// player is a full player object with .id and .mode ('kids' | 'adults')
export function randomMonster(player) {
  const m = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
  const isKid = player.mode === 'kids';
  return { ...m, maxHP: isKid ? m.kidHP : m.adultHP, gold: isKid ? m.kidGold : m.gold };
}

export function dateSeededMonster(player, dateKey) {
  const hash = `${player.id}${dateKey}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const m = MONSTERS[hash % MONSTERS.length];
  const isKid = player.mode === 'kids';
  return { ...m, maxHP: isKid ? m.kidHP : m.adultHP, gold: isKid ? m.kidGold : m.gold };
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

export function streakMultiplier(streak) {
  if (streak >= 14) return 2.0;
  if (streak >= 7)  return 1.5;
  if (streak >= 3)  return 1.2;
  return 1.0;
}

export function dailyBonusChoreId(choreIds, dateKey) {
  if (!choreIds.length) return null;
  const hash = dateKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return choreIds[hash % choreIds.length];
}

export function rollLoot() {
  if (Math.random() > 0.10) return null;
  return LOOT_TABLE[Math.floor(Math.random() * LOOT_TABLE.length)];
}

export function getPlayerTitle(playerBadgeIds) {
  const set = new Set(playerBadgeIds || []);
  for (const { badge, title } of TITLES) {
    if (set.has(badge)) return title;
  }
  return null;
}

export function checkNewBadges(existingBadges, { streak, gold, monstersKilled, rewardsRedeemed, luckyCount, penaltyFreeDays }) {
  const existing = new Set(existingBadges || []);
  const earned = [];
  if (!existing.has('first_blood')    && monstersKilled >= 1)   earned.push('first_blood');
  if (!existing.has('streak_3')       && streak >= 3)           earned.push('streak_3');
  if (!existing.has('streak_7')       && streak >= 7)           earned.push('streak_7');
  if (!existing.has('streak_14')      && streak >= 14)          earned.push('streak_14');
  if (!existing.has('big_spender')    && rewardsRedeemed >= 5)  earned.push('big_spender');
  if (!existing.has('gold_hoarder')   && gold >= 100)           earned.push('gold_hoarder');
  if (!existing.has('monster_slayer') && monstersKilled >= 10)  earned.push('monster_slayer');
  if (!existing.has('lucky_charm')    && luckyCount >= 3)       earned.push('lucky_charm');
  if (!existing.has('untouchable')    && penaltyFreeDays >= 7)  earned.push('untouchable');
  return earned;
}
