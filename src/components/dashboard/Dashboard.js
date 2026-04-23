import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI, alertsAPI } from '../../api';
import { usePolling, usePrices } from '../../hooks/usePolling';
import { fmt, fmtN, pct } from '../../utils/helpers';
import { IconPlus, IconTrendUp, IconTrendDown, IconChevR } from '../shared/Icons';
import PortfolioChart    from './PortfolioChart';
import PortfolioBreakdown from './PortfolioBreakdown';
import AddTradeModal     from '../portfolio/AddTradeModal';

function PriceBar({ entry, sl, target, cur }) {
  const range = target - sl;
  if (range <= 0) return null;
  const pos  = Math.min(100, Math.max(0, (cur - sl)   / range * 100));
  const ePct = Math.min(100, Math.max(0, (entry - sl)  / range * 100));
  const col  = cur >= entry ? 'var(--green)' : 'var(--red)';
  return (
    <div className="pbar-wrap">
      <div className="pbar-track">
        <div className="pbar-fill" style={{ width:`${pos}%`, background:col }}/>
        <div className="pbar-entry" style={{ left:`${ePct}%` }}/>
        <div className="pbar-dot"   style={{ left:`${pos}%`, background:col }}/>
      </div>
      <div className="pbar-labels">
        <span style={{ color:'var(--red)' }}>SL {fmt(sl)}</span>
        <span>Entry {fmt(entry)}</span>
        <span style={{ color:'var(--green)' }}>T {fmt(target)}</span>
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
    <div style={{ borderBottom:'1px solid var(--border)' }}>
      <div className="trade-row" style={{ paddingBottom:4 }}>
        <div>
          <div className="trade-name">{trade.name}</div>
          <div className="trade-meta">Entry {fmt(trade.entry)} · T {fmt(trade.target)}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div id={`price-${(trade.symbol||'').replace(/[^a-z0-9]/gi,'-')}`}
            style={{ fontWeight:700, fontFamily:'JetBrains Mono', fontSize:13, color:isUp?'var(--green)':'var(--red)' }}>
            {fmt(cur)}
          </div>
          <div style={{ fontSize:11, color:isUp?'var(--green)':'var(--red)' }}>
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
  const { data: portfolio, loading, refetch } = usePolling(portfolioAPI.stats, 30000, []);
  const { data: snapshots } = usePolling(portfolioAPI.snapshots, 300000, []);
  const { data: alertData  } = usePolling(() => alertsAPI.getAll(), 30000, []);
  const activeTrades = portfolio?.activeTrades || [];
  const symbols = activeTrades.map(t => t.symbol || `${t.name}.NS`).filter(Boolean);
  const { prices } = usePrices(symbols, 30000);

  if (loading) return <div className="loading-box"><div className="spinner"/><span>Loading portfolio...</span></div>;

  const p      = portfolio || {};
  const pnlUp  = (p.pnl || 0) >= 0;
  const tdUp   = (p.todayPnl || 0) >= 0;
  const recentAlerts = (alertData || []).slice(0, 4);

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        {[
          { lbl:'Portfolio Value', val:fmt(p.current||0), sub:`Invested ${fmt(p.invested||0)}`, icon:IconTrendUp },
          { lbl:'Total P&L', val:`${pnlUp?'+':''}${fmt(Math.round(p.pnl||0))}`, sub:`${pnlUp?'+':''}${fmtN(p.pnlPct||0)}% overall`, col:pnlUp?'var(--green)':'var(--red)', icon:pnlUp?IconTrendUp:IconTrendDown },
          { lbl:"Today's P&L", val:`${tdUp?'+':''}${fmt(Math.round(p.todayPnl||0))}`, sub:`${activeTrades.length} active positions`, col:tdUp?'var(--green)':'var(--red)', icon:tdUp?IconTrendUp:IconTrendDown },
          { lbl:'Win Rate', val:`${p.winRate||0}%`, sub:`${p.wins||0}W / ${p.losses||0}L · ${p.closedTrades||0} closed`, col:'var(--accent)', icon:IconTrendUp },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ borderColor: s.col ? `${s.col}28` : undefined }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <div className="stat-lbl">{s.lbl}</div>
              <s.icon style={{ width:16, height:16, color:'var(--muted)' }}/>
            </div>
            <div className="stat-val" style={{ color:s.col }}>{s.val}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-left">
          {/* Active Positions */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Active Positions</span>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--muted)' }}>{fmt(p.current||0)} · {pnlUp?'+':''}{fmt(Math.round(p.pnl||0))}</span>
                <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}><IconPlus style={{ width:11,height:11 }}/> Add</button>
              </div>
            </div>
            {activeTrades.length === 0
              ? <div className="loading-box" style={{ padding:28 }}><div style={{ fontSize:12 }}>No active positions</div><button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(true)} style={{ marginTop:8 }}><IconPlus style={{ width:11,height:11 }}/> Add First Trade</button></div>
              : activeTrades.map(t => <TradeRow key={t._id} trade={t} prices={prices}/>)
            }
          </div>

          {/* Chart + Breakdown */}
          <div className="dash-mid">
            <div className="card">
              <div className="card-hdr">
                <div>
                  <div className="card-title">Portfolio Value</div>
                  <div style={{ fontSize:19, fontWeight:700, fontFamily:'JetBrains Mono', marginTop:2 }}>
                    {fmt(p.current||0)}
                    <span style={{ fontSize:12, marginLeft:8, fontFamily:'Inter', color:pnlUp?'var(--green)':'var(--red)', fontWeight:600 }}>{pnlUp?'+':''}{fmtN(p.pnlPct||0)}%</span>
                  </div>
                </div>
              </div>
              <div style={{ padding:'0 16px 16px' }}>
                <PortfolioChart snapshots={snapshots||[]} currentValue={p.current||0}/>
              </div>
            </div>
            <div className="card">
              <div className="card-hdr"><span className="card-title">Breakdown</span><span style={{ fontSize:12, fontWeight:700, fontFamily:'JetBrains Mono' }}>{fmt(p.current||0)}</span></div>
              <div className="card-body">
                <PortfolioBreakdown sectorAllocation={p.sectorAllocation||{}} total={p.current||0}/>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="dash-right">
          {/* Scanner shortcut */}
          <div className="card">
            <div className="card-hdr"><span className="card-title">Strategy Scanner</span></div>
            <div style={{ padding:'10px 16px 16px', fontSize:11, color:'var(--muted)', lineHeight:1.7 }}>
              Run the EMA 200 breakout scanner to find high-conviction NSE setups using ATR, Bollinger Bands, CUSUM, and ZigZag indicators.
            </div>
            <div style={{ padding:'0 16px 16px' }}>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={()=>navigate('/scanner')}>
                Open Scanner →
              </button>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">Recent Alerts</span>
              <button className="btn btn-sm btn-ghost" onClick={()=>navigate('/alerts')}>See all <IconChevR style={{ width:11,height:11 }}/></button>
            </div>
            {recentAlerts.length === 0
              ? <div className="loading-box" style={{ padding:'20px' }}><div style={{ fontSize:11 }}>No alerts yet</div></div>
              : recentAlerts.map(a => {
                  const isGood = ['TARGET','BUY'].includes(a.type);
                  return (
                    <div key={a._id} className="alert-item">
                      <div className={`alert-icon ${isGood?'success':a.type==='SL_HIT'?'danger':'info'}`} style={{ fontSize:12, fontWeight:700 }}>
                        {isGood?'★':a.type==='SL_HIT'?'✕':'●'}
                      </div>
                      <div className="alert-body">
                        <div className="alert-title">{a.symbol} — {a.type.replace('_',' ')}</div>
                        <div className="alert-meta">{a.message?.slice(0,50)}{a.message?.length>50?'...':''}</div>
                      </div>
                      {a.price > 0 && <div style={{ fontSize:12, fontWeight:700, fontFamily:'JetBrains Mono', color:isGood?'var(--green)':'var(--red)', flexShrink:0 }}>{fmt(a.price)}</div>}
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>

      {showAdd && <AddTradeModal onClose={()=>setShowAdd(false)} onSaved={()=>{ setShowAdd(false); refetch(); }}/>}
    </>
  );
}