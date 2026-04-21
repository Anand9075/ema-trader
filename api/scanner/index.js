"use strict";
const { allowCors }           = require("../../lib/cors");
const { connectDB, Alert }    = require("../../lib/db");
const { requireAuth }         = require("../../lib/auth");
const { runScanner }          = require("../../lib/strategy");

function withTimeout(p, ms, msg) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms)),
  ]);
}

async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Hard 26-second limit (Vercel function max is 30s)
    const result = await withTimeout(
      runScanner(),
      26000,
      "Scanner timed out after 26s — try again"
    );

    // Save a selection alert for this user
    if (result.picks?.length > 0) {
      try {
        await connectDB();
        await Alert().create({
          userId:   req.userId,
          type:     "SELECTION",
          symbol:   "SCANNER",
          message:  `Scan complete: ${result.picks.map(p => p.name).join(" | ")} (${result.elapsed}s)`,
          severity: "INFO",
        });
      } catch { /* non-fatal */ }
    }

    return res.json({ success: true, ...result });
  } catch (e) {
    console.error("[Scanner]", e.message);
    return res.status(500).json({
      success: false,
      error:   e.message,
      hint:    "Yahoo Finance may be rate-limiting. Wait 60 seconds and try again.",
    });
  }
}
module.exports = allowCors(requireAuth(handler));

export default handler;