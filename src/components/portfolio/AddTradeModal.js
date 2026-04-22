import React, { useState, useEffect, useRef } from 'react';
import { tradesAPI } from '../../api';
import { pricesAPI, searchAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { fmt, fmtN, pct } from '../../utils/helpers';
import { IconX, IconSearch } from '../shared/Icons';

const BLANK = { symbol: '', name: '', sector: 'Other', entry: '', sl: '', target: '', qty: '1', notes: '', status: 'WAITING' };

export default function AddTradeModal({ onClose, onSaved, editTrade = null, prefill = null }) {
  const { addToast } = useToast();
  const [form,     setForm]    = useState({ ...BLANK, ...prefill });
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState('');
  const [searchQ,  setSearchQ] = useState('');
  const [results,  setResults] = useState([]);
  const [srchLoad, setSrchLoad]= useState(false);
  const [showDrop, setShowDrop]= useState(false);
  const [livePrice,setLivePrice]= useState(null);
  const debounce = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => {
    if (editTrade) setForm({ ...BLANK, ...editTrade, entry: String(editTrade.entry), sl: String(editTrade.sl), target: String(editTrade.target), qty: String(editTrade.qty) });
    else if (prefill) { setForm(f => ({ ...f, ...prefill, entry: String(prefill.entry || ''), currentPrice: prefill.currentPrice })); if (prefill.price) setLivePrice(prefill.price); }
  }, [editTrade, prefill]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSearch = (val) => {
    setSearchQ(val);
    if (debounce.current) clearTimeout(debounce.current);
    if (val.length < 2) { setResults([]); setShowDrop(false); return; }
    debounce.current = setTimeout(async () => {
      setSrchLoad(true);
      try { const d = await searchAPI.query(val); setResults(d.results || []); setShowDrop(true); }
      catch { setResults([]); }
      finally { setSrchLoad(false); }
    }, 350);
  };

  const selectStock = async (stock) => {
    setSearchQ('');
    setShowDrop(false);
    setResults([]);
    setForm(f => ({ ...f, symbol: stock.symbol, name: stock.symbol.replace('.NS', ''), sector: stock.sector || 'Other' }));
    try {
      const pData = await pricesAPI.get([stock.symbol]);
      const q = pData?.prices?.[stock.symbol];
      if (q?.price) {
        setLivePrice(q.price);
        setForm(f => ({ ...f, entry: String(q.price) }));
      }
    } catch {}
  };

  const handleSave = async () => {
    setError('');
    const { entry, sl, target, qty, name } = form;
    if (!name) { setError('Select a stock'); return; }
    if (!entry || !sl || !target) { setError('Entry, stop loss and target are required'); return; }
    if (Number(sl) >= Number(entry)) { setError('Stop loss must be below entry price'); return; }
    if (Number(target) <= Number(entry)) { setError('Target must be above entry price'); return; }
    setSaving(true);
    try {
      const payload = { ...form, entry: Number(entry), sl: Number(sl), target: Number(target), qty: Number(qty) || 1 };
      if (editTrade) await tradesAPI.update(editTrade._id, payload);
      else           await tradesAPI.create(payload);
      addToast(editTrade ? 'Trade updated' : 'Trade added!', 'success');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const entry = Number(form.entry), sl = Number(form.sl), target = Number(form.target);
  const risk   = entry - sl;
  const rr     = risk > 0 ? ((target - entry) / risk).toFixed(1) : '—';
  const expRet = entry > 0 ? pct(target, entry) : '—';
  const maxLoss= entry > 0 ? pct(sl, entry) : '—';

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">{editTrade ? 'Edit Trade' : 'Add Position'}</span>
          <button className="modal-close" onClick={onClose}><IconX style={{ width: 14, height: 14 }}/></button>
        </div>
        <div className="modal-body">
          {error && <div className="auth-error" style={{ marginBottom: 14 }}>{error}</div>}

          {/* Stock search */}
          {!editTrade && (
            <div className="form-group" ref={wrapRef} style={{ position: 'relative' }}>
              <label className="form-label">Search Stock</label>
              <div style={{ position: 'relative' }}>
                <IconSearch style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }}/>
                <input className="form-input" value={searchQ} onChange={e => handleSearch(e.target.value)}
                  placeholder="Type symbol or name..." style={{ paddingLeft: 34 }}/>
              </div>
              {showDrop && (
                <div className="search-dropdown">
                  {srchLoad && <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-muted)' }}>Searching...</div>}
                  {results.map(r => (
                    <div key={r.symbol} className="search-item" onMouseDown={() => selectStock(r)}>
                      <div>
                        <div className="search-ticker">{r.symbol.replace('.NS', '')}</div>
                        <div className="search-name">{r.name}</div>
                      </div>
                      <span className="search-badge" style={{ background: 'var(--bg-card2)', color: 'var(--text-muted)' }}>{r.sector || 'NSE'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected stock info */}
          {form.name && livePrice && (
            <div style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'JetBrains Mono' }}>{form.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{form.sector} · {form.symbol}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>{fmt(livePrice)}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>CMP</div>
              </div>
            </div>
          )}

          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Entry Price (₹)</label>
              <input className="form-input" type="number" value={form.entry} onChange={set('entry')} placeholder="0.00"/>
            </div>
            <div className="form-group">
              <label className="form-label">Stop Loss (₹)</label>
              <input className="form-input" type="number" value={form.sl} onChange={set('sl')} placeholder="0.00"/>
            </div>
            <div className="form-group">
              <label className="form-label">Target (₹)</label>
              <input className="form-input" type="number" value={form.target} onChange={set('target')} placeholder="0.00"/>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input className="form-input" type="number" value={form.qty} onChange={set('qty')} placeholder="1" min="1"/>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select form-input" value={form.status} onChange={set('status')}>
                <option value="WAITING">Waiting</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          {entry > 0 && sl > 0 && target > 0 && (
            <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>R:R Ratio</div>
                <div style={{ fontWeight: 700, color: Number(rr) >= 2 ? 'var(--green)' : 'var(--red)', fontFamily: 'JetBrains Mono' }}>{rr}:1</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Expected</div>
                <div style={{ fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono' }}>+{expRet}%</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Max Loss</div>
                <div style={{ fontWeight: 700, color: 'var(--red)', fontFamily: 'JetBrains Mono' }}>{maxLoss}%</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Capital</div>
                <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{fmt(Math.round(entry * (Number(form.qty) || 1)))}</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" value={form.notes} onChange={set('notes')} placeholder="Setup reason, catalyst..."/>
          </div>

          <div className="form-actions">
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