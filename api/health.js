"use strict";

const { allowCors } = require("../lib/cors");

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dbOk    = !!process.env.MONGODB_URI;
  const jwtOk   = !!process.env.JWT_SECRET;
  const emailOk = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

  let yfOk  = false;
  let yfErr = null;
  
  try {
    const { fetchQuote } = require("../lib/yahoo");
    const q = await Promise.race([
      fetchQuote("RELIANCE.NS"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
    ]);
    yfOk = !!(q?.price);
  } catch (e) {
    yfErr = e.message;
  }

  const status = (dbOk && jwtOk && yfOk) ? "ok" : "degraded";

  // Respond with a 200 OK and the detailed diagnostic JSON
  return res.status(200).json({
    status,
    version:  "1.0.0",
    time:     new Date().toISOString(),
    env: {
      MONGODB_URI:   dbOk    ? "✅ set"       : "❌ MISSING — add in Vercel env vars",
      JWT_SECRET:    jwtOk   ? "✅ set"       : "❌ MISSING — add in Vercel env vars",
      EMAIL_USER:    emailOk ? "✅ set"       : "⚠️  not set (optional, for email alerts)",
      TOTAL_CAPITAL: process.env.TOTAL_CAPITAL || "100000 (default)",
    },
    yahooFinance: yfOk ? "✅ live" : `❌ ${yfErr}`,
    node:   process.version,
    region: process.env.VERCEL_REGION || "local",
  });
}

// Ensure we only export ONCE using CommonJS
module.exports = allowCors(handler);