/**
 * src/api.js
 * All frontend API calls — centralised, auth-aware.
 * Uses relative /api/ paths so it works on Vercel without CORS issues.
 */
const BASE = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/$/, '')
  : '';

function getToken() {
  return localStorage.getItem('ema_token') || '';
}

async function req(path, opts = {}) {
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  };
  if (opts.body && typeof opts.body !== 'string') {
    config.body = JSON.stringify(opts.body);
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, config);
  } catch (e) {
    throw new Error('Network error — check your internet connection or API status');
  }
  const ct   = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (typeof data === 'object' ? data?.error : data) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* ── Auth ── */
export const authAPI = {
  register: (body) => req('/api/auth/register', { method: 'POST', body }),
  login:    (body) => req('/api/auth/login',    { method: 'POST', body }),
  me:       ()     => req('/api/auth/me'),
};

/* ── User profile ── */
export const userAPI = {
  get:    ()     => req('/api/user'),
  update: (body) => req('/api/user', { method: 'PUT', body }),
};

/* ── Trades ── */
export const tradesAPI = {
  getAll:  (qs = '')         => req(`/api/trades${qs ? `?${qs}` : ''}`),
  create:  (body)            => req('/api/trades', { method: 'POST', body }),
  update:  (id, body)        => req(`/api/trades?id=${id}`, { method: 'PUT', body }),
  delete:  (id)              => req(`/api/trades?id=${id}`, { method: 'DELETE' }),
  close:   (id, body)        => req(`/api/trades?id=${id}&action=close`, { method: 'POST', body }),
};

/* ── Portfolio ── */
export const portfolioAPI = {
  stats:     () => req('/api/portfolio'),
  snapshots: () => req('/api/portfolio?action=snapshots'),
};

/* ── Alerts ── */
export const alertsAPI = {
  getAll:      (since) => req(`/api/alerts${since ? `?since=${since}` : ''}`),
  markAllRead: ()      => req('/api/alerts?action=read-all', { method: 'PUT' }),
  markRead:    (id)    => req(`/api/alerts?id=${id}`,       { method: 'PUT' }),
  delete:      (id)    => req(`/api/alerts?id=${id}`,       { method: 'DELETE' }),
};

/* ── Scanner ── */
export const scannerAPI = {
  run: () => req('/api/scanner', { method: 'POST' }),
};

/* ── Stock search ── */
export const searchAPI = {
  query: (q) => req(`/api/search?q=${encodeURIComponent(q)}`),
};

/* ── Live prices ── */
export const pricesAPI = {
  get: (symbols) => req(`/api/prices?symbols=${symbols.join(',')}`),
};

/* ── Market indices ── */
export const marketAPI = {
  get: () => req('/api/market'),
};

/* ── Health check ── */
export const healthAPI = {
  get: () => req('/api/health'),
};