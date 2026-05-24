import React, { useState } from 'react';
import TileSprite from './TileSprite';

const TYPE_TILE = {
  chore:   118,
  gold:     55,
  penalty: 123,
  reward:   41,
};

export default function HistoryTab({ history, players }) {
  const [filter, setFilter] = useState(null);

  const all = [...history].reverse().slice(0, 200);
  const activity = all.filter(h => h.type !== 'reward');
  const rewards = all.filter(h => h.type === 'reward');
  const hist = filter ? activity.filter(h => h.player === filter) : activity.slice(0, 60);
  const rewardHist = filter ? rewards.filter(h => h.player === filter) : rewards;

  return (
    <>
      <div className="section-label">Recent activity</div>
      <div className="history-filters">
        <button
          className={`history-filter-btn${filter === null ? ' active' : ''}`}
          onClick={() => setFilter(null)}
        >
          All
        </button>
        {(players ?? []).map(p => (
          <button
            key={p.id}
            className={`history-filter-btn${filter === p.name ? ' active' : ''}`}
            onClick={() => setFilter(prev => prev === p.name ? null : p.name)}
          >
            {p.name}
          </button>
        ))}
      </div>
      {hist.length === 0 ? (
        <div className="empty">No activity yet.</div>
      ) : (
        <div className="redeemed-list">
          {hist.map((h, i) => {
            const tile = TYPE_TILE[h.type] ?? 118;
            const action = h.type === 'chore' ? 'completed' : h.type === 'penalty' ? 'attacked by' : 'slew';
            const pts = h.type === 'chore' ? `(+${h.pts} dmg${h.crit ? ' CRIT' : ''})` : h.type === 'penalty' ? `(-${h.pts} gold)` : `(+${h.pts} gold${h.lucky ? ' LUCKY' : ''})`;
            return (
              <div key={i} className="redeemed-item">
                <TileSprite tile={tile} display={14} />
                <span>
                  <span className="redeemed-name">{h.player}</span> {action}{' '}
                  <span className="redeemed-name">{h.name}</span> {pts}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {rewardHist.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24 }}>Rewards redeemed</div>
          <div className="redeemed-list">
            {rewardHist.map((h, i) => (
              <div key={i} className="redeemed-item">
                <TileSprite tile={41} display={14} />
                <span>
                  <span className="redeemed-name">{h.player}</span> redeemed{' '}
                  <span className="redeemed-name">{h.name}</span>{' '}
                  (-{h.pts} gold)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
