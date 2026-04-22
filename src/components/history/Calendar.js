import React, { useState, useMemo } from 'react';
import { usePolling } from '../../hooks/usePolling';
import { tradesAPI } from '../../api';
import { fmt, fmtN, pct, calDays, MONTHS, DAYS_SHORT } from '../../utils/helpers';
import { IconChevronLeft, IconChevronRight, IconPlus } from '../shared/Icons';
import AddTradeModal from '../portfolio/AddTradeModal';

export default function Calendar() {
  const today  = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);
  const [showAdd,  setShowAdd]  = useState(false);

  const { data: allTrades, refetch } = usePolling(() => tradesAPI.getAll(), 60000, []);
  const trades = allTrades || [];

  // Map: "YYYY-MM-DD" -> array of trades
  const tradeMap = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      // Open date
      const openKey = t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : null;
      if (openKey) { if (!map[openKey]) map[openKey] = []; map[openKey].push({ ...t, dateType: 'open' }); }
      // Close date
      const closeKey = t.closedAt ? new Date(t.closedAt).toISOString().slice(0, 10) : null;
      if (closeKey) { if (!map[closeKey]) map[closeKey] = []; map[closeKey].push({ ...t, dateType: 'close' }); }
    });
    return map;
  }, [trades]);

  const cells = calDays(year, month);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelected(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0);  } else setMonth(m => m + 1); setSelected(null); };

  const formatKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Summary stats for current month
  const monthTrades = useMemo(() => {
    return Object.entries(tradeMap)
      .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
      .flatMap(([, ts]) => ts);
  }, [tradeMap, year, month]);

  const closedThisMonth = monthTrades.filter(t => t.dateType === 'close' && ['TARGET','SL','MANUAL_EXIT','CLOSED'].includes(t.status));
  const monthPnl = closedThisMonth.reduce((s, t) => s + ((t.exitPrice || t.entry) - t.entry) * (t.qty || 1), 0);

  const selectedKey = selected ? formatKey(year, month, selected.day) : null;
  const selectedTrades = selectedKey ? (tradeMap[selectedKey] || []) : [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <div className="page-sub">Trade entry & exit dates</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <IconPlus style={{ width: 14, height: 14 }}/> Add Reminder
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Calendar */}
        <div className="card" style={{ padding: '20px' }}>
          {/* Month nav */}
          <div className="cal-nav">
            <button className="btn-icon" onClick={prevMonth}><IconChevronLeft style={{ width: 14, height: 14 }}/></button>
            <div>
              <div className="cal-month">{MONTHS[month]} {year}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                {closedThisMonth.length} trades closed · {' '}
                <span style={{ color: monthPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {monthPnl >= 0 ? '+' : ''}{fmt(Math.round(monthPnl))}
                </span>
              </div>
            </div>
            <button className="btn-icon" onClick={nextMonth}><IconChevronRight style={{ width: 14, height: 14 }}/></button>
          </div>

          {/* Day headers */}
          <div className="cal-header">
            {DAYS_SHORT.map(d => <div key={d} className="cal-day-label">{d}</div>)}
          </div>

          {/* Days grid */}
          <div className="cal-grid">
            {cells.map((cell, i) => {
              const key     = formatKey(year, month, cell.day);
              const dayTrades = cell.cur ? (tradeMap[key] || []) : [];
              const hasOpen  = dayTrades.some(t => t.dateType === 'open');
              const hasClose = dayTrades.some(t => t.dateType === 'close');
              const isToday  = cell.cur && cell.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSel    = selected && selected.day === cell.day && cell.cur;

              return (
                <div
                  key={i}
                  className={`cal-day ${isToday ? 'today' : ''} ${!cell.cur ? 'other-month' : ''}`}
                  style={{
                    background: isSel && !isToday ? 'var(--bg-hover)' : undefined,
                    border: isSel ? '1px solid var(--border2)' : '1px solid transparent',
                    cursor: cell.cur ? 'pointer' : 'default',
                    flexDirection: 'column',
                    gap: 2,
                    paddingBottom: dayTrades.length > 0 ? 2 : undefined,
                  }}
                  onClick={() => cell.cur && setSelected(isSel ? null : cell)}
                >
                  <span>{cell.day}</span>
                  {cell.cur && dayTrades.length > 0 && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {hasOpen  && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--blue)' }}/>}
                      {hasClose && <span style={{ width: 4, height: 4, borderRadius: '50%', background: hasClose && closedThisMonth.find(t => formatKey(year, month, cell.day) === (t.closedAt ? new Date(t.closedAt).toISOString().slice(0,10) : null) && ((t.exitPrice||t.entry)>t.entry)) ? 'var(--green)' : 'var(--red)' }}/>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 10, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }}/> Trade opened</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}/> Profit closed</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }}/> Loss closed</span>
          </div>
        </div>

        {/* Right panel: selected day or monthly stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Monthly summary */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {MONTHS[month]} Summary
            </div>
            {[
              { label: 'Trades Opened', value: monthTrades.filter(t => t.dateType === 'open').length },
              { label: 'Trades Closed', value: closedThisMonth.length },
              { label: 'Month P&L', value: `${monthPnl >= 0 ? '+' : ''}${fmt(Math.round(monthPnl))}`, color: monthPnl >= 0 ? 'var(--green)' : 'var(--red)' },
              { label: 'Win Rate', value: closedThisMonth.length > 0 ? `${Math.round(closedThisMonth.filter(t => (t.exitPrice||t.entry) > t.entry).length / closedThisMonth.length * 100)}%` : '—', color: 'var(--accent)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono', color: s.color || 'var(--text-primary)' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Selected day detail */}
          {selected && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {selected.day} {MONTHS[month]}
              </div>
              {selectedTrades.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No trades on this date</div>
              )}
              {selectedTrades.map((t, i) => {
                const pl = t.exitPrice ? ((t.exitPrice - t.entry) * (t.qty || 1)) : null;
                return (
                  <div key={i} style={{ padding: '8px 0', borderBottom: i < selectedTrades.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 13 }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          {t.dateType === 'open' ? '📂 Opened' : '📁 Closed'} · {t.sector}
                        </div>
                      </div>
                      {pl !== null && (
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', color: pl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {pl >= 0 ? '+' : ''}{fmt(Math.round(pl))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming trades (open positions) */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Open Positions
            </div>
            {trades.filter(t => ['WAITING','ACTIVE'].includes(t.status)).slice(0, 5).map(t => (
              <div key={t._id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', fontSize: 12 }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.entryType}</div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: t.status === 'ACTIVE' ? 'var(--green-dim)' : 'rgba(251,191,36,0.1)', color: t.status === 'ACTIVE' ? 'var(--green)' : 'var(--accent)' }}>
                  {t.status}
                </span>
              </div>
            ))}
            {trades.filter(t => ['WAITING','ACTIVE'].includes(t.status)).length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No open positions</div>
            )}
          </div>
        </div>
      </div>

      {showAdd && <AddTradeModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refetch(); }}/>}
    </>
  );
}