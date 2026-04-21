"use strict";
const nodemailer = require("nodemailer");

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    pool: true,
    maxConnections: 3,
  });
  return _transporter;
}

/**
 * Send a trade alert email.
 * Silently returns false if email is not configured.
 */
async function sendAlert({ to, type, symbol, price, message, details = {} }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email] Not configured — skipping: ${type} ${symbol}`);
    return false;
  }
  const colors = { TARGET: "#22c55e", SL_HIT: "#ef4444", BUY: "#3b82f6", CLOSED: "#f59e0b", DEFAULT: "#94a3b8" };
  const col = colors[type] || colors.DEFAULT;
  const priceStr = price ? `₹${Number(price).toLocaleString("en-IN")}` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#080d1a;font-family:monospace">
<div style="max-width:520px;margin:24px auto;background:#101828;border:1px solid rgba(255,255,255,0.07);border-top:3px solid ${col};border-radius:8px;overflow:hidden">
  <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.07)">
    <span style="font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:0.08em">${type.replace("_"," ")}</span>
    <h2 style="color:${col};margin:6px 0 0;font-size:18px">${symbol}</h2>
  </div>
  <div style="padding:20px 24px">
    ${priceStr ? `<p style="color:#94a3b8;font-size:14px;margin:0 0 16px">Price: <strong style="color:${col};font-size:20px">${priceStr}</strong></p>` : ""}
    <p style="color:#94a3b8;font-size:13px;margin:0 0 16px;line-height:1.6">${message}</p>
    ${Object.entries(details).map(([k, v]) => `<p style="color:#475569;font-size:12px;margin:4px 0">${k}: <span style="color:#94a3b8">${v}</span></p>`).join("")}
  </div>
  <div style="padding:12px 24px;border-top:1px solid rgba(255,255,255,0.07)">
    <p style="color:#1e293b;font-size:11px;margin:0">EMA Trading Terminal · ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
  </div>
</div>
</body>
</html>`;

  try {
    await t.sendMail({
      from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `[EMA Terminal] ${type.replace("_"," ")} — ${symbol}${priceStr ? " @ " + priceStr : ""}`,
      text:    message,
      html,
    });
    console.log(`[Email] ✅ Sent: ${type} ${symbol} to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] ❌ Failed:`, err.message);
    return false;
  }
}

module.exports = { sendAlert };
