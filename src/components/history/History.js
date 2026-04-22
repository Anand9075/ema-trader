import React, { useState } from 'react';
import { tradesAPI } from '../../api';
import { usePolling } from '../../hooks/usePolling';
import { fmt, fmtN, pct } from '../../utils/helpers';
import { IconRefresh, IconTrendUp, IconTrendDown } from '../shared/Icons';

const STATUS_LABELS = {
  TARGET:       { label: 'Target Hit',   color: 'var(--green)' },
  SL:           { label: 'Stop Loss',    color: 'var(--red)' },
  MANUAL_EXIT:  { label: 'Manual Exit',  color: 'var(--accent)' },
  CLOSED:       { label: 'Closed',       color: 'var(--text-muted)' },
};

function HistoryRow({ trade }) {
  const ep      = trade.exitPrice || trade.entry;
  const pl      = (ep - trade.entry) * (trade.qty || 1);
  const plPct   = Number(pct(ep, trade.entry));
  const isWin   = pl >= 0;
  const rr      = trade.entry && trade.sl ? ((trade.target - trade.entry) / Math.max(1, trade.entry - trade.sl)).toFixed(1) : '—';
  const statusM = STATUS_LABELS[trade.status] || STATUS_LABELS.CLOSED;
  const openD   = trade.createdAt ? new Date(trade.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
  const closeD  = trade.closedAt  ? new Date(trade.closedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 13 }}>{trade.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{trade.sector} · {trade.entryType}</div>
      </td>
      <td>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Open: {openD}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Close: {closeD}</div>
      </td>
      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>{fmt(trade.entry)}</td>
      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: isWin ? 'var(--green)' : 'var(--red)' }}>{fmt(ep)}</td>
      <td style={{ fontFamily: 'JetBrains Mono' }}>{trade.qty}</td>
      <td>
        <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 13, color: isWin ? 'var(--green)' : 'var(--red)' }}>
          {isWin ? '+' : ''}{fmt(Math.round(pl))}
        </div>
        <div style={{ fontSize: 11, color: isWin ? 'var(--green)' : 'var(--red)' }}>
          {isWin ? '+' : ''}{fmtN(plPct)}%
        </div>
      </td>
      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: Number(rr) >= 2 ? 'var(--green)' : 'var(--text-muted)' }}>{rr}:1</td>
      <td>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: `${statusM.color}18`, color: statusM.color, border: `1px solid ${statusM.color}30` }}>
          {statusM.label}
        </span>
      </td>
    </tr>
  );
}

export default function History() {
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const { data: trades, loading, refetch } = usePolling(
    () => tradesAPI.getAll('status=TARGET&status2=SL&status3=MANUAL_EXIT&status4=CLOSED'),
    60000, []
  );

  // Re-fetch all and filter client-side for simplicity
  const { data: allTrades, loading: allLoad } = usePolling(() => tradesAPI.getAll(), 60000, []);
  const closed = (allTrades || []).filter(t => ['TARGET','SL','MANUAL_EXIT','CLOSED'].includes(t.status));

  // Stats
  const wins      = closed.filter(t => (t.exitPrice || t.entry) > t.entry);
  const losses    = closed.filter(t => (t.exitPrice || t.entry) < t.entry);
  const totalPnl  = closed.reduce((s, t) => s + ((t.exitPrice || t.entry) - t.entry) * (t.qty || 1), 0);
  const winRate   = closed.length > 0 ? Math.round(wins.length / closed.length * 100) : 0;
  const avgWin    = wins.length > 0 ? wins.reduce((s, t) => s + ((t.exitPrice || t.entry) - t.entry) * (t.qty || 1), 0) / wins.length : 0;
  const avgLoss   = losses.length > 0 ? losses.reduce((s, t) => s + ((t.exitPrice || t.entry) - t.entry) * (t.qty || 1), 0) / losses.length : 0;

  // Sort
  const sorted = [...closed].sort((a, b) => {
    let va, vb;
    if (sortBy === 'date') { va = new Date(a.closedAt || 0); vb = new Date(b.closedAt || 0); }
    else if (sortBy === 'pnl') { va = ((a.exitPrice || a.entry) - a.entry) * (a.qty || 1); vb = ((b.exitPrice || b.entry) - b.entry) * (b.qty || 1); }
    else if (sortBy === 'name') { va = a.name; vb = b.name; }
    else { va = 0; vb = 0; }
    return sortDir === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
  });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortBtn = ({ col, children }) => (
    <button onClick={() => toggleSort(col)} style={{ background: 'none', border: 'none', color: sortBy === col ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 3 }}>
      {children}
      {sortBy === col && <span>{sortDir === 'desc' ? '↓' : '↑'}</span>}
    </button>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trade History</h1>
          <div className="page-sub">{closed.length} closed trades</div>
        </div>
        <button className="btn-icon" onClick={refetch}><IconRefresh style={{ width: 14, height: 14 }}/></button>
      </div>

      {/* Stats grid */}
      <div className="stat-cards" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Realised P&L</div>
          <div className="stat-value" style={{ fontSize: 20, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {totalPnl >= 0 ? '+' : ''}{fmt(Math.round(totalPnl))}
          </div>
          <div className="stat-sub" style={{ color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {closed.length} trades total
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--accent)' }}>{winRate}%</div>
          <div className="stat-sub">{wins.length}W / {losses.length}L</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Win</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--green)' }}>
            {avgWin !== 0 ? `+${fmt(Math.round(avgWin))}` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Loss</div>
          <div className="stat-value" style={{ fontSize: 20, color: 'var(--red)' }}>
            {avgLoss !== 0 ? fmt(Math.round(avgLoss)) : '—'}
          </div>
        </div>
      </div>

      {/* P&L streak bar */}
      {closed.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Trade outcomes</div>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {sorted.slice(-30).map((t, i) => {
              const pl = ((t.exitPrice || t.entry) - t.entry) * (t.qty || 1);
              return (
                <div key={i} title={`${t.name}: ${pl >= 0 ? '+' : ''}${fmt(Math.round(pl))}`}
                  style={{ width: 8, height: 24, borderRadius: 2, background: pl >= 0 ? 'var(--green)' : 'var(--red)', opacity: 0.8 }}/>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        {allLoad && <div className="loading-center"><div className="spinner"/></div>}
        {!allLoad && sorted.length === 0 && (
          <div className="loading-center" style={{ padding: '40px' }}>
            <div style={{ fontSize: 12 }}>No closed trades yet</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Close a position to see history here.</div>
          </div>
        )}
        {sorted.length > 0 && (
          <table className="history-table">
            <thead>
              <tr>
                <th><SortBtn col="name">Stock</SortBtn></th>
                <th><SortBtn col="date">Dates</SortBtn></th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Qty</th>
                <th><SortBtn col="pnl">P&L</SortBtn></th>
                <th>R:R</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => <HistoryRow key={t._id} trade={t}/>)}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}