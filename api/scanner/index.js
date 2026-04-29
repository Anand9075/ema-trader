"use strict";
const { allowCors }  = require("../lib/cors");
const { runScanner } = require("../lib/strategy");
const { connectDB, Alert } = require("../lib/db");

function withTimeout(promise, ms, msg) {
  let timer;
  const timeout = new Promise((_, reject) =>
    (timer = setTimeout(() => reject(new Error(msg)), ms))
  );
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function friendlyError(err) {
  const msg = String(err?.message || "Unknown error");
  if (/timeout|timed out/i.test(msg))
    return "Scanner timed out. NSE data is slow — please retry in 30 seconds.";
  if (/429|rate.?limit/i.test(msg))
    return "Yahoo Finance is rate-limiting requests. Please wait 60 seconds and retry.";
  if (/ECONNREFUSED|ENOTFOUND|network/i.test(msg))
    return "Network error reaching market data provider. Please retry.";
  if (/FUNCTION_INVOCATION_FAILED/i.test(msg))
    return "Serverless function error. This is usually temporary — please retry.";
  return "Scanner encountered an error. Please retry in 30 seconds.";
}

async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("[Scanner] Starting scan…");

    const result = await withTimeout(
      runScanner(),
      24_000,
      "Scanner timed out. NSE data is slow — please retry in 30 seconds."
    );

    // Persist alert (best-effort, never crash on failure)
    try {
      await connectDB();
      const AlertModel = Alert();
      if (result.picks?.length > 0) {
        await AlertModel.create({
          type:     "SELECTION",
          symbol:   "SCANNER",
          message:  `Monthly picks: ${result.picks.map(p => p.name).join(" | ")}`,
          severity: "INFO",
        });
      }
    } catch (dbErr) {
      console.warn("[Scanner] DB alert save failed (non-fatal):", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    const msg = String(err?.message || "");
    console.error("[Scanner] Error:", msg);

    const isTimeout  = /timed? ?out/i.test(msg);
    const isRateLimit= /429|rate.?limit/i.test(msg);
    const status     = isTimeout ? 504 : isRateLimit ? 429 : 502;

    return res.status(status).json({
      success:   false,
      error:     friendlyError(err),
      retryable: true,
      hint:      "Market data provider may be slow. Retry after 60 seconds.",
    });
  }
}

module.exports = allowCors(handler);
