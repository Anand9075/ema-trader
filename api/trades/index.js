"use strict";
/**
 * GET    /api/trades          → list all trades
 * POST   /api/trades          → create trade
 * PUT    /api/trades?id=X     → update trade
 * DELETE /api/trades?id=X     → delete trade
 * POST   /api/trades?action=close&id=X  → close trade
 */
const { allowCors }               = require("../lib/cors");
const { connectDB, Trade, Alert } = require("../lib/db");
const { fetchQuote }              = require("../lib/yahoo");
const { sendTradeAlert }          = require("../lib/email");

const STATUS_MAP = {
  WAITING:     "WAITING",
  WAIT:        "WAITING",
  PENDING:     "WAITING",
  ACTIVE:      "ACTIVE",
  BOUGHT:      "ACTIVE",
  TARGET:      "TARGET",
  SL:          "SL",
  STOPLOSS:    "SL",
  "STOP_LOSS": "SL",
  "STOP LOSS": "SL",
  MANUAL_EXIT: "MANUAL_EXIT",
  MANUAL:      "MANUAL_EXIT",
  CLOSED:      "CLOSED",
};

function normalizeStatus(value) {
  const key = String(value || "WAITING").trim().replace(/[\s-]+/g, "_").toUpperCase();
  return STATUS_MAP[key] || "WAITING";
}

function normalizeSymbol(rawName, rawSymbol) {
  const source = String(rawSymbol || rawName || "").trim().toUpperCase();
  if (!source) return "";
  if (source.startsWith("^")) return source;
  return source.includes(".") ? source : `${source}.NS`;
}

function normalizeTradePayload(body = {}) {
  const symbol = normalizeSymbol(body.name, body.symbol);
  const name   = String(body.name || symbol || "").replace(".NS", "").trim().toUpperCase();
  return {
    ...body,
    name,
    symbol,
    sector:     String(body.sector     || "Unknown").trim() || "Unknown",
    status:     normalizeStatus(body.status),
    entryType:  String(body.entryType  || "BREAKOUT").trim().replace(/[\s-]+/g, "_").toUpperCase(),
    confidence: String(body.confidence || "MEDIUM").trim().toUpperCase(),
    entry:      Number(body.entry)    || 0,
    sl:         Number(body.sl)       || 0,
    target:     Number(body.target)   || 0,
    target2:    Number(body.target2)  || 0,
    qty:        Number(body.qty)      || 0,
    currentPrice: Number(body.currentPrice) || 0,
    ema200:     Number(body.ema200)   || 0,
    ema50:      Number(body.ema50)    || 0,
    rsi:        Number(body.rsi)      || 0,
  };
}

function normalizeTradeUpdate(body = {}) {
  const out = { ...body };
  if (body.status    !== undefined) out.status    = normalizeStatus(body.status);
  if (body.symbol    !== undefined || body.name !== undefined) {
    out.symbol = normalizeSymbol(body.name, body.symbol);
    if (body.name !== undefined)
      out.name = String(body.name || out.symbol || "").replace(".NS", "").trim().toUpperCase();
  }
  if (body.sector     !== undefined) out.sector     = String(body.sector     || "Unknown").trim() || "Unknown";
  if (body.entryType  !== undefined) out.entryType  = String(body.entryType  || "BREAKOUT").trim().replace(/[\s-]+/g, "_").toUpperCase();
  if (body.confidence !== undefined) out.confidence = String(body.confidence || "MEDIUM").trim().toUpperCase();
  ["entry","sl","target","target2","qty","currentPrice","ema200","ema50","rsi","exitPrice"].forEach(k => {
    if (body[k] !== undefined) out[k] = Number(body[k]) || 0;
  });
  return out;
}

function friendlyDbError(err) {
  const msg = String(err?.message || "");
  if (/timeout|timed out/i.test(msg))      return "Database timeout. Please retry.";
  if (/ECONNREFUSED|ENOTFOUND/i.test(msg)) return "Database connection failed. Please retry.";
  if (/validation/i.test(msg))             return "Invalid trade data: " + msg;
  if (/duplicate|E11000/i.test(msg))       return "A duplicate trade already exists.";
  return "Position could not be saved. Please retry.";
}

async function handler(req, res) {
  try {
    await connectDB();
    const TradeModel = Trade();
    const AlertModel = Alert();
    const { id, action, status } = req.query;

    /* ── GET ─────────────────────────────────── */
    if (req.method === "GET") {
      const filter = status ? { status: normalizeStatus(status) } : {};
      const trades = await TradeModel.find(filter).sort({ createdAt: -1 }).lean();
      return res.json(trades);
    }

    /* ── POST ────────────────────────────────── */
    if (req.method === "POST") {
      // Close trade
      if (action === "close" && id) {
        const { exitPrice, result } = req.body || {};
        const ep = Number(exitPrice) || 0;
        if (ep <= 0) return res.status(400).json({ error: "Invalid exit price." });

        const trade = await TradeModel.findByIdAndUpdate(id, {
          status:    normalizeStatus(result || "MANUAL_EXIT"),
          exitPrice: ep,
          closedAt:  new Date(),
        }, { new: true, runValidators: false });

        if (!trade) return res.status(404).json({ error: "Trade not found" });

        const pl  = ((ep - trade.entry) * (trade.qty || 0)).toFixed(0);
        const msg = `${trade.name} closed at ₹${ep} — ${trade.status} | P&L: ₹${pl}`;

        try {
          await AlertModel.create({
            type: "CLOSED", symbol: trade.name, message: msg,
            severity: ep >= trade.entry ? "SUCCESS" : "DANGER", price: ep,
          });
          await sendTradeAlert({ type: "CLOSED", symbol: trade.name, price: ep, message: msg });
        } catch (alertErr) {
          console.warn("[Trades] Alert/email send failed (non-fatal):", alertErr.message);
        }

        return res.json(trade);
      }

      // Create trade
      const body = normalizeTradePayload(req.body || {});

      if (!body.name) {
        return res.status(400).json({ error: "Stock name is required." });
      }
      if (!body.entry || body.entry <= 0) {
        return res.status(400).json({ error: "Entry price must be greater than zero." });
      }
      if (!body.sl || body.sl <= 0) {
        return res.status(400).json({ error: "Stop loss must be greater than zero." });
      }
      if (!body.target || body.target <= 0) {
        return res.status(400).json({ error: "Target must be greater than zero." });
      }

      // Fetch live price if not supplied
      if (!body.currentPrice && body.symbol) {
        try {
          const q = await fetchQuote(body.symbol);
          if (q?.price) body.currentPrice = q.price;
        } catch (priceErr) {
          console.warn("[Trades] Price fetch failed (non-fatal):", priceErr.message);
          // Fallback to entry price — don't crash
          body.currentPrice = body.entry;
        }
      }

      const trade = await TradeModel.create(body);
      return res.status(201).json({ success: true, trade });
    }

    /* ── PUT ─────────────────────────────────── */
    if (req.method === "PUT") {
      if (!id) return res.status(400).json({ error: "id required" });
      const body  = normalizeTradeUpdate(req.body || {});
      const trade = await TradeModel.findByIdAndUpdate(id, body, { new: true, runValidators: false });
      if (!trade) return res.status(404).json({ error: "Trade not found" });

      try { await checkAlertsForTrade(trade, AlertModel); }
      catch (alertErr) { console.warn("[Trades] Alert check failed (non-fatal):", alertErr.message); }

      return res.json(trade);
    }

    /* ── DELETE ──────────────────────────────── */
    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "id required" });
      await TradeModel.findByIdAndDelete(id);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[Trades] Error:", err);
    const msg = String(err?.message || "");
    return res.status(500).json({
      success:   false,
      error:     friendlyDbError(err),
      retryable: /timeout|network|rate|server/i.test(msg),
    });
  }
}

async function checkAlertsForTrade(trade, AlertModel) {
  const p = trade.currentPrice;
  if (!p) return;
  const fired = new Set(trade.alertsFired || []);

  if (trade.status === "WAITING" && p >= trade.entry * 0.995 && !fired.has("BUY")) {
    const msg = `Entry triggered — price ₹${p} ≥ entry ₹${trade.entry}`;
    await AlertModel.create({ type: "BUY", symbol: trade.name, message: msg, severity: "SUCCESS", price: p });
    await sendTradeAlert({ type: "BUY", symbol: trade.name, price: p, message: msg });
  }
  if (trade.status === "ACTIVE" && p >= trade.target && !fired.has("TARGET")) {
    const msg = `Target hit — ₹${p} ≥ ₹${trade.target}. Book 50% profit.`;
    await AlertModel.create({ type: "TARGET", symbol: trade.name, message: msg, severity: "SUCCESS", price: p });
    await sendTradeAlert({ type: "TARGET", symbol: trade.name, price: p, message: msg });
  }
  if (trade.status === "ACTIVE" && p <= trade.sl && !fired.has("SL")) {
    const msg = `Stop loss hit — ₹${p} ≤ SL ₹${trade.sl}. Exit immediately.`;
    await AlertModel.create({ type: "SL_HIT", symbol: trade.name, message: msg, severity: "DANGER", price: p });
    await sendTradeAlert({ type: "SL_HIT", symbol: trade.name, price: p, message: msg });
  }
}

module.exports = allowCors(handler);
