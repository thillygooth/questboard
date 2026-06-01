import React, { useState } from 'react';

const ICON_CHOICES = [
  '🔧','🪟','🚗','💡','🪴','🏠','🖼️','🛠️','🪑','🪞',
  '🧹','🧽','🍽️','🛏️','🧺','📦','🗂️','🔑','🎯','⭐',
  '🎁','🎂','🍕','🏆','🎵','🎀','💎','🌟','🎮','📚',
  '🪤','🔩','🪚','🪛','🧰','🚿','🛁','🪜','🏗️','🪣',
];

export default function BountyBoard({ players, selectedPlayerId, bounties = [], gold, onCreateBounty, onClaimBounty, onCancelBounty }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', icon: '🔧', goldReward: 10, assignedTo: '' });

  const active = bounties.filter(b => !b.completedAt);
  const recent = [...bounties.filter(b => b.completedAt)].reverse().slice(0, 5);

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const creatorGold = gold || 0;
  const canAfford = form.goldReward >= 1 && form.goldReward <= creatorGold;

  function handleCreate() {
    if (!form.title.trim() || !canAfford) return;
    onCreateBounty(form.title.trim(), form.icon, form.goldReward, form.assignedTo || null);
    setForm({ title: '', icon: '🔧', goldReward: 10, assignedTo: '' });
    setShowCreate(false);
  }

  return (
    <div className="bounty-board">
      <div className="section-label">📜 Bounty Board</div>

      {selectedPlayer && (
        <button className="bounty-post-btn" onClick={() => setShowCreate(v => !v)}>
          {showCreate ? '✕ Cancel' : '+ Post Bounty'}
        </button>
      )}

      {showCreate && selectedPlayer && (
        <div className="bounty-create-form">
          <div style={{ marginBottom: 10 }}>
            <div className="bounty-form-label">Quest Title</div>
            <input
              className="bounty-input"
              placeholder="e.g. Install vanity mirror"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              maxLength={48}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div className="bounty-form-label">Icon</div>
            <div className="bounty-icon-grid">
              {ICON_CHOICES.map(ic => (
                <button
                  key={ic}
                  className={`bounty-icon-btn${form.icon === ic ? ' selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, icon: ic }))}
                >{ic}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div className="bounty-form-label">Gold Reward</div>
              <input
                type="number"
                className="bounty-input"
                min={1}
                max={creatorGold}
                value={form.goldReward}
                onChange={e => setForm(f => ({ ...f, goldReward: Math.max(1, parseInt(e.target.value) || 1) }))}
              />
              <div className="bounty-form-hint">
                You have {creatorGold}g — locked in until claimed or canceled
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="bounty-form-label">Assign To</div>
              <select
                className="bounty-input"
                value={form.assignedTo}
                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
              >
                <option value="">Anyone</option>
                {players.filter(p => p.id !== selectedPlayerId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            className="bounty-submit-btn"
            disabled={!form.title.trim() || !canAfford}
            onClick={handleCreate}
          >
            {canAfford
              ? `Post Bounty (${form.goldReward}g)`
              : creatorGold < 1 ? 'No gold to offer' : 'Not enough gold'}
          </button>
        </div>
      )}

      {active.length === 0 && (
        <div className="no-select">
          {selectedPlayer
            ? 'No active bounties. Post one to offer gold for a task!'
            : 'Select a hero to post or claim bounties.'}
        </div>
      )}

      {active.map(bounty => {
        const creator = players.find(p => p.id === bounty.createdBy);
        const assignee = bounty.assignedTo ? players.find(p => p.id === bounty.assignedTo) : null;
        const isCreator = bounty.createdBy === selectedPlayerId;
        const canClaim = selectedPlayerId && !isCreator &&
          (!bounty.assignedTo || bounty.assignedTo === selectedPlayerId);

        return (
          <div key={bounty.id} className="bounty-card">
            <div className="bounty-card-top">
              <span className="bounty-card-icon">{bounty.icon}</span>
              <div className="bounty-card-info">
                <div className="bounty-title">{bounty.title}</div>
                <div className="bounty-meta">
                  {creator && <span>from {creator.name}</span>}
                  {assignee
                    ? <span> → {assignee.name}</span>
                    : <span className="bounty-meta-anyone"> → anyone</span>
                  }
                </div>
              </div>
              <div className="bounty-gold">
                <span className="gold-coin-sm" />{bounty.gold}g
              </div>
            </div>
            {(isCreator || canClaim) && (
              <div className="bounty-card-actions">
                {isCreator && (
                  <button className="bounty-cancel-btn" onClick={() => onCancelBounty(bounty.id)}>
                    Cancel (+{bounty.gold}g back)
                  </button>
                )}
                {canClaim && (
                  <button className="bounty-claim-btn" onClick={() => onClaimBounty(bounty.id)}>
                    Complete! +{bounty.gold}g
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {recent.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 16 }}>✓ Recently Completed</div>
          {recent.map(bounty => {
            const completer = players.find(p => p.id === bounty.completedBy);
            const creator = players.find(p => p.id === bounty.createdBy);
            return (
              <div key={bounty.id} className="bounty-card bounty-card-done">
                <span style={{ fontSize: 16, flexShrink: 0 }}>{bounty.icon}</span>
                <div className="bounty-card-info">
                  <div className="bounty-title">{bounty.title}</div>
                  <div className="bounty-meta">
                    {completer?.name} completed — +{bounty.gold}g
                    {creator && creator.id !== completer?.id && (
                      <span className="bounty-meta-anyone"> (offered by {creator.name})</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
