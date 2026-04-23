import React, { useState } from 'react';
import { tradesAPI } from '../../api';
import { usePolling } from '../../hooks/usePolling';
import { fmt, fmtN, pct } from '../../utils/helpers';
import { IconRefresh } from '../shared/Icons';

export default function History() {
  const [sort, setSort]  = useState({ by:'date', dir:'desc' });
  const { data: all, loading, refetch } = usePolling(() => tradesAPI.getAll(), 60000, []);
  const trades  = (all || []).filter(t => ['TARGET','SL','MANUAL_EXIT','CLOSED'].includes(t.status));

  const wins    = trades.filter(t => (t.exitPrice || 0) >= t.entry);
  const losses  = trades.filter(t => (t.exitPrice || 0) <  t.entry);
  const totalPnl= trades.reduce((s,t) => s + ((t.exitPrice||t.entry)-t.entry)*(t.qty||1), 0);
  const winRate = trades.length > 0 ? Math.round(wins.length / trades.length * 100) : 0;
  const avgWin  = wins.length   > 0 ? wins.reduce((s,t)=>s+((t.exitPrice||t.entry)-t.entry)*(t.qty||1),0)/wins.length   : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s,t)=>s+((t.exitPrice||t.entry)-t.entry)*(t.qty||1),0)/losses.length : 0;

  const toggleSort = col => {
    setSort(s => s.by === col ? { by:col, dir:s.dir==='desc'?'asc':'desc' } : { by:col, dir:'desc' });
  };

  const sorted = [...trades].sort((a,b) => {
    let va, vb;
    if (sort.by === 'date') { va = new Date(a.closedAt||0); vb = new Date(b.closedAt||0); }
    else if (sort.by === 'pnl') { va = ((a.exitPrice||a.entry)-a.entry)*(a.qty||1); vb = ((b.exitPrice||b.entry)-b.entry)*(b.qty||1); }
    else if (sort.by === 'name') { va = a.name; vb = b.name; }
    else { va = 0; vb = 0; }
    return sort.dir === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
  });

  const SortBtn = ({ col, children }) => (
    <button onClick={()=>toggleSort(col)} style={{ background:'none', border:'none', color:sort.by===col?'var(--accent)':'var(--muted)', cursor:'pointer', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:3 }}>
      {children}{sort.by===col && <span>{sort.dir==='desc'?'↓':'↑'}</span>}
    </button>
  );

  return (
    <>
      <div className="page-hdr">
        <div><h1 className="page-ttl">Trade History</h1><div className="page-sub">{trades.length} closed trades</div></div>
        <button className="btn-icon" onClick={refetch}><IconRefresh style={{ width:13,height:13 }}/></button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:16 }}>
        {[
          { lbl:'Realised P&L', val:`${totalPnl>=0?'+':''}${fmt(Math.round(totalPnl))}`, col:totalPnl>=0?'var(--green)':'var(--red)', sub:`${trades.length} total trades` },
          { lbl:'Win Rate',     val:`${winRate}%`,                                        col:'var(--accent)', sub:`${wins.length}W / ${losses.length}L` },
          { lbl:'Avg Win',      val:avgWin!==0?`+${fmt(Math.round(avgWin))}`:'—',         col:'var(--green)'  },
          { lbl:'Avg Loss',     val:avgLoss!==0?fmt(Math.round(avgLoss)):'—',             col:'var(--red)'    },
        ].map(s => (
          <div key={s.lbl} className="stat-card">
            <div className="stat-lbl">{s.lbl}</div>
            <div className="stat-val" style={{ fontSize:18, color:s.col }}>{s.val}</div>
            {s.sub && <div className="stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Win/loss streak */}
      {trades.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>Last 30 trades</div>
          <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
            {sorted.slice(0,30).map((t,i) => {
              const pl = ((t.exitPrice||t.entry)-t.entry)*(t.qty||1);
              return <div key={i} title={`${t.name}: ${pl>=0?'+':''}${fmt(Math.round(pl))}`}
                style={{ width:8, height:24, borderRadius:2, background:pl>=0?'var(--green)':'var(--red)', opacity:0.75 }}/>;
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflowX:'auto' }}>
        {loading && <div className="loading-box"><div className="spinner"/></div>}
        {!loading && sorted.length === 0 && (
          <div className="loading-box" style={{ padding:40 }}>
            <div style={{ fontSize:12 }}>No closed trades yet</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Close a position to see history here.</div>
          </div>
        )}
        {sorted.length > 0 && (
          <table className="tbl">
            <thead>
              <tr>
                <th><SortBtn col="name">Stock</SortBtn></th>
                <th>Sector</th>
                <th><SortBtn col="date">Closed</SortBtn></th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Qty</th>
                <th><SortBtn col="pnl">P&L</SortBtn></th>
                <th>Return</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(t => {
                const ep  = t.exitPrice || t.entry;
                const pl  = (ep - t.entry) * (t.qty || 1);
                const pp  = Number(pct(ep, t.entry));
                const win = pl >= 0;
                const STATUS = { TARGET:'#22c55e', SL:'#ef4444', MANUAL_EXIT:'#fbbf24', CLOSED:'#94a3b8' };
                const sc  = STATUS[t.status] || '#94a3b8';
                return (
                  <tr key={t._id}>
                    <td><div style={{ fontWeight:700, fontFamily:'JetBrains Mono', fontSize:13 }}>{t.name}</div><div style={{ fontSize:10, color:'var(--muted)' }}>{t.entryType}</div></td>
                    <td style={{ fontSize:11, color:'var(--muted)' }}>{t.sector}</td>
                    <td style={{ fontSize:11, color:'var(--muted)' }}>{t.closedAt ? new Date(t.closedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}</td>
                    <td style={{ fontFamily:'JetBrains Mono', fontSize:12 }}>{fmt(t.entry)}</td>
                    <td style={{ fontFamily:'JetBrains Mono', fontSize:12, color:win?'var(--green)':'var(--red)' }}>{fmt(ep)}</td>
                    <td style={{ fontFamily:'JetBrains Mono', fontSize:12 }}>{t.qty}</td>
                    <td><div style={{ fontWeight:700, fontFamily:'JetBrains Mono', fontSize:12, color:win?'var(--green)':'var(--red)' }}>{win?'+':''}{fmt(Math.round(pl))}</div></td>
                    <td style={{ fontWeight:700, fontFamily:'JetBrains Mono', fontSize:12, color:win?'var(--green)':'var(--red)' }}>{win?'+':''}{fmtN(pp)}%</td>
                    <td><span style={{ fontSize:10, padding:'2px 8px', borderRadius:4, fontWeight:600, background:`${sc}18`, color:sc, border:`1px solid ${sc}30` }}>{t.status.replace('_',' ')}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}