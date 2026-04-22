// ── Formatting ────────────────────────────────────────────
export const fmt  = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const fmtN = (n, d = 2) => Number(n || 0).toFixed(d);
export const pct  = (v, b) => (b ? ((v - b) / b * 100).toFixed(2) : '0.00');

// ── Color helpers ─────────────────────────────────────────
export function pnlColor(val) {
  if (val > 0) return 'var(--green)';
  if (val < 0) return 'var(--red)';
  return 'var(--text-muted)';
}
export function pnlClass(val) {
  if (val > 0) return 'text-green';
  if (val < 0) return 'text-red';
  return 'text-muted';
}
export function confClass(score) {
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

// ── Market hours ─────────────────────────────────────────
export function isMarketOpen() {
  const d   = new Date();
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const t = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return t >= 555 && t <= 930;
}

// ── Calendar helpers ──────────────────────────────────────
export function calDays(year, month) {
  const first   = new Date(year, month, 1).getDay();
  const daysIn  = new Date(year, month + 1, 0).getDate();
  const daysPrev= new Date(year, month, 0).getDate();
  const cells   = [];
  for (let i = first - 1; i >= 0; i--)   cells.push({ day: daysPrev - i, cur: false });
  for (let d = 1; d <= daysIn; d++)       cells.push({ day: d,           cur: true  });
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++)          cells.push({ day: d,           cur: false });
  return cells;
}

export const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Sector colours (matching the UI screenshots) ──────────
export const SECTOR_COLORS = {
  'Energy':       '#f59e0b',
  'Banking':      '#3b82f6',
  'IT':           '#8b5cf6',
  'Finance':      '#06b6d4',
  'FMCG':         '#22c55e',
  'Pharma':       '#ec4899',
  'Auto':         '#f97316',
  'Infra':        '#84cc16',
  'Power':        '#eab308',
  'Metals':       '#94a3b8',
  'Telecom':      '#a78bfa',
  'Consumer':     '#fb923c',
  'Realty':       '#4ade80',
  'Mining':       '#64748b',
  'Healthcare':   '#38bdf8',
  'Insurance':    '#f0abfc',
  'Chemicals':    '#34d399',
  'Cement':       '#fbbf24',
  'Beverages':    '#fb7185',
  'Internet':     '#60a5fa',
  'Aviation':     '#c084fc',
  'Ports':        '#5eead4',
  'Conglomerate': '#fde68a',
  'Travel':       '#fdba74',
  'Capital Goods':'#a3e635',
  'Other':        '#475569',
};