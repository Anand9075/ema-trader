import React, { useState } from 'react';
import { alertsAPI } from '../../api';
import { usePolling } from '../../hooks/usePolling';
import { useToast } from '../../context/ToastContext';
import { fmt } from '../../utils/helpers';
import { IconTrash, IconRefresh } from '../shared/Icons';

const TYPE_META = {
  BUY:       { label: 'Buy Signal',   color: 'var(--blue)',   bg: 'var(--blue-dim)',  icon: '▲' },
  TARGET:    { label: 'Target Hit',   color: 'var(--green)',  bg: 'var(--green-dim)', icon: '★' },
  SL_HIT:    { label: 'Stop Loss',    color: 'var(--red)',    bg: 'var(--red-dim)',   icon: '✕' },
  SELECTION: { label: 'Scanner',      color: 'var(--cyan)',   bg: 'rgba(6,182,212,0.1)', icon: '◈' },
  CLOSED:    { label: 'Trade Closed', color: 'var(--accent)', bg: 'rgba(245,158,11,0.1)', icon: '✓' },
  DEFAULT:   { label: 'Alert',        color: 'var(--text-muted)', bg: 'var(--bg-card2)', icon: '●' },
};

function alertMeta(type) { return TYPE_META[type] || TYPE_META.DEFAULT; }

function AlertRow({ alert, onDelete }) {
  const { addToast } = useToast();
  const m = alertMeta(alert.type);
  const ts = alert.createdAt ? new Date(alert.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '';

  const handleDelete = async () => {
    try { await onDelete(alert._id); }
    catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div className="alert-item" style={{ opacity: alert.read ? 0.7 : 1 }}>
      <div className="alert-icon" style={{ background: m.bg, color: m.color, fontSize: 13, fontWeight: 700 }}>
        {m.icon}
      </div>
      <div className="alert-body">
        <div className="alert-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {alert.symbol}
          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, fontWeight: 600, background: m.bg, color: m.color }}>
            {m.label}
          </span>
          {!alert.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}/>}
        </div>
        <div className="alert-meta">{alert.message}</div>
        <div className="alert-meta" style={{ marginTop: 2 }}>{ts}{alert.emailSent && ' · 📧 emailed'}</div>
      </div>
      <div className="alert-value">
        {alert.price > 0 && <div className="alert-price" style={{ color: m.color }}>{fmt(alert.price)}</div>}
        <button className="btn-icon" onClick={handleDelete} title="Delete" style={{ marginTop: 4, width: 26, height: 26 }}>
          <IconTrash style={{ width: 12, height: 12 }}/>
        </button>
      </div>
    </div>
  );
}

export default function Alerts() {
  const { addToast } = useToast();
  const [filter, setFilter] = useState('all');
  const { data, loading, refetch } = usePolling(() => alertsAPI.getAll(), 15000, []);
  const alerts = data || [];

  const unread = alerts.filter(a => !a.read).length;

  const filtered = filter === 'all' ? alerts
    : filter === 'unread' ? alerts.filter(a => !a.read)
    : alerts.filter(a => a.type === filter);

  const markAllRead = async () => {
    try { await alertsAPI.markAllRead(); addToast('All alerts marked as read', 'info'); refetch(); }
    catch (e) { addToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    await alertsAPI.delete(id);
    refetch();
  };

  const FILTERS = [
    ['all',       'All'],
    ['unread',    `Unread (${unread})`],
    ['TARGET',    'Target Hit'],
    ['SL_HIT',    'Stop Loss'],
    ['BUY',       'Buy Signal'],
    ['SELECTION', 'Scanner'],
  ];

  const counts = {
    total:   alerts.length,
    target:  alerts.filter(a => a.type === 'TARGET').length,
    sl:      alerts.filter(a => a.type === 'SL_HIT').length,
    buy:     alerts.filter(a => a.type === 'BUY').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <div className="page-sub">{unread} unread · {alerts.length} total</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unread > 0 && (
            <button className="btn btn-ghost" onClick={markAllRead} style={{ fontSize: 11 }}>Mark all read</button>
          )}
          <button className="btn-icon" onClick={refetch}><IconRefresh style={{ width: 14, height: 14 }}/></button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total', value: counts.total, color: 'var(--text-primary)' },
          { label: 'Target Hit', value: counts.target, color: 'var(--green)' },
          { label: 'Stop Loss', value: counts.sl, color: 'var(--red)' },
          { label: 'Buy Signal', value: counts.buy, color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
        ))}
      </div>

      {/* Alert list */}
      <div className="card">
        {loading && <div className="loading-center"><div className="spinner"/></div>}
        {!loading && filtered.length === 0 && (
          <div className="loading-center" style={{ padding: '40px' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔔</div>
            <div style={{ fontSize: 12 }}>No alerts {filter !== 'all' ? 'in this category' : 'yet'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Alerts fire automatically when price conditions are met.
            </div>
          </div>
        )}
        {filtered.map(a => (
          <AlertRow key={a._id} alert={a} onDelete={handleDelete}/>
        ))}
      </div>
    </>
  );
}