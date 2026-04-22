import React, { useState } from 'react';
import { scannerAPI, tradesAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { fmt, fmtN, confClass } from '../../utils/helpers';
import { IconRefresh, IconPlus, IconTrendUp, IconTrendDown } from '../shared/Icons';

const INDICATOR_LABELS = {
  aboveEMA200:  '200 EMA',
  goldenCross:  'Golden ✕',
  macdBullish:  'MACD ↑',
  bbBreakout:   'BB Break',
  bbSqueeze:    'BB Squeeze',
};

function IndicatorPill({ label, active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 500,
      background: active ? 'var(--green-dim)' : 'rgba(255,255,255,0.04)',
      color: active ? 'var(--green)' : 'var(--text-muted)',
      border: `1px solid ${active ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? 'var(--green)' : 'var(--text-muted)', flexShrink: 0 }}/>
      {label}
    </span>
  );
}

function ScoreBar({ score }) {
  const color = score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--accent)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }}/>
      </div>
      <span style={{ fontWeight: 700, fontSize: 12, color, fontFamily: 'JetBrains Mono', minWidth: 24 }}>{score}</span>
    </div>
  );
}

function ScannerCard({ result, onAdd }) {
  const { addToast } = useToast();
  const [adding, setAdding] = useState(false);
  const conf  = confClass(result.score);
  const confColors = { high: 'var(--green)', medium: 'var(--accent)', low: 'var(--red)' };
  const t = result.technicals || {};
  const rr = result.rrRatio || '—';
  const rrOk = Number(rr) >= 2;

  const handleAdd = async () => {
    setAdding(true);
    try {
      await tradesAPI.create({
        symbol: result.symbol, name: result.name, sector: result.sector,
        entry: result.entry, sl: result.stopLoss, target: result.target1,
        target2: result.target2, qty: result.qty || 1,
        ema200: t.ema200, ema50: t.ema50, rsi: t.rsi,
        confidence: result.confidence, entryType: result.entryType,
        techScore: result.score, status: 'WAITING',
      });
      addToast(`${result.name} added to portfolio`, 'success');
      if (onAdd) onAdd();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>
            {result.name?.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'JetBrains Mono' }}>{result.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{result.sector} · {result.symbol} · {result.entryType}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`score-badge ${conf}`}>{result.confidence}</span>
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding}>
            {adding ? <span className="spinner spinner-sm"/> : <><IconPlus style={{ width: 11, height: 11 }}/> Add</>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Entry</div>
          <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 14, color: 'var(--accent)' }}>{fmt(result.entry)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Stop Loss</div>
          <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 14, color: 'var(--red)' }}>{fmt(result.stopLoss)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Target 1</div>
          <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 14, color: 'var(--green)' }}>{fmt(result.target1)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>R:R · T2</div>
          <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 14, color: rrOk ? 'var(--green)' : 'var(--red)' }}>
            {rr}:1
          </div>
          {result.target2 > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmt(result.target2)}</div>}
        </div>
      </div>

      {/* Technicals */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 60 }}>Technicals</div>
        {t.ema200 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>EMA200 <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{fmt(t.ema200)}</span></div>}
        {t.rsi    && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>RSI <span style={{ color: t.rsi >= 50 && t.rsi <= 75 ? 'var(--green)' : 'var(--accent)', fontFamily: 'JetBrains Mono' }}>{fmtN(t.rsi, 1)}</span></div>}
        {t.atr    && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ATR <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{fmt(t.atr)}</span></div>}
        {t.volSpike && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Vol <span style={{ color: t.volSpike >= 1.5 ? 'var(--green)' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>{fmtN(t.volSpike)}×</span></div>}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {Object.entries(INDICATOR_LABELS).map(([key, label]) => (
            <IndicatorPill key={key} label={label} active={!!t[key]}/>
          ))}
          {t.zzTrend && (
            <IndicatorPill label={`ZZ:${t.zzTrend}`} active={t.zzTrend === 'UPTREND'}/>
          )}
          {t.cusumSignal === 1 && <IndicatorPill label="CUSUM↑" active={true}/>}
        </div>
      </div>

      {/* Score */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 60 }}>Score</div>
        <div style={{ flex: 1 }}><ScoreBar score={result.score}/></div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Qty: <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{result.qty}</span>
          {' · '}Capital: <span style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{fmt(result.capitalDeployed)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Scanner() {
  const [result,   setResult]  = useState(null);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [filterConf, setFilter]= useState('all');
  const { addToast } = useToast();

  const runScan = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await scannerAPI.run();
      setResult(data);
      addToast(`Scan complete — ${data.picks?.length || 0} picks found`, 'success', `${data.totalScanned} stocks scanned in ${data.elapsed}s`);
    } catch (e) {
      setError(e.message);
      addToast('Scanner failed', 'error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const picks = (result?.picks || []).filter(p =>
    filterConf === 'all' ? true : p.confidence?.toLowerCase() === filterConf
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Strategy Scanner</h1>
          <div className="page-sub">EMA 200 Breakout + ATR + Bollinger + CUSUM + ZigZag · NSE Large-Cap</div>
        </div>
        <button className="btn btn-primary" onClick={runScan} disabled={loading}>
          {loading ? <><span className="spinner spinner-sm"/> Scanning...</> : <><IconRefresh style={{ width: 14, height: 14 }}/> Run Scan</>}
        </button>
      </div>

      {/* Strategy info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'EMA 200', desc: 'Primary trend filter', color: 'var(--blue)' },
          { label: 'RSI 50–75', desc: 'Momentum sweet spot', color: 'var(--green)' },
          { label: 'ATR Stop', desc: 'Dynamic stop loss', color: 'var(--accent)' },
          { label: 'Bollinger', desc: 'Squeeze breakout', color: 'var(--purple)' },
          { label: 'CUSUM', desc: 'Regime detection', color: 'var(--cyan)' },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding: '10px 12px', borderColor: `${item.color}22` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: item.color, marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Scanner Error</div>
          <div style={{ color: 'var(--red)', fontSize: 11 }}>{error}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 6 }}>Try again in 60 seconds. Yahoo Finance occasionally rate-limits requests.</div>
          <button className="btn btn-danger btn-sm" onClick={runScan} style={{ marginTop: 8 }}>Retry</button>
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Run the Scanner</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 20px' }}>
            Scans 25 NSE large-cap stocks using EMA breakout, RSI momentum, ATR volatility, Bollinger Bands, CUSUM regime detection, and ZigZag trend structure. Takes 15–25 seconds.
          </div>
          <button className="btn btn-primary" onClick={runScan}>
            <IconRefresh style={{ width: 14, height: 14 }}/> Run Scan Now
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }}/>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Scanning NSE stocks...</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fetching 1Y data · Calculating EMA, RSI, ATR, Bollinger, CUSUM, ZigZag</div>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Scan summary */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Scanned </span><span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{result.totalScanned}</span></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Passed </span><span style={{ fontWeight: 700, color: 'var(--green)', fontFamily: 'JetBrains Mono' }}>{result.picks?.length || 0}</span></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Time </span><span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{result.elapsed}s</span></div>
              <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>At </span><span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{result.timestamp ? new Date(result.timestamp).toLocaleTimeString('en-IN') : '—'}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'high', 'medium'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`btn btn-sm ${filterConf === f ? 'btn-primary' : 'btn-ghost'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {picks.length === 0 && (
            <div className="loading-center" style={{ padding: 40 }}>
              <div style={{ fontSize: 12 }}>No {filterConf !== 'all' ? filterConf + '-confidence ' : ''}picks found</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Market may be in a risk-off regime</div>
            </div>
          )}

          {picks.map((pick, i) => (
            <ScannerCard key={pick.symbol || i} result={pick} onAdd={() => {}}/>
          ))}
        </>
      )}
    </>
  );
}