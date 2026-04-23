import React, { useState } from 'react';
import { tradesAPI, portfolioAPI } from '../../api';
import { usePolling, usePrices } from '../../hooks/usePolling';
import { useToast } from '../../context/ToastContext';
import { fmt, fmtN, pct } from '../../utils/helpers';
import { IconPlus, IconEdit, IconTrash, IconRefresh } from '../shared/Icons';
import AddTradeModal   from './AddTradeModal';
import CloseTradeModal from './CloseTradeModal';

function StatusBadge({ status }) {
  const MAP = {
    WAITING:     { bg:'rgba(245,158,11,0.12)', col:'#fbbf24'  },
    ACTIVE:      { bg:'var(--green-bg)',        col:'var(--green)' },
    TARGET:      { bg:'var(--green-bg)',        col:'var(--green)' },
    SL:          { bg:'var(--red-bg)',          col:'var(--red)'   },
    MANUAL_EXIT: { bg:'rgba(139,92,246,0.12)',  col:'#a78bfa'  },
    CLOSED:      { bg:'rgba(255,255,255,0.05)', col:'var(--muted)' },
  };
  const s = MAP[status] || MAP.CLOSED;
  return <span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:600, background:s.bg, color:s.col }}>{status.replace('_',' ')}</span>;
}

function PriceBar({ entry, sl, target, cur }) {
  const range = target - sl;
  if (range <= 0) return null;
  const pos  = Math.min(100, Math.max(0, (cur - sl)   / range * 100));
  const ePct = Math.min(100, Math.max(0, (entry - sl)  / range * 100));
  const col  = cur >= entry ? 'var(--green)' : 'var(--red)';
  return (
    <div style={{ padding:'0 0 6px' }}>
      <div className="pbar-track">
        <div className="pbar-fill" style={{ width:`${pos}%`, background:col }}/>
        <div className="pbar-entry" style={{ left:`${ePct}%` }}/>
        <div className="pbar-dot"   style={{ left:`${pos}%`, background:col }}/>
      </div>
      <div className="pbar-labels" style={{ marginTop:4 }}>
        <span style={{ color:'var(--red)' }}>SL {fmt(sl)}</span>
        <span style={{ color:'var(--muted)' }}>Entry {fmt(entry)}</span>
        <span style={{ color:'var(--green)' }}>T {fmt(target)}</span>
      </div>
    </div>
  );
}

function TradeCard({ trade, prices, onEdit, onClose, onDelete }) {
  const q   = prices[trade.symbol || `${trade.name}.NS`] || {};
  const cur = q.price || trade.currentPrice || trade.entry;
  const pnl = (cur - trade.entry) * (trade.qty || 1);
  const pp  = Number(pct(cur, trade.entry));
  const isUp= pnl >= 0;
  const rr  = trade.entry && trade.sl ? ((trade.target - trade.entry) / Math.max(0.01, trade.entry - trade.sl)).toFixed(1) : '—';
  const isClosed = ['TARGET','SL','MANUAL_EXIT','CLOSED'].includes(trade.status);

  return (
    <div className="card" style={{ marginBottom:10, transition:'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.13)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'}>
      {/* Header */}
      <div style={{ padding:'11px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:8, background:'var(--card2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--accent)', fontFamily:'JetBrains Mono' }}>
            {(trade.name||'?').slice(0,2)}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, fontFamily:'JetBrains Mono' }}>{trade.name}</div>
            <div style={{ fontSize:10, color:'var(--muted)' }}>{trade.sector} · {trade.entryType || 'BREAKOUT'}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <StatusBadge status={trade.status}/>
          {trade.confidence && <span style={{ fontSize:10, color: trade.confidence==='HIGH'?'var(--green)':trade.confidence==='MEDIUM'?'var(--accent)':'var(--muted)' }}>{trade.confidence}</span>}
          <div style={{ display:'flex', gap:4 }}>
            <button className="btn-icon" onClick={()=>onEdit(trade)} title="Edit"><IconEdit style={{ width:12,height:12 }}/></button>
            {!isClosed && <button className="btn btn-sm btn-success" onClick={()=>onClose(trade)}>Close</button>}
            <button className="btn-icon" onClick={()=>onDelete(trade._id)} title="Delete" style={{ color:'var(--red)', borderColor:'rgba(239,68,68,0.2)' }}><IconTrash style={{ width:12,height:12 }}/></button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding:'11px 14px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, borderBottom:'1px solid var(--border)' }}>
        {[
          { lbl:'Entry',     val:fmt(trade.entry),    col:'' },
          { lbl:'CMP',       val:fmt(cur),             col:isUp?'var(--green)':'var(--red)', id:`price-${(trade.symbol||'').replace(/[^a-z0-9]/gi,'-')}` },
          { lbl:'P&L',       val:`${isUp?'+':''}${fmt(Math.round(pnl))}`, col:isUp?'var(--green)':'var(--red)' },
          { lbl:'R:R · Qty', val:`${rr}:1`,            col:Number(rr)>=2?'var(--green)':'var(--muted)', sub:`${trade.qty} shares` },
        ].map(s => (
          <div key={s.lbl}>
            <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3 }}>{s.lbl}</div>
            <div id={s.id} style={{ fontWeight:700, fontFamily:'JetBrains Mono', fontSize:13, color:s.col||'var(--text)' }}>{s.val}</div>
            {s.sub && <div style={{ fontSize:10, color:'var(--muted)' }}>{s.sub}</div>}
            {s.lbl==='P&L' && <div style={{ fontSize:10, color:isUp?'var(--green)':'var(--red)' }}>{isUp?'+':''}{fmtN(pp)}%</div>}
          </div>
        ))}
      </div>

      {/* Price bar */}
      <div style={{ padding:'8px 14px 4px' }}>
        <PriceBar entry={trade.entry} sl={trade.sl} target={trade.target} cur={cur}/>
      </div>

      {trade.notes && (
        <div style={{ padding:'0 14px 10px', fontSize:11, color:'var(--muted)', borderTop:'1px solid var(--border)', paddingTop:8 }}>
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
  const allTrades = portfolio?.activeTrades || [];
  const symbols   = allTrades.map(t => t.symbol || `${t.name}.NS`).filter(Boolean);
  const { prices }= usePrices(symbols, 30000);

  const shown = filter === 'active'
    ? allTrades.filter(t => !['TARGET','SL','MANUAL_EXIT','CLOSED'].includes(t.status))
    : filter === 'closed'
    ? allTrades.filter(t =>  ['TARGET','SL','MANUAL_EXIT','CLOSED'].includes(t.status))
    : allTrades;

  const handleDelete = async id => {
    if (!window.confirm('Remove this trade?')) return;
    try { await tradesAPI.delete(id); addToast('Trade removed','info'); refetch(); }
    catch (e) { addToast(e.message,'error'); }
  };

  const p = portfolio || {};
  const pnlUp = (p.pnl || 0) >= 0;

  return (
    <>
      <div className="page-hdr">
        <div>
          <h1 className="page-ttl">Portfolio</h1>
          <div className="page-sub">{allTrades.length} positions · {fmt(p.current||0)}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-icon" onClick={refetch} title="Refresh"><IconRefresh style={{ width:14,height:14 }}/></button>
          <button className="btn btn-primary" onClick={()=>setShowAdd(true)}><IconPlus style={{ width:13,height:13 }}/> Add Trade</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom:16 }}>
        {[
          { lbl:'Portfolio Value', val:fmt(p.current||0),                                       sub:`Invested ${fmt(p.invested||0)}` },
          { lbl:'Total P&L',       val:`${pnlUp?'+':''}${fmt(Math.round(p.pnl||0))}`,          sub:`${pnlUp?'+':''}${fmtN(p.pnlPct||0)}%`, col:pnlUp?'var(--green)':'var(--red)' },
          { lbl:'Realised P&L',    val:`${(p.histPnl||0)>=0?'+':''}${fmt(Math.round(p.histPnl||0))}`, col:(p.histPnl||0)>=0?'var(--green)':'var(--red)' },
          { lbl:'Win Rate',        val:`${p.winRate||0}%`,                                      sub:`${p.wins||0}W / ${p.losses||0}L`, col:'var(--accent)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card">
            <div className="stat-lbl">{s.lbl}</div>
            <div className="stat-val" style={{ fontSize:18, color:s.col }}>{s.val}</div>
            {s.sub && <div className="stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[['active','Active'],['closed','Closed'],['all','All']].map(([v,l]) => (
          <button key={v} onClick={()=>setFilter(v)} className={`btn btn-sm ${filter===v?'btn-primary':'btn-ghost'}`}>{l}</button>
        ))}
      </div>

      {loading && <div className="loading-box"><div className="spinner"/></div>}

      {!loading && shown.length === 0 && (
        <div className="loading-box" style={{ padding:48 }}>
          <div style={{ fontSize:12 }}>No {filter !== 'all' ? filter+' ' : ''}trades</div>
          {filter !== 'closed' && <button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(true)} style={{ marginTop:10 }}><IconPlus style={{ width:12,height:12 }}/> Add Trade</button>}
        </div>
      )}

      {shown.map(t => (
        <TradeCard key={t._id} trade={t} prices={prices}
          onEdit={setEditTrade}
          onClose={setCloseTrd}
          onDelete={handleDelete}/>
      ))}

      {showAdd    && <AddTradeModal onClose={()=>setShowAdd(false)} onSaved={()=>{ setShowAdd(false); refetch(); }}/>}
      {editTrade  && <AddTradeModal editTrade={editTrade} onClose={()=>setEditTrade(null)} onSaved={()=>{ setEditTrade(null); refetch(); }}/>}
      {closeTrd   && <CloseTradeModal trade={closeTrd} prices={prices} onClose={()=>setCloseTrd(null)} onSaved={()=>{ setCloseTrd(null); refetch(); }}/>}
    </>
  );
}