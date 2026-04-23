import React, { useState } from 'react';
import { alertsAPI } from '../../api';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../context/ToastContext';
import { fmt } from '../../utils/helpers';
import { IconTrash, IconRefresh } from '../shared/Icons';

const TYPE_META = {
  BUY:       { col:'var(--blue)',   bg:'var(--blue-bg)',  icon:'▲', cls:'info'    },
  TARGET:    { col:'var(--green)',  bg:'var(--green-bg)', icon:'★', cls:'success' },
  SL_HIT:    { col:'var(--red)',    bg:'var(--red-bg)',   icon:'✕', cls:'danger'  },
  SELECTION: { col:'var(--cyan)',   bg:'rgba(6,182,212,0.1)', icon:'◈', cls:'info' },
  CLOSED:    { col:'var(--accent)', bg:'rgba(245,158,11,0.1)', icon:'✓', cls:'warn' },
  DEFAULT:   { col:'var(--muted)',  bg:'rgba(255,255,255,0.04)', icon:'●', cls:'info' },
};
const meta = t => TYPE_META[t] || TYPE_META.DEFAULT;

export default function Alerts() {
  const { addToast } = useToast();
  const [filter, setFilter] = useState('all');
  const { data, loading, refetch } = usePolling(() => alertsAPI.getAll(), 15000, []);
  const alerts = data || [];
  const unread = alerts.filter(a => !a.read).length;

  const filtered = filter === 'all'    ? alerts
    : filter === 'unread'              ? alerts.filter(a => !a.read)
    : alerts.filter(a => a.type === filter);

  const markAll = async () => { try { await alertsAPI.markAllRead(); addToast('All marked as read','info'); refetch(); } catch (e) { addToast(e.message,'error'); } };

  const del = async id => {
    try { await alertsAPI.delete(id); refetch(); }
    catch (e) { addToast(e.message,'error'); }
  };

  const counts = { total:alerts.length, target:alerts.filter(a=>a.type==='TARGET').length, sl:alerts.filter(a=>a.type==='SL_HIT').length, buy:alerts.filter(a=>a.type==='BUY').length };

  return (
    <>
      <div className="page-hdr">
        <div><h1 className="page-ttl">Alerts</h1><div className="page-sub">{unread} unread · {alerts.length} total</div></div>
        <div style={{ display:'flex', gap:8 }}>
          {unread > 0 && <button className="btn btn-ghost" onClick={markAll} style={{ fontSize:11 }}>Mark all read</button>}
          <button className="btn-icon" onClick={refetch}><IconRefresh style={{ width:13,height:13 }}/></button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:16 }}>
        {[
          { lbl:'Total',      val:counts.total,  col:'var(--text)'   },
          { lbl:'Target Hit', val:counts.target, col:'var(--green)'  },
          { lbl:'Stop Loss',  val:counts.sl,     col:'var(--red)'    },
          { lbl:'Buy Signal', val:counts.buy,    col:'var(--blue)'   },
        ].map(s => (
          <div key={s.lbl} className="stat-card">
            <div className="stat-lbl">{s.lbl}</div>
            <div className="stat-val" style={{ fontSize:24, color:s.col }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
        {[['all','All'],['unread',`Unread (${unread})`],['TARGET','Target Hit'],['SL_HIT','Stop Loss'],['BUY','Buy Signal'],['SELECTION','Scanner']].map(([v,l]) => (
          <button key={v} onClick={()=>setFilter(v)} className={`btn btn-sm ${filter===v?'btn-primary':'btn-ghost'}`}>{l}</button>
        ))}
      </div>

      <div className="card">
        {loading && <div className="loading-box"><div className="spinner"/></div>}
        {!loading && filtered.length === 0 && (
          <div className="loading-box" style={{ padding:40 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🔔</div>
            <div style={{ fontSize:12 }}>No alerts {filter !== 'all' ? 'in this category' : 'yet'}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Alerts fire automatically when price conditions are met.</div>
          </div>
        )}
        {filtered.map(a => {
          const m  = meta(a.type);
          const ts = a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short' }) : '';
          return (
            <div key={a._id} className="alert-item" style={{ opacity:a.read ? 0.7 : 1 }}>
              <div className={`alert-icon ${m.cls}`} style={{ fontSize:12, fontWeight:700 }}>{m.icon}</div>
              <div className="alert-body">
                <div className="alert-title" style={{ display:'flex', alignItems:'center', gap:7 }}>
                  {a.symbol}
                  <span style={{ fontSize:10, padding:'1px 7px', borderRadius:4, fontWeight:600, background:m.bg, color:m.col }}>{a.type.replace('_',' ')}</span>
                  {!a.read && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }}/>}
                </div>
                <div className="alert-meta">{a.message}</div>
                <div className="alert-meta" style={{ marginTop:2 }}>{ts}{a.emailSent ? ' · 📧 emailed' : ''}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                {a.price > 0 && <div style={{ fontWeight:700, fontFamily:'JetBrains Mono', fontSize:12, color:m.col }}>{fmt(a.price)}</div>}
                <button className="btn-icon" onClick={()=>del(a._id)} style={{ width:26,height:26 }}><IconTrash style={{ width:11,height:11 }}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}