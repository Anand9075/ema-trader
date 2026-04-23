import React, { useState, useMemo } from 'react';
import { tradesAPI } from '../../api';
import { usePolling } from '../../hooks/usePolling';
import { fmt, calDays, MONTHS, DAYS_SHORT } from '../../utils/helpers';
import { IconChevL, IconChevR } from '../shared/Icons';
import AddTradeModal from '../portfolio/AddTradeModal';

export default function Calendar() {
  const today    = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel,   setSel]   = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const { data: all, refetch } = usePolling(() => tradesAPI.getAll(), 60000, []);
  const trades = all || [];

  const tradeMap = useMemo(() => {
    const m = {};
    trades.forEach(t => {
      const open  = t.createdAt ? new Date(t.createdAt).toISOString().slice(0,10) : null;
      const close = t.closedAt  ? new Date(t.closedAt).toISOString().slice(0,10)  : null;
      if (open)  { if (!m[open])  m[open]  = []; m[open].push({ ...t, _dateType:'open'  }); }
      if (close) { if (!m[close]) m[close] = []; m[close].push({ ...t, _dateType:'close' }); }
    });
    return m;
  }, [trades]);

  const cells = calDays(year, month);
  const key   = (y,m,d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const prevM = () => { if (month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); setSel(null); };
  const nextM = () => { if (month===11){setYear(y=>y+1);setMonth(0); }else setMonth(m=>m+1); setSel(null); };

  const monthPfx = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthTrades = Object.entries(tradeMap).filter(([k])=>k.startsWith(monthPfx)).flatMap(([,ts])=>ts);
  const closedMonth = monthTrades.filter(t=>t._dateType==='close'&&['TARGET','SL','MANUAL_EXIT','CLOSED'].includes(t.status));
  const monthPnl    = closedMonth.reduce((s,t)=>s+((t.exitPrice||t.entry)-t.entry)*(t.qty||1),0);

  const selKey    = sel ? key(year,month,sel) : null;
  const selTrades = selKey ? (tradeMap[selKey]||[]) : [];

  return (
    <>
      <div className="page-hdr">
        <div><h1 className="page-ttl">Calendar</h1><div className="page-sub">Trade entry & exit dates</div></div>
        <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Reminder</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
        {/* Calendar */}
        <div className="card" style={{ padding:20 }}>
          {/* Nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <button className="btn-icon" onClick={prevM}><IconChevL style={{ width:13,height:13 }}/></button>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:15, fontWeight:700 }}>{MONTHS[month]} {year}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                {closedMonth.length} trades closed ·{' '}
                <span style={{ color:monthPnl>=0?'var(--green)':'var(--red)' }}>{monthPnl>=0?'+':''}{fmt(Math.round(monthPnl))}</span>
              </div>
            </div>
            <button className="btn-icon" onClick={nextM}><IconChevR style={{ width:13,height:13 }}/></button>
          </div>

          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
            {DAYS_SHORT.map(d => <div key={d} className="cal-day-lbl">{d}</div>)}
          </div>

          {/* Days */}
          <div className="cal-grid">
            {cells.map((c,i) => {
              const k   = key(year,month,c.day);
              const dts = c.cur ? (tradeMap[k]||[]) : [];
              const hasOpen = dts.some(t=>t._dateType==='open');
              const hasClose= dts.some(t=>t._dateType==='close');
              const closeWin = dts.some(t=>t._dateType==='close'&&(t.exitPrice||0)>=t.entry);
              const isToday  = c.cur && c.day===today.getDate() && month===today.getMonth() && year===today.getFullYear();
              const isSel    = sel === c.day && c.cur;
              return (
                <div key={i} className={`cal-day ${isToday?'today':''} ${!c.cur?'other-month':''} ${isSel&&!isToday?'selected':''}`}
                  onClick={()=>c.cur&&setSel(isSel?null:c.day)}>
                  <span>{c.day}</span>
                  {c.cur && dts.length > 0 && (
                    <div style={{ display:'flex', gap:2 }}>
                      {hasOpen  && <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--blue)' }}/>}
                      {hasClose && <span style={{ width:4, height:4, borderRadius:'50%', background:closeWin?'var(--green)':'var(--red)' }}/>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:16, marginTop:14, fontSize:10, color:'var(--muted)' }}>
            {[['var(--blue)','Opened'],['var(--green)','Profit close'],['var(--red)','Loss close']].map(([col,lbl])=>(
              <span key={lbl} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:col, display:'inline-block' }}/>{lbl}
              </span>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Month summary */}
          <div className="card" style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>{MONTHS[month]} Summary</div>
            {[
              { lbl:'Trades Opened', val:monthTrades.filter(t=>t._dateType==='open').length },
              { lbl:'Trades Closed', val:closedMonth.length },
              { lbl:'Month P&L',     val:`${monthPnl>=0?'+':''}${fmt(Math.round(monthPnl))}`, col:monthPnl>=0?'var(--green)':'var(--red)' },
              { lbl:'Win Rate',      val:closedMonth.length>0?`${Math.round(closedMonth.filter(t=>(t.exitPrice||0)>=t.entry).length/closedMonth.length*100)}%`:'—', col:'var(--accent)' },
            ].map(s=>(
              <div key={s.lbl} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--muted)' }}>{s.lbl}</span>
                <span style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono', color:s.col||'var(--text)' }}>{s.val}</span>
              </div>
            ))}
          </div>

          {/* Selected day */}
          {sel && (
            <div className="card" style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
                {sel} {MONTHS[month]}
              </div>
              {selTrades.length === 0
                ? <div style={{ fontSize:11, color:'var(--muted)', textAlign:'center', padding:'12px 0' }}>No trades on this date</div>
                : selTrades.map((t,i) => {
                    const pl = t.exitPrice ? (t.exitPrice-t.entry)*(t.qty||1) : null;
                    return (
                      <div key={i} style={{ padding:'8px 0', borderBottom:i<selTrades.length-1?'1px solid var(--border)':'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:700, fontFamily:'JetBrains Mono', fontSize:13 }}>{t.name}</div>
                          <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{t._dateType==='open'?'📂 Opened':'📁 Closed'} · {t.sector}</div>
                        </div>
                        {pl !== null && <div style={{ fontSize:12, fontWeight:700, fontFamily:'JetBrains Mono', color:pl>=0?'var(--green)':'var(--red)' }}>{pl>=0?'+':''}{fmt(Math.round(pl))}</div>}
                      </div>
                    );
                  })
              }
            </div>
          )}

          {/* Open positions */}
          <div className="card" style={{ padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Open Positions</div>
            {trades.filter(t=>['WAITING','ACTIVE'].includes(t.status)).slice(0,6).map(t=>(
              <div key={t._id} style={{ padding:'7px 0', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontWeight:600, fontFamily:'JetBrains Mono', fontSize:12 }}>{t.name}</div><div style={{ fontSize:10, color:'var(--muted)' }}>{t.entryType}</div></div>
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:600, background:t.status==='ACTIVE'?'var(--green-bg)':'rgba(245,158,11,0.12)', color:t.status==='ACTIVE'?'var(--green)':'var(--accent)' }}>{t.status}</span>
              </div>
            ))}
            {trades.filter(t=>['WAITING','ACTIVE'].includes(t.status)).length===0 && <div style={{ fontSize:11, color:'var(--muted)', textAlign:'center', padding:'12px 0' }}>No open positions</div>}
          </div>
        </div>
      </div>

      {showAdd && <AddTradeModal onClose={()=>setShowAdd(false)} onSaved={()=>{ setShowAdd(false); refetch(); }}/>}
    </>
  );
}