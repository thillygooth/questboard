import React, { useMemo } from 'react';
import { getChoresFor, choreDoneKey, isChoreDoneForPlayer, getChoreClaimant } from '../logic';
import TileSprite from './TileSprite';

function dmgClass(p) {
  if (p <= 1) return 'pts-1';
  if (p === 2) return 'pts-2';
  if (p === 3) return 'pts-3';
  if (p === 4) return 'pts-4';
  if (p === 5) return 'pts-5';
  return 'pts-6';
}

// Derived state (isDone / claimedName / canUndo / isBonus) is computed by the
// parent and passed as primitives so this stays cheap to memo-compare: a single
// chore tap only re-renders the tiles whose status actually changed, not the
// whole grid.
const ChoreCard = React.memo(function ChoreCard({ chore, isDone, claimedName, canUndo, isBonus, onClaim, onUnclaim }) {
  function handleClick() {
    if (isDone) {
      if (canUndo) onUnclaim(chore.id);
    } else {
      onClaim(chore.id);
    }
  }

  return (
    <div
      className={`chore ${chore.freq}${isDone ? ' done' : ''}${canUndo ? ' undoable' : ''}${isBonus ? ' bonus' : ''}`}
      onClick={handleClick}
      title={canUndo ? 'Tap to undo' : undefined}
    >
      <div className="chore-top">
        <TileSprite tile={chore.icon} scale={2} />
        {isBonus && <span className="bonus-badge">⭐2x</span>}
        <span className={`pts-badge ${dmgClass(chore.pts)}`}>
          <TileSprite tile={118} display={10} />
          {chore.pts}
        </span>
      </div>
      <div className="chore-name">{chore.name}{chore.mode === 'solo' && <span className="solo-badge">1P</span>}</div>
      {isDone && (
        <div className="done-by">{canUndo ? '↩ undo' : `✔ ${claimedName || 'done'}`}</div>
      )}
    </div>
  );
});

export default function ChoreGrid({ player, players, activeChores, dailyDone, weeklyDone, monthlyDone, onClaimChore, onUnclaimChore, bonusChoreId }) {
  // Filtering only depends on the player and chore set, not on done-state, so it
  // shouldn't re-run on every chore tap (each tap re-renders this grid).
  const { daily, weekly, monthly } = useMemo(() => {
    const chores = getChoresFor(player, activeChores);
    return {
      daily:   chores.filter(c => c.freq === 'daily'),
      weekly:  chores.filter(c => c.freq === 'weekly'),
      monthly: chores.filter(c => c.freq === 'monthly'),
    };
  }, [player, activeChores]);

  const renderCard = (c) => {
    const store = c.freq === 'daily' ? dailyDone : c.freq === 'weekly' ? weeklyDone : (monthlyDone || {});
    const isDone = isChoreDoneForPlayer(store, c, player.id);
    const claimedById = getChoreClaimant(store, c, player.id);
    const claimedName = claimedById ? (players.find(p => p.id === claimedById)?.name ?? null) : null;
    return (
      <ChoreCard
        key={c.id}
        chore={c}
        isDone={isDone}
        claimedName={claimedName}
        canUndo={isDone && claimedById === player.id}
        isBonus={c.id === bonusChoreId}
        onClaim={onClaimChore}
        onUnclaim={onUnclaimChore}
      />
    );
  };

  return (
    <div className="chore-sections">
      <div>
        <div className="section-label">
          <TileSprite tile={118} display={12} />
          Daily Quests
          <span className="reset-info">— resets at midnight</span>
        </div>
        <div className="chores">
          {daily.map(renderCard)}
        </div>
      </div>
      {weekly.length > 0 && (
        <div>
          <div className="section-label">
            <TileSprite tile={131} display={12} />
            Weekly Quests
            <span className="reset-info">— resets Sunday</span>
          </div>
          <div className="chores">
            {weekly.map(renderCard)}
          </div>
        </div>
      )}
      {monthly.length > 0 && (
        <div>
          <div className="section-label">
            <TileSprite tile={72} display={12} />
            Monthly Quests
            <span className="reset-info">— resets 1st of month</span>
          </div>
          <div className="chores">
            {monthly.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}
