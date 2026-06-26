import React, { useState, useEffect } from 'react';
import TileSprite from './TileSprite';

const API = '/api';

// Standalone fetch helpers — the gate runs before there is a token, and a 401
// here (wrong PIN / no such account) must be handled locally, not bounced to
// the global unauthorized handler.
async function listAccounts() {
  const res = await fetch(`${API}/accounts`);
  return res.ok ? res.json() : [];
}

async function postJson(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const S = {
  wrap: {
    position: 'relative', zIndex: 2, minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  panel: {
    width: '100%', maxWidth: 380, background: 'var(--bg2)',
    border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
    padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
  },
  title: {
    color: 'var(--gold2)', fontFamily: 'var(--pixel)', fontSize: 20,
    textAlign: 'center', margin: '0 0 4px',
  },
  sub: { color: 'var(--text2)', fontSize: 12, textAlign: 'center', margin: '0 0 20px' },
  accountBtn: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    background: 'var(--bg4)', color: 'var(--text)', textAlign: 'left',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '12px 14px', marginBottom: 8, cursor: 'pointer', fontSize: 14,
  },
  input: {
    width: '100%', background: 'var(--bg)', color: 'var(--text)',
    border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)',
    padding: '10px 12px', fontSize: 14, marginBottom: 10, boxSizing: 'border-box',
    fontFamily: 'var(--pixel)',
  },
  primary: {
    width: '100%', background: 'var(--gold-bg)', color: 'var(--gold2)',
    border: '1px solid var(--gold-border)', borderRadius: 'var(--radius-sm)',
    padding: '12px', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--pixel)',
  },
  link: {
    display: 'block', width: '100%', background: 'none', color: 'var(--text2)',
    border: 'none', padding: '12px 0 0', fontSize: 12, cursor: 'pointer',
    textAlign: 'center',
  },
  error: { color: 'var(--danger-text)', fontSize: 12, textAlign: 'center', margin: '0 0 10px' },
};

export default function AccountGate({ onAuthenticated }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'pin' | 'create'
  const [active, setActive] = useState(null); // account awaiting a PIN
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listAccounts().then(a => { setAccounts(a); setLoading(false); });
  }, []);

  function pick(acc) {
    setError('');
    if (acc.has_pin) {
      setActive(acc);
      setPin('');
      setView('pin');
    } else {
      doLogin(acc.id, null);
    }
  }

  async function doLogin(accountId, pinValue) {
    setBusy(true);
    setError('');
    const { ok, data } = await postJson(`/accounts/${accountId}/login`, pinValue ? { pin: pinValue } : {});
    setBusy(false);
    if (ok && data.token) {
      onAuthenticated(data.token);
    } else {
      setError(data.detail || 'Login failed');
    }
  }

  async function doCreate() {
    if (!name.trim()) { setError('Enter a name'); return; }
    setBusy(true);
    setError('');
    const { ok, data } = await postJson('/accounts', { name: name.trim(), pin: newPin || undefined });
    setBusy(false);
    if (ok && data.token) {
      onAuthenticated(data.token);
    } else {
      setError(data.detail || 'Could not create account');
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.panel}>
        <h1 style={S.title}><TileSprite tile={118} display={18} /> Questboard</h1>

        {view === 'list' && (
          <>
            <p style={S.sub}>{loading ? 'Loading…' : 'Choose your household'}</p>
            {error && <p style={S.error}>{error}</p>}
            {!loading && accounts.map(acc => (
              <button key={acc.id} style={S.accountBtn} onClick={() => pick(acc)} disabled={busy}>
                <TileSprite tile={118} display={16} />
                <span style={{ flex: 1 }}>{acc.name}</span>
                {acc.has_pin && <span style={{ color: 'var(--text2)', fontSize: 12 }}>🔒</span>}
              </button>
            ))}
            {!loading && accounts.length === 0 && (
              <p style={S.sub}>No households yet — create the first one.</p>
            )}
            <button style={{ ...S.primary, marginTop: 8 }} onClick={() => { setName(''); setNewPin(''); setError(''); setView('create'); }}>
              + New household
            </button>
          </>
        )}

        {view === 'pin' && active && (
          <>
            <p style={S.sub}>Enter PIN for <strong style={{ color: 'var(--text)' }}>{active.name}</strong></p>
            {error && <p style={S.error}>{error}</p>}
            <input
              style={S.input}
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              placeholder="PIN"
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !busy) doLogin(active.id, pin); }}
            />
            <button style={S.primary} onClick={() => doLogin(active.id, pin)} disabled={busy}>
              {busy ? 'Checking…' : 'Enter'}
            </button>
            <button style={S.link} onClick={() => { setView('list'); setError(''); }}>← Back</button>
          </>
        )}

        {view === 'create' && (
          <>
            <p style={S.sub}>Create a new household</p>
            {error && <p style={S.error}>{error}</p>}
            <input
              style={S.input}
              autoFocus
              value={name}
              placeholder="Household name"
              maxLength={40}
              onChange={e => setName(e.target.value)}
            />
            <input
              style={S.input}
              type="password"
              inputMode="numeric"
              value={newPin}
              placeholder="PIN (optional)"
              onChange={e => setNewPin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !busy) doCreate(); }}
            />
            <button style={S.primary} onClick={doCreate} disabled={busy}>
              {busy ? 'Creating…' : 'Create & start'}
            </button>
            <button style={S.link} onClick={() => { setView('list'); setError(''); }}>← Back</button>
          </>
        )}
      </div>
    </div>
  );
}
