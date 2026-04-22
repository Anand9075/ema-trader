import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePolling, usePrices } from '../../hooks/usePolling';
import { portfolioAPI, alertsAPI } from '../../api';
import { fmt, fmtN, pct, pnlClass, pnlColor, SECTOR_COLORS } from '../../utils/helpers';
import { IconTrendUp, IconTrendDown, IconPlus, IconChevronRight } from '../shared/Icons';
import PortfolioChart from './PortfolioChart';
import PortfolioBreakdown from './PortfolioBreakdown';
import AddTradeModal from '../portfolio/AddTradeModal';

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="stat-card" style={{ borderColor: color ? `${color}30` : undefined }}>
      <div className="flex items-center justify-between mb-8">
        <div className="stat-label">{label}</div>
        {Icon && <Icon style={{ width: 16, height: 16, color: 'var(--text-muted)' }}/>}
      </div>
      <div className="stat-value" style={{ color: color || undefined }}>{value}</div>
      {sub && <div className="stat-sub" style={{ color: color || 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function ActivePositionRow({ trade, prices }) {
  const q      = prices[trade.symbol] || {};
  const cur    = q.price || trade.currentPrice || trade.entry;
  const pnl    = (cur - trade.entry) * (trade.qty || 1);
  const pnlPct = Number(pct(cur, trade.entry));
  const isUp   = pnl >= 0;
  const range  = trade.target - trade.sl;
  const barPos = range > 0 ? Math.min(100, Math.max(0, (cur - trade.sl) / range * 100)) : 50;
  const entPos = range > 0 ? Math.min(100, Math.max(0, (trade.entry - trade.sl) / range * 100)) : 50;

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="trade-row" style={{ paddingBottom: 4 }}>
        <div>
          <div className="trade-ticker">{trade.name}</div>
          <div className="trade-meta">Entry ₹{trade.entry} · Target ₹{trade.target}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="trade-price" id={`price-${(trade.symbol||'').replace(/[^a-z0-9]/gi,'-')}`}
            style={{ color: isUp ? 'var(--green)' : 'var(--red)' }}>
            {fmt(cur)}
          </div>
          <div className="trade-pnl" style={{ color: isUp ? 'var(--green)' : 'var(--red)' }}>
            {isUp ? '+' : ''}{fmt(Math.round(pnl))} ({isUp ? '+' : ''}{fmtN(pnlPct)}%)
          </div>
        </div>
      </div>
      {/* Price bar */}
      <div className="price-bar-wrap" style={{ paddingTop: 0, paddingBottom: 8 }}>
        <div className="price-bar-track" style={{ margin: '0 0 0 0' }}>
          <div className="price-bar-fill" style={{ width: `${barPos}%`, background: isUp ? 'var(--green)' : 'var(--red)' }}/>
          <div className="price-bar-dot" style={{ left: `${entPos}%`, background: 'var(--text-muted)', width: 6, height: 6 }}/>
          <div className="price-bar-dot" style={{ left: `${barPos}%`, background: isUp ? 'var(--green)' : 'var(--red)', width: 8, height: 8 }}/>
        </div>
      </div>
    </div>
  );
}

function AlertPreview({ alerts }) {
  const navigate = useNavigate();
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Alerts</span>
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/alerts')}>
          See all <IconChevronRight style={{ width: 12, height: 12 }}/>
        </button>
      </div>
      <div>
        {(!alerts || alerts.length === 0) && (
          <div className="loading-center" style={{ padding: '24px', fontSize: 11 }}>No recent alerts</div>
        )}
        {(alerts || []).slice(0, 4).map(a => {
          const isGood = ['TARGET', 'BUY'].includes(a.type);
          return (
            <div key={a._id} className="alert-item">
              <div className={`alert-icon ${isGood ? 'success' : a.type === 'SL_HIT' ? 'danger' : 'info'}`}
                style={{ fontSize: 12, fontWeight: 700 }}>
                {isGood ? '★' : a.type === 'SL_HIT' ? '✕' : '●'}
              </div>
              <div className="alert-body">
                <div className="alert-title">{a.symbol} — {a.type.replace('_', ' ')}</div>
                <div className="alert-meta">{a.message?.slice(0, 48)}{a.message?.length > 48 ? '...' : ''}</div>
              </div>
              <div className="alert-value">
                <div className="alert-price" style={{ color: isGood ? 'var(--green)' : 'var(--red)' }}>
                  {a.price ? fmt(a.price) : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ onStockSelect }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const { data: portfolio, loading: pLoad, refetch } = usePolling(portfolioAPI.stats, 30000, []);
  const { data: snapshots } = usePolling(portfolioAPI.snapshots, 300000, []);
  const { data: alertData  } = usePolling(() => alertsAPI.getAll(), 30000, []);

  const activeTrades = portfolio?.activeTrades || [];
  const symbols = activeTrades.map(t => t.symbol || `${t.name}.NS`).filter(Boolean);
  const { prices } = usePrices(symbols, 30000);

  const handleAddFromSearch = useCallback((stock) => {
    setPrefill({ symbol: stock.symbol, name: stock.symbol?.replace('.NS', ''), sector: stock.sector, entry: String(stock.price || ''), currentPrice: stock.price });
    setShowAdd(true);
  }, []);

  if (pLoad) return <div className="loading-center"><div className="spinner"/><span>Loading portfolio...</span></div>;

  const stats = portfolio || {};
  const pnlUp = (stats.pnl || 0) >= 0;
  const todayUp = (stats.todayPnl || 0) >= 0;

  return (
    <>
      {/* STAT CARDS */}
      <div className="stat-cards">
        <StatCard
          label="Portfolio Value"
          value={fmt(stats.current || 0)}
          sub={`Invested ${fmt(stats.invested || 0)}`}
          icon={IconTrendUp}
        />
        <StatCard
          label="Total P&L"
          value={`${pnlUp ? '+' : ''}${fmt(Math.round(stats.pnl || 0))}`}
          sub={`${pnlUp ? '+' : ''}${fmtN(stats.pnlPct || 0)}% overall`}
          color={pnlUp ? 'var(--green)' : 'var(--red)'}
          icon={pnlUp ? IconTrendUp : IconTrendDown}
        />
        <StatCard
          label="Today's P&L"
          value={`${todayUp ? '+' : ''}${fmt(Math.round(stats.todayPnl || 0))}`}
          sub={`${stats.activeTrades?.length || 0} active positions`}
          color={todayUp ? 'var(--green)' : 'var(--red)'}
          icon={todayUp ? IconTrendUp : IconTrendDown}
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate || 0}%`}
          sub={`${stats.wins || 0}W / ${stats.losses || 0}L · ${stats.closedTrades || 0} closed`}
          color="var(--accent)"
          icon={IconTrendUp}
        />
      </div>

      {/* MAIN GRID */}
      <div className="dash-grid">
        {/* LEFT */}
        <div className="dash-left">
          {/* Active Positions */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Active Positions</span>
              <div className="flex gap-8">
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fmt(stats.current || 0)} · {pnlUp ? '+' : ''}{fmt(Math.round(stats.pnl || 0))} ({pnlUp?'+':''}{fmtN(stats.pnlPct||0)}%)
                </span>
                <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>
                  <IconPlus style={{ width: 12, height: 12 }}/> Add
                </button>
              </div>
            </div>
            {(!activeTrades || activeTrades.length === 0) && (
              <div className="loading-center" style={{ padding: '24px' }}>
                <div style={{ fontSize: 12 }}>No active positions</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} style={{ marginTop: 8 }}>
                  <IconPlus style={{ width: 12, height: 12 }}/> Add First Trade
                </button>
              </div>
            )}
            {activeTrades.map(t => (
              <ActivePositionRow key={t._id} trade={t} prices={prices}/>
            ))}
          </div>

          {/* Mid row: Chart + Breakdown */}
          <div className="dash-mid">
            {/* Portfolio Value Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Total Value</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)', marginTop: 2 }}>
                    {fmt(stats.current || 0)}
                    <span style={{ fontSize: 12, color: pnlUp ? 'var(--green)' : 'var(--red)', marginLeft: 8, fontFamily: 'Inter' }}>
                      {pnlUp ? '+' : ''}{fmtN(stats.pnlPct || 0)}%
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <PortfolioChart snapshots={snapshots || []} currentValue={stats.current || 0}/>
              </div>
            </div>

            {/* Portfolio Breakdown */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Portfolio Breakdown</div>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
                  {fmt(stats.current || 0)}
                </span>
              </div>
              <div className="card-body">
                <PortfolioBreakdown sectorAllocation={stats.sectorAllocation || {}} total={stats.current || 0}/>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="dash-right">
          {/* Scanner results preview */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Strategy Scanner</span>
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/scanner')}>Run Scan</button>
            </div>
            <div style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
              Run the EMA breakout scanner to find high-conviction setups matching your strategy.
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/scanner')}>
                Open Scanner →
              </button>
            </div>
          </div>

          {/* Alerts */}
          <AlertPreview alerts={alertData || []}/>
        </div>
      </div>

      {/* Add Trade Modal */}
      {showAdd && (
        <AddTradeModal
          prefill={prefill}
          onClose={() => { setShowAdd(false); setPrefill(null); }}
          onSaved={() => { setShowAdd(false); setPrefill(null); refetch(); }}
        />
      )}
    </>
  );
}