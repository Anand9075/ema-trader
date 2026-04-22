import React, { useState, useEffect } from 'react';
import { marketAPI, pricesAPI } from '../../api';

export default function Ticker({ extraSymbols = [] }) {
  const [indices, setIndices] = useState({});
  const [extras,  setExtras]  = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const r = await marketAPI.get();
        if (r?.indices) setIndices(r.indices);
      } catch {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!extraSymbols.length) return;
    const load = async () => {
      try {
        const r = await pricesAPI.getMany(extraSymbols);
        if (r?.prices) setExtras(r.prices);
      } catch {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [JSON.stringify(extraSymbols)]); // eslint-disable-line

  const items = [
    { symbol: '^NSEI',    label: 'NIFTY'     },
    { symbol: '^NSEBANK', label: 'BANKNIFTY' },
    { symbol: '^INDIAVIX',label: 'VIX'       },
    ...extraSymbols.map(s => ({ symbol: s, label: s.replace('.NS', '') })),
  ];

  const allPrices = { ...indices, ...extras };

  const content = items.map(({ symbol, label }) => {
    const q = allPrices[symbol];
    if (!q?.price) return null;
    const up  = (q.changePct || 0) >= 0;
    const pStr = q.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
      <span key={symbol} className="ticker-item">
        <span className="ticker-label">{label}</span>
        <span className="ticker-price">₹{pStr}</span>
        <span className={`ticker-change ${up ? 'up' : 'down'}`}>
          {up ? '▲' : '▼'} {Math.abs(q.changePct || 0).toFixed(2)}%
        </span>
      </span>
    );
  }).filter(Boolean);

  if (!content.length) {
    return (
      <div className="ticker-bar" style={{ display: 'flex', alignItems: 'center', paddingLeft: 40 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⟳ Fetching market data...</span>
      </div>
    );
  }

  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {content}{content}{content}
      </div>
    </div>
  );
}