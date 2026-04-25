"use strict";
// BUG FIXED: now returns activeTrades as full array, not just a count
const { allowCors }                   = require("../../lib/cors");
const { connectDB, Trade, Snapshot }  = require("../../lib/db");
const { requireAuth }                 = require("../../lib/auth");
const { fetchQuotes }                 = require("../../lib/yahoo");

async function handler(req, res) {
  await connectDB();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const action = req.query.action;

  /* ── Snapshot history for portfolio chart ── */
  if (action === "snapshots") {
    const snaps = await Snapshot().find({ userId: req.userId })
      .sort({ date: 1 }).limit(90).lean();
    return res.json(snaps);
  }

  /* ── Full portfolio stats + active trade list ── */
  const allTrades = await Trade().find({ userId: req.userId }).lean();
  const active    = allTrades.filter(t => !["TARGET","SL","MANUAL_EXIT","CLOSED"].includes(t.status));
  const closed    = allTrades.filter(t =>  ["TARGET","SL","MANUAL_EXIT","CLOSED"].includes(t.status));

  // Fetch live prices for active positions
  const symbols = [...new Set(active.map(t => t.symbol || `${t.name}.NS`).filter(Boolean))];
  let prices = {};
  if (symbols.length > 0) {
    try { prices = await fetchQuotes(symbols); } catch {}
  }

  // Attach live price to each active trade object
  const activeWithPrices = active.map(t => {
    const sym = t.symbol || `${t.name}.NS`;
    const q   = prices[sym];
    return { ...t, currentPrice: q?.price || t.currentPrice || t.entry, liveChange: q?.change || 0, liveChangePct: q?.changePct || 0 };
  });

  // Portfolio calculations
  const invested = active.reduce((s, t) => s + (t.qty || 0) * t.entry, 0);
  const current  = activeWithPrices.reduce((s, t) => s + (t.qty || 0) * t.currentPrice, 0);
  const pnl      = current - invested;
  const pnlPct   = invested > 0 ? (pnl / invested * 100) : 0;

  // Historical P&L from closed trades
  const histPnl = closed.reduce((s, t) => s + ((t.exitPrice || t.entry) - t.entry) * (t.qty || 0), 0);
  const wins    = closed.filter(t => (t.exitPrice || 0) >= t.entry).length;
  const winRate = closed.length > 0 ? Math.round(wins / closed.length * 100) : 0;

  // Today's P&L from live change data
  const todayPnl = activeWithPrices.reduce((s, t) => s + (t.qty || 0) * (t.liveChange || 0), 0);

  // Sector allocation (current value per sector)
  const sectorMap = {};
  activeWithPrices.forEach(t => {
    const val = (t.qty || 0) * t.currentPrice;
    const sec = t.sector || "Other";
    sectorMap[sec] = (sectorMap[sec] || 0) + val;
  });

  // Save today's snapshot
  const today = new Date().toISOString().slice(0, 10);
  try {
    await Snapshot().findOneAndUpdate(
      { userId: req.userId, date: today },
      { value: Math.round(current), pnl: Math.round(pnl) },
      { upsert: true }
    );
  } catch { /* non-fatal */ }

  return res.json({
    // Stats
    invested:       Math.round(invested),
    current:        Math.round(current),
    pnl:            Math.round(pnl),
    pnlPct:         Math.round(pnlPct * 100) / 100,
    todayPnl:       Math.round(todayPnl),
    histPnl:        Math.round(histPnl),
    wins,
    losses:         closed.length - wins,
    winRate,
    totalTrades:    allTrades.length,
    closedTrades:   closed.length,
    sectorAllocation: sectorMap,
    prices,

    // FIX: return full array so Dashboard can render trade cards
    activeTrades:   activeWithPrices,
  });
}
module.exports = allowCors(requireAuth(handler));
