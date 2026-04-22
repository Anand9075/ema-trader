import React, { useState } from 'react';
import { tradesAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { fmt, fmtN, pct } from '../../utils/helpers';
import { IconX } from '../shared/Icons';

export default function CloseTradeModal({ trade, prices = {}, onClose, onSaved }) {
  const { addToast } = useToast();
  const livePrice = prices[trade.symbol]?.price || trade.currentPrice || trade.entry;
  const [exitPrice, setExitPrice] = useState(String(livePrice));
  const [exitDate,  setExitDate]  = useState(new Date().toISOString().slice(0, 10));
  const [result,    setResult]    = useState('MANUAL_EXIT');
  const [saving,    setSaving]    = useState(false);

  const ep     = Number(exitPrice);
  const pl     = ep > 0 ? (ep - trade.entry) * (trade.qty || 1) : 0;
  const plPct  = ep > 0 ? Number(pct(ep, trade.entry)) : 0;
  const isWin  = pl >= 0;

  const handleClose = async () => {
    if (!exitPrice) return;
    setSaving(true);
    try {
      await tradesAPI.close(trade._id, { exitPrice: ep, exitDate, result });
      addToast(`Trade closed: ${isWin ? '+' : ''}${fmt(Math.round(pl))}`, isWin ? 'success' : 'error');
      onSaved();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Close Trade — {trade.name}</span>
          <button className="modal-close" onClick={onClose}><IconX style={{ width: 14, height: 14 }}/></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Entry: <strong style={{ color: 'var(--text-primary)' }}>{fmt(trade.entry)}</strong></span>
              <span>SL: <strong style={{ color: 'var(--red)' }}>{fmt(trade.sl)}</strong></span>
              <span>Target: <strong style={{ color: 'var(--green)' }}>{fmt(trade.target)}</strong></span>
              <span>Qty: <strong style={{ color: 'var(--text-primary)' }}>{trade.qty}</strong></span>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Exit Price (₹)</label>
              <input className="form-input" type="number" value={exitPrice} onChange={e => setExitPrice(e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Exit Date</label>
              <input className="form-input" type="date" value={exitDate} onChange={e => setExitDate(e.target.value)}/>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reason</label>
            <select className="form-select form-input" value={result} onChange={e => setResult(e.target.value)}>
              <option value="TARGET">Target Hit</option>
              <option value="SL">Stop Loss Hit</option>
              <option value="MANUAL_EXIT">Manual Exit</option>
            </select>
          </div>

          {ep > 0 && (
            <div style={{ background: isWin ? 'var(--green-dim)' : 'var(--red-dim)', border: `1px solid ${isWin?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>P&L</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: isWin ? 'var(--green)' : 'var(--red)' }}>
                  {isWin ? '+' : ''}{fmt(Math.round(pl))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Return</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: isWin ? 'var(--green)' : 'var(--red)' }}>
                  {isWin ? '+' : ''}{fmtN(plPct)}%
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className={`btn ${isWin ? 'btn-green' : 'btn-danger'}`} onClick={handleClose} disabled={saving || !exitPrice}>
              {saving ? <span className="spinner spinner-sm"/> : 'Confirm Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}