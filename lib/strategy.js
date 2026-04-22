"use strict";
const { EMA, RSI, MACD, ATR, BollingerBands } = require("technicalindicators");
const { fetchOHLCV } = require("./yahoo");

const SCAN_LIST = [
  "RELIANCE.NS","HDFCBANK.NS","ICICIBANK.NS","TCS.NS","INFY.NS",
  "AXISBANK.NS","KOTAKBANK.NS","LT.NS","SUNPHARMA.NS","MARUTI.NS",
  "BAJFINANCE.NS","HCLTECH.NS","WIPRO.NS","TATAMOTORS.NS","ITC.NS",
  "BHARTIARTL.NS","NTPC.NS","POWERGRID.NS","COALINDIA.NS","BAJAJFINSV.NS",
  "DRREDDY.NS","CIPLA.NS","DIVISLAB.NS","TITAN.NS","ASIANPAINT.NS",
];

const SECTOR = {
  "RELIANCE.NS":"Energy",   "HDFCBANK.NS":"Banking",  "ICICIBANK.NS":"Banking",
  "TCS.NS":"IT",            "INFY.NS":"IT",            "AXISBANK.NS":"Banking",
  "KOTAKBANK.NS":"Banking", "LT.NS":"Infra",           "SUNPHARMA.NS":"Pharma",
  "MARUTI.NS":"Auto",       "BAJFINANCE.NS":"Finance", "HCLTECH.NS":"IT",
  "WIPRO.NS":"IT",          "TATAMOTORS.NS":"Auto",    "ITC.NS":"FMCG",
  "BHARTIARTL.NS":"Telecom","NTPC.NS":"Power",         "POWERGRID.NS":"Power",
  "COALINDIA.NS":"Mining",  "BAJAJFINSV.NS":"Finance", "DRREDDY.NS":"Pharma",
  "CIPLA.NS":"Pharma",      "DIVISLAB.NS":"Pharma",    "TITAN.NS":"Consumer",
  "ASIANPAINT.NS":"Consumer",
};

const sp  = (p, len) => Math.min(p, len - 2);
const r2  = n => Math.round(n * 100) / 100;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── CUSUM: detect sustained breakout from mean ── */
function cusumSignal(prices, k = 0.5, h = 3) {
  if (prices.length < 20) return 0;
  const mu  = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const std = Math.sqrt(prices.slice(-20).map(p => (p - mu) ** 2).reduce((a, b) => a + b, 0) / 20) || 1;
  let cp = 0, cn = 0;
  prices.slice(-30).forEach(p => {
    cp = Math.max(0, cp + (p - mu) / std - k);
    cn = Math.max(0, cn - (p - mu) / std - k);
  });
  return cp > h ? 1 : cn > h ? -1 : 0;
}

/* ── ZigZag: identify higher-high / higher-low trend structure ── */
function zzTrend(highs, lows, thresh = 0.03) {
  if (highs.length < 20) return "UNKNOWN";
  const h = highs.slice(-20), l = lows.slice(-20);
  let hh = 0, hl = 0, lh = 0, ll = 0;
  for (let i = 1; i < h.length; i++) {
    if (h[i] > h[i - 1] * (1 + thresh)) hh++;
    if (l[i] > l[i - 1] * (1 + thresh)) hl++;
    if (h[i] < h[i - 1] * (1 - thresh)) lh++;
    if (l[i] < l[i - 1] * (1 - thresh)) ll++;
  }
  if (hh >= 3 && hl >= 2) return "UPTREND";
  if (lh >= 3 && ll >= 2) return "DOWNTREND";
  return "SIDEWAYS";
}

function analyseTechnicals(data) {
  const closes  = (data.close  || []).filter(Boolean);
  const highs   = (data.high   || []).filter(Boolean);
  const lows    = (data.low    || []).filter(Boolean);
  const volumes = (data.volume || []).filter(Boolean);
  if (closes.length < 50) return null;

  const e200 = EMA.calculate({ period: sp(200, closes.length), values: closes });
  const e50  = EMA.calculate({ period: sp(50,  closes.length), values: closes });
  const e20  = EMA.calculate({ period: sp(20,  closes.length), values: closes });
  const rsiA = RSI.calculate({ period: 14,                     values: closes });

  let macdA = [], atrA = [], bbA = [];
  try { if (closes.length > 35) macdA = MACD.calculate({ values:closes, fastPeriod:12, slowPeriod:26, signalPeriod:9, SimpleMAOscillator:false, SimpleMASignal:false }); } catch {}
  try { const ml = Math.min(highs.length, lows.length, closes.length); if (ml > 15) atrA = ATR.calculate({ period:14, high:highs.slice(-ml), low:lows.slice(-ml), close:closes.slice(-ml) }); } catch {}
  try { if (closes.length > 25) bbA = BollingerBands.calculate({ period:20, values:closes, stdDev:2 }); } catch {}

  const price = closes.at(-1);
  const ema200= e200.at(-1) || price * 0.90;
  const ema50 = e50.at(-1)  || price * 0.95;
  const ema20 = e20.at(-1)  || price;
  const rsi   = rsiA.at(-1) || 50;
  const prevR = rsiA.at(-6) || rsi;
  const macd  = macdA.at(-1) || null;
  const prevM = macdA.at(-2) || null;
  const atr   = atrA.at(-1)  || price * 0.02;
  const bb    = bbA.at(-1)   || null;

  const vol20    = volumes.length > 20 ? volumes.slice(-20).reduce((a,b)=>a+b,0)/20 : (volumes[0]||1);
  const volSpike = (volumes.at(-1)||0) / vol20;

  const bbSqueeze  = bb ? (bb.upper - bb.lower) / bb.middle < 0.08 : false;
  const bbBreakout = bb ? price > bb.upper : false;
  const cusum      = cusumSignal(closes);
  const trend      = zzTrend(highs, lows);

  // Entry pattern detection
  let entryType = "MONITOR";
  if (closes.length > 21) {
    const h20 = Math.max(...closes.slice(-21, -1));
    if (price > h20 && volSpike >= 1.3)                         entryType = "BREAKOUT";
    else if (Math.abs(price - ema50) / ema50 < 0.025 && price > closes.at(-2)) entryType = "EMA50_BOUNCE";
    else if (Math.abs(price - ema20) / ema20 < 0.020 && price > closes.at(-2)) entryType = "EMA20_PULLBACK";
    else if (bbBreakout)                                         entryType = "BB_BREAKOUT";
  }

  // Composite score
  let score = 0;
  if (price > ema200)                    score += 20;  // MANDATORY
  if (price > ema50)                     score += 10;
  if (price > ema20)                     score +=  5;
  if (ema50  > ema200)                   score += 10;  // Golden cross
  if (rsi >= 50 && rsi <= 75)            score += 12;
  if (rsi > prevR)                       score +=  4;
  if (macd?.MACD > macd?.signal)         score +=  8;
  if (macd && prevM && macd.histogram > prevM.histogram) score += 4;
  if (cusum === 1)                       score += 10;  // CUSUM breakout
  if (trend === "UPTREND")               score +=  8;  // ZigZag confirmation
  if (bbBreakout)                        score +=  6;
  if (bbSqueeze && entryType !== "MONITOR") score += 3;
  if (volSpike >= 1.5)                   score +=  5;
  if (entryType !== "MONITOR")           score +=  5;

  return {
    price, ema200, ema50, ema20, rsi, atr, volSpike: r2(volSpike),
    entryType, score,
    aboveEMA200: price > ema200,
    goldenCross: ema50  > ema200,
    macdBullish: !!(macd && macd.MACD > macd.signal),
    bbBreakout, bbSqueeze, cusumSignal: cusum, zzTrend: trend,
  };
}

async function scanStock(symbol) {
  const data = await fetchOHLCV(symbol, "1y", "1d");
  if (!data) return null;
  const t = analyseTechnicals(data);
  if (!t || !t.aboveEMA200) return null;   // HARD: must be above 200 EMA
  if (t.rsi > 82 || t.rsi < 38) return null;
  if (t.score < 35) return null;

  const stopLoss = r2(Math.max(t.price - t.atr * 1.8, t.ema50 * 0.985));
  const risk     = t.price - stopLoss;
  if (risk <= 0) return null;
  const target1  = r2(t.price + risk * 2);
  const target2  = r2(t.price + risk * 3.5);
  const rrRatio  = r2((target2 - t.price) / risk);
  if (rrRatio < 2) return null;

  const capital = Number(process.env.TOTAL_CAPITAL) || 100000;
  const riskAmt = capital * 0.015;
  const qty     = Math.max(1, Math.floor(Math.min(riskAmt / risk, capital * 0.3 / t.price)));

  return {
    symbol,
    name:    symbol.replace(".NS", ""),
    sector:  SECTOR[symbol] || "Other",
    score:   t.score,
    confidence: t.score >= 72 ? "HIGH" : t.score >= 52 ? "MEDIUM" : "LOW",
    entryType:  t.entryType,
    entry:      r2(t.price),
    stopLoss,
    target1,
    target2,
    rrRatio,
    qty,
    capitalDeployed: Math.round(qty * t.price),
    technicals: {
      ema200:      r2(t.ema200),
      ema50:       r2(t.ema50),
      rsi:         r2(t.rsi),
      atr:         r2(t.atr),
      volSpike:    t.volSpike,
      aboveEMA200: t.aboveEMA200,
      goldenCross: t.goldenCross,
      macdBullish: t.macdBullish,
      bbBreakout:  t.bbBreakout,
      bbSqueeze:   t.bbSqueeze,
      cusumSignal: t.cusumSignal,
      zzTrend:     t.zzTrend,
    },
  };
}

async function runScanner() {
  const start   = Date.now();
  console.log(`[Scanner] Starting scan of ${SCAN_LIST.length} stocks...`);
  const settled = await Promise.allSettled(SCAN_LIST.map(async (s, i) => {
    await sleep(i * 200);   // stagger requests to avoid rate-limiting
    return scanStock(s);
  }));
  const results = settled
    .filter(r => r.status === "fulfilled" && r.value)
    .map(r => r.value)
    .sort((a, b) => b.score - a.score);
  const picks = results.filter(r => r.confidence !== "LOW").slice(0, 5);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[Scanner] Done in ${elapsed}s — ${picks.length} picks from ${results.length} passed`);
  return { picks, allResults: results, totalScanned: SCAN_LIST.length, elapsed, timestamp: new Date().toISOString() };
}

module.exports = { runScanner, scanStock, SCAN_LIST };
