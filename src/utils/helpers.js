export const fmt  = n  => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const fmtN = (n, d = 2) => Number(n || 0).toFixed(d);
export const pct  = (v, b) => b ? ((v - b) / b * 100).toFixed(2) : '0.00';

export const pnlColor = v => v > 0 ? 'var(--green)' : v < 0 ? 'var(--red)' : 'var(--muted)';
export const pnlClass = v => v > 0 ? 'col-green'    : v < 0 ? 'col-red'    : 'col-muted';
export const confClass= s => s >= 70 ? 'high' : s >= 50 ? 'medium' : 'low';

export function isMarketOpen() {
  const d   = new Date(), ist = new Date(d.getTime() + 5.5 * 3600000), day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const t = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return t >= 555 && t <= 930;
}

export function calDays(year, month) {
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const prev  = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = first - 1; i >= 0; i--)  cells.push({ day: prev - i, cur: false });
  for (let d = 1; d <= total; d++)       cells.push({ day: d,        cur: true  });
  const rem = 42 - cells.length;
  for (let d = 1; d <= rem; d++)         cells.push({ day: d,        cur: false });
  return cells;
}

export const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export const SECTOR_COLORS = {
  'Energy':'#f59e0b', 'Banking':'#3b82f6', 'IT':'#8b5cf6', 'Finance':'#06b6d4',
  'FMCG':'#22c55e', 'Pharma':'#ec4899', 'Auto':'#f97316', 'Infra':'#84cc16',
  'Power':'#eab308', 'Metals':'#94a3b8', 'Telecom':'#a78bfa', 'Consumer':'#fb923c',
  'Realty':'#4ade80', 'Mining':'#64748b', 'Healthcare':'#38bdf8', 'Chemicals':'#34d399',
  'Cement':'#fbbf24', 'Insurance':'#f0abfc', 'Internet':'#60a5fa', 'Other':'#475569',
};