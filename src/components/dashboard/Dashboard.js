import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI, alertsAPI } from '../../api';
import { usePolling, usePrices } from '../../hooks/usePolling';
import { fmt, fmtN, pct } from '../../utils/helpers';
import { IconPlus, IconTrendUp, IconTrendDown, IconChevR, IconRefresh } from '../shared/Icons';
import PortfolioChart     from './PortfolioChart';
import PortfolioBreakdown from './PortfolioBreakdown';
import AddTradeModal      from '../portfolio/AddTradeModal';

function StatCard({ label, value, sub, color, icon: Icon, glowColor }) {
  return (
    <div className="stat-card hover-glow" style={{
      borderColor: color ? `${color}22` : undefined,
      background: color ? `linear-gradient(135deg, rgba(12,19,38,0.94) 0%, ${color}08 100%)` : undefined,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
        <div className="stat-lbl">{label}</div>
        {Icon && <Icon style={{ width:16, height:16, color: color || 'var(--text3)', opacity:0.7 }}/>}
      </div>
      <div className="stat-val" style={{ color: color || 'var(--white)',
        ...(color ? { textShadow:`0 0 20px ${color}55` } : {}) }}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function PriceBar({ entry, sl, target, cur }) {
  const range = target - sl;
  if (range <= 0) return null;
  const pos  = Math.min(100, Math.max(0, (cur - sl)  / range * 100));
  const ePct = Math.min(100, Math.max(0, (entry - sl) / range * 100));
  const col  = cur >= entry ? 'var(--green2)' : 'var(--red2)';
  return (
    <div className="pbar-wrap">
      <div className="pbar-track">
        <div className="pbar-fill" style={{ width:`${pos}%`, background:col, boxShadow:`0 0 8px ${col}88` }}/>
        <div className="pbar-entry" style={{ left:`${ePct}%` }}/>
        <div className="pbar-dot"  style={{ left:`${pos}%`, background:col, boxShadow:`0 0 8px ${col}` }}/>
      </div>
      <div className="pbar-labels">
        <span style={{ color:'var(--red2)' }}>SL {fmt(sl)}</span>
        <span>Entry {fmt(entry)}</span>
        <span style={{ color:'var(--green2)' }}>T {fmt(target)}</span>
      </div>
    </div>
  );
}

function TradeRow({ trade, prices }) {
  const q   = prices[trade.symbol || `${trade.name}.NS`] || {};
  const cur = q.price || trade.currentPrice || trade.entry;
  const pnl = (cur - trade.entry) * (trade.qty || 1);
  const isUp= pnl >= 0;
  return (
    <div style={{ borderBottom:'1px solid rgba(255,255,255,0.038)' }}>
      <div className="trade-row" style={{ paddingBottom:4 }}>
        <div>
          <div className="trade-name">{trade.name}</div>
          <div className="trade-meta">Entry {fmt(trade.entry)} · T {fmt(trade.target)}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div id={`price-${(trade.symbol||'').replace(/[^a-z0-9]/gi,'-')}`}
            style={{ fontWeight:800, fontFamily:'JetBrains Mono', fontSize:14,
              color:isUp?'var(--green2)':'var(--red2)',
              textShadow:isUp?'0 0 12px rgba(52,211,153,0.5)':'0 0 12px rgba(251,113,133,0.5)' }}>
            {fmt(cur)}
          </div>
          <div style={{ fontSize:11, color:isUp?'var(--green2)':'var(--red2)', marginTop:2 }}>
            {isUp?'+':''}{fmt(Math.round(pnl))} ({isUp?'+':''}{fmtN(Number(pct(cur,trade.entry)))}%)
          </div>
        </div>
      </div>
      <PriceBar entry={trade.entry} sl={trade.sl} target={trade.target} cur={cur}/>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const { data: portfolio, loading, refetch } = usePolling(portfolioAPI.stats,     30000, []);
  const { data: snapshots }                   = usePolling(portfolioAPI.snapshots, 300000, []);
  const { data: alertData }                   = usePolling(() => alertsAPI.getAll(), 30000, []);
  const activeTrades = portfolio?.activeTrades || [];
  const symbols = activeTrades.map(t => t.symbol || `${t.name}.NS`).filter(Boolean);
  const { prices } = usePrices(symbols, 30000);

  if (loading) return (
    <div className="loading-box">
      <div className="spinner" style={{ width:32, height:32 }}/>
      <span>Loading portfolio...</span>
    </div>
  );

  const p      = portfolio || {};
  const pnlUp  = (p.pnl || 0) >= 0;
  const tdUp   = (p.todayPnl || 0) >= 0;
  const alerts = (alertData || []).slice(0, 4);

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard label="Portfolio Value"  value={fmt(p.current||0)}
          sub={`Invested ${fmt(p.invested||0)}`} icon={IconTrendUp}/>
        <StatCard label="Total P&L"
          value={`${pnlUp?'+':''}${fmt(Math.round(p.pnl||0))}`}
          sub={`${pnlUp?'+':''}${fmtN(p.pnlPct||0)}% overall`}
          color={pnlUp?'var(--green2)':'var(--red2)'}
          icon={pnlUp?IconTrendUp:IconTrendDown}/>
        <StatCard label="Today's P&L"
          value={`${tdUp?'+':''}${fmt(Math.round(p.todayPnl||0))}`}
          sub={`${activeTrades.length} active positions`}
          color={tdUp?'var(--green2)':'var(--red2)'}
          icon={tdUp?IconTrendUp:IconTrendDown}/>
        <StatCard label="Win Rate"
          value={`${p.winRate||0}%`}
          sub={`${p.wins||0}W / ${p.losses||0}L · ${p.closedTrades||0} closed`}
          color="var(--accent)"
          icon={IconTrendUp}/>
      </div>

      <div className="dash-grid">
        {/* LEFT */}
        <div className="dash-left">
          {/* Active Positions Card */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Active Positions</span>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:11, color:'var(--text3)' }}>
                  {fmt(p.current||0)} · <span style={{ color:pnlUp?'var(--green2)':'var(--red2)' }}>
                    {pnlUp?'+':''}{fmtN(p.pnlPct||0)}%
                  </span>
                </span>
                <button className="btn-icon" onClick={refetch} title="Refresh">
                  <IconRefresh style={{ width:12, height:12 }}/>
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>
                  <IconPlus style={{ width:11, height:11 }}/> Add
                </button>
              </div>
            </div>
            {activeTrades.length === 0 ? (
              <div className="loading-box" style={{ padding:32 }}>
                <div style={{ fontSize:30, marginBottom:6 }}>📊</div>
                <div style={{ fontSize:12, color:'var(--text2)' }}>No active positions</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} style={{ marginTop:12 }}>
                  <IconPlus style={{ width:11, height:11 }}/> Add First Trade
                </button>
              </div>
            ) : (
              activeTrades.map(t => <TradeRow key={t._id} trade={t} prices={prices}/>)
            )}
          </div>

          {/* Chart + Breakdown row */}
          <div className="dash-mid">
            <div className="card">
              <div className="card-hdr">
                <div>
                  <div className="card-title">Portfolio Value</div>
                  <div style={{ fontSize:20, fontWeight:800, fontFamily:'JetBrains Mono', marginTop:4, color:'var(--white)', letterSpacing:'-0.03em' }}>
                    {fmt(p.current||0)}
                    <span style={{ fontSize:12, marginLeft:10, fontFamily:'Inter', fontWeight:600, color:pnlUp?'var(--green2)':'var(--red2)' }}>
                      {pnlUp?'+':''}{fmtN(p.pnlPct||0)}%
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ padding:'0 16px 16px' }}>
                <PortfolioChart snapshots={snapshots||[]} currentValue={p.current||0}/>
              </div>
            </div>

            <div className="card">
              <div className="card-hdr">
                <span className="card-title">Portfolio Breakdown</span>
                <span style={{ fontSize:12, fontWeight:800, fontFamily:'JetBrains Mono', color:'var(--white)' }}>
                  {fmt(p.current||0)}
                </span>
              </div>
              <div className="card-body">
                <PortfolioBreakdown sectorAllocation={p.sectorAllocation||{}} total={p.current||0}/>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="dash-right">
          {/* Scanner shortcut */}
          <div className="card hover-glow" style={{ borderColor:'rgba(59,130,246,0.12)' }}>
            <div className="card-hdr">
              <span className="card-title">Strategy Scanner</span>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'rgba(59,130,246,0.1)', color:'#93c5fd', border:'1px solid rgba(59,130,246,0.2)', fontWeight:600 }}>EMA + ATR</span>
            </div>
            <div style={{ padding:'0 16px 16px', fontSize:11, color:'var(--text2)', lineHeight:1.7 }}>
              Scan 25 NSE large-caps using EMA 200 breakout, RSI, ATR, Bollinger Bands, CUSUM, and ZigZag for high-conviction setups.
            </div>
            <div style={{ padding:'0 16px 16px' }}>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontSize:12 }}
                onClick={() => navigate('/scanner')}>
                🔍 Open Strategy Scanner →
              </button>
            </div>
          </div>

          {/* Alerts preview */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Recent Alerts</span>
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/alerts')}>
                See all <IconChevR style={{ width:11, height:11 }}/>
              </button>
            </div>
            {alerts.length === 0 ? (
              <div style={{ padding:'20px 16px', textAlign:'center', color:'var(--text3)', fontSize:11 }}>
                🔔 No alerts yet. Alerts fire when price conditions are met.
              </div>
            ) : alerts.map(a => {
              const isGood = ['TARGET','BUY'].includes(a.type);
              return (
                <div key={a._id} className="alert-item">
                  <div className={`alert-icon ${isGood?'success':a.type==='SL_HIT'?'danger':'info'}`}
                    style={{ fontSize:12, fontWeight:700 }}>
                    {isGood ? '★' : a.type==='SL_HIT' ? '✕' : '●'}
                  </div>
                  <div className="alert-body">
                    <div className="alert-title">{a.symbol} — {a.type.replace('_',' ')}</div>
                    <div className="alert-meta">{a.message?.slice(0,50)}{a.message?.length>50?'...':''}</div>
                  </div>
                  {a.price > 0 && (
                    <div style={{ fontSize:11, fontWeight:700, fontFamily:'JetBrains Mono', color:isGood?'var(--green2)':'var(--red2)', flexShrink:0 }}>
                      {fmt(a.price)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAdd && (
        <AddTradeModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refetch(); }}
        />
      )}
    </>
  );
}