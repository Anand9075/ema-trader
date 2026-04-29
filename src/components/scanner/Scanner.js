import React, { useState } from 'react';
import { scannerAPI, tradesAPI } from '../../api';
import { useToast } from '../../context/ToastContext';
import { fmt, fmtN, confClass } from '../../utils/helpers';
import { IconRefresh, IconPlus } from '../shared/Icons';

function ScoreBar({ score }) {
  const col = score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--accent)' : 'var(--red)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
        <div style={{ width:`${score}%`, height:'100%', background:col, borderRadius:2, transition:'width 0.5s ease' }}/>
      </div>
      <span style={{ fontWeight:700, fontSize:12, color:col, fontFamily:'JetBrains Mono', minWidth:22 }}>{score}</span>
    </div>
  );
}

function Pill({ label, active }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px',
      borderRadius:4, fontSize:10, fontWeight:500,
      background: active ? 'var(--green-bg)' : 'rgba(255,255,255,0.04)',
      color: active ? 'var(--green)' : 'var(--muted)',
      border: `1px solid ${active ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
    }}>
      <span style={{ width:4, height:4, borderRadius:'50%', background: active ? 'var(--green)' : 'var(--muted)', flexShrink:0 }}/>
      {label}
    </span>
  );
}

function ScanCard({ pick, onAdded }) {
  const { addToast } = useToast();
  const [adding, setAdding] = useState(false);
  const t = pick.technicals || {};

  const handleAdd = async () => {
    setAdding(true);
    try {
      await tradesAPI.create({
        symbol: pick.symbol, name: pick.name, sector: pick.sector,
        entry:  pick.entry, sl: pick.stopLoss, target: pick.target1,
        target2: pick.target2, qty: pick.qty || 1,
        ema200: t.ema200, ema50: t.ema50, rsi: t.rsi,
        confidence: pick.confidence, entryType: pick.entryType,
        techScore: pick.score, status: 'WAITING',
      });
      addToast(`${pick.name} added to portfolio`, 'success');
      onAdded?.();
    } catch (e) {
      addToast(e.message || 'Failed to add trade', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom:10 }}>
      {/* Header */}
      <div style={{ padding:'11px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:38, height:38, borderRadius:8, background:'var(--card2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, color:'var(--accent)', fontFamily:'JetBrains Mono',
          }}>
            {(pick.name||'?').slice(0,2)}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, fontFamily:'JetBrains Mono' }}>{pick.name}</div>
            <div style={{ fontSize:10, color:'var(--muted)' }}>{pick.sector} · {pick.symbol} · {pick.entryType}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span className={`score-badge ${confClass(pick.score)}`}>{pick.confidence}</span>
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={adding}>
            {adding ? <span className="spinner spinner-sm"/> : <><IconPlus style={{ width:11,height:11 }}/> Add</>}
          </button>
        </div>
      </div>

      {/* Levels */}
      <div style={{ padding:'11px 14px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, borderBottom:'1px solid var(--border)' }}>
        {[
          { lbl:'Entry',    val:fmt(pick.entry),       col:'var(--accent)' },
          { lbl:'Stop Loss',val:fmt(pick.stopLoss),     col:'var(--red)'   },
          { lbl:'Target 1', val:fmt(pick.target1),      col:'var(--green)' },
          { lbl:'R:R',      val:`${pick.rrRatio}:1`,    col:Number(pick.rrRatio)>=2?'var(--green)':'var(--red)', sub:pick.target2?`T2 ${fmt(pick.target2)}`:'—' },
        ].map(s => (
          <div key={s.lbl}>
            <div style={{ fontSize:10, color:'var(--muted)', marginBottom:3 }}>{s.lbl}</div>
            <div style={{ fontWeight:700, fontFamily:'JetBrains Mono', fontSize:14, color:s.col }}>{s.val}</div>
            {s.sub && <div style={{ fontSize:10, color:'var(--muted)' }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Technical indicators */}
      <div style={{ padding:'9px 14px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:10, color:'var(--muted)', minWidth:64 }}>Signals</div>
        <Pill label="200 EMA"  active={t.aboveEMA200}/>
        <Pill label="Golden ✕" active={t.goldenCross}/>
        <Pill label="MACD ↑"   active={t.macdBullish}/>
        <Pill label="BB Break" active={t.bbBreakout}/>
        <Pill label="CUSUM ↑"  active={t.cusumSignal === 1}/>
        {t.zzTrend && <Pill label={`ZZ:${t.zzTrend}`} active={t.zzTrend === 'UPTREND'}/>}
        <div style={{ marginLeft:'auto', display:'flex', gap:14, fontSize:10, color:'var(--muted)' }}>
          {t.ema200 && <span>EMA200 <span style={{ color:'var(--cyan)', fontFamily:'JetBrains Mono' }}>{fmt(t.ema200)}</span></span>}
          {t.rsi    && <span>RSI <span style={{ color:t.rsi>=50&&t.rsi<=75?'var(--green)':'var(--accent)', fontFamily:'JetBrains Mono' }}>{fmtN(t.rsi,1)}</span></span>}
          {t.volSpike&&<span>Vol <span style={{ color:t.volSpike>=1.5?'var(--green)':'var(--text)', fontFamily:'JetBrains Mono' }}>{fmtN(t.volSpike)}×</span></span>}
        </div>
      </div>

      {/* Score bar */}
      <div style={{ padding:'9px 14px', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ fontSize:10, color:'var(--muted)', minWidth:40 }}>Score</div>
        <div style={{ flex:1 }}><ScoreBar score={pick.score}/></div>
        <div style={{ fontSize:10, color:'var(--muted)' }}>
          Qty <span style={{ color:'var(--text)', fontFamily:'JetBrains Mono' }}>{pick.qty}</span>
          {' · '}Capital <span style={{ color:'var(--text)', fontFamily:'JetBrains Mono' }}>{fmt(pick.capitalDeployed)}</span>
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ error, onRetry, loading }) {
  // Detect if it's a raw invocation error and make it user-friendly
  const isTechnical = /FUNCTION_INVOCATION_FAILED|bom1::/i.test(error);
  const display = isTechnical
    ? 'Scanner encountered a server error. This is usually temporary — please retry.'
    : error;

  return (
    <div className="error-panel" style={{ marginBottom:14 }}>
      <div style={{ color:'var(--red)', fontWeight:600, fontSize:13, marginBottom:4 }}>
        ⚠ Scanner Error
      </div>
      <div style={{ color:'var(--red)', fontSize:12, marginBottom:6 }}>{display}</div>
      <div style={{ color:'var(--muted)', fontSize:11, lineHeight:1.6 }}>
        Yahoo Finance may be rate-limiting or NSE data may be temporarily slow. 
        The scanner uses multiple data source fallbacks — a retry usually succeeds.
      </div>
      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <button className="btn btn-danger btn-sm" onClick={onRetry} disabled={loading}>
          {loading ? <><span className="spinner spinner-sm"/> Retrying…</> : '↺ Retry Now'}
        </button>
        <span style={{ fontSize:10, color:'var(--muted)', alignSelf:'center' }}>
          Wait 30–60 s if retries keep failing
        </span>
      </div>
    </div>
  );
}

export default function Scanner() {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('all');
  const { addToast } = useToast();

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await scannerAPI.run();
      setResult(data);
      const source = data.cached ? 'Cached results' : 'Live scan complete';
      addToast(
        `${source} — ${data.picks?.length || 0} picks found`,
        'success',
        `${data.scanned || data.totalScanned} stocks in ${data.elapsed}s`
      );
    } catch (e) {
      // Strip raw invocation IDs from error message
      let msg = e.message || 'Scanner is temporarily unavailable. Please retry.';
      msg = msg.replace(/FUNCTION_INVOCATION_FAILED\s+\S+/gi, 'server error');
      setError(msg);
      addToast('Scanner failed', 'error', 'Retry in 30–60 seconds');
    } finally {
      setLoading(false);
    }
  };

  const picks = (result?.picks || []).filter(p =>
    filter === 'all' ? true : p.confidence?.toLowerCase() === filter
  );

  return (
    <>
      <div className="page-hdr">
        <div>
          <h1 className="page-ttl">Strategy Scanner</h1>
          <div className="page-sub">EMA 200 Breakout + ATR + Bollinger + CUSUM + ZigZag · NSE Large-Cap</div>
        </div>
        <button className="btn btn-primary" onClick={run} disabled={loading}>
          {loading
            ? <><span className="spinner spinner-sm"/> Scanning…</>
            : <><IconRefresh style={{ width:13,height:13 }}/> Run Scan</>}
        </button>
      </div>

      {/* Strategy summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
        {[
          { lbl:'EMA 200',   desc:'Primary trend filter', col:'var(--blue)'   },
          { lbl:'RSI 50–75', desc:'Momentum zone',        col:'var(--green)'  },
          { lbl:'ATR Stop',  desc:'Dynamic stop loss',    col:'var(--accent)' },
          { lbl:'Bollinger', desc:'Squeeze breakout',     col:'var(--purple)' },
          { lbl:'CUSUM',     desc:'Regime shift detect',  col:'var(--cyan)'   },
        ].map(c => (
          <div key={c.lbl} className="card" style={{ padding:'10px 12px', borderColor:`${c.col}22` }}>
            <div style={{ fontSize:11, fontWeight:700, color:c.col, marginBottom:3 }}>{c.lbl}</div>
            <div style={{ fontSize:10, color:'var(--muted)' }}>{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && <ErrorPanel error={error} onRetry={run} loading={loading}/>}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="card" style={{ padding:'52px 24px', textAlign:'center' }}>
          <div style={{ fontSize:38, marginBottom:12 }}>🔍</div>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Run the Scanner</div>
          <div style={{ fontSize:12, color:'var(--muted)', maxWidth:400, margin:'0 auto 20px', lineHeight:1.7 }}>
            Scans 25 NSE large-cap stocks. Applies EMA breakout, RSI momentum, ATR volatility, 
            Bollinger squeeze, CUSUM regime detection, and ZigZag trend structure. Takes 15–25 seconds.
          </div>
          <button className="btn btn-primary" onClick={run}>
            <IconRefresh style={{ width:13,height:13 }}/> Run Scan Now
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-box" style={{ padding:60 }}>
          <div className="spinner" style={{ width:34,height:34 }}/>
          <div style={{ fontSize:14, fontWeight:600, marginTop:4 }}>Scanning NSE stocks…</div>
          <div style={{ fontSize:11, color:'var(--muted)' }}>Fetching data from NSE + Yahoo Finance</div>
          <div style={{ fontSize:10, color:'var(--text3)', marginTop:4 }}>This may take 15–25 seconds</div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:14, padding:'10px 14px',
            background:'var(--card)', border:'1px solid var(--border)', borderRadius:10,
          }}>
            <div style={{ display:'flex', gap:22, fontSize:11 }}>
              <span>Scanned <strong style={{ fontFamily:'JetBrains Mono' }}>{result.scanned || result.totalScanned}</strong></span>
              <span>Passed <strong style={{ fontFamily:'JetBrains Mono', color:'var(--green)' }}>{result.picks?.length||0}</strong></span>
              <span>Time <strong style={{ fontFamily:'JetBrains Mono' }}>{result.elapsed}s</strong></span>
              {result.cached  && <span style={{ color:'var(--green)'  }}>Cached</span>}
              {result.partial && <span style={{ color:'var(--accent)' }}>Partial ({result.scanned}/{result.totalScanned})</span>}
              <span style={{ color:'var(--muted)' }}>
                {result.timestamp ? new Date(result.timestamp).toLocaleTimeString('en-IN') : ''}
              </span>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {['all','high','medium'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`btn btn-sm ${filter===f ? 'btn-primary' : 'btn-ghost'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {picks.length === 0 ? (
            <div className="loading-box" style={{ padding:40 }}>
              <div style={{ fontSize:12 }}>
                No {filter !== 'all' ? filter + '-confidence ' : ''}picks — market may be in risk-off regime
              </div>
              <button className="btn btn-ghost btn-sm" onClick={run} style={{ marginTop:8 }}>
                ↺ Re-scan
              </button>
            </div>
          ) : (
            picks.map((p, i) => <ScanCard key={p.symbol || i} pick={p} onAdded={() => {}}/>)
          )}
        </>
      )}
    </>
  );
}
