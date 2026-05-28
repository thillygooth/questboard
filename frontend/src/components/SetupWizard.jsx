import React, { useState } from 'react';
import { ALL_CHORES, REWARDS, POWER_UPS, DEFAULT_POWER_UP_SETTINGS, TRIGGER_TYPES, DURATION_OPTIONS, CLASSES } from '../data';
import TileSprite from './TileSprite';

const ICON_CHOICES = [
  '🧹','🧽','🍽️','🛏️','🧺','🌱','🚿','🗑️',
  '🐕','🐱','🍲','🛒','🪣','🧴','🔧','🧼',
  '🪟','🚗','📦','💡','🔑','🪴','🧲','🏠',
  '⭐','🎯','📚','🎮','🎂','🍦','🎬','🎲',
  '🛋️','💎','🌟','🎁','🍕','🏆','🎵','🎀',
];

const PLAYER_COLORS = [
  { color: '#1a3a5c', textColor: '#7ab8f5' },
  { color: '#4a1a2e', textColor: '#f5a0c0' },
  { color: '#1e3a10', textColor: '#8dc447' },
  { color: '#2d1a4a', textColor: '#c4a0f5' },
  { color: '#3a2a0a', textColor: '#f5c870' },
  { color: '#0a3a3a', textColor: '#70f5e8' },
];

const WHO_CYCLE = ['all', 'adults', 'kids'];
const WHO_LABEL = { all: 'everyone', adults: 'adults', kids: 'kids' };

const REWARD_TIERS = [
  { label: 'QUICK', max: 15  },
  { label: 'MID',   max: 30  },
  { label: 'BIG',   max: 65  },
  { label: 'DREAM', max: 999 },
];

const TABS = ['party', 'quests', 'rewards', 'powerups', 'display'];
const TAB_LABELS = { party: 'Party', quests: 'Quests', rewards: 'Rewards', powerups: 'Power-Ups', display: 'Display' };

const UI_SCALES = [
  { id: 'mini',   label: 'Mini',   desc: '100%' },
  { id: 'heroic', label: 'Heroic', desc: '125%' },
  { id: 'epic',   label: 'Epic',   desc: '175%' },
];

function makeNewPlayer(existingPlayers = []) {
  const usedNums = new Set(
    existingPlayers.map(p => parseInt(p.id.replace('player_', ''))).filter(n => !isNaN(n))
  );
  let n = 0;
  while (usedNums.has(n)) n++;
  const colorIdx = n % PLAYER_COLORS.length;
  return {
    id: `player_${n}`,
    name: '',
    mode: 'adults',
    class: CLASSES[n % CLASSES.length].id,
    color: PLAYER_COLORS[colorIdx].color,
    textColor: PLAYER_COLORS[colorIdx].textColor,
  };
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(5,5,18,0.97)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, fontFamily: 'inherit',
  },
  card: {
    background: '#13132a', border: '2px solid #3a3a6e',
    borderRadius: 4, width: '100%', maxWidth: 560,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
  },
  header: {
    padding: '16px 20px 12px', borderBottom: '1px solid #2a2a4a',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { color: '#f5c870', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
  stepIndicator: { color: '#5a5a8a', fontSize: 11 },
  body: { flex: 1, overflowY: 'auto', padding: '20px' },
  footer: {
    padding: '12px 20px', borderTop: '1px solid #2a2a4a',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  btn: {
    background: '#2a2a4e', border: '1px solid #4a4a7e', color: '#c8d0e0',
    padding: '8px 20px', cursor: 'pointer', fontSize: 12, letterSpacing: 1,
  },
  btnPrimary: {
    background: '#4a3a0a', border: '1px solid #f5c870', color: '#f5c870',
    padding: '8px 20px', cursor: 'pointer', fontSize: 12, letterSpacing: 1,
  },
  btnDisabled: {
    background: '#1a1a2e', border: '1px solid #3a3a5e', color: '#4a4a7a',
    padding: '8px 20px', cursor: 'default', fontSize: 12, letterSpacing: 1,
  },
  btnDanger: {
    background: '#3a1a1a', border: '1px solid #8a3a3a', color: '#c08080',
    padding: '8px 20px', cursor: 'pointer', fontSize: 12, letterSpacing: 1,
  },
  input: {
    background: '#0d0d20', border: '1px solid #3a3a6e', color: '#c8d0e0',
    padding: '8px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box',
  },
  label: { color: '#8a8aaa', fontSize: 11, marginBottom: 6, display: 'block', letterSpacing: 1 },
  h2: { color: '#c8d0e0', fontSize: 16, margin: '0 0 16px', fontWeight: 'bold' },
  p: { color: '#7a7a9a', fontSize: 12, lineHeight: 1.6, margin: '0 0 16px' },
};

// ── Step 0: Welcome ───────────────────────────────────────────────────────────
function StepWelcome({ onNext }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>⚔</div>
      <div style={{ color: '#f5c870', fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>QUESTBOARD</div>
      <p style={{ ...S.p, maxWidth: 360, margin: '0 auto 24px' }}>
        Turn household chores into a pixel art RPG adventure. Each family member gets a hero and fights a monster every day — complete chores to deal damage and earn gold.
      </p>
      <button style={S.btnPrimary} onClick={onNext}>Start Setup →</button>
    </div>
  );
}

// ── Step 1: Player count ──────────────────────────────────────────────────────
function StepPlayerCount({ current, onSelect }) {
  return (
    <div>
      <div style={S.h2}>How many heroes?</div>
      <p style={S.p}>Each player gets their own character, monster, and gold.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button
            key={n}
            style={{
              ...(n === current ? S.btnPrimary : S.btn),
              flex: '1 1 60px', fontSize: 20, padding: '16px 8px',
            }}
            onClick={() => onSelect(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Shared: player form (wizard + Party tab) ──────────────────────────────────
function PlayerForm({ player, onChange }) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>NAME</label>
        <input
          style={S.input}
          placeholder="Enter a name…"
          value={player.name}
          onChange={e => onChange('name', e.target.value)}
          autoFocus
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>DIFFICULTY</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { val: 'adults', label: 'Hard', desc: 'Adults' },
            { val: 'kids',   label: 'Easy', desc: 'Kids'   },
          ].map(opt => (
            <button
              key={opt.val}
              style={{ ...(player.mode === opt.val ? S.btnPrimary : S.btn), flex: 1, padding: '10px 8px' }}
              onClick={() => onChange('mode', opt.val)}
            >
              <div style={{ fontSize: 14, fontWeight: 'bold' }}>{opt.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>CLASS</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CLASSES.map(cls => (
            <button
              key={cls.id}
              style={{
                ...(player.class === cls.id ? S.btnPrimary : S.btn),
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 12px', gap: 4, flex: '1 1 70px',
              }}
              onClick={() => onChange('class', cls.id)}
            >
              <TileSprite tile={cls.tile} scale={3} />
              <span style={{ fontSize: 10 }}>{cls.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>COLOR</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {PLAYER_COLORS.map((c, i) => (
            <button
              key={i}
              style={{
                width: 36, height: 36, background: c.color,
                border: player.color === c.color ? `2px solid ${c.textColor}` : '2px solid #3a3a6e',
                cursor: 'pointer',
              }}
              onClick={() => { onChange('color', c.color); onChange('textColor', c.textColor); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Per-player setup (wizard) ─────────────────────────────────────────
function StepPlayerSetup({ player, playerIdx, total, onChange, onNext, onBack, onDone }) {
  const canAdvance = player.name.trim().length > 0;
  return (
    <div>
      <div style={S.h2}>
        Hero {playerIdx + 1} of {total}
        {player.name && <span style={{ color: '#f5c870' }}> — {player.name}</span>}
      </div>
      <PlayerForm player={player} onChange={onChange} />
      {!canAdvance && (
        <div style={{ color: '#c05a5a', fontSize: 11, marginTop: 4 }}>Enter a name to continue.</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <button style={S.btn} onClick={onBack}>← Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {playerIdx > 0 && playerIdx + 1 < total && (
            <button style={S.btn} onClick={onDone}>Done adding heroes</button>
          )}
          <button
            style={canAdvance ? S.btnPrimary : S.btnDisabled}
            onClick={canAdvance ? onNext : undefined}
          >
            {playerIdx + 1 < total ? 'Next Hero →' : 'Choose Chores →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared: who-toggle button ─────────────────────────────────────────────────
function CycleBtn({ value, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: '1px solid #3a3a5e', color: '#7ab8f5', fontSize: 10, padding: '2px 6px', cursor: 'pointer' }}
    >
      {WHO_LABEL[value]}
    </button>
  );
}

// ── Shared: custom item form ──────────────────────────────────────────────────
function CustomForm({ form, setForm, onSubmit, onCancel, extraFields }) {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <div style={{ background: '#0d0d20', border: '1px solid #3a3a6e', padding: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input style={{ ...S.input, flex: 3 }} placeholder="Name" value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
        <button
          style={{ ...S.btn, fontSize: 20, padding: '4px 10px', minWidth: 48 }}
          onClick={() => setShowPicker(p => !p)}
          title="Pick icon"
        >{form.icon || '❓'}</button>
      </div>
      {showPicker && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, background: '#080818', padding: 8, border: '1px solid #2a2a4a' }}>
          {ICON_CHOICES.map(ic => (
            <button
              key={ic}
              style={{ background: form.icon === ic ? '#3a3a6e' : 'none', border: '1px solid transparent', fontSize: 18, cursor: 'pointer', padding: 4, borderRadius: 2 }}
              onClick={() => { setForm(f => ({ ...f, icon: ic })); setShowPicker(false); }}
            >{ic}</button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {extraFields}
        <select style={{ ...S.input, flex: 1 }} value={form.who}
          onChange={e => setForm(f => ({ ...f, who: e.target.value }))}>
          <option value="all">Everyone</option>
          <option value="adults">Adults</option>
          <option value="kids">Kids</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button style={S.btnPrimary} onClick={onSubmit}>Add</button>
        <button style={S.btn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Shared: chore list (wizard step + Quests tab) ─────────────────────────────
function ChoreSection({ players, enabledChores, onToggle, choreOverrides, onOverride, customChores, onAddCustom, onRemoveCustom }) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '⭐', pts: 2, who: 'all', freq: 'daily', mode: 'party' });

  const modes = new Set(players.map(p => p.mode));
  const daily   = ALL_CHORES.filter(c => c.freq === 'daily');
  const weekly  = ALL_CHORES.filter(c => c.freq === 'weekly');
  const monthly = ALL_CHORES.filter(c => c.freq === 'monthly');

  function isRelevant(who) {
    return who === 'all' || modes.has(who);
  }

  function submitCustom() {
    if (!form.name.trim()) return;
    onAddCustom({ ...form, id: `custom_${Date.now()}`, name: form.name.trim() });
    setForm({ name: '', icon: '⭐', pts: 2, who: 'all', freq: 'daily', mode: 'party' });
    setAddingCustom(false);
  }

  function ChoreRow({ chore, isCustom }) {
    const ov = choreOverrides[chore.id] || {};
    const who  = ov.who  ?? chore.who;
    const pts  = ov.pts  ?? chore.pts;
    const mode = ov.mode ?? chore.mode ?? 'party';
    const dim  = !isRelevant(who);

    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #1e1e3a', opacity: dim ? 0.4 : 1, cursor: 'pointer' }}
        onClick={() => !isCustom && onToggle(chore.id)}
      >
        {!isCustom && (
          <input type="checkbox" checked={enabledChores.has(chore.id)} onChange={() => {}}
            style={{ accentColor: '#f5c870', width: 14, height: 14, pointerEvents: 'none' }} />
        )}
        <span style={{ fontSize: 16 }}>{chore.icon}</span>
        <span style={{ color: '#c8d0e0', fontSize: 12, flex: 1 }}>{chore.name}</span>
        <button
          onClick={e => { e.stopPropagation(); onOverride(chore.id, { ...ov, mode: mode === 'party' ? 'solo' : 'party' }); }}
          style={{ background: 'none', border: '1px solid #3a3a5e', color: mode === 'solo' ? '#f5a0c0' : '#8dc447', fontSize: 10, padding: '2px 6px', cursor: 'pointer', minWidth: 34 }}
          title={mode === 'solo' ? '1 player only — tap to make shared' : 'All players share — tap to make solo'}
        >{mode === 'solo' ? '1P' : 'ALL'}</button>
        <CycleBtn value={who} onClick={e => { e.stopPropagation(); const next = WHO_CYCLE[(WHO_CYCLE.indexOf(who) + 1) % WHO_CYCLE.length]; onOverride(chore.id, { ...ov, who: next }); }} />
        <button
          onClick={e => { e.stopPropagation(); onOverride(chore.id, { ...ov, pts: pts >= 6 ? 1 : pts + 1 }); }}
          style={{ background: 'none', border: '1px solid #3a3a5e', color: '#f5c870', fontSize: 10, padding: '2px 6px', cursor: 'pointer', minWidth: 34 }}
        >{pts}pts</button>
        {isCustom && (
          <button onClick={e => { e.stopPropagation(); onRemoveCustom(chore.id); }}
            style={{ background: 'none', border: 'none', color: '#7a3a3a', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>✕</button>
        )}
      </div>
    );
  }

  function Section({ title, chores }) {
    const allOn = chores.every(c => enabledChores.has(c.id));
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: '#f5c870', fontSize: 11, letterSpacing: 1 }}>{title}</span>
          <button style={{ ...S.btn, padding: '2px 8px', fontSize: 10 }}
            onClick={() => {
              if (allOn) chores.filter(c => enabledChores.has(c.id)).forEach(c => onToggle(c.id));
              else chores.filter(c => !enabledChores.has(c.id)).forEach(c => onToggle(c.id));
            }}>{allOn ? 'none' : 'all'}</button>
        </div>
        {chores.map(c => <ChoreRow key={c.id} chore={c} />)}
      </div>
    );
  }

  return (
    <div>
      <Section title="DAILY" chores={daily} />
      <Section title="WEEKLY" chores={weekly} />
      <Section title="MONTHLY" chores={monthly} />
      {customChores.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={{ color: '#f5c870', fontSize: 11, letterSpacing: 1 }}>CUSTOM</span>
          {customChores.map(c => <ChoreRow key={c.id} chore={c} isCustom />)}
        </div>
      )}
      {addingCustom ? (
        <CustomForm
          form={form} setForm={setForm}
          onSubmit={submitCustom} onCancel={() => setAddingCustom(false)}
          extraFields={
            <>
              <select style={{ ...S.input, flex: 1 }} value={form.pts} onChange={e => setForm(f => ({ ...f, pts: +e.target.value }))}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} pts</option>)}
              </select>
              <select style={{ ...S.input, flex: 1 }} value={form.freq} onChange={e => setForm(f => ({ ...f, freq: e.target.value }))}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <select style={{ ...S.input, flex: 1 }} value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))}>
                <option value="party">ALL (shared)</option>
                <option value="solo">1P (per player)</option>
              </select>
            </>
          }
        />
      ) : (
        <button style={{ ...S.btn, width: '100%', marginBottom: 16 }} onClick={() => setAddingCustom(true)}>+ Add custom chore</button>
      )}
    </div>
  );
}

// ── Step 3: Chore selection (wizard) ─────────────────────────────────────────
function StepChoreSelect({ players, enabledChores, onToggle, choreOverrides, onOverride, customChores, onAddCustom, onRemoveCustom, onBack, onNext }) {
  return (
    <div>
      <div style={S.h2}>Choose your quests</div>
      <p style={S.p}>Select chores. Green <b style={{ color: '#8dc447' }}>ALL</b> = shared by party; pink <b style={{ color: '#f5a0c0' }}>1P</b> = each player tracks independently.</p>
      <ChoreSection
        players={players}
        enabledChores={enabledChores} onToggle={onToggle}
        choreOverrides={choreOverrides} onOverride={onOverride}
        customChores={customChores} onAddCustom={onAddCustom} onRemoveCustom={onRemoveCustom}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <button style={S.btn} onClick={onBack}>← Back</button>
        <button style={S.btnPrimary} onClick={onNext}>Next: Rewards →</button>
      </div>
    </div>
  );
}

// ── Shared: reward list (wizard step + Rewards tab) ───────────────────────────
function RewardSection({ players, enabledRewards, onToggle, rewardOverrides, onOverride, customRewards, onAddCustom, onRemoveCustom }) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '🏆', cost: 20, who: 'all', desc: '' });

  const modes = new Set(players.map(p => p.mode));

  function isRelevant(who) {
    return who === 'all' || modes.has(who);
  }

  function submitCustom() {
    if (!form.name.trim()) return;
    onAddCustom({ ...form, id: `creward_${Date.now()}`, name: form.name.trim() });
    setForm({ name: '', icon: '🏆', cost: 20, who: 'all', desc: '' });
    setAddingCustom(false);
  }

  function RewardRow({ reward, isCustom }) {
    const ov   = rewardOverrides[reward.id] || {};
    const who  = ov.who  ?? reward.who;
    const cost = ov.cost ?? reward.cost;
    const dim  = !isRelevant(who);

    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #1e1e3a', opacity: dim ? 0.4 : 1, cursor: 'pointer' }}
        onClick={() => !isCustom && onToggle(reward.id)}
      >
        {!isCustom && (
          <input type="checkbox" checked={enabledRewards.has(reward.id)} onChange={() => {}}
            style={{ accentColor: '#f5c870', width: 14, height: 14, pointerEvents: 'none' }} />
        )}
        <span style={{ fontSize: 16 }}>{reward.icon}</span>
        <span style={{ color: '#c8d0e0', fontSize: 12, flex: 1 }}>{reward.name}</span>
        <CycleBtn value={who} onClick={e => { e.stopPropagation(); const next = WHO_CYCLE[(WHO_CYCLE.indexOf(who) + 1) % WHO_CYCLE.length]; onOverride(reward.id, { ...ov, who: next }); }} />
        <input
          type="number" value={cost} min={1} max={999}
          onClick={e => e.stopPropagation()}
          onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) onOverride(reward.id, { ...ov, cost: v }); }}
          style={{ ...S.input, width: 52, padding: '2px 4px', fontSize: 11, textAlign: 'center', color: '#f5c870' }}
        />
        <span style={{ color: '#7a6a3a', fontSize: 10 }}>gold</span>
        {isCustom && (
          <button onClick={e => { e.stopPropagation(); onRemoveCustom(reward.id); }}
            style={{ background: 'none', border: 'none', color: '#7a3a3a', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>✕</button>
        )}
      </div>
    );
  }

  function TierSection({ label, max, prev }) {
    const tier = REWARDS.filter(r => r.cost <= max && r.cost > (prev || 0));
    if (!tier.length) return null;
    const allOn = tier.every(r => enabledRewards.has(r.id));
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: '#f5c870', fontSize: 11, letterSpacing: 1 }}>{label}</span>
          <button style={{ ...S.btn, padding: '2px 8px', fontSize: 10 }}
            onClick={() => {
              if (allOn) tier.filter(r => enabledRewards.has(r.id)).forEach(r => onToggle(r.id));
              else tier.filter(r => !enabledRewards.has(r.id)).forEach(r => onToggle(r.id));
            }}>{allOn ? 'none' : 'all'}</button>
        </div>
        {tier.map(r => <RewardRow key={r.id} reward={r} />)}
      </div>
    );
  }

  return (
    <div>
      {REWARD_TIERS.map((t, i) => (
        <TierSection key={t.label} label={t.label} max={t.max} prev={REWARD_TIERS[i - 1]?.max} />
      ))}
      {customRewards.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <span style={{ color: '#f5c870', fontSize: 11, letterSpacing: 1 }}>CUSTOM</span>
          {customRewards.map(r => <RewardRow key={r.id} reward={r} isCustom />)}
        </div>
      )}
      {addingCustom ? (
        <CustomForm
          form={form} setForm={setForm}
          onSubmit={submitCustom} onCancel={() => setAddingCustom(false)}
          extraFields={
            <input
              type="number" min={1} max={999} value={form.cost}
              onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))}
              style={{ ...S.input, flex: 1 }} placeholder="Cost"
            />
          }
        />
      ) : (
        <button style={{ ...S.btn, width: '100%', marginBottom: 16 }} onClick={() => setAddingCustom(true)}>+ Add custom reward</button>
      )}
    </div>
  );
}

// ── Step 4: Reward selection (wizard) ─────────────────────────────────────────
function StepRewardSelect({ players, enabledRewards, onToggle, rewardOverrides, onOverride, customRewards, onAddCustom, onRemoveCustom, onBack, onLaunch, crtEnabled, onToggleCrt, uiScale, onChangeUiScale, animatedBg, onToggleAnimatedBg }) {
  return (
    <div>
      <div style={S.h2}>Choose your rewards</div>
      <p style={S.p}>Toggle rewards and set gold costs. Click the blue badge to change who can redeem it.</p>
      <RewardSection
        players={players}
        enabledRewards={enabledRewards} onToggle={onToggle}
        rewardOverrides={rewardOverrides} onOverride={onOverride}
        customRewards={customRewards} onAddCustom={onAddCustom} onRemoveCustom={onRemoveCustom}
      />
      <div style={{ marginTop: 20, borderTop: '1px solid #2a2a4a', paddingTop: 16 }}>
        <div style={{ ...S.label, marginBottom: 10 }}>DISPLAY</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            style={{ ...(crtEnabled ? S.btnPrimary : S.btn), padding: '6px 14px', fontSize: 11 }}
            onClick={onToggleCrt}
          >
            {crtEnabled ? '✓ CRT Scanlines ON' : 'CRT Scanlines OFF'}
          </button>
          <span style={{ color: '#5a5a7a', fontSize: 10 }}>Retro CRT overlay effect</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            style={{ ...(animatedBg ? S.btnPrimary : S.btn), padding: '6px 14px', fontSize: 11 }}
            onClick={onToggleAnimatedBg}
          >
            {animatedBg ? '✓ Animated BG ON' : 'Animated BG OFF'}
          </button>
          <span style={{ color: '#5a5a7a', fontSize: 10 }}>Disable if background flickers</span>
        </div>
        <div style={{ ...S.label, marginBottom: 8 }}>UI SCALE</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {UI_SCALES.map(s => (
            <button
              key={s.id}
              style={{ ...(uiScale === s.id ? S.btnPrimary : S.btn), flex: 1, padding: '8px 4px', fontSize: 11 }}
              onClick={() => onChangeUiScale(s.id)}
            >
              <div style={{ fontWeight: 'bold' }}>{s.label}</div>
              <div style={{ fontSize: 9, opacity: 0.7 }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button style={S.btn} onClick={onBack}>← Back</button>
        <button style={S.btnPrimary} onClick={onLaunch}>Launch the Adventure! ⚔</button>
      </div>
    </div>
  );
}

// ── Edit tab: Party ───────────────────────────────────────────────────────────
function TabParty({ players, onUpdatePlayer, onAddPlayer, onRemovePlayer }) {
  const [editIdx, setEditIdx] = useState(null);

  if (editIdx !== null && players[editIdx]) {
    const player = players[editIdx];
    const canSave = player.name.trim().length > 0;
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button style={{ ...S.btn, padding: '4px 10px', fontSize: 11 }} onClick={() => setEditIdx(null)}>← Back</button>
          <span style={{ color: '#c8d0e0', fontSize: 13 }}>
            Edit {player.name || 'Hero'}
          </span>
        </div>
        <PlayerForm
          player={player}
          onChange={(key, val) => onUpdatePlayer(editIdx, key, val)}
        />
        {!canSave && (
          <div style={{ color: '#c05a5a', fontSize: 11, marginTop: 4 }}>Enter a name.</div>
        )}
        <button
          style={{ ...(canSave ? S.btnPrimary : S.btnDisabled), marginTop: 12 }}
          onClick={canSave ? () => setEditIdx(null) : undefined}
        >Done ✓</button>
      </div>
    );
  }

  return (
    <div>
      <p style={S.p}>Tap a hero to edit name, class, or color.</p>
      {players.map((p, i) => {
        const cls = CLASSES.find(c => c.id === p.class) || CLASSES[0];
        return (
          <div
            key={p.id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e1e3a', cursor: 'pointer' }}
            onClick={() => setEditIdx(i)}
          >
            <div style={{ width: 36, height: 36, background: p.color, border: `1px solid ${p.textColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TileSprite tile={cls.tile} scale={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: p.textColor, fontSize: 13, fontWeight: 'bold' }}>{p.name || '(unnamed)'}</div>
              <div style={{ color: '#5a5a8a', fontSize: 10 }}>{cls.label} · {p.mode === 'kids' ? 'Easy' : 'Hard'}</div>
            </div>
            <div style={{ color: '#5a5a8a', fontSize: 14 }}>›</div>
          </div>
        );
      })}
      {players.length < 6 && (
        <button
          style={{ ...S.btn, width: '100%', marginTop: 16 }}
          onClick={() => { onAddPlayer(); setEditIdx(players.length); }}
        >+ Add Hero</button>
      )}
      {players.length > 1 && (
        <button
          style={{ ...S.btnDanger, width: '100%', marginTop: 8, padding: '6px 20px', fontSize: 11 }}
          onClick={() => onRemovePlayer(players.length - 1)}
        >Remove {players[players.length - 1].name || 'Last Hero'}</button>
      )}
    </div>
  );
}

// ── Edit tab: Power-Ups ───────────────────────────────────────────────────────
function TabPowerUps({ powerUpSettings, onChange }) {
  return (
    <div>
      <p style={S.p}>Power tokens are earned by dealing overkill damage after the daily monster is defeated. Configure which power-ups are available and how they trigger.</p>
      {POWER_UPS.map(pu => {
        const cfg = powerUpSettings[pu.id] || { enabled: true, trigger: 'daily_chores', count: 5, durationHours: 24 };
        return (
          <div key={pu.id} style={{ padding: '12px 0', borderBottom: '1px solid #1e1e3a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TileSprite tile={pu.icon} scale={2} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#c8d0e0', fontSize: 13, fontWeight: 'bold' }}>{pu.name}</div>
                <div style={{ color: '#5a5a8a', fontSize: 10 }}>{pu.desc}</div>
              </div>
              <button
                style={{ ...(cfg.enabled ? S.btnPrimary : S.btn), padding: '4px 12px', fontSize: 11 }}
                onClick={() => onChange(pu.id, { ...cfg, enabled: !cfg.enabled })}
              >
                {cfg.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {cfg.enabled && (
              <div style={{ marginTop: 10, paddingLeft: 44, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <span style={{ ...S.label, display: 'inline', marginRight: 8 }}>AUTO-TRIGGER</span>
                  <select
                    style={{ ...S.input, display: 'inline', width: 'auto', padding: '2px 8px', fontSize: 11 }}
                    value={cfg.trigger}
                    onChange={e => onChange(pu.id, { ...cfg, trigger: e.target.value })}
                  >
                    {TRIGGER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <input
                    type="number" min={1} max={99} value={cfg.count}
                    onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) onChange(pu.id, { ...cfg, count: v }); }}
                    style={{ ...S.input, display: 'inline', width: 44, padding: '2px 6px', fontSize: 11, marginLeft: 6, textAlign: 'center' }}
                  />
                  <span style={{ color: '#5a5a8a', fontSize: 10, marginLeft: 4 }}>times</span>
                </div>
                {pu.effectType === 'timed' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...S.label, display: 'inline', marginBottom: 0, marginRight: 6 }}>DURATION</span>
                    {DURATION_OPTIONS.map(h => (
                      <button
                        key={h}
                        style={{ ...(cfg.durationHours === h ? S.btnPrimary : S.btn), padding: '2px 10px', fontSize: 10 }}
                        onClick={() => onChange(pu.id, { ...cfg, durationHours: h })}
                      >{h}h</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Edit tab: Display ─────────────────────────────────────────────────────────
function TabDisplay({ crtEnabled, onToggleCrt, uiScale, onChangeUiScale, animatedBg, onToggleAnimatedBg }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...S.label, marginBottom: 10 }}>CRT EFFECT</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{ ...(crtEnabled ? S.btnPrimary : S.btn), padding: '6px 14px', fontSize: 11 }}
            onClick={onToggleCrt}
          >
            {crtEnabled ? '✓ CRT Scanlines ON' : 'CRT Scanlines OFF'}
          </button>
          <span style={{ color: '#5a5a7a', fontSize: 10 }}>Retro CRT overlay effect</span>
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...S.label, marginBottom: 10 }}>ANIMATED BACKGROUND</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{ ...(animatedBg ? S.btnPrimary : S.btn), padding: '6px 14px', fontSize: 11 }}
            onClick={onToggleAnimatedBg}
          >
            {animatedBg ? '✓ Animated BG ON' : 'Animated BG OFF'}
          </button>
          <span style={{ color: '#5a5a7a', fontSize: 10 }}>Parallax dungeon background (disable if flickering on slower devices)</span>
        </div>
      </div>
      <div>
        <div style={{ ...S.label, marginBottom: 6 }}>UI SCALE</div>
        <p style={{ ...S.p, fontSize: 11 }}>Scale the entire interface for your display. Heroic and Epic are great for tablets or large screens.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {UI_SCALES.map(s => (
            <button
              key={s.id}
              style={{ ...(uiScale === s.id ? S.btnPrimary : S.btn), flex: 1, padding: '14px 4px', fontSize: 12 }}
              onClick={() => onChangeUiScale(s.id)}
            >
              <div style={{ fontWeight: 'bold' }}>{s.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────
export default function SetupWizard({ onComplete, onCancel, initialConfig }) {
  const isEdit = !!initialConfig;

  const [step, setStep] = useState(isEdit ? 'tabs' : 0);
  const [activeTab, setActiveTab] = useState('party');
  const [players, setPlayers] = useState(initialConfig?.players ?? []);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [enabledChores, setEnabledChores] = useState(
    () => new Set(initialConfig?.enabledChores ?? ALL_CHORES.map(c => c.id))
  );
  const [choreOverrides, setChoreOverrides] = useState(initialConfig?.choreOverrides ?? {});
  const [customChores, setCustomChores] = useState(initialConfig?.customChores ?? []);
  const [enabledRewards, setEnabledRewards] = useState(
    () => new Set(initialConfig?.enabledRewards ?? REWARDS.map(r => r.id))
  );
  const [rewardOverrides, setRewardOverrides] = useState(initialConfig?.rewardOverrides ?? {});
  const [customRewards, setCustomRewards] = useState(initialConfig?.customRewards ?? []);
  const [crtEnabled, setCrtEnabled] = useState(initialConfig?.crtEnabled ?? true);
  const [uiScale, setUiScale] = useState(initialConfig?.uiScale ?? 'mini');
  const [animatedBg, setAnimatedBg] = useState(initialConfig?.animatedBg ?? true);
  const [powerUpSettings, setPowerUpSettings] = useState(
    initialConfig?.powerUpSettings ?? { ...DEFAULT_POWER_UP_SETTINGS }
  );
  const [launching, setLaunching] = useState(false);

  function handlePlayerCount(n) {
    setPlayers(prev => {
      const existing = initialConfig?.players ?? prev;
      const result = [];
      for (let i = 0; i < n; i++) {
        if (i < existing.length) result.push({ ...existing[i], id: `player_${i}` });
        else result.push(makeNewPlayer(result));
      }
      return result;
    });
    setPlayerIdx(0);
    setStep(2);
  }

  function updatePlayer(key, val) {
    setPlayers(prev => prev.map((p, i) => i === playerIdx ? { ...p, [key]: val } : p));
  }

  function updatePlayerAt(idx, key, val) {
    setPlayers(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));
  }

  function nextPlayer() {
    if (playerIdx + 1 < players.length) setPlayerIdx(playerIdx + 1);
    else setStep(3);
  }

  function prevPlayer() {
    if (playerIdx > 0) setPlayerIdx(playerIdx - 1);
    else setStep(1);
  }

  function doneAddingPlayers() {
    setPlayers(prev => prev.slice(0, playerIdx + 1));
    setStep(3);
  }

  function toggleChore(id) {
    setEnabledChores(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function overrideChore(id, ov) {
    setChoreOverrides(prev => ({ ...prev, [id]: ov }));
  }

  function toggleReward(id) {
    setEnabledRewards(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function overrideReward(id, ov) {
    setRewardOverrides(prev => ({ ...prev, [id]: ov }));
  }

  async function handleLaunch() {
    setLaunching(true);
    await onComplete({
      players,
      enabledChores: [...enabledChores],
      choreOverrides,
      customChores,
      enabledRewards: [...enabledRewards],
      rewardOverrides,
      customRewards,
      crtEnabled,
      uiScale,
      animatedBg,
      powerUpSettings,
    });
  }

  const currentCount = players.length || (initialConfig?.players?.length ?? 2);

  // ── Edit mode: tabbed interface ───────────────────────────────────────────
  if (isEdit && step === 'tabs') {
    return (
      <div style={S.overlay}>
        <div style={S.card}>
          <div style={S.header}>
            <span style={S.title}>⚔ EDIT SETTINGS</span>
            {onCancel && (
              <button style={{ ...S.btn, padding: '4px 10px', fontSize: 11 }} onClick={onCancel}>✕ Cancel</button>
            )}
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid #2a2a4a', flexShrink: 0 }}>
            {TABS.map(tab => (
              <button
                key={tab}
                style={{
                  flex: 1, padding: '9px 2px', fontSize: 10, letterSpacing: 0.5, cursor: 'pointer',
                  background: activeTab === tab ? '#1e1e3e' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #f5c870' : '2px solid transparent',
                  color: activeTab === tab ? '#f5c870' : '#5a5a8a',
                }}
                onClick={() => setActiveTab(tab)}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
          <div style={S.body}>
            {launching ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#c8d0e0' }}>Saving changes…</div>
            ) : activeTab === 'party' ? (
              <TabParty
                players={players}
                onUpdatePlayer={updatePlayerAt}
                onAddPlayer={() => setPlayers(prev => [...prev, makeNewPlayer(prev)])}
                onRemovePlayer={idx => setPlayers(prev => prev.filter((_, i) => i !== idx))}
              />
            ) : activeTab === 'quests' ? (
              <ChoreSection
                players={players}
                enabledChores={enabledChores} onToggle={toggleChore}
                choreOverrides={choreOverrides} onOverride={overrideChore}
                customChores={customChores}
                onAddCustom={c => setCustomChores(prev => [...prev, c])}
                onRemoveCustom={id => setCustomChores(prev => prev.filter(c => c.id !== id))}
              />
            ) : activeTab === 'rewards' ? (
              <RewardSection
                players={players}
                enabledRewards={enabledRewards} onToggle={toggleReward}
                rewardOverrides={rewardOverrides} onOverride={overrideReward}
                customRewards={customRewards}
                onAddCustom={r => setCustomRewards(prev => [...prev, r])}
                onRemoveCustom={id => setCustomRewards(prev => prev.filter(r => r.id !== id))}
              />
            ) : activeTab === 'powerups' ? (
              <TabPowerUps
                powerUpSettings={powerUpSettings}
                onChange={(id, cfg) => setPowerUpSettings(prev => ({ ...prev, [id]: cfg }))}
              />
            ) : (
              <TabDisplay
                crtEnabled={crtEnabled} onToggleCrt={() => setCrtEnabled(v => !v)}
                uiScale={uiScale} onChangeUiScale={setUiScale}
                animatedBg={animatedBg} onToggleAnimatedBg={() => setAnimatedBg(v => !v)}
              />
            )}
          </div>
          <div style={S.footer}>
            <span style={{ color: '#5a5a8a', fontSize: 11 }}>{players.length} hero{players.length !== 1 ? 'es' : ''}</span>
            <button style={S.btnPrimary} onClick={handleLaunch}>Save Changes ✓</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard mode: step-by-step new setup ──────────────────────────────────
  const stepNum = step <= 1 ? step + 1 : step;

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        {step > 0 && (
          <div style={S.header}>
            <span style={S.title}>⚔ QUESTBOARD SETUP</span>
            <span style={S.stepIndicator}>Step {stepNum} of 5</span>
          </div>
        )}

        <div style={S.body}>
          {launching ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#c8d0e0' }}>
              Preparing your adventure…
            </div>
          ) : step === 0 ? (
            <StepWelcome onNext={() => setStep(1)} />
          ) : step === 1 ? (
            <StepPlayerCount current={currentCount} onSelect={handlePlayerCount} />
          ) : step === 2 ? (
            <StepPlayerSetup
              player={players[playerIdx]}
              playerIdx={playerIdx}
              total={players.length}
              onChange={updatePlayer}
              onNext={nextPlayer}
              onBack={prevPlayer}
              onDone={doneAddingPlayers}
            />
          ) : step === 3 ? (
            <StepChoreSelect
              players={players}
              enabledChores={enabledChores}
              onToggle={toggleChore}
              choreOverrides={choreOverrides}
              onOverride={overrideChore}
              customChores={customChores}
              onAddCustom={c => setCustomChores(prev => [...prev, c])}
              onRemoveCustom={id => setCustomChores(prev => prev.filter(c => c.id !== id))}
              onBack={() => { setPlayerIdx(players.length - 1); setStep(2); }}
              onNext={() => setStep(4)}
            />
          ) : (
            <StepRewardSelect
              players={players}
              enabledRewards={enabledRewards}
              onToggle={toggleReward}
              rewardOverrides={rewardOverrides}
              onOverride={overrideReward}
              customRewards={customRewards}
              onAddCustom={r => setCustomRewards(prev => [...prev, r])}
              onRemoveCustom={id => setCustomRewards(prev => prev.filter(r => r.id !== id))}
              onBack={() => setStep(3)}
              onLaunch={handleLaunch}
              crtEnabled={crtEnabled}
              onToggleCrt={() => setCrtEnabled(v => !v)}
              uiScale={uiScale}
              onChangeUiScale={setUiScale}
              animatedBg={animatedBg}
              onToggleAnimatedBg={() => setAnimatedBg(v => !v)}
            />
          )}
        </div>

        {step === 1 && (
          <div style={S.footer}>
            <button style={S.btn} onClick={() => setStep(0)}>← Back</button>
            <span style={{ color: '#5a5a8a', fontSize: 11 }}>tap a number above</span>
          </div>
        )}
      </div>
    </div>
  );
}
