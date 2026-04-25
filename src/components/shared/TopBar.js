import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchAPI, pricesAPI } from '../../api';
import { IconSearch } from './Icons';
import { fmt, isMarketOpen } from '../../utils/helpers';

export default function TopBar({ onStockSelect, alertCount = 0 }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [sLoad,   setSLoad]   = useState(false);
  const [showDD,  setShowDD]  = useState(false);
  const wrapRef = useRef(null);
  const debRef  = useRef(null);
  const mktOpen = isMarketOpen();
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  useEffect(() => {
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDD(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSearch = val => {
    setQuery(val);
    if (debRef.current) clearTimeout(debRef.current);
    if (val.length < 2) { setResults([]); setShowDD(false); return; }
    debRef.current = setTimeout(async () => {
      setSLoad(true);
      try { const d = await searchAPI.query(val); setResults(d.results || []); setShowDD(true); }
      catch { setResults([]); }
      finally { setSLoad(false); }
    }, 350);
  };

  const handleSelect = async stock => {
    setQuery(''); setShowDD(false); setResults([]);
    try {
      const p = await pricesAPI.get([stock.symbol]);
      onStockSelect?.({ ...stock, ...p?.prices?.[stock.symbol] });
    } catch { onStockSelect?.(stock); }
  };

  return (
    <div className="topbar">
      {/* Brand */}
      <div className="tb-brand">
        <div className="tb-brand-icon">EMA</div>
        <div>
          <div className="tb-brand-name">EMA Terminal</div>
          <div className="tb-brand-sub">Trading Terminal</div>
        </div>
      </div>

      {/* Search */}
      <div className="tb-search" ref={wrapRef} style={{ position:'relative' }}>
        <IconSearch className="tb-search-icon" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--text3)' }}/>
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => results.length && setShowDD(true)}
          placeholder="Search NSE stocks..."
          style={{ paddingLeft:34 }}
        />
        {showDD && (
          <div className="search-dd">
            {sLoad && <div style={{ padding:'10px 14px', fontSize:11, color:'var(--text3)' }}>Searching...</div>}
            {results.map(r => (
              <div key={r.symbol} className="search-dd-item" onMouseDown={() => handleSelect(r)}>
                <div><div className="s-sym">{r.symbol.replace('.NS','')}</div><div className="s-name">{r.name}</div></div>
                <span className="s-tag">{r.sector || 'NSE'}</span>
              </div>
            ))}
            {!sLoad && results.length === 0 && query.length >= 2 && (
              <div style={{ padding:'10px 14px', fontSize:11, color:'var(--text3)' }}>No results for "{query}"</div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="tb-nav">
        {[['/', 'Dashboard'],['/portfolio','Portfolio'],['/scanner','Scanner'],
          ['/alerts', alertCount > 0 ? `Alerts (${alertCount})` : 'Alerts']
        ].map(([p,l]) => (
          <button key={p} className="tb-nav-btn" onClick={() => navigate(p)}>{l}</button>
        ))}
      </nav>

      {/* Right */}
      <div className="tb-right">
        <div className="live-pill">
          <span className="live-dot"/>
          {mktOpen ? 'Live' : 'Closed'}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--white)' }}>{user?.name?.split(' ')[0]}</div>
          <div style={{ fontSize:10, color:'var(--text3)' }}>{fmt(user?.capital || 100000)}</div>
        </div>
        <div className="avatar" onClick={() => navigate('/settings')} title={user?.name}>{initials}</div>
      </div>
    </div>
  );
}
