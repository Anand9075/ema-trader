import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchAPI, pricesAPI } from '../../api';
import { isMarketOpen, fmt } from '../../utils/helpers';

function SearchDrop({ results, loading, onSelect }) {
  if (!loading && results.length === 0) return null;
  return (
    <div className="search-dropdown">
      {loading && (
        <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>Searching...</div>
      )}
      {results.map(r => (
        <div key={r.symbol} className="search-item" onMouseDown={() => onSelect(r)}>
          <div>
            <div className="search-ticker">{r.symbol.replace('.NS', '')}</div>
            <div className="search-name">{r.name}</div>
          </div>
          <span className="search-badge" style={{ background: 'var(--bg-card2)', color: 'var(--text-muted)' }}>
            {r.sector || 'NSE'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TopBar({ onStockSelect, alertCount = 0 }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query,    setQuery]   = useState('');
  const [results,  setResults] = useState([]);
  const [loading,  setLoading] = useState(false);
  const [showDrop, setShowDrop]= useState(false);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);
  const marketOpen  = isMarketOpen();

  // Close dropdown when clicking outside
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setResults([]); setShowDrop(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await searchAPI.query(val);
        setResults(d.results || []);
        setShowDrop(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
  };

  const handleSelect = async (stock) => {
    setQuery('');
    setShowDrop(false);
    setResults([]);
    let enriched = stock;
    try {
      const pData = await pricesAPI.getOne(stock.symbol);
      if (pData?.price) enriched = { ...stock, ...pData };
    } catch {}
    if (onStockSelect) onStockSelect(enriched);
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="topbar">
      {/* Logo */}
      <div className="topbar-logo">
        <div className="topbar-logo-mark">📈</div>
        <div>
          <div className="topbar-title">EMA</div>
          <div className="topbar-subtitle">Trading Terminal</div>
        </div>
      </div>

      {/* Search */}
      <div className="topbar-search" style={{ position: 'relative' }} ref={wrapRef}>
        <svg className="search-icon" style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',width:14,height:14,stroke:'var(--text-muted)',fill:'none',strokeWidth:1.8 }} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
        </svg>
        <input
          className="form-input"
          style={{ paddingLeft: 34 }}
          value={query}
          onChange={handleInput}
          onFocus={() => { if (results.length) setShowDrop(true); }}
          placeholder="Search NSE stocks..."
        />
        <SearchDrop results={results} loading={loading} onSelect={handleSelect}/>
      </div>

      {/* Nav */}
      <nav className="topbar-nav">
        {[['/', 'Dashboard'], ['/portfolio', 'Portfolio'], ['/scanner', 'Scanner'],
          ['/history', 'History'], ['/alerts', 'Alerts']].map(([path, label]) => (
          <button key={path} className="topbar-nav-btn" onClick={() => navigate(path)}>
            {label === 'Alerts' && alertCount > 0 && (
              <span style={{ width:6,height:6,borderRadius:'50%',background:'var(--red)',display:'inline-block' }}/>
            )}
            {label}
          </button>
        ))}
      </nav>

      {/* Right side */}
      <div className="topbar-right">
        <div className={`live-badge ${marketOpen ? '' : 'closed'}`}
          style={!marketOpen ? { background:'rgba(148,163,184,0.1)',borderColor:'rgba(148,163,184,0.2)',color:'var(--text-muted)' } : {}}>
          <span className="live-dot" style={!marketOpen ? { background:'var(--text-muted)',animation:'none' } : {}}/>
          {marketOpen ? 'Live' : 'Closed'}
        </div>
        <div onClick={() => navigate('/settings')} className="user-avatar" title={user?.name} style={{ cursor:'pointer' }}>
          {initials}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:12,fontWeight:600,color:'var(--text-primary)' }}>
            {user?.name?.split(' ')[0] || 'Trader'}
          </div>
          <div style={{ fontSize:10,color:'var(--text-muted)' }}>
            {fmt(user?.capital || 100000)}
          </div>
        </div>
      </div>
    </div>
  );
}