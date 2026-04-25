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
