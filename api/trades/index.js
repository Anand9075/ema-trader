"use strict";
const { allowCors }                    = require("../../lib/cors");
const { connectDB, Trade, Alert, User }= require("../../lib/db");
const  requireAuth                 = require("../../lib/auth");
const { fetchQuote }                   = require("../../lib/yahoo");
const { sendAlert }                    = require("../../lib/email");

/* ── Alert checking after price update ── */
async function checkAndFireAlerts(trade, AlertModel, userEmail, emailAlerts) {
  const p    = trade.currentPrice;
  if (!p)    return;
  const fired = new Set(trade.alertsFired || []);
  const toCreate = [];

  if (trade.status === "WAITING" && p >= trade.entry * 0.995 && !fired.has("BUY")) {
    toCreate.push({ type:"BUY", symbol:trade.name,
      message:`Entry triggered — CMP ₹${p} ≥ entry ₹${trade.entry}`, severity:"INFO", price:p });
    fired.add("BUY");
  }
  if (trade.status === "ACTIVE" && p >= trade.target && !fired.has("TARGET")) {
    toCreate.push({ type:"TARGET", symbol:trade.name,
      message:`Target hit! CMP ₹${p} ≥ target ₹${trade.target}. Book 50% profit.`, severity:"SUCCESS", price:p });
    fired.add("TARGET");
  }
  if (["ACTIVE","WAITING"].includes(trade.status) && p <= trade.sl && !fired.has("SL")) {
    toCreate.push({ type:"SL_HIT", symbol:trade.name,
      message:`Stop loss hit. CMP ₹${p} ≤ SL ₹${trade.sl}. Exit now.`, severity:"DANGER", price:p });
    fired.add("SL");
  }

  for (const al of toCreate) {
    try {
      const created = await AlertModel.create({ ...al, userId: trade.userId });
      if (emailAlerts && userEmail && ["TARGET","SL_HIT"].includes(al.type)) {
        const sent = await sendAlert({ to: userEmail, ...al });
        if (sent) await AlertModel.findByIdAndUpdate(created._id, { emailSent: true });
      }
    } catch (e) {
      console.error("[Alerts] create failed:", e.message);
    }
  }

  if (fired.size > (trade.alertsFired || []).length) {
    await Trade().findByIdAndUpdate(trade._id, { alertsFired: [...fired] });
  }
}

async function handler(req, res) {
  await connectDB();
  const T  = Trade();
  const AL = Alert();
  const { id, action } = req.query;

  /* ── GET: list trades ── */
  if (req.method === "GET") {
    const filter = { userId: req.userId };
    if (req.query.status) filter.status = req.query.status;
    const trades = await T.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(trades);
  }

  /* ── POST: create or close ── */
  if (req.method === "POST") {
    // Close trade
    if (action === "close" && id) {
      const { exitPrice, result, exitDate } = req.body || {};
      const trade = await T.findOneAndUpdate(
        { _id: id, userId: req.userId },
        { status: result || "MANUAL_EXIT", exitPrice: Number(exitPrice) || 0, closedAt: exitDate ? new Date(exitDate) : new Date() },
        { new: true }
      );
      if (!trade) return res.status(404).json({ error: "Trade not found" });

      const u   = await User().findById(req.userId).lean();
      const pl  = ((Number(exitPrice) - trade.entry) * (trade.qty || 1)).toFixed(0);
      const msg = `${trade.name} closed at ₹${exitPrice} — ${result} | P&L: ₹${pl}`;
      const isWin = Number(exitPrice) >= trade.entry;

      await AL.create({ userId: req.userId, type: "CLOSED", symbol: trade.name,
        message: msg, severity: isWin ? "SUCCESS" : "DANGER", price: Number(exitPrice) });

      if (u?.emailAlerts && u?.email) {
        await sendAlert({ to: u.email, type: "CLOSED", symbol: trade.name,
          price: exitPrice, message: msg });
      }
      return res.json(trade);
    }

    // Create trade
    const body = req.body || {};
    if (!body.entry || !body.sl || !body.target)
      return res.status(400).json({ error: "entry, sl and target are required" });

    body.userId  = req.userId;
    body.name    = (body.name || body.symbol || "").replace(".NS", "").toUpperCase();
    body.symbol  = body.symbol || `${body.name}.NS`;
    body.qty     = Number(body.qty) || 1;

    // Fetch live price if not provided
    if (!body.currentPrice || body.currentPrice === 0) {
      try {
        const q = await fetchQuote(body.symbol);
        if (q?.price) body.currentPrice = q.price;
      } catch {}
    }

    const trade = await T.create(body);
    return res.status(201).json(trade);
  }

  /* ── PUT: update trade ── */
  if (req.method === "PUT") {
    if (!id) return res.status(400).json({ error: "id query param required" });
    const trade = await T.findOneAndUpdate(
      { _id: id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    // Check alerts on price update
    if (req.body.currentPrice) {
      try {
        const u = await User().findById(req.userId).lean();
        await checkAndFireAlerts(trade, AL, u?.email, u?.emailAlerts);
      } catch (e) {
        console.warn("[Alerts] check failed:", e.message);
      }
    }
    return res.json(trade);
  }

  /* ── DELETE: remove trade ── */
  if (req.method === "DELETE") {
    if (!id) return res.status(400).json({ error: "id query param required" });
    await T.findOneAndDelete({ _id: id, userId: req.userId });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
module.exports = allowCors(requireAuth(handler));