"use strict";

const https = require("https");

const _cache = global.__emaYahooCache || new Map();
global.__emaYahooCache = _cache;

const TTL = {
  quote: 60_000,
  ohlcv: 5 * 60_000,
  search: 10 * 60_000,
};

function fromCache(key) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < hit.ttl) return hit.data;
  return null;
}
function toCache(key, data, ttl) {
  _cache.set(key, { ts: Date.now(), ttl, data });
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
];

function randUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(url, timeoutMs = 4500, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": randUA(),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Connection": "close",
        "Pragma": "no-cache",
        "Referer": "https://finance.yahoo.com/",
        ...extraHeaders,
      },
    }, (res) => {
      let raw = "";
      res.on("data", d => { raw += d; });
      res.on("end", () => {
        if (res.statusCode !== 200) {
          const err = new Error(`Yahoo HTTP ${res.statusCode}`);
          err.statusCode = res.statusCode;
          err.url = url;
          return reject(err);
        }
        try { resolve(JSON.parse(raw)); }
        catch {
          const err = new Error("Yahoo JSON parse failed");
          err.url = url;
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Yahoo request timed out after ${timeoutMs}ms`));
    });
  });
}

async function httpGetWithRetry(url, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await httpGet(url);
    }
    catch (e) {
      if (i === retries) throw e;
      await sleep(300 * 2 ** i);
    }
  }
}

async function fetchNseQuote(symbol) {
  if (!symbol.endsWith(".NS")) return null;
  const nseSymbol = symbol.replace(".NS", "");
  const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(nseSymbol)}`;
  try {
    const json = await httpGet(url, 3500, {
      "Referer": `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(nseSymbol)}`,
      "Host": "www.nseindia.com",
    });
    const priceInfo = json?.priceInfo || {};
    const info = json?.info || {};
    const price = Number(priceInfo.lastPrice || priceInfo.close);
    if (!Number.isFinite(price) || price <= 0) return null;
    const prevClose = Number(priceInfo.previousClose || price);
    const change = Number(priceInfo.change || (price - prevClose));
    const changePct = Number(priceInfo.pChange || (prevClose ? (change / prevClose) * 100 : 0));
    return {
      symbol,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      volume: Number(json?.preOpenMarket?.totalTradedVolume || json?.securityInfo?.totalTradedVolume || 0),
      high: Number(priceInfo.intraDayHighLow?.max || priceInfo.weekHighLow?.max || price),
      low: Number(priceInfo.intraDayHighLow?.min || priceInfo.weekHighLow?.min || price),
      prevClose,
      marketState: "NSE",
      longName: info.companyName || nseSymbol,
    };
  } catch (e) {
    console.warn(`[NSE] quote ${symbol} failed: ${e.message}`);
    return null;
  }
}

function validNumbers(values) {
  return (values || []).filter(v => Number.isFinite(Number(v)));
}

function toQuoteFromChart(symbol, json) {
  const result = json?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const closes = validNumbers(quote.close);
  const highs = validNumbers(quote.high);
  const lows = validNumbers(quote.low);
  const volumes = validNumbers(quote.volume);
  const price = Number(meta.regularMarketPrice || closes[closes.length - 1]);
  if (!Number.isFinite(price) || price <= 0) return null;

  const prevClose = Number(meta.previousClose || meta.chartPreviousClose || closes[closes.length - 2] || price);
  const change = price - prevClose;
  const changePct = prevClose ? (change / prevClose) * 100 : 0;

  return {
    symbol,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    volume: Number(meta.regularMarketVolume || volumes[volumes.length - 1] || 0),
    high: Number(meta.regularMarketDayHigh || highs[highs.length - 1] || price),
    low: Number(meta.regularMarketDayLow || lows[lows.length - 1] || price),
    prevClose,
    marketState: meta.marketState || "UNKNOWN",
    longName: meta.longName || meta.shortName || symbol.replace(".NS", ""),
  };
}

/**
 * Fetch OHLCV historical data.
 * @param {string} symbol  - Yahoo Finance symbol e.g. "RELIANCE.NS"
 * @param {string} range   - "1d","5d","1mo","6mo","1y"
 * @param {string} interval- "1m","5m","1d","1wk"
 */
async function fetchOHLCV(symbol, range = "6mo", interval = "1d") {
  symbol = String(symbol || "").trim().toUpperCase();
  if (!symbol) return null;

  const cacheKey = `ohlcv:${symbol}:${range}:${interval}`;
  const hit = fromCache(cacheKey);
  if (hit) return hit;

  const hosts  = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
  const params = `range=${range}&interval=${interval}&includePrePost=false`;

  for (const host of hosts) {
    try {
      const url  = `https://${host}/v8/finance/chart/${symbol}?${params}`;
      const json = await httpGetWithRetry(url);

      const result = json?.chart?.result?.[0];
      if (!result) continue;

      const q      = result.indicators.quote[0];
      const closes = (q.close  || []).map(v => v ?? null);
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
      console.warn(`[Yahoo] ${host} failed for ${symbol}: ${e.message}`);
    }
  }

  return null; // both hosts failed
}

/**
 * Fetch real-time quote (price, change, volume).
 * @param {string} symbol
 */
async function fetchQuote(symbol) {
  symbol = String(symbol || "").trim().toUpperCase();
  if (!symbol) return null;

  const cacheKey = `quote:${symbol}`;
  const hit = fromCache(cacheKey);
  if (hit) return hit;

  const nseQuote = await fetchNseQuote(symbol);
  if (nseQuote) {
    toCache(cacheKey, nseQuote, TTL.quote);
    return nseQuote;
  }

  const attempts = [
    ["query2.finance.yahoo.com", "5d", "1d"],
    ["query1.finance.yahoo.com", "5d", "1d"],
    ["query2.finance.yahoo.com", "1mo", "1d"],
    ["query1.finance.yahoo.com", "1d", "1m"],
  ];

  for (const [host, range, interval] of attempts) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
    try {
      const quote = toQuoteFromChart(symbol, await httpGetWithRetry(url));
      if (quote) {
        toCache(cacheKey, quote, TTL.quote);
        return quote;
      }
    } catch (e) {
      console.warn(`[Yahoo] quote ${symbol} ${range}/${interval} failed: ${e.message}`);
    }
  }

  return null;
}

/**
 * Fetch multiple quotes in parallel with a concurrency cap.
 */
async function fetchQuotes(symbols, concurrency = 4) {
  const results = {};
  symbols = [...new Set((symbols || []).map(s => String(s || "").trim().toUpperCase()).filter(Boolean))];
  const chunks  = [];
  for (let i = 0; i < symbols.length; i += concurrency) {
    chunks.push(symbols.slice(i, i + concurrency));
  }
  for (const chunk of chunks) {
    const settled = await Promise.allSettled(chunk.map(s => fetchQuote(s)));
    settled.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value) results[chunk[i]] = r.value;
    });
    if (chunks.length > 1) await sleep(180);
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
    const json = await httpGetWithRetry(url);
    const data = (json?.quotes || []).filter(q => q.quoteType === "EQUITY").map(q => ({
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

