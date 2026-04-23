import React, { useState, useEffect, useRef } from 'react';
import { tradesAPI, searchAPI, pricesAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { fmt, fmtN, pct } from '../../utils/helpers';
import { IconX, IconSearch } from '../shared/Icons';

const BLANK = { symbol:'', name:'', sector:'Other', entry:'', sl:'', target:'', qty:'1', notes:'', status:'WAITING', entryType:'BREAKOUT', confidence:'MEDIUM' };

export default function AddTradeModal({ onClose, onSaved, editTrade = null, prefill = null }) {
  const { addToast } = useToast();
  const [form,    setForm]    = useState({ ...BLANK, ...prefill });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [sLoad,   setSLoad]   = useState(false);
  const [showDD,  setShowDD]  = useState(false);
  const [livePrice, setLive]  = useState(null);
  const [priceLoad, setPLoad] = useState(false);
  const debRef  = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (editTrade) {
      setForm({ ...BLANK, ...editTrade, entry: String(editTrade.entry||''), sl: String(editTrade.sl||''), target: String(editTrade.target||''), qty: String(editTrade.qty||1) });
      if (editTrade.currentPrice) setLive(editTrade.currentPrice);
    } else if (prefill) {
      setForm(f => ({ ...f, ...prefill, entry: String(prefill.entry||''), sl: String(prefill.sl||''), target: String(prefill.target||'') }));
      if (prefill.price) setLive(prefill.price);
    }
  }, [editTrade, prefill]);

  useEffect(() => {
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDD(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

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

  const selectStock = async stock => {
    setQuery(''); setShowDD(false); setResults([]);
    setForm(f => ({ ...f, symbol: stock.symbol, name: stock.symbol.replace('.NS','').toUpperCase(), sector: stock.sector || 'Other' }));
    setPLoad(true);
    try {
      const p = await pricesAPI.get([stock.symbol]);
      const q = p?.prices?.[stock.symbol];
      if (q?.price) {
        setLive(q.price);
        setForm(f => ({ ...f, entry: String(q.price) }));
      }
    } catch {}
    finally { setPLoad(false); }
  };

  const fetchPrice = async () => {
    const sym = form.symbol || (form.name ? `${form.name}.NS` : '');
    if (!sym) return;
    setPLoad(true);
    try {
      const p = await pricesAPI.get([sym]);
      const q = p?.prices?.[sym];
      if (q?.price) { setLive(q.price); if (!form.entry) setForm(f => ({ ...f, entry: String(q.price) })); }
      else addToast(`No price found for ${sym}`, 'warning');
    } catch (e) { addToast(e.message, 'error'); }
    finally { setPLoad(false); }
  };

  const handleSave = async () => {
    setError('');
    if (!form.name && !form.symbol) { setError('Select a stock from the search'); return; }
    if (!form.entry) { setError('Entry price is required'); return; }
    if (!form.sl)    { setError('Stop loss is required');   return; }
    if (!form.target){ setError('Target is required');      return; }
    if (Number(form.sl) >= Number(form.entry)) { setError('Stop loss must be below entry price'); return; }
    if (Number(form.target) <= Number(form.entry)) { setError('Target must be above entry price'); return; }
    setSaving(true);
    try {
      const payload = { ...form, entry: Number(form.entry), sl: Number(form.sl), target: Number(form.target), qty: Number(form.qty) || 1 };
      if (editTrade) await tradesAPI.update(editTrade._id, payload);
      else           await tradesAPI.create(payload);
      addToast(editTrade ? 'Trade updated' : 'Trade added!', 'success');
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const entry = Number(form.entry), sl = Number(form.sl), target = Number(form.target);
  const risk  = entry - sl;
  const rr    = risk > 0 ? ((target - entry) / risk).toFixed(1) : '—';
  const expRet= entry > 0 ? pct(target, entry) : '—';
  const maxLoss=entry > 0 ? pct(sl, entry) : '—';

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-hdr">
          <span className="modal-ttl">{editTrade ? `Edit — ${editTrade.name}` : 'Add Position'}</span>
          <button className="modal-x" onClick={onClose}><IconX style={{ width:13,height:13 }}/></button>
        </div>
        <div className="modal-body">
          {error && <div className="auth-err" style={{ marginBottom:14 }}>{error}</div>}

          {/* Stock Search */}
          {!editTrade && (
            <div className="fg" ref={wrapRef} style={{ position:'relative' }}>
              <label className="flabel">Search NSE Stock</label>
              <div style={{ position:'relative' }}>
                <IconSearch style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', width:13, height:13, color:'var(--muted)' }}/>
                <input className="finput" value={query} onChange={e => handleSearch(e.target.value)}
                  onFocus={() => results.length && setShowDD(true)}
                  placeholder="Type symbol or company name..." style={{ paddingLeft:32 }}/>
              </div>
              {showDD && (
                <div className="search-dd">
                  {sLoad && <div style={{ padding:'10px 13px', fontSize:11, color:'var(--muted)' }}>Searching...</div>}
                  {results.map(r => (
                    <div key={r.symbol} className="search-dd-item" onMouseDown={() => selectStock(r)}>
                      <div><div className="s-sym">{r.symbol.replace('.NS','')}</div><div className="s-name">{r.name}</div></div>
                      <span className="s-tag">{r.sector || 'NSE'}</span>
                    </div>
                  ))}
                  {!sLoad && results.length === 0 && <div style={{ padding:'10px 13px', fontSize:11, color:'var(--muted)' }}>No results</div>}
                </div>
              )}
            </div>
          )}

          {/* Live Price Bar */}
          {(livePrice || priceLoad) && (
            <div style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 13px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:13, fontFamily:'JetBrains Mono' }}>{form.name || form.symbol?.replace('.NS','')}</div>
                <div style={{ fontSize:10, color:'var(--muted)' }}>{form.sector} · {form.symbol}</div>
              </div>
              {priceLoad
                ? <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--muted)' }}><div className="spinner spinner-sm"/> Fetching price...</div>
                : <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:16, fontWeight:700, fontFamily:'JetBrains Mono', color:'var(--accent)' }}>{fmt(livePrice)}</div>
                    <div style={{ fontSize:9, color:'var(--muted)' }}>CURRENT MARKET PRICE</div>
                  </div>
              }
            </div>
          )}

          {/* Manual symbol row (when not using search) */}
          {!editTrade && !form.symbol && (
            <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'flex-end' }}>
              <div style={{ flex:1 }}>
                <label className="flabel">Manual Symbol</label>
                <input className="finput" value={form.symbol} onChange={set('symbol')} placeholder="e.g. RELIANCE.NS" style={{ marginBottom:0 }}/>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom:0, height:36 }} onClick={fetchPrice} disabled={priceLoad}>
                {priceLoad ? <span className="spinner spinner-sm"/> : 'Fetch Price'}
              </button>
            </div>
          )}

          <div className="fgrid2">
            <div className="fg"><label className="flabel">Display Name</label><input className="finput" value={form.name} onChange={set('name')} placeholder="RELIANCE"/></div>
            <div className="fg"><label className="flabel">Sector</label><input className="finput" value={form.sector} onChange={set('sector')} placeholder="Energy"/></div>
          </div>

          <div className="fgrid3">
            <div className="fg"><label className="flabel">Entry Price (₹)</label><input className="finput" type="number" value={form.entry} onChange={set('entry')} placeholder="2850"/></div>
            <div className="fg"><label className="flabel">Stop Loss (₹)</label><input className="finput" type="number" value={form.sl} onChange={set('sl')} placeholder="2700"/></div>
            <div className="fg"><label className="flabel">Target (₹)</label><input className="finput" type="number" value={form.target} onChange={set('target')} placeholder="3150"/></div>
          </div>

          <div className="fgrid3">
            <div className="fg"><label className="flabel">Quantity</label><input className="finput" type="number" value={form.qty} onChange={set('qty')} placeholder="1" min="1"/></div>
            <div className="fg">
              <label className="flabel">Status</label>
              <select className="finput fselect" value={form.status} onChange={set('status')}>
                <option value="WAITING">Waiting</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
            <div className="fg">
              <label className="flabel">Setup Type</label>
              <select className="finput fselect" value={form.entryType} onChange={set('entryType')}>
                <option value="BREAKOUT">Breakout</option>
                <option value="EMA50_BOUNCE">EMA 50 Bounce</option>
                <option value="EMA20_PULLBACK">EMA 20 Pullback</option>
                <option value="BB_BREAKOUT">BB Breakout</option>
                <option value="RETEST">Retest</option>
                <option value="MONITOR">Monitor</option>
              </select>
            </div>
          </div>

          {/* R:R Preview */}
          {entry > 0 && sl > 0 && target > 0 && (
            <div style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 13px', marginBottom:14, display:'flex', gap:24 }}>
              <div><div style={{ fontSize:10, color:'var(--muted)', marginBottom:2 }}>R:R Ratio</div><div style={{ fontWeight:700, fontFamily:'JetBrains Mono', color:Number(rr)>=2?'var(--green)':'var(--red)' }}>{rr}:1</div></div>
              <div><div style={{ fontSize:10, color:'var(--muted)', marginBottom:2 }}>Expected</div><div style={{ fontWeight:700, fontFamily:'JetBrains Mono', color:'var(--green)' }}>+{expRet}%</div></div>
              <div><div style={{ fontSize:10, color:'var(--muted)', marginBottom:2 }}>Max Loss</div><div style={{ fontWeight:700, fontFamily:'JetBrains Mono', color:'var(--red)' }}>{maxLoss}%</div></div>
              <div><div style={{ fontSize:10, color:'var(--muted)', marginBottom:2 }}>Capital</div><div style={{ fontWeight:700, fontFamily:'JetBrains Mono' }}>{fmt(Math.round(entry * (Number(form.qty)||1)))}</div></div>
              {Number(rr) < 2 && entry > 0 && <div style={{ fontSize:10, color:'var(--red)', alignSelf:'center' }}>⚠ R:R below 2:1</div>}
            </div>
          )}

          <div className="fg"><label className="flabel">Notes (optional)</label><input className="finput" value={form.notes} onChange={set('notes')} placeholder="Setup reason, catalyst, key levels..."/></div>

          <div className="faction">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner spinner-sm"/> : editTrade ? 'Update Trade' : 'Add Position'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}