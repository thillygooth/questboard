// Centralized API client: injects the account session token and handles 401s
// by clearing the token and bouncing the user back to the account picker.

const API = '/api';
const TOKEN_KEY = 'qb_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

let onUnauthorized = null;

// App registers a handler so an expired/invalid token sends the user to the gate.
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (res.status === 401) {
    clearToken();
    if (onUnauthorized) onUnauthorized();
    throw new Error('Unauthorized');
  }
  return res;
}

export function apiPost(path, body) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
