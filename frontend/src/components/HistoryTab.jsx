import React, { useState } from 'react';
import TileSprite from './TileSprite';

function formatTime(ts) {
  if (!ts) return null;
  const now = Date.now();
  const diff = now - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

const TYPE_TILE = {
  chore:   118,
  gold:     55,
  penalty: 123,
  reward:   41,
  badge:    29,
  loot:     72,
};

export default function HistoryTab({ history, players, weeklyGold = {} }) {
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
            let action, pts;
            switch (h.type) {
              case 'chore':   action = 'completed'; pts = `(+${h.pts} dmg${h.crit ? ' CRIT' : ''})`; break;
              case 'penalty': action = 'attacked by'; pts = `(-${h.pts} gold)`; break;
              case 'badge':   action = 'earned'; pts = h.icon || '🏅'; break;
              case 'loot':    action = 'found'; pts = h.pts ? `(+${h.pts} gold)` : (h.xp ? `(+${h.xp} XP)` : ''); break;
              default:        action = 'slew'; pts = h.pts != null ? `(+${h.pts} gold${h.lucky ? ' LUCKY' : ''})` : ''; break;
            }
            return (
              <div key={i} className="redeemed-item">
                <TileSprite tile={tile} display={14} />
                <span>
                  <span className="redeemed-name">{h.player}</span> {action}{' '}
                  <span className="redeemed-name">{h.name}</span> {pts}
                  {h.ts && <span className="history-ts">{formatTime(h.ts)}</span>}
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
                  {h.ts && <span className="history-ts">{formatTime(h.ts)}</span>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {players && players.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24 }}>Weekly leaderboard</div>
          <div className="redeemed-list">
            {[...players]
              .sort((a, b) => (weeklyGold[b.id] || 0) - (weeklyGold[a.id] || 0))
              .map((p, i) => (
                <div key={p.id} className="redeemed-item">
                  <span style={{ fontSize: 14, minWidth: 20 }}>{['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'][i]}</span>
                  <span>
                    <span className="redeemed-name">{p.name}</span>{' '}
                    <span style={{ color: '#f5c870' }}>{weeklyGold[p.id] || 0} gold</span> this week
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </>
  );
}
