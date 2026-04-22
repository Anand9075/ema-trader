import React, { useState } from 'react';
import { tradesAPI, portfolioAPI } from '../../api';
import { usePolling, usePrices } from '../../hooks/usePolling';
import { useToast } from '../../context/ToastContext';
import { fmt, fmtN, pct, pnlColor } from '../../utils/helpers';
import { IconPlus, IconEdit, IconTrash, IconRefresh } from '../shared/Icons';
import AddTradeModal from './AddTradeModal';
import CloseTradeModal from './CloseTradeModal';

function PriceBar({ entry, sl, target, current }) {
  const range = target - sl;
  if (range <= 0) return null;
  const pos  = Math.min(100, Math.max(0, (current - sl) / range * 100));
  const ePct = Math.min(100, Math.max(0, (entry   - sl) / range * 100));
  const col  = current >= entry ? 'var(--green)' : 'var(--red)';
  return (
    <div style={{ marginTop: 8 }}>
      <div className="price-bar-track" style={{ margin: 0 }}>
        <div className="price-bar-fill" style={{ width: `${pos}%`, background: col }}/>
        <div style={{ position: 'absolute', left: `${ePct}%`, top: -2, bottom: -2, width: 1, background: 'rgba(255,255,255,0.3)' }}/>
        <div className="price-bar-dot" style={{ left: `${pos}%`, background: col, width: 8, height: 8 }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--red)' }}>SL {fmt(sl)}</span>
        <span>Entry {fmt(entry)}</span>
        <span style={{ color: 'var(--green)' }}>T {fmt(target)}</span>
      </div>
    </div>
  );
}

function TradeCard({ trade, prices, onEdit, onClose, onDelete }) {
  const q      = prices[trade.symbol] || {};
  const cur    = q.price || trade.currentPrice || trade.entry;
  const pnl    = (cur - trade.entry) * (trade.qty || 1);
  const pnlPct = Number(pct(cur, trade.entry));
  const isUp   = pnl >= 0;
  const rr     = trade.entry && trade.sl ? ((trade.target - trade.entry) / Math.max(1, trade.entry - trade.sl)).toFixed(1) : '—';

  return (
    <div className="card" style={{ marginBottom: 10, transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>
            {trade.name?.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'JetBrains Mono' }}>{trade.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{trade.sector} · {trade.entryType || 'BREAKOUT'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
            background: trade.status === 'ACTIVE' ? 'var(--green-dim)' : trade.status === 'WAITING' ? 'rgba(251,191,36,0.12)' : 'var(--bg-card2)',
            color: trade.status === 'ACTIVE' ? 'var(--green)' : trade.status === 'WAITING' ? 'var(--accent2)' : 'var(--text-muted)' }}>
            {trade.status}
          </span>
          {trade.confidence && (
            <span style={{ fontSize: 10, color: trade.confidence === 'HIGH' ? 'var(--green)' : trade.confidence === 'MEDIUM' ? 'var(--accent)' : 'var(--text-muted)' }}>
              {trade.confidence}
            </span>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-icon" onClick={() => onEdit(trade)} title="Edit"><IconEdit style={{ width: 12, height: 12 }}/></button>
            {!['CLOSED','TARGET','SL','MANUAL_EXIT'].includes(trade.status) && (
              <button className="btn btn-sm btn-green" onClick={() => onClose(trade)}>Close</button>
            )}
            <button className="btn-icon btn-danger" onClick={() => onDelete(trade._id)} title="Delete"><IconTrash style={{ width: 12, height: 12 }}/></button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Entry</div>
          <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', fontSize: 13 }}>{fmt(trade.entry)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>CMP</div>
          <div id={`price-${(trade.symbol||'').replace(/[^a-z0-9]/gi,'-')}`}
            style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 13, color: isUp ? 'var(--green)' : 'var(--red)', transition: 'color 0.2s' }}>
            {fmt(cur)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>P&L</div>
          <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 13, color: isUp ? 'var(--green)' : 'var(--red)' }}>
            {isUp ? '+' : ''}{fmt(Math.round(pnl))}
          </div>
          <div style={{ fontSize: 10, color: isUp ? 'var(--green)' : 'var(--red)' }}>
            {isUp ? '+' : ''}{fmtN(pnlPct)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>R:R · Qty</div>
          <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', fontSize: 12 }}>{rr}:1</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{trade.qty} shares</div>
        </div>
      </div>

      {/* Price bar */}
      <div style={{ padding: '0 14px 12px' }}>
        <PriceBar entry={trade.entry} sl={trade.sl} target={trade.target} current={cur}/>
      </div>

      {trade.notes && (
        <div style={{ padding: '0 14px 12px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {trade.notes}
        </div>
      )}
    </div>
  );
}

export default function Portfolio() {
  const { addToast } = useToast();
  const [showAdd,   setShowAdd]   = useState(false);
  const [editTrade, setEditTrade] = useState(null);
  const [closeTrd,  setCloseTrd]  = useState(null);
  const [filter,    setFilter]    = useState('active');

  const { data: portfolio, loading, refetch } = usePolling(portfolioAPI.stats, 30000, []);
  const trades   = portfolio?.activeTrades || [];
  const symbols  = trades.map(t => t.symbol || `${t.name}.NS`).filter(Boolean);
  const { prices } = usePrices(symbols, 30000);

  const shown = filter === 'active'
    ? trades.filter(t => !['CLOSED','TARGET','SL','MANUAL_EXIT'].includes(t.status))
    : filter === 'closed'
    ? trades.filter(t =>  ['CLOSED','TARGET','SL','MANUAL_EXIT'].includes(t.status))
    : trades;

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this trade?')) return;
    try { await tradesAPI.delete(id); addToast('Trade removed', 'info'); refetch(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  const stats = portfolio || {};
  const pnlUp = (stats.pnl || 0) >= 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Portfolio</h1>
          <div className="page-sub">{trades.length} positions · {fmt(stats.current || 0)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-icon" onClick={refetch} title="Refresh"><IconRefresh style={{ width: 14, height: 14 }}/></button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <IconPlus style={{ width: 14, height: 14 }}/> Add Trade
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-cards" style={{ marginBottom: 16 }}>
        {[
          { label: 'Portfolio Value', value: fmt(stats.current || 0), sub: `Invested ${fmt(stats.invested || 0)}` },
          { label: 'Total P&L',   value: `${pnlUp?'+':''}${fmt(Math.round(stats.pnl||0))}`, sub: `${pnlUp?'+':''}${fmtN(stats.pnlPct||0)}%`, color: pnlUp?'var(--green)':'var(--red)' },
          { label: 'Realised P&L',value: `${(stats.histPnl||0)>=0?'+':''}${fmt(Math.round(stats.histPnl||0))}`, color: (stats.histPnl||0)>=0?'var(--green)':'var(--red)' },
          { label: 'Win Rate',     value: `${stats.winRate||0}%`, sub: `${stats.wins||0}W / ${stats.losses||0}L`, color: 'var(--accent)' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize: 18, color: s.color }}>{s.value}</div>
            {s.sub && <div className="stat-sub" style={{ color: s.color || 'var(--text-muted)' }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['active','Active'],['closed','Closed'],['all','All']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`btn btn-sm ${filter===v?'btn-primary':'btn-ghost'}`}>{l}</button>
        ))}
      </div>

      {loading && <div className="loading-center"><div className="spinner"/></div>}

      {!loading && shown.length === 0 && (
        <div className="loading-center" style={{ padding: '48px' }}>
          <div style={{ fontSize: 12 }}>No trades here</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} style={{ marginTop: 10 }}>
            <IconPlus style={{ width: 12, height: 12 }}/> Add First Trade
          </button>
        </div>
      )}

      {shown.map(t => (
        <TradeCard key={t._id} trade={t} prices={prices}
          onEdit={setEditTrade}
          onClose={setCloseTrd}
          onDelete={handleDelete}/>
      ))}

      {showAdd   && <AddTradeModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refetch(); }}/>}
      {editTrade && <AddTradeModal editTrade={editTrade} onClose={() => setEditTrade(null)} onSaved={() => { setEditTrade(null); refetch(); }}/>}
      {closeTrd  && <CloseTradeModal trade={closeTrd} prices={prices} onClose={() => setCloseTrd(null)} onSaved={() => { setCloseTrd(null); refetch(); }}/>}
    </>
  );
}