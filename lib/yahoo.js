"use strict";
const https = require("https");

/* ── In-memory cache ── */
const _cache = new Map();
const CACHE_QUOTE = 90_000;
const CACHE_HIST = 300_000;

function fromCache(k) {
  const h = _cache.get(k);
  if (h && Date.now() - h.ts < h.ttl) return h.d;
  return null;
}

function toCache(k, d, ttl = CACHE_QUOTE) {
  _cache.set(k, { ts: Date.now(), d, ttl });
}

/* ── Headers ── */
const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "Mozilla/5.0 (X11; Linux x86_64)",
];

const ua = () => UAS[Math.floor(Math.random() * UAS.length)];

/* ── HTTP with better timeout ── */
function httpGet(url, ms = 12000) { // ⬅️ increased timeout
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": ua(),
        "Accept": "application/json,*/*",
      },
    }, (r) => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => {
        if (r.statusCode !== 200) {
          return reject(new Error(`HTTP ${r.statusCode}`));
        }
        try {
          resolve(JSON.parse(d));
        } catch {
          reject(new Error("JSON parse error"));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(ms, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}

/* ── Retry ── */
async function retry(fn, n = 3) { // ⬅️ more retries
  for (let i = 0; i <= n; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === n) throw e;
      await new Promise(r => setTimeout(r, 700 * (i + 1)));
    }
  }
}

/* ── Fetch Quote ── */
async function fetchQuote(symbol) {
  const k = `q:${symbol}`;
  const cached = fromCache(k);
  if (cached) return cached;

  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const url = `https://${host}/v8/finance/chart/${symbol}?range=1d&interval=1m`;
      const json = await retry(() => httpGet(url));

      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta || !meta.regularMarketPrice) continue;

      const prev = meta.previousClose || meta.regularMarketPrice;

      const data = {
        symbol,
        price: meta.regularMarketPrice,
        change: meta.regularMarketPrice - prev,
        changePct: prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0,
        volume: meta.regularMarketVolume || 0,
        high: meta.regularMarketDayHigh || 0,
        low: meta.regularMarketDayLow || 0,
        prevClose: prev,
        marketState: meta.marketState || "CLOSED",
        longName: meta.longName || symbol,
      };

      toCache(k, data);
      return data;

    } catch (e) {
      console.warn(`[Yahoo ERROR] ${symbol} via ${host}:`, e.message);
    }
  }

  // ⬅️ IMPORTANT: throw instead of silent null
  throw new Error(`Failed to fetch quote for ${symbol}`);
}

/* ── Fetch OHLCV ── */
async function fetchOHLCV(symbol, range = "1y", interval = "1d") {
  const k = `ohlcv:${symbol}:${range}:${interval}`;
  const cached = fromCache(k);
  if (cached) return cached;

  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const url = `https://${host}/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
      const json = await retry(() => httpGet(url));

      const result = json?.chart?.result?.[0];
      if (!result) continue;

      const q = result.indicators.quote[0];

      const data = {
        symbol,
        timestamps: result.timestamp || [],
        open: q.open || [],
        high: q.high || [],
        low: q.low || [],
        close: q.close || [],
        volume: q.volume || [],
      };

      toCache(k, data, CACHE_HIST);
      return data;

    } catch (e) {
      console.warn(`[Yahoo ERROR] OHLCV ${symbol}:`, e.message);
    }
  }

  throw new Error(`Failed to fetch OHLCV for ${symbol}`);
}

/* ── Batch Fetch ── */
async function fetchQuotes(symbols, concurrency = 3) {
  const out = {};

  for (let i = 0; i < symbols.length; i += concurrency) {
    const chunk = symbols.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      chunk.map(s => fetchQuote(s))
    );

    results.forEach((r, j) => {
      if (r.status === "fulfilled") {
        out[chunk[j]] = r.value;
      } else {
        console.warn("Batch error:", r.reason.message);
      }
    });

    await new Promise(r => setTimeout(r, 400));
  }

  return out;
}

/* ── Search ── */
async function searchSymbol(q) {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&region=IN`;
    const json = await retry(() => httpGet(url, 6000));

    return (json?.quotes || []).map(x => ({
      symbol: x.symbol,
      name: x.longname || x.shortname || x.symbol,
      exchange: x.exchange || "NSE",
    }));

  } catch (e) {
    console.warn("Search error:", e.message);
    return [];
  }
}

module.exports = {
  fetchQuote,
  fetchOHLCV,
  fetchQuotes,
  searchSymbol,
};