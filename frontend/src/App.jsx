import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ALL_CHORES, REWARDS } from './data';
import { todayKey, weekKey, monthKey, dateSeededMonster, randomMonster, getLevelFromXP, critChanceForLevel, luckForLevel } from './logic';
import PlayerCard from './components/PlayerCard';
import ChoreGrid from './components/ChoreGrid';
import RewardGrid from './components/RewardGrid';
import HistoryTab from './components/HistoryTab';
import DungeonBackground from './components/DungeonBackground';
import TileSprite from './components/TileSprite';
import Celebration from './components/Celebration';
import SetupWizard from './components/SetupWizard';
import { playHit, playKill, playFanfare, playUndo, playRedeem, playCrit } from './sounds';

const API = '/api';

function makeDefaultState(players) {
  const zeros = Object.fromEntries(players.map(p => [p.id, 0]));
  return {
    gold: { ...zeros },
    xp: { ...zeros },
    streaks: { ...zeros },
    dailyDone: {},
    weeklyDone: {},
    monthlyDone: {},
    weekKey: '',
    todayKey: '',
    monthKey: '',
    history: [],
    monsterDamage: {},
    monsterBaseline: {},
    monsterPenalties: {},
    assignedMonsters: {},
  };
}

function applyAutoResets(raw, players) {
  const state = { ...makeDefaultState(players), ...raw };

  // migrate old points field to gold
  if (raw.points && !raw.gold) state.gold = raw.points;

  let changed = false;
  const penaltyMsgs = [];

  if (!state.assignedMonsters || Object.keys(state.assignedMonsters).length === 0) {
    const monsters = {};
    players.forEach(pl => { monsters[pl.id] = randomMonster(pl); });
    state.assignedMonsters = monsters;
    changed = true;
  }

  if (state.todayKey !== todayKey()) {
    const yKey = state.todayKey;
    const zeros = Object.fromEntries(players.map(p => [p.id, 0]));
    const newStreaks = { ...zeros, ...(state.streaks || {}) };

    if (yKey) {
      players.forEach(pl => {
        const m = dateSeededMonster(pl, yKey);
        const dmg = (state.monsterDamage?.[pl.id]?.[yKey]) || 0;
        if (dmg >= m.maxHP) {
          newStreaks[pl.id] = (newStreaks[pl.id] || 0) + 1;
        } else {
          newStreaks[pl.id] = 0;
          const pKey = `${pl.id}_${yKey}`;
          if (!(state.monsterPenalties || {})[pKey]) {
            state.gold = { ...state.gold, [pl.id]: Math.max(0, (state.gold[pl.id] || 0) - m.atk) };
            state.monsterPenalties = { ...state.monsterPenalties, [pKey]: true };
            state.history = [...(state.history || []), { type: 'penalty', player: pl.name, name: m.name, pts: m.atk }];
            penaltyMsgs.push(`⚠ ${pl.name}'s ${m.name} attacked! -${m.atk} gold`);
          }
        }
      });
    }

    const newMonsters = {};
    players.forEach(pl => { newMonsters[pl.id] = randomMonster(pl); });
    state.assignedMonsters = newMonsters;
    state.streaks = newStreaks;
    state.dailyDone = {};
    state.todayKey = todayKey();
    state.monsterBaseline = {};
    changed = true;
  }

  if (state.weekKey !== weekKey()) {
    state.weeklyDone = {};
    state.weekKey = weekKey();
    changed = true;
  }

  if (state.monthKey !== monthKey()) {
    state.monthlyDone = {};
    state.monthKey = monthKey();
    changed = true;
  }

  return { state, changed, penaltyMsgs };
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
  const lastActionAt = useRef(0);

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
    return [...base, ...(config.customChores ?? [])];
  }, [config]);

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
        const { state: after, changed, penaltyMsgs } = applyAutoResets(fetched, cfg.players);

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

  const loadState = useCallback(async () => {
    if (Date.now() - lastActionAt.current < 3000) return;
    try {
      const res = await fetch(`${API}/state`);
      const fetched = await res.json();
      const { state: after, changed } = applyAutoResets(fetched, players);
      if (changed) await saveState(after);
      setServerState(after);
    } catch (e) {
      console.error('Poll failed', e);
    }
  }, [players, saveState]);

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
    const storeKey = chore.freq === 'daily' ? 'dailyDone' : chore.freq === 'weekly' ? 'weeklyDone' : 'monthlyDone';
    const store = serverState[storeKey];
    if (store[choreId]) return;

    const player = players.find(p => p.id === selected);
    const tKey = todayKey();
    const m = serverState.assignedMonsters?.[selected] || dateSeededMonster(player, tKey);
    const totalDmg = (serverState.monsterDamage?.[selected]?.[tKey]) || 0;
    const baseline = (serverState.monsterBaseline?.[selected]?.[tKey]) || 0;
    const prevDmgOnCurrent = totalDmg - baseline;

    const playerXp = serverState.xp?.[selected] || 0;
    const { level } = getLevelFromXP(playerXp);
    const isCrit = prevDmgOnCurrent < m.maxHP && Math.random() < critChanceForLevel(level);
    const actualPts = isCrit ? chore.pts * 2 : chore.pts;

    const newDmgOnCurrent = prevDmgOnCurrent + actualPts;
    const hp = Math.max(0, m.maxHP - newDmgOnCurrent);
    const justKilled = hp === 0 && prevDmgOnCurrent < m.maxHP;

    const xpGain = justKilled ? Math.max(2, Math.ceil(m.gold / 3)) : 0;
    const newXp = { ...(serverState.xp || {}), [selected]: playerXp + xpGain };
    const { level: newLevel } = getLevelFromXP(playerXp + xpGain);
    const leveledUp = justKilled && newLevel > level;

    const luck = luckForLevel(level);
    const isLucky = justKilled && Math.random() < luck;
    const luckyGold = isLucky ? Math.ceil(m.gold * 0.5) : 0;
    const totalGoldGain = m.gold + luckyGold;
    const newTotalDmg = totalDmg + actualPts;
    const newBaseline = justKilled ? newTotalDmg : baseline;
    const newMonster = justKilled ? randomMonster(player) : null;

    const newState = {
      ...serverState,
      [storeKey]: { ...store, [choreId]: selected },
      gold: justKilled
        ? { ...serverState.gold, [selected]: (serverState.gold[selected] || 0) + totalGoldGain }
        : serverState.gold,
      xp: newXp,
      history: [
        ...(serverState.history || []),
        { type: 'chore', player: player.name, name: chore.name, pts: actualPts, crit: isCrit },
        ...(justKilled ? [{ type: 'gold', player: player.name, name: m.name, pts: totalGoldGain, lucky: isLucky }] : []),
      ],
      monsterDamage: {
        ...serverState.monsterDamage,
        [selected]: { ...(serverState.monsterDamage?.[selected] || {}), [tKey]: newTotalDmg },
      },
      monsterBaseline: justKilled ? {
        ...serverState.monsterBaseline,
        [selected]: { ...(serverState.monsterBaseline?.[selected] || {}), [tKey]: newBaseline },
      } : serverState.monsterBaseline,
      assignedMonsters: justKilled
        ? { ...serverState.assignedMonsters, [selected]: newMonster }
        : serverState.assignedMonsters,
    };

    await updateState(newState);

    setLastHits(prev => ({ ...prev, [selected]: { pts: actualPts, ts: Date.now(), crit: isCrit } }));

    if (isCrit && !justKilled) {
      playCrit();
    } else if (justKilled) {
      playKill();
      const allDone = players.every(pl => {
        const plBaseline = newState.monsterBaseline?.[pl.id]?.[tKey] || 0;
        return plBaseline > 0;
      });
      if (allDone) {
        setTimeout(() => { playFanfare(); setCelebration(true); }, 600);
      }
    } else {
      playHit(chore.pts);
    }

    const critTag = isCrit ? ' CRIT!' : '';
    const levelTag = leveledUp ? ` Level up! Lv ${newLevel}` : '';
    const luckyTag = isLucky ? ` +${luckyGold} lucky gold!` : '';
    const msg = justKilled
      ? `${player.name} slew the ${m.name}!${critTag} +${totalGoldGain} gold${luckyTag}${levelTag}`
      : `${player.name} hits ${m.name} for ${actualPts}!${critTag} HP: ${hp}/${m.maxHP}`;
    showToast(msg);
  }, [selected, serverState, players, activeChores, updateState, showToast]);

  const unclaimChore = useCallback(async (choreId) => {
    if (!selected || !serverState) return;
    const chore = activeChores.find(c => c.id === choreId);
    const storeKey = chore.freq === 'daily' ? 'dailyDone' : chore.freq === 'weekly' ? 'weeklyDone' : 'monthlyDone';
    const store = serverState[storeKey];
    const claimedBy = store[choreId];
    if (!claimedBy || claimedBy !== selected) return;

    const player = players.find(p => p.id === selected);
    const tKey = todayKey();
    const baseline = (serverState.monsterBaseline?.[selected]?.[tKey]) || 0;
    const prevDmg = (serverState.monsterDamage?.[selected]?.[tKey]) || 0;

    if (prevDmg - chore.pts < baseline) {
      showToast("Can't undo past a monster kill");
      return;
    }

    const m = serverState.assignedMonsters?.[selected] || dateSeededMonster(player, tKey);
    const prevDmgOnCurrent = prevDmg - baseline;
    const newDmgOnCurrent = Math.max(0, prevDmgOnCurrent - chore.pts);
    const wasKillShot = prevDmgOnCurrent >= m.maxHP && newDmgOnCurrent < m.maxHP;
    const newDmg = prevDmg - chore.pts;

    const updatedStore = { ...store };
    delete updatedStore[choreId];

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

    const newState = {
      ...serverState,
      gold: { ...serverState.gold, [selected]: gold - reward.cost },
      history: [...(serverState.history || []), { type: 'reward', player: player.name, name: reward.name, pts: reward.cost }],
    };

    await updateState(newState);
    playRedeem();
    showToast(`${player.name} redeemed: ${reward.name}!`);
  }, [selected, serverState, players, activeRewards, updateState, showToast]);

  const resetWeek = useCallback(async () => {
    if (!confirm('Reset chores, gold, and monsters? History will be kept.')) return;
    const freshMonsters = {};
    players.forEach(pl => { freshMonsters[pl.id] = randomMonster(pl); });
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
      assignedMonsters: freshMonsters,
    };
    await updateState(newState);
  }, [players, serverState, updateState]);

  const handleSetupComplete = useCallback(async (wizardConfig) => {
    const freshState = makeDefaultState(wizardConfig.players);
    const { state: after } = applyAutoResets(freshState, wizardConfig.players);
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
    // Set all three together so React batches them into one render
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

    const newMonsters = { ...(serverState.assignedMonsters || {}) };
    wizardConfig.players.forEach(pl => {
      if (!newMonsters[pl.id]) newMonsters[pl.id] = randomMonster(pl);
    });
    Object.keys(newMonsters).forEach(id => { if (!newIds.has(id)) delete newMonsters[id]; });

    const mergedState = {
      ...serverState,
      gold: keep(serverState.gold),
      xp: keep(serverState.xp),
      streaks: keep(serverState.streaks),
      assignedMonsters: newMonsters,
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text2)', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (needsSetup) {
    return (
      <>
        <DungeonBackground />
        <SetupWizard onComplete={handleSetupComplete} />
      </>
    );
  }

  if (showSettings) {
    return (
      <>
        <DungeonBackground />
        <SetupWizard
          initialConfig={config}
          onComplete={handleEditComplete}
          onCancel={() => setShowSettings(false)}
        />
      </>
    );
  }

  const state = serverState;
  const selectedPlayer = players.find(p => p.id === selected);

  return (
    <>
    <DungeonBackground />
    <div className="board" style={{ position: 'relative', zIndex: 1 }}>
      <div className="header">
        <span className="title"><TileSprite tile={118} display={18} /> Questboard</span>
        <div className="tabs">
          <button className={`tab${currentTab === 'chores' ? ' active' : ''}`} onClick={() => setCurrentTab('chores')}>
            <TileSprite tile={118} display={14} /> Chores
          </button>
          <button className={`tab${currentTab === 'rewards' ? ' active' : ''}`} onClick={() => setCurrentTab('rewards')}>
            <TileSprite tile={72} display={14} /> Rewards
          </button>
          <button className={`tab${currentTab === 'history' ? ' active' : ''}`} onClick={() => setCurrentTab('history')}>
            <TileSprite tile={116} display={14} /> History
          </button>
        </div>
        <button className="reset-btn" onClick={() => setShowSettings(true)}><TileSprite tile={115} display={12} /> Settings</button>
        <button className="reset-btn" onClick={resetWeek}><TileSprite tile={115} display={12} /> Reset week</button>
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
            monsterDamage={state.monsterDamage}
            monsterBaseline={state.monsterBaseline}
            lastHit={lastHits[p.id]}
            streak={state.streaks?.[p.id] || 0}
            monster={state.assignedMonsters?.[p.id]}
          />
        ))}
      </div>

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
        {currentTab === 'history' && (
          <HistoryTab history={state.history || []} players={players} />
        )}
      </div>

      <div className={`toast${toast.visible ? ' show' : ''}`}>{toast.msg}</div>
    </div>
    {celebration && <Celebration onDismiss={() => setCelebration(false)} />}
    </>
  );
}
