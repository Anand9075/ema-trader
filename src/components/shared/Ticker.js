import React, { useState, useEffect } from 'react';
import { marketAPI } from '../../api';

export default function Ticker({ extraSymbols = [] }) {
  const [data, setData] = useState({});
  useEffect(() => {
    const load = async () => { try { const r = await marketAPI.get(); if (r?.indices) setData(r.indices); } catch {} };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const base = [{ symbol:'^NSEI',label:'NIFTY'},{ symbol:'^NSEBANK',label:'BANKNIFTY'}];
  const items = [...base, ...extraSymbols.map(s => ({ symbol:s, label:s.replace('.NS','') }))].map(({ symbol, label }) => {
    const q = data[symbol];
    return { label, price: q?.price ? q.price.toLocaleString('en-IN',{minimumFractionDigits:2}) : '—', changePct: q?.changePct || 0 };
  });

  const content = items.map((item, i) => (
    <span key={i} className="ticker-item">
      <span className="t-label">{item.label}</span>
      <span className="t-price">₹{item.price}</span>
      <span className={item.changePct >= 0 ? 't-up' : 't-down'}>
        {item.changePct >= 0 ? '▲' : '▼'}{Math.abs(item.changePct).toFixed(2)}%
      </span>
    </span>
  ));

  return (
    <div className="ticker-bar">
      <div className="ticker-track">{content}{content}</div>
    </div>
  );
}