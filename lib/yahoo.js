"use strict";

const https = require("https");
const http  = require("http");

const _cache = global.__emaYahooCache || new Map();
global.__emaYahooCache = _cache;

const TTL = {
  quote:  60_000,
  ohlcv:  5 * 60_000,
  search: 10 * 60_000,
};

function fromCache(key) {
  try {
    const hit = _cache.get(key);
    if (hit && Date.now() - hit.ts < hit.ttl) return hit.data;
  } catch {}
  return null;
}
function toCache(key, data, ttl) {
  try { _cache.set(key, { ts: Date.now(), ttl, data }); } catch {}
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

function randUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(url, timeoutMs = 5000, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    let settled = false;
    const done = (fn, val) => { if (!settled) { settled = true; fn(val); } };

    const req = lib.get(url, {
      headers: {
        "User-Agent":      randUA(),
        "Accept":          "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control":   "no-cache",
        "Pragma":          "no-cache",
        "Referer":         "https://finance.yahoo.com/",
        "Origin":          "https://finance.yahoo.com",
        ...extraHeaders,
      },
    }, (res) => {
      const chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("error", e => done(reject, e));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode === 429) {
          const e = new Error("Yahoo rate-limited (429)");
          e.statusCode = 429;
          return done(reject, e);
        }
        if (res.statusCode >= 400) {
          const e = new Error(`Yahoo HTTP ${res.statusCode}`);
          e.statusCode = res.statusCode;
          return done(reject, e);
        }
        try {
          done(resolve, JSON.parse(raw));
        } catch {
          done(reject, new Error("Yahoo JSON parse failed"));
        }
      });
    });

    req.on("error", e => done(reject, e));

    const timer = setTimeout(() => {
      try { req.destroy(); } catch {}
      done(reject, new Error(`Yahoo timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    req.on("close", () => clearTimeout(timer));
  });
}

async function httpGetWithRetry(url, retries = 2, timeoutMs = 5000, extraHeaders = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await httpGet(url, timeoutMs, extraHeaders);
    } catch (e) {
      lastErr = e;
      if (e.statusCode === 429) throw e; // don't retry rate-limits
      if (i < retries) await sleep(400 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

/* ── NSE India fallback ── */
async function fetchNseQuote(symbol) {
  if (!symbol.endsWith(".NS")) return null;
  const nseSymbol = symbol.replace(".NS", "");

  // First hit the main page to get cookies, then API
  const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(nseSymbol)}`;
  try {
    const json = await httpGet(url, 4000, {
      "Referer":  `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(nseSymbol)}`,
      "Host":     "www.nseindia.com",
      "Accept":   "application/json",
    });
    const priceInfo = json?.priceInfo || {};
    const info      = json?.info || {};
    const price     = Number(priceInfo.lastPrice || priceInfo.close);
    if (!Number.isFinite(price) || price <= 0) return null;
    const prevClose = Number(priceInfo.previousClose || price);
    const change    = Number(priceInfo.change    || (price - prevClose));
    const changePct = Number(priceInfo.pChange   || (prevClose ? (change / prevClose) * 100 : 0));
    return {
      symbol,
      price:      Math.round(price    * 100) / 100,
      change:     Math.round(change   * 100) / 100,
      changePct:  Math.round(changePct * 100) / 100,
      volume:     Number(json?.securityInfo?.totalTradedVolume || 0),
      high:       Number(priceInfo.intraDayHighLow?.max || price),
      low:        Number(priceInfo.intraDayHighLow?.min || price),
      prevClose,
      marketState: "NSE",
      longName:   info.companyName || nseSymbol,
    };
  } catch (e) {
    console.warn(`[NSE] quote ${symbol} failed: ${e.message}`);
    return null;
  }
}

/* ── Stooq fallback (no API key required) ── */
async function fetchStooqQuote(symbol) {
  if (!symbol.endsWith(".NS")) return null;
  const stooqSym = symbol.replace(".NS", "").toLowerCase() + ".in";
  const url = `https://stooq.com/q/d/l/?s=${stooqSym}&i=d`;
  try {
    const res = await new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { "User-Agent": randUA() } }, r => {
        const chunks = [];
        r.on("data", d => chunks.push(d));
        r.on("end",  () => resolve({ statusCode: r.statusCode, body: Buffer.concat(chunks).toString() }));
        r.on("error", reject);
      });
      req.on("error", reject);
      setTimeout(() => { try { req.destroy(); } catch {} reject(new Error("timeout")); }, 4000);
    });
    if (res.statusCode !== 200) return null;
    const lines = res.body.trim().split("\n");
    if (lines.length < 2) return null;
    const last  = lines[lines.length - 1].split(",");
    const price = parseFloat(last[4]); // close
    if (!Number.isFinite(price) || price <= 0) return null;
    const prev  = lines.length > 2 ? parseFloat(lines[lines.length - 2].split(",")[4]) : price;
    const change    = price - prev;
    const changePct = prev ? (change / prev) * 100 : 0;
    return {
      symbol,
      price:      Math.round(price     * 100) / 100,
      change:     Math.round(change    * 100) / 100,
      changePct:  Math.round(changePct * 100) / 100,
      volume:     parseInt(last[5]) || 0,
      high:       parseFloat(last[2]) || price,
      low:        parseFloat(last[3]) || price,
      prevClose:  prev,
      marketState: "STOOQ",
      longName:   symbol.replace(".NS", ""),
    };
  } catch (e) {
    console.warn(`[Stooq] ${symbol} failed: ${e.message}`);
    return null;
  }
}

function validNumbers(values) {
  return (values || []).filter(v => Number.isFinite(Number(v))).map(Number);
}

function toQuoteFromChart(symbol, json) {
  try {
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const meta   = result.meta || {};
    const quote  = result.indicators?.quote?.[0] || {};
    const closes = validNumbers(quote.close);
    const highs  = validNumbers(quote.high);
    const lows   = validNumbers(quote.low);
    const volumes= validNumbers(quote.volume);
    const price  = Number(meta.regularMarketPrice || closes[closes.length - 1]);
    if (!Number.isFinite(price) || price <= 0) return null;
    const prevClose = Number(meta.previousClose || meta.chartPreviousClose || closes[closes.length - 2] || price);
    const change    = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    return {
      symbol,
      price:      Math.round(price    * 100) / 100,
      change:     Math.round(change   * 100) / 100,
      changePct:  Math.round(changePct * 100) / 100,
      volume:     Number(meta.regularMarketVolume || volumes[volumes.length - 1] || 0),
      high:       Number(meta.regularMarketDayHigh || highs[highs.length - 1]  || price),
      low:        Number(meta.regularMarketDayLow  || lows[lows.length - 1]    || price),
      prevClose,
      marketState: meta.marketState || "UNKNOWN",
      longName:   meta.longName || meta.shortName || symbol.replace(".NS", ""),
    };
  } catch { return null; }
}

/**
 * Fetch OHLCV historical data.
 */
async function fetchOHLCV(symbol, range = "6mo", interval = "1d", opts = {}) {
  symbol = String(symbol || "").trim().toUpperCase();
  if (!symbol) return null;

  const cacheKey = `ohlcv:${symbol}:${range}:${interval}`;
  const hit = fromCache(cacheKey);
  if (hit) return hit;

  const timeoutMs = opts.timeoutMs || 6000;
  const retries   = Number.isFinite(opts.retries) ? opts.retries : 1;
  const hosts     = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  const params    = `range=${range}&interval=${interval}&includePrePost=false&events=div%7Csplit`;

  for (const host of hosts) {
    try {
      const url  = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`;
      const json = await httpGetWithRetry(url, retries, timeoutMs);

      const result = json?.chart?.result?.[0];
      if (!result) continue;

      const q      = result.indicators?.quote?.[0] || {};
      const closes = (q.close  || []).map(v => (v != null && Number.isFinite(v)) ? v : null);
      const valid  = closes.filter(Boolean);
      if (valid.length < 10) continue;

      const data = {
        symbol,
        timestamps: result.timestamp || [],
        open:   q.open   || [],
        high:   q.high   || [],
        low:    q.low    || [],
        close:  closes,
        volume: q.volume || [],
        currentPrice: valid[valid.length - 1],
        currency:     result.meta?.currency || "INR",
      };

      toCache(cacheKey, data, TTL.ohlcv);
      return data;
    } catch (e) {
      console.warn(`[Yahoo] ${host} OHLCV ${symbol}: ${e.message}`);
    }
  }

  return null;
}

/**
 * Fetch real-time quote with multi-source fallback.
 */
async function fetchQuote(symbol) {
  symbol = String(symbol || "").trim().toUpperCase();
  if (!symbol) return null;

  const cacheKey = `quote:${symbol}`;
  const hit = fromCache(cacheKey);
  if (hit) return hit;

  // Source 1: NSE India
  const nseQuote = await fetchNseQuote(symbol);
  if (nseQuote) {
    toCache(cacheKey, nseQuote, TTL.quote);
    return nseQuote;
  }

  // Source 2: Yahoo Finance chart endpoint (multiple host + range combos)
  const attempts = [
    ["query2.finance.yahoo.com", "5d",  "1d", 5000],
    ["query1.finance.yahoo.com", "5d",  "1d", 5000],
    ["query2.finance.yahoo.com", "1mo", "1d", 5000],
    ["query1.finance.yahoo.com", "1mo", "1d", 5000],
  ];

  for (const [host, range, ivl, tms] of attempts) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${ivl}&includePrePost=false`;
    try {
      const json  = await httpGetWithRetry(url, 1, tms);
      const quote = toQuoteFromChart(symbol, json);
      if (quote) {
        toCache(cacheKey, quote, TTL.quote);
        return quote;
      }
    } catch (e) {
      if (e.statusCode === 429) break; // stop trying Yahoo on rate-limit
      console.warn(`[Yahoo] quote ${symbol} ${range}/${ivl}: ${e.message}`);
    }
  }

  // Source 3: Stooq fallback
  const stooq = await fetchStooqQuote(symbol);
  if (stooq) {
    toCache(cacheKey, stooq, TTL.quote);
    return stooq;
  }

  return null;
}

/**
 * Fetch multiple quotes in parallel with concurrency cap and graceful degradation.
 */
async function fetchQuotes(symbols, concurrency = 4) {
  const results = {};
  symbols = [...new Set((symbols || [])
    .map(s => String(s || "").trim().toUpperCase())
    .filter(Boolean))];

  const chunks = [];
  for (let i = 0; i < symbols.length; i += concurrency) {
    chunks.push(symbols.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const settled = await Promise.allSettled(chunk.map(s => fetchQuote(s)));
    settled.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) results[chunk[i]] = r.value;
    });
    if (chunks.length > 1) await sleep(200);
  }

  return results;
}

/**
 * Search Yahoo Finance for symbol suggestions.
 */
async function searchSymbol(query) {
  const cacheKey = `search:${query}`;
  const hit = fromCache(cacheKey);
  if (hit) return hit;

  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=IN&quotesCount=10&newsCount=0&listsCount=0`;
  try {
    const json = await httpGetWithRetry(url, 1, 5000);
    const data = (json?.quotes || [])
      .filter(q => q.quoteType === "EQUITY")
      .map(q => ({
        symbol:   q.symbol,
        name:     q.longname || q.shortname || q.symbol,
        exchange: q.exchange || "",
        type:     q.typeDisp || "Equity",
      }));
    toCache(cacheKey, data, TTL.search);
    return data;
  } catch (e) {
    console.warn("[Yahoo] search failed:", e.message);
    return [];
  }
}

module.exports = { fetchOHLCV, fetchQuote, fetchQuotes, searchSymbol };
