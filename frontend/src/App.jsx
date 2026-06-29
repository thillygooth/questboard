import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { ALL_CHORES, REWARDS, BADGES, MONSTER_TAUNTS, POWER_UPS, OVERKILL_CHARGE_GOAL, POWER_TOKEN_CAP, POWER_TOKEN_CHOICES } from './data';
import { todayKey, weekKey, monthKey, dateSeededMonster, getLevelFromXP, critChanceForLevel, luckForLevel, streakMultiplier, dailyBonusChoreId, rollLoot, checkNewBadges, getPlayerTitle, getTitleForBadge, isPowerUpActive, getActivePowerUps, cleanExpiredPowerUps, checkPowerUpTriggers, choreDoneKey, isChoreDoneForPlayer, initDungeonMap, dungeonMoveResult, generateFloor } from './logic';
import PlayerCard from './components/PlayerCard';
import ChoreGrid from './components/ChoreGrid';
import RewardGrid from './components/RewardGrid';
import DungeonBackground from './components/DungeonBackground';
import Torches from './components/Torches';
import TileSprite from './components/TileSprite';
import Celebration from './components/Celebration';
import { playHit, playKill, playFanfare, playUndo, playRedeem, playCrit, playKeyPickup, isMuted, setMuted } from './sounds';

// Code-split the heavy, conditionally-rendered views so a low-end device only
// parses+evaluates them when first opened. SetupWizard in particular is large
// and unused on a normal launch. The core chores view (PlayerCard/ChoreGrid)
// stays eager so the default screen has no loading gap.
const HistoryTab = lazy(() => import('./components/HistoryTab'));
const BountyBoard = lazy(() => import('./components/BountyBoard'));
const DungeonMap = lazy(() => import('./components/DungeonMap'));
const SetupWizard = lazy(() => import('./components/SetupWizard'));

const API = '/api';

function makeDefaultState(players) {
  const zeros = Object.fromEntries(players.map(p => [p.id, 0]));
  return {
    gold: { ...zeros },
    xp: { ...zeros },
    streaks: { ...zeros },
    prestige: { ...zeros },
    weeklyGold: { ...zeros },
    badges: Object.fromEntries(players.map(p => [p.id, []])),
    badgeProgress: Object.fromEntries(players.map(p => [p.id, { monsters_killed: 0, rewards_redeemed: 0, lucky_count: 0, penalty_free_days: 0 }])),
    selectedTitles: {},
    dailyDone: {},
    weeklyDone: {},
    monthlyDone: {},
    weekKey: '',
    todayKey: '',
    monthKey: '',
    history: [],
    bounties: [],
    monsterDamage: {},
    monsterPenalties: {},
    damageLog: {},
    overkillCharge: { ...zeros },
    storedPowerTokens: { ...zeros },
    activePowerUps: {},
    dungeonMaps: {},
  };
}

function applyAutoResets(raw, players, weekStartDay = 1) {
  const state = { ...makeDefaultState(players), ...raw };

  // migrate old points field to gold
  if (raw.points && !raw.gold) state.gold = raw.points;

  let changed = false;
  const penaltyMsgs = [];

  if (state.todayKey !== todayKey()) {
    const yKey = state.todayKey;
    const zeros = Object.fromEntries(players.map(p => [p.id, 0]));
    const newStreaks = { ...zeros, ...(state.streaks || {}) };

    if (yKey) {
      players.forEach(pl => {
        const plLevel = getLevelFromXP(state.xp?.[pl.id] || 0).level;
        const m = dateSeededMonster(pl, yKey, plLevel);
        const dmg = (state.monsterDamage?.[pl.id]?.[yKey]) || 0;
        if (dmg >= m.maxHP) {
          newStreaks[pl.id] = (newStreaks[pl.id] || 0) + 1;
        } else {
          newStreaks[pl.id] = 0;
          const pKey = `${pl.id}_${yKey}`;
          const shieldActive = isPowerUpActive(state.activePowerUps, pl.id, 'shield_aura');
          if (!shieldActive && !(state.monsterPenalties || {})[pKey]) {
            state.gold = { ...state.gold, [pl.id]: Math.max(0, (state.gold[pl.id] || 0) - m.atk) };
            state.monsterPenalties = { ...state.monsterPenalties, [pKey]: true };
            state.history = [...(state.history || []), { type: 'penalty', player: pl.name, name: m.name, pts: m.atk, ts: Date.now() }];
            const taunt = MONSTER_TAUNTS[m.id] || `${m.name} attacks!`;
            penaltyMsgs.push(`⚠ ${pl.name}: ${taunt} -${m.atk} gold`);
          }
        }
      });
    }

    // Track penalty-free days and check badges
    players.forEach(pl => {
      const prog = state.badgeProgress?.[pl.id] || { monsters_killed: 0, rewards_redeemed: 0, lucky_count: 0, penalty_free_days: 0 };
      const hadPenalty = penaltyMsgs.some(msg => msg.includes(pl.name));
      const newPfd = hadPenalty ? 0 : (prog.penalty_free_days || 0) + 1;
      const newProg = { ...prog, penalty_free_days: newPfd };
      const existingBadges = state.badges?.[pl.id] || [];
      const newBadgeIds = checkNewBadges(existingBadges, {
        streak: newStreaks[pl.id] || 0,
        gold: state.gold?.[pl.id] || 0,
        monstersKilled: prog.monsters_killed || 0,
        rewardsRedeemed: prog.rewards_redeemed || 0,
        luckyCount: prog.lucky_count || 0,
        penaltyFreeDays: newPfd,
      });
      state.badgeProgress = { ...state.badgeProgress, [pl.id]: newProg };
      if (newBadgeIds.length) {
        state.badges = { ...state.badges, [pl.id]: [...existingBadges, ...newBadgeIds] };
      }
    });

    // Auto-activate stored power tokens at day reset
    players.forEach(pl => {
      const tokens = state.storedPowerTokens?.[pl.id] || 0;
      if (tokens > 0) {
        const rewardId = POWER_TOKEN_CHOICES[Math.floor(Math.random() * POWER_TOKEN_CHOICES.length)];
        const pu = POWER_UPS.find(p => p.id === rewardId);
        if (pu) {
          const existing = state.activePowerUps?.[pl.id] || [];
          const activated = { id: rewardId, activatedAt: Date.now(), durationHours: pu.effectType === 'instant' ? 0 : 24 };
          state.activePowerUps = { ...(state.activePowerUps || {}), [pl.id]: [...existing, activated] };
          state.storedPowerTokens = { ...(state.storedPowerTokens || {}), [pl.id]: tokens - 1 };
        }
      }
    });

    // Clean up expired power-ups
    state.activePowerUps = cleanExpiredPowerUps(state.activePowerUps);

    state.streaks = newStreaks;
    state.dailyDone = {};
    state.todayKey = todayKey();
    state.damageLog = {};
    state.overkillCharge = { ...zeros, ...(state.overkillCharge || {}) };
    // Dungeon persists — just grant daily bonus moves instead of resetting
    if (!state.dungeonMaps) state.dungeonMaps = {};
    players.forEach(pl => {
      const dm = state.dungeonMaps[pl.id];
      const bonusMoves = 5 + Math.floor(Math.random() * 6);
      if (dm?.grid) {
        state.dungeonMaps[pl.id] = { ...dm, pendingMoves: (dm.pendingMoves || 0) + bonusMoves, dayKey: state.todayKey };
      } else {
        state.dungeonMaps[pl.id] = { ...initDungeonMap(state.todayKey, 1), pendingMoves: bonusMoves };
      }
    });
    changed = true;
  }

  if (state.weekKey !== weekKey(weekStartDay)) {
    state.weeklyDone = {};
    state.weekKey = weekKey(weekStartDay);
    state.weeklyGold = Object.fromEntries(players.map(p => [p.id, 0]));
    changed = true;
  }

  if (state.monthKey !== monthKey()) {
    state.monthlyDone = {};
    state.monthKey = monthKey();
    changed = true;
  }

  // Ensure all players have a valid BSP-grid dungeon map
  if (!state.dungeonMaps) state.dungeonMaps = {};
  players.forEach(pl => {
    const dm = state.dungeonMaps[pl.id];
    if (!dm || !dm.grid) {
      const startMoves = 5 + Math.floor(Math.random() * 6);
      state.dungeonMaps[pl.id] = { ...initDungeonMap(state.todayKey || todayKey(), 1), pendingMoves: startMoves };
      changed = true;
    }
  });

  return { state, changed, penaltyMsgs };
}

// Pick a projected overkill reward (deterministic per player+day)
function getProjectedOverkillReward(playerId) {
  const hash = `${playerId}${todayKey()}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return POWER_TOKEN_CHOICES[hash % POWER_TOKEN_CHOICES.length];
}

export default function App() {
  const [config, setConfig] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [serverState, setServerState] = useState(null);
  const [selected, setSelected] = useState(null);
  const [currentTab, setCurrentTab] = useState('chores');
  const [toast, setToast] = useState({ msg: '', visible: false });
  const [loading, setLoading] = useState(true);
  const [lastHits, setLastHits] = useState({});
  const [celebration, setCelebration] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [menuOpen, setMenuOpen] = useState(false);
  const lastActionAt = useRef(0);
  const lastChoreAt = useRef(0);
  const comboRef = useRef(0);
  const [comboDisplay, setComboDisplay] = useState(0);

  const players = config?.players ?? [];

  const activeRewards = useMemo(() => {
    if (!config) return REWARDS;
    const enabled = new Set(config.enabledRewards ?? REWARDS.map(r => r.id));
    const overrides = config.rewardOverrides ?? {};
    const base = REWARDS
      .filter(r => enabled.has(r.id))
      .map(r => overrides[r.id] ? { ...r, ...overrides[r.id] } : r);
    return [...base, ...(config.customRewards ?? [])];
  }, [config]);

  const activeChores = useMemo(() => {
    if (!config) return [];
    const enabled = new Set(config.enabledChores ?? []);
    const overrides = config.choreOverrides ?? {};
    const base = ALL_CHORES
      .filter(c => enabled.has(c.id))
      .map(c => overrides[c.id] ? { ...c, ...overrides[c.id] } : c);
    return [...base, ...(config.customChores ?? []).map(c => overrides[c.id] ? { ...c, ...overrides[c.id] } : c)];
  }, [config]);

  const bonusChoreId = useMemo(() => {
    if (!activeChores.length) return null;
    return dailyBonusChoreId(activeChores.map(c => c.id), todayKey());
  }, [activeChores]);

  const showToast = useCallback((msg) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }, []);

  const saveState = useCallback(async (state) => {
    try {
      await fetch(`${API}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch (e) {
      console.error('Save failed', e);
    }
  }, []);

  // Initial load: fetch config, then game state
  useEffect(() => {
    async function init() {
      try {
        const cfgRes = await fetch(`${API}/config`);
        const cfg = await cfgRes.json();

        if (cfg.needs_setup) {
          setNeedsSetup(true);
          setLoading(false);
          return;
        }

        setConfig(cfg);

        const stateRes = await fetch(`${API}/state`);
        const fetched = await stateRes.json();
        const { state: after, changed, penaltyMsgs } = applyAutoResets(fetched, cfg.players, cfg.weekStartDay ?? 1);

        if (changed) {
          await fetch(`${API}/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(after),
          });
        }

        setServerState(after);
        if (penaltyMsgs.length) setTimeout(() => showToast(penaltyMsgs[0]), 800);
      } catch (e) {
        console.error('Init failed', e);
      }
      setLoading(false);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lastRawRef = useRef('');
  const loadState = useCallback(async () => {
    if (Date.now() - lastActionAt.current < 3000) return;
    try {
      const res = await fetch(`${API}/state`);
      const text = await res.text();
      const fetched = JSON.parse(text);
      const wsd = config?.weekStartDay ?? 1;
      // Skip the whole re-render when the server state is byte-identical to what
      // we last applied and no date-boundary reset is pending. Keeps an idle wall
      // display from reconciling the entire tree (and competing with the
      // background animation) every 5s when nothing has actually changed.
      const datesCurrent = fetched.todayKey === todayKey()
        && fetched.weekKey === weekKey(wsd)
        && fetched.monthKey === monthKey();
      if (text === lastRawRef.current && datesCurrent) return;
      lastRawRef.current = text;
      const { state: after, changed } = applyAutoResets(fetched, players, wsd);
      if (changed) await saveState(after);
      setServerState(after);
    } catch (e) {
      console.error('Poll failed', e);
    }
  }, [players, saveState, config?.weekStartDay]);

  useEffect(() => {
    if (!config) return;
    const id = setInterval(loadState, 5000);
    return () => clearInterval(id);
  }, [loadState, config]);

  const updateState = useCallback(async (newState) => {
    lastActionAt.current = Date.now();
    setServerState(newState);
    await saveState(newState);
  }, [saveState]);

  const selectPlayer = useCallback((id) => {
    setSelected(prev => prev === id ? null : id);
  }, []);

  const claimChore = useCallback(async (choreId) => {
    if (!selected || !serverState) return;
    const chore = activeChores.find(c => c.id === choreId);

    // Optional confirmation to prevent accidental taps
    if (config?.confirmChores && !confirm(`Complete ${chore.name}?`)) return;
    const storeKey = chore.freq === 'daily' ? 'dailyDone' : chore.freq === 'weekly' ? 'weeklyDone' : 'monthlyDone';
    const store = serverState[storeKey];
    const doneKey = choreDoneKey(chore, selected);
    if (store[doneKey]) return;

    const player = players.find(p => p.id === selected);
    const tKey = todayKey();
    const playerXpForMonster = serverState.xp?.[selected] || 0;
    const playerLevelForMonster = getLevelFromXP(playerXpForMonster).level;
    const m = dateSeededMonster(player, tKey, playerLevelForMonster);
    const totalDmg = (serverState.monsterDamage?.[selected]?.[tKey]) || 0;
    const monsterAlreadyDefeated = totalDmg >= m.maxHP;

    // Combo tracking (in-memory only, not persisted)
    const now = Date.now();
    if (now - lastChoreAt.current < 8000) {
      comboRef.current = Math.min(comboRef.current + 1, 10);
    } else {
      comboRef.current = 1;
    }
    lastChoreAt.current = now;
    const combo = comboRef.current;
    setComboDisplay(combo);
    setTimeout(() => setComboDisplay(c => c === combo ? 0 : c), 4000);

    const playerXp = serverState.xp?.[selected] || 0;
    const { level } = getLevelFromXP(playerXp);

    const hasDoubleDamage = isPowerUpActive(serverState.activePowerUps, selected, 'double_damage');
    const isBonus = choreId === bonusChoreId;
    const isCrit = !monsterAlreadyDefeated && Math.random() < critChanceForLevel(level);
    const comboMult = Math.min(2.5, 1 + (combo - 1) * 0.15);
    const basePts = isBonus ? chore.pts * 2 : chore.pts;
    let actualPts = Math.round((isCrit ? basePts * 2 : basePts) * comboMult);
    if (hasDoubleDamage) actualPts = actualPts * 2;

    // ── Overkill mode: monster already defeated, charge the bar ──────────────
    if (monsterAlreadyDefeated) {
      const prevCharge = serverState.overkillCharge?.[selected] || 0;
      const newCharge = prevCharge + 1;
      const tokenEarned = newCharge >= OVERKILL_CHARGE_GOAL;
      const finalCharge = tokenEarned ? newCharge - OVERKILL_CHARGE_GOAL : newCharge;
      const prevTokens = serverState.storedPowerTokens?.[selected] || 0;
      const newTokens = tokenEarned ? Math.min(POWER_TOKEN_CAP, prevTokens + 1) : prevTokens;

      const newState = {
        ...serverState,
        [storeKey]: { ...store, [doneKey]: selected },
        overkillCharge: { ...(serverState.overkillCharge || {}), [selected]: finalCharge },
        storedPowerTokens: { ...(serverState.storedPowerTokens || {}), [selected]: newTokens },
        history: [...(serverState.history || []), { type: 'chore', player: player.name, name: chore.name, pts: actualPts, overkill: true, ts: Date.now() }],
        damageLog: {
          ...(serverState.damageLog || {}),
          [selected]: { ...((serverState.damageLog || {})[selected] || {}), [doneKey]: { pts: actualPts, overkill: true } },
        },
      };
      await updateState(newState);
      playHit(chore.pts);
      showToast(tokenEarned
        ? `${player.name}: ⚡ OVERKILL! Power Token banked!`
        : `${player.name}: ⚡ Overkill! ${finalCharge}/${OVERKILL_CHARGE_GOAL} charged`);
      return;
    }

    // ── Normal hit ────────────────────────────────────────────────────────────
    const newTotalDmg = totalDmg + actualPts;
    const hp = Math.max(0, m.maxHP - newTotalDmg);
    const justKilled = hp === 0;

    const currentStreak = serverState.streaks?.[selected] || 0;
    const sMultiplier = streakMultiplier(currentStreak);
    const prestigeBonus = 1 + (serverState.prestige?.[selected] || 0) * 0.05;

    const hasTreasureMagnet = isPowerUpActive(serverState.activePowerUps, selected, 'treasure_magnet');
    const hasGoldRush = isPowerUpActive(serverState.activePowerUps, selected, 'gold_rush');
    const dropMultiplier = hasTreasureMagnet ? 3 : 1;
    const goldMultiplier = hasGoldRush ? 2 : 1;

    const xpGain = justKilled ? Math.max(2, Math.ceil(m.gold / 3)) : 0;
    const newPlayerXp = playerXp + xpGain;
    const { level: newLevel } = getLevelFromXP(newPlayerXp);
    const leveledUp = justKilled && newLevel > level;

    const luck = luckForLevel(level) * (hasTreasureMagnet ? 3 : 1);
    const isLucky = justKilled && Math.random() < Math.min(1, luck);
    const luckyGold = isLucky ? Math.ceil(m.gold * 0.5) : 0;
    const baseKillGold = justKilled ? Math.round(m.gold * sMultiplier * prestigeBonus * goldMultiplier) : 0;
    const totalGoldGain = baseKillGold + luckyGold;

    const loot = rollLoot(dropMultiplier);
    const lootGold = loot?.gold ?? 0;
    const lootXp   = loot?.xp   ?? 0;

    // Dungeon map: multi-chore combat against dungeon monsters, or grant moves
    const dungeonMap = serverState.dungeonMaps?.[selected];
    let dungeonGoldBonus = 0;
    let dungeonKillName = '';
    let dungeonFightMsg = '';
    let newDungeonMaps = serverState.dungeonMaps ?? {};
    if (dungeonMap) {
      if (dungeonMap.activeMonster && (dungeonMap.activeMonster.currentHP ?? 0) > 0) {
        const dm = dungeonMap.activeMonster;
        const newMonsterHP = Math.max(0, dm.currentHP - actualPts);
        if (newMonsterHP === 0) {
          dungeonGoldBonus = dm.gold;
          dungeonKillName = dm.name;
          const newGrid = dungeonMap.grid.map(row => [...row]);
          if (dm.pos) newGrid[dm.pos[1]][dm.pos[0]] = 'floor';
          newDungeonMaps = { ...newDungeonMaps, [selected]: { ...dungeonMap, grid: newGrid, activeMonster: null, pendingMoves: (dungeonMap.pendingMoves || 0) + 3 } };
        } else {
          dungeonFightMsg = `⚔ ${dm.name} HP:${newMonsterHP}/${dm.maxHP}`;
          newDungeonMaps = { ...newDungeonMaps, [selected]: { ...dungeonMap, activeMonster: { ...dm, currentHP: newMonsterHP }, pendingMoves: (dungeonMap.pendingMoves || 0) + 1 } };
        }
      } else if (dungeonMap.activeMonster) {
        dungeonGoldBonus = dungeonMap.activeMonster.gold ?? 0;
        dungeonKillName = dungeonMap.activeMonster.name;
        newDungeonMaps = { ...newDungeonMaps, [selected]: { ...dungeonMap, activeMonster: null, pendingMoves: (dungeonMap.pendingMoves || 0) + 3 } };
      } else {
        newDungeonMaps = { ...newDungeonMaps, [selected]: { ...dungeonMap, pendingMoves: (dungeonMap.pendingMoves || 0) + 2 } };
      }
    }

    const prog = serverState.badgeProgress?.[selected] || { monsters_killed: 0, rewards_redeemed: 0, lucky_count: 0, penalty_free_days: 0 };
    const newProg = {
      ...prog,
      monsters_killed: justKilled ? prog.monsters_killed + 1 : prog.monsters_killed,
      lucky_count:     isLucky    ? prog.lucky_count + 1     : prog.lucky_count,
    };
    const currentBadges = serverState.badges?.[selected] || [];
    const newGoldTotal = (serverState.gold[selected] || 0) + totalGoldGain + lootGold + dungeonGoldBonus;
    const newBadgeIds = checkNewBadges(currentBadges, {
      streak: currentStreak,
      gold: newGoldTotal,
      monstersKilled: newProg.monsters_killed,
      rewardsRedeemed: newProg.rewards_redeemed,
      luckyCount: newProg.lucky_count,
      penaltyFreeDays: prog.penalty_free_days,
    });

    const newXpMap = { ...(serverState.xp || {}), [selected]: newPlayerXp + lootXp };

    const historyEntries = [
      { type: 'chore', player: player.name, name: chore.name, pts: actualPts, crit: isCrit, combo: combo > 1 ? combo : undefined, bonus: isBonus || undefined, ts: Date.now() },
      ...(justKilled ? [{ type: 'gold', player: player.name, name: m.name, pts: totalGoldGain, lucky: isLucky, streak: currentStreak >= 3 ? currentStreak : undefined, ts: Date.now() }] : []),
      ...(loot ? [{ type: 'loot', player: player.name, name: loot.name, icon: loot.icon, pts: lootGold, xp: lootXp, ts: Date.now() }] : []),
      ...newBadgeIds.map(bid => { const b = BADGES.find(x => x.id === bid); return { type: 'badge', player: player.name, name: b?.name || bid, icon: b?.icon || '🏅', ts: Date.now() }; }),
    ];

    const newState = {
      ...serverState,
      [storeKey]: { ...store, [doneKey]: selected },
      gold: { ...serverState.gold, [selected]: newGoldTotal },
      xp: newXpMap,
      weeklyGold: { ...(serverState.weeklyGold || {}), [selected]: (serverState.weeklyGold?.[selected] || 0) + totalGoldGain + lootGold },
      badges: { ...(serverState.badges || {}), [selected]: [...currentBadges, ...newBadgeIds] },
      badgeProgress: { ...(serverState.badgeProgress || {}), [selected]: newProg },
      history: [...(serverState.history || []), ...historyEntries],
      monsterDamage: {
        ...serverState.monsterDamage,
        [selected]: { ...(serverState.monsterDamage?.[selected] || {}), [tKey]: newTotalDmg },
      },
      damageLog: {
        ...(serverState.damageLog || {}),
        [selected]: { ...((serverState.damageLog || {})[selected] || {}), [doneKey]: { pts: actualPts, overkill: false } },
      },
      dungeonMaps: newDungeonMaps,
    };

    await updateState(newState);
    setLastHits(prev => ({ ...prev, [selected]: { pts: actualPts, ts: Date.now(), crit: isCrit } }));

    if (isCrit && !justKilled) playCrit();
    else if (justKilled) {
      playKill();
      const allDone = players.every(pl => {
        const plLvl = getLevelFromXP(newState.xp?.[pl.id] || 0).level;
        const plM = dateSeededMonster(pl, tKey, plLvl);
        const plDmg = (newState.monsterDamage?.[pl.id]?.[tKey]) || 0;
        return plDmg >= plM.maxHP;
      });
      if (allDone) setTimeout(() => { playFanfare(); setCelebration(true); }, 600);
    } else {
      playHit(chore.pts);
    }

    const comboTag  = combo > 1            ? ` x${combo} COMBO!`                                   : '';
    const critTag   = isCrit               ? ' CRIT!'                                               : '';
    const bonusTag  = isBonus              ? ' BONUS!'                                              : '';
    const levelTag  = leveledUp            ? ` LVL UP ${newLevel}!`                                 : '';
    const luckyTag  = isLucky              ? ` +${luckyGold} lucky gold!`                           : '';
    const streakTag = justKilled && currentStreak >= 3 ? ` ${currentStreak}-day streak x${sMultiplier}!` : '';
    const lootTag   = loot                 ? ` ${loot.icon} Found ${loot.name}!`                    : '';
    const badgeTag  = newBadgeIds.length   ? ` 🏅 ${BADGES.find(b => b.id === newBadgeIds[0])?.name}!` : '';
    const dungeonTag = dungeonGoldBonus > 0 ? ` [☠ ${dungeonKillName} +${dungeonGoldBonus}g]` : dungeonFightMsg ? ` [${dungeonFightMsg}]` : '';

    const msg = justKilled
      ? `${player.name} slew ${m.name}!${critTag} +${totalGoldGain}g${streakTag}${luckyTag}${lootTag}${levelTag}${badgeTag}${dungeonTag}`
      : `${player.name} hits for ${actualPts}!${critTag}${comboTag}${bonusTag} HP:${hp}/${m.maxHP}${lootTag}${dungeonTag}`;
    showToast(msg);
  }, [selected, serverState, players, activeChores, bonusChoreId, updateState, showToast]);

  const unclaimChore = useCallback(async (choreId) => {
    if (!selected || !serverState) return;
    const chore = activeChores.find(c => c.id === choreId);
    const storeKey = chore.freq === 'daily' ? 'dailyDone' : chore.freq === 'weekly' ? 'weeklyDone' : 'monthlyDone';
    const store = serverState[storeKey];
    const doneKey = choreDoneKey(chore, selected);
    const claimedBy = store[doneKey];
    if (!claimedBy || claimedBy !== selected) return;

    const player = players.find(p => p.id === selected);
    const tKey = todayKey();

    // Look up actual pts from damageLog (handles crit/combo accurately)
    const logEntry = serverState.damageLog?.[selected]?.[doneKey];
    const wasOverkill = typeof logEntry === 'object' ? !!logEntry.overkill : false;
    const actualPts = typeof logEntry === 'object' ? logEntry.pts : (logEntry ?? chore.pts);

    const updatedStore = { ...store };
    delete updatedStore[doneKey];

    const newDamageLog = { ...(serverState.damageLog || {}) };
    if (newDamageLog[selected]) {
      newDamageLog[selected] = { ...newDamageLog[selected] };
      delete newDamageLog[selected][doneKey];
    }

    if (wasOverkill) {
      // Revert overkill charge (can't revert earned tokens)
      const prevCharge = serverState.overkillCharge?.[selected] || 0;
      const newState = {
        ...serverState,
        [storeKey]: updatedStore,
        overkillCharge: { ...(serverState.overkillCharge || {}), [selected]: Math.max(0, prevCharge - 1) },
        damageLog: newDamageLog,
      };
      await updateState(newState);
      playUndo();
      showToast(`${player.name} undid: ${chore.name}`);
      return;
    }

    const unclaimLevel = getLevelFromXP(serverState.xp?.[selected] || 0).level;
    const m = dateSeededMonster(player, tKey, unclaimLevel);
    const prevDmg = (serverState.monsterDamage?.[selected]?.[tKey]) || 0;
    const newDmg = Math.max(0, prevDmg - actualPts);
    const wasKillShot = prevDmg >= m.maxHP && newDmg < m.maxHP;

    const newState = {
      ...serverState,
      [storeKey]: updatedStore,
      gold: wasKillShot
        ? { ...serverState.gold, [selected]: Math.max(0, (serverState.gold[selected] || 0) - m.gold) }
        : serverState.gold,
      monsterDamage: {
        ...serverState.monsterDamage,
        [selected]: { ...(serverState.monsterDamage?.[selected] || {}), [tKey]: newDmg },
      },
      damageLog: newDamageLog,
    };

    await updateState(newState);
    playUndo();
    showToast(`${player.name} undid: ${chore.name}`);
  }, [selected, serverState, players, activeChores, updateState, showToast]);

  const redeemReward = useCallback(async (rewardId) => {
    if (!selected || !serverState) return;
    const reward = activeRewards.find(r => r.id === rewardId);
    const player = players.find(p => p.id === selected);
    const gold = serverState.gold[selected] || 0;
    if (gold < reward.cost) return;
    if (!confirm(`Redeem "${reward.name}" for ${reward.cost} gold?`)) return;

    const prog = serverState.badgeProgress?.[selected] || { monsters_killed: 0, rewards_redeemed: 0, lucky_count: 0, penalty_free_days: 0 };
    const newProg = { ...prog, rewards_redeemed: prog.rewards_redeemed + 1 };
    const currentBadges = serverState.badges?.[selected] || [];
    const newBadgeIds = checkNewBadges(currentBadges, {
      streak: serverState.streaks?.[selected] || 0,
      gold: gold - reward.cost,
      monstersKilled: prog.monsters_killed,
      rewardsRedeemed: newProg.rewards_redeemed,
      luckyCount: prog.lucky_count,
      penaltyFreeDays: prog.penalty_free_days,
    });

    const newState = {
      ...serverState,
      gold: { ...serverState.gold, [selected]: gold - reward.cost },
      badgeProgress: { ...(serverState.badgeProgress || {}), [selected]: newProg },
      badges: { ...(serverState.badges || {}), [selected]: [...currentBadges, ...newBadgeIds] },
      history: [...(serverState.history || []), { type: 'reward', player: player.name, name: reward.name, pts: reward.cost, ts: Date.now() }],
    };

    await updateState(newState);
    playRedeem();
    const badgeTag = newBadgeIds.length ? ` 🏅 ${BADGES.find(b => b.id === newBadgeIds[0])?.name}!` : '';
    showToast(`${player.name} redeemed: ${reward.name}!${badgeTag}`);
  }, [selected, serverState, players, activeRewards, updateState, showToast]);

  const handlePrestige = useCallback(async (playerId) => {
    if (!serverState) return;
    const player = players.find(p => p.id === playerId);
    const xp = serverState.xp?.[playerId] || 0;
    const { level } = getLevelFromXP(xp);
    if (level < 10) return;
    if (!confirm(`${player.name} will prestige! XP resets to 0 but you earn +5% gold on every kill forever. Continue?`)) return;
    const currentPrestige = (serverState.prestige?.[playerId] || 0) + 1;
    const currentBadges = serverState.badges?.[playerId] || [];
    const newBadges = currentBadges.includes('prestige_1') ? currentBadges : [...currentBadges, 'prestige_1'];
    const newState = {
      ...serverState,
      xp: { ...serverState.xp, [playerId]: 0 },
      prestige: { ...(serverState.prestige || {}), [playerId]: currentPrestige },
      badges: { ...(serverState.badges || {}), [playerId]: newBadges },
      history: [...(serverState.history || []), { type: 'badge', player: player.name, name: 'Prestige', icon: '🌟', ts: Date.now() }],
    };
    await updateState(newState);
    showToast(`${player.name} prestiged! +${currentPrestige * 5}% gold bonus forever! ⭐`);
  }, [serverState, players, updateState, showToast]);

  const handleSelectTitle = useCallback(async (playerId, badgeId) => {
    if (!serverState) return;
    const newState = {
      ...serverState,
      selectedTitles: { ...(serverState.selectedTitles || {}), [playerId]: badgeId },
    };
    await updateState(newState);
  }, [serverState, updateState]);

  const createBounty = useCallback(async (title, icon, gold, assignedTo) => {
    if (!selected || !serverState) return;
    const player = players.find(p => p.id === selected);
    const playerGold = serverState.gold[selected] || 0;
    if (playerGold < gold) return;
    const bounty = {
      id: `bounty_${Date.now()}`,
      title,
      icon,
      gold,
      createdBy: selected,
      assignedTo: assignedTo || null,
      createdAt: Date.now(),
      completedAt: null,
      completedBy: null,
    };
    const newState = {
      ...serverState,
      gold: { ...serverState.gold, [selected]: playerGold - gold },
      bounties: [...(serverState.bounties || []), bounty],
      history: [...(serverState.history || []), { type: 'bounty_post', player: player.name, name: title, pts: gold, ts: Date.now() }],
    };
    await updateState(newState);
    showToast(`${player.name} posted: ${title} (${gold}g offered)`);
  }, [selected, serverState, players, updateState, showToast]);

  const claimBounty = useCallback(async (bountyId) => {
    if (!selected || !serverState) return;
    const bounty = (serverState.bounties || []).find(b => b.id === bountyId);
    if (!bounty || bounty.completedAt) return;
    const player = players.find(p => p.id === selected);
    const newState = {
      ...serverState,
      gold: { ...serverState.gold, [selected]: (serverState.gold[selected] || 0) + bounty.gold },
      bounties: (serverState.bounties || []).map(b =>
        b.id === bountyId ? { ...b, completedAt: Date.now(), completedBy: selected } : b
      ),
      history: [...(serverState.history || []), { type: 'bounty_complete', player: player.name, name: bounty.title, pts: bounty.gold, ts: Date.now() }],
    };
    await updateState(newState);
    playRedeem();
    showToast(`${player.name} completed bounty: ${bounty.title}! +${bounty.gold}g`);
  }, [selected, serverState, players, updateState, showToast]);

  const cancelBounty = useCallback(async (bountyId) => {
    if (!selected || !serverState) return;
    const bounty = (serverState.bounties || []).find(b => b.id === bountyId);
    if (!bounty || bounty.createdBy !== selected || bounty.completedAt) return;
    const player = players.find(p => p.id === selected);
    const newState = {
      ...serverState,
      gold: { ...serverState.gold, [selected]: (serverState.gold[selected] || 0) + bounty.gold },
      bounties: (serverState.bounties || []).filter(b => b.id !== bountyId),
      history: [...(serverState.history || []), { type: 'bounty_cancel', player: player.name, name: bounty.title, pts: bounty.gold, ts: Date.now() }],
    };
    await updateState(newState);
    showToast(`${player.name} canceled: ${bounty.title} (+${bounty.gold}g returned)`);
  }, [selected, serverState, players, updateState, showToast]);

  const handleDungeonMove = useCallback(async (playerId, dx, dy) => {
    if (!serverState) return;
    const player = players.find(p => p.id === playerId);
    const dungeonMap = serverState.dungeonMaps?.[playerId];
    if (!dungeonMap) return;
    const { level } = getLevelFromXP(serverState.xp?.[playerId] || 0);
    const luck = luckForLevel(level);
    const result = dungeonMoveResult(dungeonMap, dx, dy, todayKey(), player.mode, luck);
    if (!result) return;
    const { newMap, goldDelta, event } = result;
    const newGold = Math.max(0, (serverState.gold[playerId] || 0) + goldDelta);
    const newState = {
      ...serverState,
      gold: { ...serverState.gold, [playerId]: newGold },
      dungeonMaps: { ...serverState.dungeonMaps, [playerId]: newMap },
    };
    if (event) {
      const goldTag = event.gold ? (goldDelta >= 0 ? ` +${event.gold}g` : ` -${event.gold}g`) : '';
      const prefix = event.kind === 'stairs_down' ? '⬇ ' : event.kind === 'stairs_up' ? '⬆ ' : event.kind === 'key' ? '◇ ' : event.kind === 'locked_chest' ? '🔓 ' : '';
      showToast(`${prefix}${player.name}: ${event.label}${goldTag}`);
      if (event.kind === 'key') playKeyPickup();
    }
    await updateState(newState);
  }, [serverState, players, updateState, showToast]);

  const resetWeek = useCallback(async () => {
    if (!confirm('Reset chores, gold, and monsters? History will be kept.')) return;
    const zeros = Object.fromEntries(players.map(p => [p.id, 0]));
    const newState = {
      ...serverState,
      gold: { ...zeros },
      dailyDone: {},
      weeklyDone: {},
      monthlyDone: {},
      monsterDamage: {},
      monsterPenalties: {},
      streaks: { ...zeros },
      damageLog: {},
      overkillCharge: { ...zeros },
      storedPowerTokens: { ...zeros },
      activePowerUps: {},
    };
    await updateState(newState);
  }, [players, serverState, updateState]);

  const exportSave = useCallback(() => {
    if (!serverState || !config) return;
    const backup = {
      state: serverState,
      config,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `questboard-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Save exported!');
  }, [serverState, config, showToast]);

  const importSave = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const backup = JSON.parse(text);
        if (!backup.state || !backup.config) {
          showToast('Invalid backup file: missing state or config');
          return;
        }
        if (!confirm('This will replace all current data. Continue?')) return;
        await Promise.all([
          fetch(`${API}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backup.config),
          }),
          fetch(`${API}/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backup.state),
          }),
        ]);
        setConfig(backup.config);
        setServerState(backup.state);
        showToast('Save imported!');
      } catch (err) {
        console.error('Import failed', err);
        showToast('Import failed: invalid JSON file');
      }
    };
    input.click();
  }, [showToast]);

  const handleSetupComplete = useCallback(async (wizardConfig) => {
    const freshState = makeDefaultState(wizardConfig.players);
    const { state: after } = applyAutoResets(freshState, wizardConfig.players, wizardConfig.weekStartDay ?? 1);
    await Promise.all([
      fetch(`${API}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardConfig),
      }),
      fetch(`${API}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(after),
      }),
    ]);
    setConfig(wizardConfig);
    setServerState(after);
    setNeedsSetup(false);
  }, []);

  const handleEditComplete = useCallback(async (wizardConfig) => {
    const newIds = new Set(wizardConfig.players.map(p => p.id));
    const zeros = Object.fromEntries(wizardConfig.players.map(p => [p.id, 0]));

    const keep = (obj) => ({
      ...zeros,
      ...Object.fromEntries(Object.entries(obj || {}).filter(([id]) => newIds.has(id))),
    });

    const mergedState = {
      ...serverState,
      gold: keep(serverState.gold),
      xp: keep(serverState.xp),
      streaks: keep(serverState.streaks),
      overkillCharge: keep(serverState.overkillCharge || {}),
      storedPowerTokens: keep(serverState.storedPowerTokens || {}),
    };

    await Promise.all([
      fetch(`${API}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardConfig),
      }),
      fetch(`${API}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedState),
      }),
    ]);

    setConfig(wizardConfig);
    setServerState(mergedState);
    setShowSettings(false);
  }, [serverState]);

  // Apply/remove CRT class on body
  useEffect(() => {
    const enabled = config?.crtEnabled ?? true;
    document.body.classList.toggle('crt', enabled);
  }, [config?.crtEnabled]);

  // UI scale: zoom the foreground content only, leaving the full-screen
  // dungeon background + torches at true viewport size (zooming <body> scaled
  // those too, breaking sprite/torch rendering at Heroic/Epic).
  const uiZoom = config?.uiScale === 'heroic' ? 1.25
               : config?.uiScale === 'epic'   ? 1.75
               : 1;

  // At Epic scale the full secondary toolbar (Sound/Settings/Reset/Export/
  // Import) overflows the viewport, so collapse it into a hamburger menu.
  const isEpic = config?.uiScale === 'epic';

  // Close the header menu on any outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.target.closest?.('.header-menu')) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  // Apply portrait orientation class on body
  useEffect(() => {
    document.body.classList.toggle('portrait', config?.displayOrientation === 'portrait');
  }, [config?.displayOrientation]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text2)', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  // NOTE: the setup/settings overlay is a full-screen `position: fixed` modal
  // sized in `vh`. The `zoom` UI-scale wrapper multiplies `vh`, making the
  // overlay taller than the viewport so its header/footer (close + save) become
  // unreachable. Render these modals at true scale, outside the zoom wrapper.
  if (needsSetup) {
    return (
      <>
        {(config?.animatedBg !== false) && <DungeonBackground />}
        <Suspense fallback={null}>
          <SetupWizard onComplete={handleSetupComplete} />
        </Suspense>
      </>
    );
  }

  if (showSettings) {
    return (
      <>
        {(config?.animatedBg !== false) && <DungeonBackground />}
        <Suspense fallback={null}>
          <SetupWizard
            initialConfig={config}
            onComplete={handleEditComplete}
            onCancel={() => setShowSettings(false)}
          />
        </Suspense>
      </>
    );
  }

  const state = serverState;
  const selectedPlayer = players.find(p => p.id === selected);

  return (
    <>
    {(config?.animatedBg !== false) && <DungeonBackground />}
    <Torches />
    <div style={{ zoom: uiZoom }}>
    <div className="board" style={{ position: 'relative', zIndex: 2 }}>
      <div className="header">
        <span className="title"><TileSprite tile={118} display={18} /> Questboard</span>
        <div className="tabs">
          <button className={`tab${currentTab === 'chores' ? ' active' : ''}`} onClick={() => setCurrentTab('chores')}>
            <TileSprite tile={118} display={14} /> Chores
          </button>
          <button className={`tab${currentTab === 'rewards' ? ' active' : ''}`} onClick={() => setCurrentTab('rewards')}>
            <TileSprite tile={72} display={14} /> Rewards
          </button>
          <button className={`tab${currentTab === 'dungeon' ? ' active' : ''}`} onClick={() => setCurrentTab('dungeon')}>
            <TileSprite tile={117} display={14} /> Dungeon
          </button>
          <button className={`tab${currentTab === 'bounties' ? ' active' : ''}`} onClick={() => setCurrentTab('bounties')}>
            📜 Bounties
          </button>
          <button className={`tab${currentTab === 'history' ? ' active' : ''}`} onClick={() => setCurrentTab('history')}>
            <TileSprite tile={116} display={14} /> History
          </button>
        </div>
        {isEpic ? (
          <div className="header-menu">
            <button
              className="mute-btn menu-toggle"
              onClick={() => setMenuOpen(o => !o)}
              title="Menu"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            ><span className="hamburger" /></button>
            {menuOpen && (
              <div className="header-dropdown">
                <button onClick={() => { const next = !muted; setMuted(next); setMutedState(next); }}>
                  {muted ? '\ud83d\udd07' : '\ud83d\udd0a'} {muted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={() => { setMenuOpen(false); setShowSettings(true); }}><TileSprite tile={65} display={14} /> Settings</button>
                <button onClick={() => { setMenuOpen(false); resetWeek(); }}><TileSprite tile={56} display={14} /> Reset week</button>
                <button onClick={() => { setMenuOpen(false); exportSave(); }}><TileSprite tile={91} display={14} /> Export Save</button>
                <button onClick={() => { setMenuOpen(false); importSave(); }}><TileSprite tile={89} display={14} /> Import Save</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button className="mute-btn" onClick={() => { const next = !muted; setMuted(next); setMutedState(next); }} title={muted ? 'Unmute sounds' : 'Mute sounds'}>{muted ? '\ud83d\udd07' : '\ud83d\udd0a'}</button>
            <button className="reset-btn" onClick={() => setShowSettings(true)}><TileSprite tile={65} display={12} /> Settings</button>
            <button className="reset-btn" onClick={resetWeek}><TileSprite tile={56} display={12} /> Reset week</button>
            <button className="reset-btn" onClick={exportSave}><TileSprite tile={91} display={12} /> Export Save</button>
            <button className="reset-btn" onClick={importSave}><TileSprite tile={89} display={12} /> Import Save</button>
          </>
        )}
      </div>

      <div className="players">
        {players.map(p => (
          <PlayerCard
            key={p.id}
            player={p}
            gold={state.gold[p.id] || 0}
            xp={state.xp?.[p.id] || 0}
            isSelected={selected === p.id}
            onClick={() => selectPlayer(p.id)}
            playerDamage={state.monsterDamage?.[p.id]}
            lastHit={lastHits[p.id]}
            streak={state.streaks?.[p.id] || 0}
            prestige={state.prestige?.[p.id] || 0}
            badges={state.badges?.[p.id] || []}
            selectedTitleBadge={state.selectedTitles?.[p.id]}
            onSelectTitle={handleSelectTitle}
            activePowerUps={getActivePowerUps(state.activePowerUps, p.id)}
            overkillCharge={state.overkillCharge?.[p.id] || 0}
            storedPowerTokens={state.storedPowerTokens?.[p.id] || 0}
            projectedOverkillRewardId={getProjectedOverkillReward(p.id)}
            onPrestige={handlePrestige}
          />
        ))}
      </div>

      <Suspense fallback={<div className="no-select">Loading…</div>}>
      <div>
        {currentTab === 'chores' && (
          selected && selectedPlayer
            ? <ChoreGrid
                player={selectedPlayer}
                players={players}
                activeChores={activeChores}
                dailyDone={state.dailyDone}
                weeklyDone={state.weeklyDone}
                monthlyDone={state.monthlyDone || {}}
                onClaimChore={claimChore}
                onUnclaimChore={unclaimChore}
                bonusChoreId={bonusChoreId}
              />
            : <div className="no-select">Select a hero above to see their quests.</div>
        )}
        {currentTab === 'rewards' && (
          selected && selectedPlayer
            ? <RewardGrid
                player={selectedPlayer}
                gold={state.gold[selected] || 0}
                activeRewards={activeRewards}
                onRedeemReward={redeemReward}
              />
            : <div className="no-select">Select a hero above to browse the shop.</div>
        )}
        {currentTab === 'dungeon' && (
          selected && selectedPlayer && state.dungeonMaps?.[selected]
            ? <DungeonMap
                player={selectedPlayer}
                dungeonMap={state.dungeonMaps[selected]}
                allPlayers={players}
                allDungeonMaps={state.dungeonMaps}
                onMove={(dx, dy) => handleDungeonMove(selected, dx, dy)}
                cellSize={44}
              />
            : <div className="no-select">Select a hero above to explore the dungeon.</div>
        )}
        {currentTab === 'bounties' && (
          <BountyBoard
            players={players}
            selectedPlayerId={selected}
            bounties={state.bounties || []}
            gold={selected ? state.gold[selected] || 0 : 0}
            onCreateBounty={createBounty}
            onClaimBounty={claimBounty}
            onCancelBounty={cancelBounty}
          />
        )}
        {currentTab === 'history' && (
          <HistoryTab history={state.history || []} players={players} weeklyGold={state.weeklyGold || {}} />
        )}
      </div>
      </Suspense>

      <div className={`toast${toast.visible ? ' show' : ''}`}>{toast.msg}</div>
    </div>
    <div className="version-label">v{__APP_VERSION__}</div>
    {celebration && <Celebration onDismiss={() => setCelebration(false)} />}
    </div>
    </>
  );
}
