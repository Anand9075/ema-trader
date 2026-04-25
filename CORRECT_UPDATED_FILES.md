# Correct Files For Your Project Structure

These are the files changed for the actual project at /Users/anand/trading/ema-terminal.

## src/App.js

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { usePolling } from './hooks/usePolling';
import { alertsAPI } from './api';
import Sidebar from './components/shared/Sidebar';
import TopBar from './components/shared/TopBar';
import Ticker from './components/shared/Ticker';
import Dashboard from './components/dashboard/Dashboard';
import Portfolio from './components/portfolio/Portfolio';
import Scanner from './components/scanner/Scanner';
import Alerts from './components/alerts/Alerts';
import History from './components/history/History';
import Calendar from './components/history/Calendar';
import Settings from './components/settings/Settings';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

function LoadingScreen() {
  return (
    <div className="loading-box" style={{ minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 34, height: 34 }} />
      <div style={{ marginTop: 12, color: 'var(--text2)', fontWeight: 700 }}>Loading EMA Terminal...</div>
    </div>
  );
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const { data: alerts = [] } = usePolling(() => alertsAPI.getAll(), 30000, []);

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const unread = Array.isArray(alerts) ? alerts.filter(a => !a.read).length : 0;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar alertCount={unread} />
        <Ticker />
        <main className="page-wrap">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/history" element={<History />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

```

## src/components/portfolio/AddTradeModal.js

```javascript
import React, { useState, useEffect } from "react";
import StockSearch from "./StockSearch";
import { pricesAPI, tradesAPI } from "../../api";
import { fmt, fmtN, pct } from "../../utils/helpers";

function Modal({ show = true, onClose, title, children, wide = false }) {
  if (!show) return null;
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className={`modal ${wide ? "modal-lg" : ""}`} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <div className="modal-ttl">{title}</div>
          <button className="modal-x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function FInput({ label, ...props }) {
  return (
    <div className="fg">
      {label && <label className="flabel">{label}</label>}
      <input className="finput" {...props} />
    </div>
  );
}

function FSelect({ label, value, onChange, options }) {
  return (
    <div className="fg">
      {label && <label className="flabel">{label}</label>}
      <select className="finput" value={value} onChange={onChange}>
        {options.map(option => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
      </select>
    </div>
  );
}

const BLANK = {
  symbol:"", name:"", sector:"", entry:"", sl:"", target:"",
  qty:"", status:"WAITING", entryType:"BREAKOUT", confidence:"MEDIUM",
  ema200:"", ema50:"", rsi:"",
};

/**
 * AddTradeModal — handles both Add and Edit modes.
 *
 * Features:
 *  - StockSearch autocomplete
 *  - Live price auto-fill when stock selected
 *  - Live R:R / Max Loss / Expected Return preview
 *  - Quantity auto-calc from capital allocation
 */
export default function AddTradeModal({ show = true, onClose, onSave, onSaved, editTrade=null, initialTrade=null, capital=100000 }) {
  const [form,      setForm]      = useState(BLANK);
  const [priceInfo, setPriceInfo] = useState(null);
  const [fetching,  setFetching]  = useState(false);
  const [error,     setError]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [lastPriceSymbol, setLastPriceSymbol] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (editTrade || initialTrade) {
      const source = editTrade || initialTrade;
      setForm({
        ...BLANK,
        ...source,
        entry:  String(source.entry  || ""),
        sl:     String(source.sl     || ""),
        target: String(source.target || ""),
        qty:    String(source.qty    || ""),
        ema200: String(source.ema200 || ""),
        ema50:  String(source.ema50  || ""),
        rsi:    String(source.rsi    || ""),
      });
      setPriceInfo(source.currentPrice || source.entry ? { price: source.currentPrice || Number(source.entry), symbol: source.symbol } : null);
      setError(null);
      setLastPriceSymbol(source.symbol || "");
    } else {
      setForm(BLANK);
      setPriceInfo(null);
      setError(null);
      setLastPriceSymbol("");
    }
  }, [editTrade, initialTrade, show]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // When stock selected from search
  const handleStockSelect = async (stock) => {
    setError(null);
    set("symbol",  stock.symbol);
    set("name",    stock.symbol.replace(".NS","").toUpperCase());
    set("sector",  stock.sector || "");
    setLastPriceSymbol(stock.symbol);

    if (stock.price && stock.price > 0) {
      setPriceInfo(stock);
      // Pre-fill entry with current price
      if (!form.entry) set("entry", String(stock.price));
    } else {
      // Fetch price if not bundled
      setFetching(true);
      try {
        const d = await pricesAPI.get([stock.symbol]);
        const q = d?.prices?.[stock.symbol];
        if (q?.price) {
          setPriceInfo(q);
          if (!form.entry) set("entry", String(q.price));
        }
      } catch (e) {
        setError("Could not fetch live price. You can enter the price manually or retry.");
      } finally {
        setFetching(false);
      }
    }
  };

  // Fetch price for manual symbol input
  const fetchPrice = async () => {
    const sym = form.symbol || (form.name ? `${form.name}.NS` : "");
    if (!sym) return;
    setLastPriceSymbol(sym);
    setFetching(true);
    setError(null);
    try {
      const d = await pricesAPI.get([sym]);
      const q = d?.prices?.[sym];
      if (q?.price) {
        setPriceInfo(q);
        if (!form.entry) set("entry", String(q.price));
      } else {
        setError(`No price found for ${sym}`);
      }
    } catch (e) {
      setError(e.message || "Price fetch failed. Please retry or enter price manually.");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!form.entry || !form.sl || !form.target) {
      setError("Entry, Stop Loss and Target are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        name:    (form.name || form.symbol || "").replace(".NS","").toUpperCase(),
        symbol:  form.symbol || `${form.name}.NS`,
        entry:   Number(form.entry),
        sl:      Number(form.sl),
        target:  Number(form.target),
        qty:     Number(form.qty) || Math.floor(capital / 3 / Number(form.entry || 1)),
        ema200:  Number(form.ema200) || 0,
        ema50:   Number(form.ema50)  || 0,
        rsi:     Number(form.rsi)    || 0,
        currentPrice: priceInfo?.price || Number(form.entry) || 0,
      };
      if (onSave) await onSave(payload, editTrade?._id);
      else if (editTrade?._id) await tradesAPI.update(editTrade._id, payload);
      else await tradesAPI.create(payload);
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e.message || "Position could not be saved. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  // Computed preview values
  const entry  = Number(form.entry)  || 0;
  const sl     = Number(form.sl)     || 0;
  const target = Number(form.target) || 0;
  const risk   = entry - sl;
  const rr     = risk > 0 ? ((target - entry) / risk).toFixed(1) : "—";
  const expRet = entry > 0 ? pct(target, entry) : "—";
  const maxLoss= entry > 0 ? pct(sl, entry) : "—";
  const autoQty= entry > 0 ? Math.floor(capital / 3 / entry) : 0;
  const alloc  = entry > 0 ? fmt(Math.round(capital / 3)) : "—";

  const isUp   = priceInfo && priceInfo.changePct >= 0;

  return (
    <Modal show={show} onClose={onClose} title={editTrade ? `EDIT — ${editTrade.name || "TRADE"}` : "ADD NEW POSITION"} wide>
      {/* Stock Search */}
      <div className="fg">
        <label className="flabel">Search Stock (NSE)</label>
        <StockSearch
          onSelect={handleStockSelect}
          placeholder="Type stock name or symbol — e.g. Reliance, INFY..."
          disabled={!!editTrade}
        />
      </div>

      {/* Live price info bar */}
      {(priceInfo || fetching) && (
        <div style={{
          background:"rgba(255,153,0,0.06)", border:"1px solid var(--border)",
          padding:"8px 12px", marginBottom:12, fontSize:11,
          display:"flex", gap:20, flexWrap:"wrap", alignItems:"center"
        }}>
          {fetching ? (
            <span style={{color:"var(--muted2)"}}>Fetching live price...</span>
          ) : priceInfo && (
            <>
              <span>
                <span style={{color:"var(--muted2)"}}>CMP: </span>
                <span className="fw7 col-green">{fmt(priceInfo.price)}</span>
              </span>
              {priceInfo.change !== undefined && (
                <span style={{color: isUp ? "var(--green)" : "var(--red)", fontWeight:600}}>
                  {isUp ? "Up" : "Down"} {Math.abs(fmtN(priceInfo.changePct))}%
                  ({isUp ? "+" : ""}₹{fmtN(priceInfo.change, 2)})
                </span>
              )}
              {priceInfo.high && <span style={{color:"var(--muted2)"}}>H:{fmt(priceInfo.high)} L:{fmt(priceInfo.low)}</span>}
              {priceInfo.volume > 0 && <span style={{color:"var(--muted2)"}}>Vol:{(priceInfo.volume/1e5).toFixed(1)}L</span>}
            </>
          )}
        </div>
      )}

      {/* Manual symbol + fetch */}
      {!editTrade && (
        <div style={{display:"flex", gap:8, marginBottom:12, alignItems:"flex-end"}}>
          <div style={{flex:1}}>
            <FInput label="Symbol (manual override)" value={form.symbol}
              onChange={e => set("symbol", e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE.NS" />
          </div>
          <button className="btn btn-blue btn-sm" style={{marginBottom:12}} onClick={fetchPrice} disabled={fetching}>
            {fetching ? "..." : "FETCH PRICE"}
          </button>
        </div>
      )}

      <div className="fgrid2">
        <FInput label="Display Name" value={form.name}
          onChange={e => set("name", e.target.value.toUpperCase())} placeholder="RELIANCE" />
        <FInput label="Sector" value={form.sector}
          onChange={e => set("sector", e.target.value)} placeholder="Energy" />
      </div>

      <div className="fgrid3">
        <FInput label="Entry Price (₹)" type="number" value={form.entry}
          onChange={e => set("entry", e.target.value)} placeholder="2850" />
        <FInput label="Stop Loss (₹)" type="number" value={form.sl}
          onChange={e => set("sl", e.target.value)} placeholder="2700" />
        <FInput label="Target Price (₹)" type="number" value={form.target}
          onChange={e => set("target", e.target.value)} placeholder="3150" />
      </div>

      <div className="fgrid3">
        <FInput label={`Qty (auto=${autoQty})`} type="number" value={form.qty}
          onChange={e => set("qty", e.target.value)} placeholder={String(autoQty)} />
        <FSelect label="Status" value={form.status} onChange={e => set("status", e.target.value)}
          options={["WAITING","ACTIVE","TARGET","SL","MANUAL_EXIT"]} />
        <FSelect label="Setup Type" value={form.entryType} onChange={e => set("entryType", e.target.value)}
          options={["BREAKOUT","EMA50_BOUNCE","EMA20_PULLBACK","RETEST","MONITOR"]} />
      </div>

      {/* Optional technicals */}
      <details style={{marginBottom:12}}>
        <summary style={{fontSize:10,color:"var(--muted2)",cursor:"pointer",padding:"4px 0",letterSpacing:"0.06em",textTransform:"uppercase"}}>
          ▸ Technical Details (optional)
        </summary>
        <div className="fgrid3" style={{marginTop:8}}>
          <FInput label="200 EMA (₹)" type="number" value={form.ema200}
            onChange={e => set("ema200", e.target.value)} placeholder="auto" />
          <FInput label="50 EMA (₹)" type="number" value={form.ema50}
            onChange={e => set("ema50", e.target.value)} placeholder="auto" />
          <FInput label="RSI (14)" type="number" value={form.rsi}
            onChange={e => set("rsi", e.target.value)} placeholder="auto" />
        </div>
        <FSelect label="Confidence" value={form.confidence} onChange={e => set("confidence", e.target.value)}
          options={["HIGH","MEDIUM","LOW"]} />
      </details>

      {/* Trade preview */}
      {entry > 0 && sl > 0 && target > 0 && (
        <div className="fprev">
          <span>R:R <span className="fw6 col-green">{rr}:1</span></span>
          <span>Expected <span className="fw6 col-green">+{expRet}%</span></span>
          <span>Max Loss <span className="fw6 col-red">{maxLoss}%</span></span>
          <span>Alloc/3 <span className="fw6 col-amber">{alloc}</span></span>
          {rr !== "—" && Number(rr) < 2 && (
          <span style={{color:"var(--red)"}}>R:R below 2:1. Consider adjusting.</span>
        )}
      </div>
      )}

      {error && (
        <div className="form-error">
          <div>
            <strong>Position Error</strong>
            <span>{error}</span>
          </div>
          {lastPriceSymbol && (
            <button className="btn btn-sm btn-red" onClick={fetchPrice} disabled={fetching}>
              RETRY
            </button>
          )}
        </div>
      )}

      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
        <button className="btn" onClick={onClose}>CANCEL</button>
        <button className="btn btn-green" onClick={handleSave}
          disabled={saving || !form.entry || !form.sl || !form.target}>
          {saving ? "SAVING..." : editTrade ? "UPDATE POSITION" : "ADD POSITION"}
        </button>
      </div>
    </Modal>
  );
}

```

## src/components/portfolio/StockSearch.js

```javascript
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { searchAPI, pricesAPI } from '../../api';

const SECTOR_COLORS = {
  Banking: '#3b82f6',
  IT: '#8b5cf6',
  Energy: '#f59e0b',
  Finance: '#06b6d4',
  FMCG: '#22c55e',
  Pharma: '#ec4899',
  Auto: '#f97316',
  Infra: '#84cc16',
  Power: '#eab308',
  Metals: '#94a3b8',
  Telecom: '#a78bfa',
  Chemicals: '#34d399',
  Other: '#64748b',
};

export default function StockSearch({
  onSelect,
  placeholder = 'Search NSE stocks...',
  disabled = false,
  style = {},
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const wrapRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const close = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const doSearch = useCallback(async value => {
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await searchAPI.query(q);
      setResults(data.results || []);
      setOpen(true);
    } catch {
      setResults([]);
      setError('Search unavailable. Type the symbol manually below.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = e => {
    const value = e.target.value;
    setQuery(value);
    setError('');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = async stock => {
    setQuery(`${stock.name || stock.symbol} (${stock.symbol})`);
    setOpen(false);
    setPriceLoading(true);
    try {
      const data = await pricesAPI.get([stock.symbol]);
      const quote = data?.prices?.[stock.symbol] || {};
      onSelect?.({ ...stock, ...quote });
    } catch {
      onSelect?.({ ...stock, price: 0 });
    } finally {
      setPriceLoading(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', ...style }}>
      <input
        className="finput"
        value={query}
        onChange={handleChange}
        onFocus={() => {
          if (results.length) setOpen(true);
          else if (query.trim().length >= 2) doSearch(query);
        }}
        placeholder={placeholder}
        disabled={disabled || priceLoading}
        style={{ paddingRight: 36 }}
      />

      <div style={{ position: 'absolute', right: 11, top: 10, color: 'var(--text3)', fontSize: 11 }}>
        {(loading || priceLoading) ? <span className="spinner spinner-sm" /> : '⌕'}
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 10, marginTop: 5 }}>{error}</div>}

      {open && (
        <div className="search-dd" style={{ top: 'calc(100% + 5px)', left: 0, right: 0 }}>
          {loading && <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text3)' }}>Searching...</div>}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text3)' }}>
              No stocks found for "{query}"
            </div>
          )}
          {results.map((stock, index) => {
            const color = SECTOR_COLORS[stock.sector] || SECTOR_COLORS.Other;
            return (
              <div
                key={`${stock.symbol}-${index}`}
                className="search-dd-item"
                onMouseDown={() => handleSelect(stock)}
              >
                <div>
                  <div className="s-sym">{String(stock.symbol || '').replace('.NS', '')}</div>
                  <div className="s-name">{stock.name || stock.symbol}</div>
                </div>
                <span className="s-tag" style={{ color, borderColor: `${color}44`, background: `${color}16` }}>
                  {stock.sector || 'NSE'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

```

