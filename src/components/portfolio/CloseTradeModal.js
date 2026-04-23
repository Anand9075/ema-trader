import React, { useState } from 'react';
import { tradesAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { fmt, fmtN, pct } from '../../utils/helpers';
import { IconX } from '../shared/Icons';

export default function CloseTradeModal({ trade, prices = {}, onClose, onSaved }) {
  const { addToast } = useToast();
  const lp = prices[trade.symbol]?.price || trade.currentPrice || trade.entry;
  const [exitPrice, setExitPrice] = useState(String(lp));
  const [exitDate,  setExitDate]  = useState(new Date().toISOString().slice(0, 10));
  const [result,    setResult]    = useState('MANUAL_EXIT');
  const [saving,    setSaving]    = useState(false);

  const ep   = Number(exitPrice);
  const pl   = ep > 0 ? (ep - trade.entry) * (trade.qty || 1) : 0;
  const plPct= ep > 0 ? Number(pct(ep, trade.entry)) : 0;
  const isWin= pl >= 0;

  const handleClose = async () => {
    if (!exitPrice || ep <= 0) return;
    setSaving(true);
    try {
      await tradesAPI.close(trade._id, { exitPrice: ep, exitDate, result });
      addToast(`Trade closed: ${isWin ? '+' : ''}${fmt(Math.round(pl))}`, isWin ? 'success' : 'error');
      onSaved();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-hdr">
          <span className="modal-ttl">Close Trade — {trade.name}</span>
          <button className="modal-x" onClick={onClose}><IconX style={{ width:13, height:13 }}/></button>
        </div>
        <div className="modal-body">
          {/* Trade summary */}
          <div style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 13px', marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)' }}>
              <span>Entry: <strong style={{ color:'var(--text)' }}>{fmt(trade.entry)}</strong></span>
              <span>SL: <strong style={{ color:'var(--red)' }}>{fmt(trade.sl)}</strong></span>
              <span>Target: <strong style={{ color:'var(--green)' }}>{fmt(trade.target)}</strong></span>
              <span>Qty: <strong style={{ color:'var(--text)' }}>{trade.qty}</strong></span>
            </div>
          </div>

          <div className="fgrid2">
            <div className="fg"><label className="flabel">Exit Price (₹)</label><input className="finput" type="number" value={exitPrice} onChange={e => setExitPrice(e.target.value)} placeholder="Exit price" autoFocus/></div>
            <div className="fg"><label className="flabel">Exit Date</label><input className="finput" type="date" value={exitDate} onChange={e => setExitDate(e.target.value)}/></div>
          </div>

          <div className="fg">
            <label className="flabel">Exit Reason</label>
            <select className="finput fselect" value={result} onChange={e => setResult(e.target.value)}>
              <option value="TARGET">Target Hit</option>
              <option value="SL">Stop Loss Hit</option>
              <option value="MANUAL_EXIT">Manual Exit</option>
            </select>
          </div>

          {/* P&L Preview */}
          {ep > 0 && (
            <div style={{ background: isWin ? 'var(--green-bg)' : 'var(--red-bg)', border:`1px solid ${isWin?'rgba(34,197,94,0.25)':'rgba(239,68,68,0.25)'}`, borderRadius:8, padding:'14px 16px', marginBottom:14, display:'flex', gap:28 }}>
              <div>
                <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3 }}>P&L</div>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono', color:isWin?'var(--green)':'var(--red)' }}>
                  {isWin ? '+' : ''}{fmt(Math.round(pl))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3 }}>Return</div>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:'JetBrains Mono', color:isWin?'var(--green)':'var(--red)' }}>
                  {isWin ? '+' : ''}{fmtN(plPct)}%
                </div>
              </div>
            </div>
          )}

          <div className="faction">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className={`btn ${isWin ? 'btn-success' : 'btn-danger'}`} onClick={handleClose} disabled={saving || !exitPrice || ep <= 0}>
              {saving ? <span className="spinner spinner-sm"/> : 'Confirm Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}