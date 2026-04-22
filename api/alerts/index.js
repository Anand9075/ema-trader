"use strict";
const { allowCors }           = require("../../lib/cors");
const { connectDB, Alert }    = require("../../lib/db");
const  requireAuth         = require("../../lib/auth");
const { sendAlert: sendEmail }= require("../../lib/email");
const { connectDB: _db, User }= require("../../lib/db");

async function handler(req, res) {
  await connectDB();
  const AL = Alert();
  const { id, action, since, unread } = req.query;

  /* ── GET ── */
  if (req.method === "GET") {
    const filter = { userId: req.userId };
    if (since)  filter.createdAt = { $gt: new Date(Number(since)) };
    if (unread) filter.read = false;
    const alerts = await AL.find(filter).sort({ createdAt: -1 }).limit(300).lean();
    return res.json(alerts);
  }

  /* ── PUT: mark read ── */
  if (req.method === "PUT") {
    if (action === "read-all") {
      await AL.updateMany({ userId: req.userId, read: false }, { read: true });
      return res.json({ ok: true });
    }
    if (id) {
      await AL.findOneAndUpdate({ _id: id, userId: req.userId }, { read: true });
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: "Provide id or action=read-all" });
  }

  /* ── POST: create alert manually ── */
  if (req.method === "POST") {
    const body  = req.body || {};
    const alert = await AL.create({ ...body, userId: req.userId });

    // Optionally send email for critical types
    if (["TARGET","SL_HIT"].includes(body.type)) {
      try {
        const u    = await User().findById(req.userId).lean();
        if (u?.emailAlerts && u?.email) {
          const sent = await sendEmail({
            to:      u.email,
            type:    body.type,
            symbol:  body.symbol,
            price:   body.price,
            message: body.message,
          });
          if (sent) await AL.findByIdAndUpdate(alert._id, { emailSent: true });
        }
      } catch (e) {
        console.warn("[Alerts] email send failed:", e.message);
      }
    }
    return res.status(201).json(alert);
  }

  /* ── DELETE ── */
  if (req.method === "DELETE") {
    if (!id) return res.status(400).json({ error: "id required" });
    await AL.findOneAndDelete({ _id: id, userId: req.userId });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
module.exports = allowCors(requireAuth(handler));
