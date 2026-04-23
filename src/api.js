/**
 * src/api.js
 * Centralised API layer. All fetch() calls live here.
 * Uses relative /api/ paths — works on Vercel without CORS issues.
 */
const BASE = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/$/, '')
  : '';

function getToken() { return localStorage.getItem('ema_token') || ''; }

async function req(path, opts = {}) {
  const token  = getToken();
  const config = {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  };
  if (opts.body && typeof opts.body !== 'string') config.body = JSON.stringify(opts.body);
  let res;
  try { res = await fetch(`${BASE}${path}`, config); }
  catch (e) { throw new Error('Network error — check your connection'); }
  const ct   = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) { const msg = (typeof data === 'object' ? data?.error : data) || `HTTP ${res.status}`; throw new Error(msg); }
  return data;
}

export const authAPI      = {
  register: b   => req('/api/auth/register', { method: 'POST', body: b }),
  login:    b   => req('/api/auth/login',    { method: 'POST', body: b }),
  me:       ()  => req('/api/auth/me'),
};
export const userAPI      = {
  get:    ()  => req('/api/user'),
  update: b   => req('/api/user', { method: 'PUT', body: b }),
};
export const tradesAPI    = {
  getAll:  (qs='') => req(`/api/trades${qs ? `?${qs}` : ''}`),
  create:  b       => req('/api/trades', { method: 'POST', body: b }),
  update:  (id, b) => req(`/api/trades?id=${id}`, { method: 'PUT', body: b }),
  delete:  id      => req(`/api/trades?id=${id}`, { method: 'DELETE' }),
  close:   (id, b) => req(`/api/trades?id=${id}&action=close`, { method: 'POST', body: b }),
};
export const portfolioAPI = {
  stats:     () => req('/api/portfolio'),
  snapshots: () => req('/api/portfolio?action=snapshots'),
};
export const alertsAPI    = {
  getAll:      since => req(`/api/alerts${since ? `?since=${since}` : ''}`),
  markAllRead: ()    => req('/api/alerts?action=read-all', { method: 'PUT' }),
  markRead:    id    => req(`/api/alerts?id=${id}`, { method: 'PUT' }),
  delete:      id    => req(`/api/alerts?id=${id}`, { method: 'DELETE' }),
};
export const scannerAPI   = { run: () => req('/api/scanner', { method: 'POST' }) };
export const searchAPI    = { query: q => req(`/api/search?q=${encodeURIComponent(q)}`) };
export const pricesAPI    = { get: syms => req(`/api/prices?symbols=${syms.join(',')}`) };
export const marketAPI    = { get: () => req('/api/market') };
export const healthAPI    = { get: () => req('/api/health') };