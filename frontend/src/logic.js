import { MONSTERS, REWARDS, LOOT_TABLE, TITLES, POWER_UPS } from './data';

// ── Dungeon map ────────────────────────────────────────────────────────────────

export const GRID_W = 34;
export const GRID_H = 22;

function seededRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xFFFFFFFF; };
}

// BSP dungeon generator — returns { grid, startPos, stairsUpPos, stairsDownPos, keyPos, chestPos }
export function generateFloor(dayKey, floor) {
  const seed = `${dayKey}_f${floor}`.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0) >>> 0;
  const rng = seededRng(seed);

  const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill('wall'));
  const rooms = [];

  const carve = (gx, gy) => { if (gx > 0 && gx < GRID_W-1 && gy > 0 && gy < GRID_H-1) grid[gy][gx] = 'floor'; };

  function placeRoom(x, y, w, h) {
    const r = { x, y, w, h, cx: x + Math.floor(w/2), cy: y + Math.floor(h/2) };
    for (let gy = y; gy < y+h; gy++) for (let gx = x; gx < x+w; gx++) carve(gx, gy);
    rooms.push(r); return r;
  }

  function corridor(x1, y1, x2, y2) {
    if (rng() < 0.5) {
      for (let x = Math.min(x1,x2); x <= Math.max(x1,x2); x++) carve(x, y1);
      for (let y = Math.min(y1,y2); y <= Math.max(y1,y2); y++) carve(x2, y);
    } else {
      for (let y = Math.min(y1,y2); y <= Math.max(y1,y2); y++) carve(x1, y);
      for (let x = Math.min(x1,x2); x <= Math.max(x1,x2); x++) carve(x, y2);
    }
  }

  function bsp(x1, y1, x2, y2, depth) {
    const w = x2-x1, h = y2-y1, MIN = 10;
    if (depth === 0 || (w < MIN && h < MIN)) {
      const rw = Math.max(4, Math.floor(rng() * Math.max(1, Math.min(w-3, 9))) + 4);
      const rh = Math.max(3, Math.floor(rng() * Math.max(1, Math.min(h-3, 7))) + 3);
      const rx = x1+1 + Math.floor(rng() * Math.max(1, w-rw-2));
      const ry = y1+1 + Math.floor(rng() * Math.max(1, h-rh-2));
      return placeRoom(Math.max(1, Math.min(rx, GRID_W-rw-2)), Math.max(1, Math.min(ry, GRID_H-rh-2)), rw, rh);
    }
    let c1, c2;
    if (w >= h && w >= MIN*2) {
      const split = x1 + MIN + Math.floor(rng() * (w - MIN*2));
      c1 = bsp(x1, y1, split, y2, depth-1); c2 = bsp(split, y1, x2, y2, depth-1);
    } else if (h >= MIN*2) {
      const split = y1 + MIN + Math.floor(rng() * (h - MIN*2));
      c1 = bsp(x1, y1, x2, split, depth-1); c2 = bsp(x1, split, x2, y2, depth-1);
    } else {
      return placeRoom(Math.max(1,x1+1), Math.max(1,y1+1), Math.min(w-2,8), Math.min(h-2,6));
    }
    corridor(c1.cx, c1.cy, c2.cx, c2.cy);
    return c1;
  }

  bsp(0, 0, GRID_W, GRID_H, 3);
  if (rooms.length < 2) { placeRoom(2,2,8,6); placeRoom(22,13,8,6); corridor(6,5,26,16); }

  // Scatter gold/traps/monsters on random floor tiles
  const floorCells = [];
  for (let gy = 0; gy < GRID_H; gy++)
    for (let gx = 0; gx < GRID_W; gx++)
      if (grid[gy][gx] === 'floor') floorCells.push([gx, gy]);

  const extras = 8 + Math.floor(rng() * 6);
  for (let i = 0; i < extras && floorCells.length; i++) {
    const idx = Math.floor(rng() * floorCells.length);
    const [gx, gy] = floorCells.splice(idx, 1)[0];
    const r = rng();
    grid[gy][gx] = r < 0.28 ? 'gold_s' : r < 0.50 ? 'gold_l' : r < 0.64 ? 'chest' : r < 0.78 ? 'trap' : 'monster';
  }

  // Place special tiles in distinct rooms
  const n = rooms.length;
  const startRoom      = rooms[0];
  const stairsUpRoom   = rooms[Math.min(1, n-1)];
  const keyRoom        = rooms[Math.max(1, Math.round(n * 0.4))];
  const chestRoom      = rooms[Math.max(2, Math.round(n * 0.65))];
  const stairsDownRoom = rooms[n-1];

  grid[stairsDownRoom.cy][stairsDownRoom.cx] = 'stairs_down';
  grid[keyRoom.cy][keyRoom.cx] = 'key';
  if (chestRoom !== keyRoom) grid[chestRoom.cy][chestRoom.cx] = 'locked_chest';

  return {
    grid,
    startPos:      [startRoom.cx, startRoom.cy],
    stairsUpPos:   [stairsUpRoom.cx, stairsUpRoom.cy],
    stairsDownPos: [stairsDownRoom.cx, stairsDownRoom.cy],
    keyPos:        [keyRoom.cx, keyRoom.cy],
    chestPos:      [chestRoom.cx, chestRoom.cy],
  };
}

// Read tile from generated grid; out-of-bounds → 'wall'
export function getTileAt(grid, gx, gy) {
  if (!grid || gy < 0 || gy >= GRID_H || gx < 0 || gx >= GRID_W) return 'wall';
  return grid[gy][gx];
}

export function initDungeonMap(dayKey, floor = 1) {
  const data = generateFloor(dayKey, floor);
  if (floor > 1) data.grid[data.stairsUpPos[1]][data.stairsUpPos[0]] = 'stairs_up';
  const [sx, sy] = data.startPos;
  return {
    grid: data.grid,
    pos: data.startPos,
    startPos: data.startPos,
    explored: [`${sx},${sy}`],
    pendingMoves: 0,
    activeMonster: null,
    dayKey,
    floor,
    hasKey: false,
    lockedChestOpened: false,
  };
}

export function dungeonMoveResult(mapState, dx, dy, dayKey, playerMode, luckLevel) {
  const [px, py] = mapState.pos;
  if (mapState.pendingMoves <= 0) return null;
  const floor = mapState.floor || 1;

  const nx = px + dx, ny = py + dy;
  const roomType = getTileAt(mapState.grid, nx, ny);
  if (roomType === 'wall') return null;

  const coordKey = `${nx},${ny}`;
  const alreadyVisited = mapState.explored.includes(coordKey);
  const newExplored = alreadyVisited ? mapState.explored : [...mapState.explored, coordKey];

  const [sx, sy] = mapState.startPos || [nx, ny];
  const depth = Math.max(Math.abs(nx - sx), Math.abs(ny - sy));
  const depthMult = 1 + 0.08 * Math.floor(depth / 3);
  const floorMult = 1 + 0.20 * (floor - 1);
  const totalMult = depthMult * floorMult * (1 + luckLevel * 1.2);

  let hasKey = mapState.hasKey || false;
  let lockedChestOpened = mapState.lockedChestOpened || false;

  // Stairs always trigger
  if (roomType === 'stairs_down') {
    const nf = floor + 1;
    const data = generateFloor(dayKey, nf);
    data.grid[data.stairsUpPos[1]][data.stairsUpPos[0]] = 'stairs_up';
    const [nsx, nsy] = data.startPos;
    return { newMap: { ...mapState, grid: data.grid, pos: data.startPos, startPos: data.startPos, explored: [`${nsx},${nsy}`], pendingMoves: mapState.pendingMoves - 1, activeMonster: null, floor: nf, hasKey: false, lockedChestOpened: false }, goldDelta: 0, event: { kind: 'stairs_down', label: `Descended to floor ${nf}` } };
  }
  if (roomType === 'stairs_up' && floor > 1) {
    const nf = floor - 1;
    const data = generateFloor(dayKey, nf);
    const [nsx, nsy] = data.startPos;
    return { newMap: { ...mapState, grid: data.grid, pos: data.startPos, startPos: data.startPos, explored: [`${nsx},${nsy}`], pendingMoves: mapState.pendingMoves - 1, activeMonster: null, floor: nf, hasKey: false, lockedChestOpened: false }, goldDelta: 0, event: { kind: 'stairs_up', label: `Ascended to floor ${nf}` } };
  }

  // Safety: block movement while in active dungeon combat
  if (mapState.activeMonster && (mapState.activeMonster.currentHP ?? 0) > 0) return null;

  let goldDelta = 0, newActiveMonster = null, event = null;
  const h = `${nx},${ny},${floor}`.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0) >>> 0;

  if (!alreadyVisited) {
    switch (roomType) {
      case 'gold_s':  goldDelta = Math.round((1 + (h % 2))  * totalMult); event = { kind: 'gold',   label: 'Found coins',           gold: goldDelta }; break;
      case 'gold_l':  goldDelta = Math.round((2 + (h % 4))  * totalMult); event = { kind: 'gold',   label: 'Found treasure',         gold: goldDelta }; break;
      case 'chest':   goldDelta = Math.round((5 + (h % 5))  * totalMult); event = { kind: 'chest',  label: 'Treasure chest!',        gold: goldDelta }; break;
      case 'trap': {
        goldDelta = -Math.max(1, Math.round((3 + (h % 7) + Math.floor(floor/2)) * (1 - luckLevel * 0.6)));
        event = { kind: 'trap', label: 'Triggered a trap!', gold: -goldDelta }; break;
      }
      case 'monster': {
        const m = MONSTERS[h % MONSTERS.length];
        const isKid = playerMode === 'kids';
        const maxHP = isKid ? m.kidHP : m.adultHP;
        newActiveMonster = { id: m.id, name: m.name, gold: isKid ? m.kidGold : m.gold, maxHP, currentHP: maxHP, pos: [nx, ny] };
        event = { kind: 'monster', label: `${m.name} blocks the way!` }; break;
      }
      case 'key': hasKey = true; goldDelta = Math.round(1 * totalMult); event = { kind: 'key', label: 'Found the floor key!', gold: goldDelta }; break;
      case 'locked_chest':
        if (hasKey) { goldDelta = Math.round((10 + (h % 8)) * totalMult); hasKey = false; lockedChestOpened = true; event = { kind: 'locked_chest', label: 'Unlocked the bonus chest!', gold: goldDelta }; }
        else if (!lockedChestOpened) { event = { kind: 'locked_chest_locked', label: 'Locked! Find the key first.' }; }
        break;
      default: break;
    }
  } else if (roomType === 'locked_chest' && !lockedChestOpened && hasKey) {
    goldDelta = Math.round((10 + (h % 8)) * totalMult);
    hasKey = false; lockedChestOpened = true;
    event = { kind: 'locked_chest', label: 'Unlocked the bonus chest!', gold: goldDelta };
  }

  return { newMap: { ...mapState, pos: [nx, ny], explored: newExplored, pendingMoves: mapState.pendingMoves - 1, activeMonster: newActiveMonster, hasKey, lockedChestOpened }, goldDelta, event };
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function weekKey(weekStartDay = 1) {
  const d = new Date();
  const s = new Date(d);
  const dow = d.getDay();
  const diff = (dow - weekStartDay + 7) % 7;
  s.setDate(d.getDate() - diff);
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

export function dateSeededMonster(player, dateKey, playerLevel = 1) {
  const maxTier = playerLevel >= 9 ? 5 : playerLevel >= 7 ? 4 :
                  playerLevel >= 5 ? 3 : playerLevel >= 3 ? 2 : 1;
  const pool = MONSTERS.filter(m => (m.tier || 1) <= maxTier);
  const hash = `${player.id}${dateKey}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const m = pool[hash % pool.length];
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

export function rollLoot(dropMultiplier = 1) {
  if (Math.random() > Math.min(1, 0.10 * dropMultiplier)) return null;
  return LOOT_TABLE[Math.floor(Math.random() * LOOT_TABLE.length)];
}

export function getPlayerTitle(playerBadgeIds) {
  const set = new Set(playerBadgeIds || []);
  for (const { badge, title } of TITLES) {
    if (set.has(badge)) return title;
  }
  return null;
}

export function getTitleForBadge(badgeId) {
  return TITLES.find(t => t.badge === badgeId)?.title ?? null;
}

// ── Solo/party chore helpers ───────────────────────────────────────────────────
// Solo chores use a compound key "choreId:playerId" so each player tracks independently.

export function choreDoneKey(chore, playerId) {
  return (chore.mode === 'solo') ? `${chore.id}:${playerId}` : chore.id;
}

export function isChoreClaimedBy(store, chore, playerId) {
  if (chore.mode === 'solo') return store[`${chore.id}:${playerId}`] === playerId;
  return !!store[chore.id];
}

export function isChoreDoneForPlayer(store, chore, playerId) {
  if (chore.mode === 'solo') return store[`${chore.id}:${playerId}`] === playerId;
  return !!store[chore.id];
}

export function getChoreClaimant(store, chore, playerId) {
  if (chore.mode === 'solo') return store[`${chore.id}:${playerId}`] || null;
  return store[chore.id] || null;
}

// ── Power-ups ─────────────────────────────────────────────────────────────────

export function isPowerUpActive(activePowerUps, playerId, powerUpId) {
  const list = activePowerUps?.[playerId] || [];
  const now = Date.now();
  return list.some(p => p.id === powerUpId && (p.durationHours === 0 || now < p.activatedAt + p.durationHours * 3600000));
}

export function getActivePowerUps(activePowerUps, playerId) {
  const list = activePowerUps?.[playerId] || [];
  const now = Date.now();
  return list.filter(p => p.durationHours === 0 || now < p.activatedAt + p.durationHours * 3600000);
}

export function cleanExpiredPowerUps(activePowerUps) {
  if (!activePowerUps) return {};
  const now = Date.now();
  const cleaned = {};
  for (const [pid, list] of Object.entries(activePowerUps)) {
    const live = list.filter(p => p.durationHours === 0 || now < p.activatedAt + p.durationHours * 3600000);
    if (live.length) cleaned[pid] = live;
  }
  return cleaned;
}

export function checkPowerUpTriggers(powerUpSettings, counts) {
  const triggered = [];
  for (const [id, settings] of Object.entries(powerUpSettings || {})) {
    if (!settings.enabled) continue;
    const { trigger, count } = settings;
    let met = false;
    if (trigger === 'daily_chores')      met = counts.dailyChores >= count;
    if (trigger === 'weekly_chores')     met = counts.weeklyChores >= count;
    if (trigger === 'monthly_chores')    met = counts.monthlyChores >= count;
    if (trigger === 'kill_streak')       met = counts.killStreak >= count;
    if (trigger === 'all_dailies_done')  met = counts.allDailiesDone >= count;
    if (met) triggered.push(id);
  }
  return triggered;
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
