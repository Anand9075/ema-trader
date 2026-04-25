"use strict";
const { allowCors }  = require("../lib/cors");
const { runScanner } = require("../lib/strategy");
const { connectDB, Alert } = require("../lib/db");

function withTimeout(promise, ms, msg) {
  let timer;
  const timeout = new Promise((_, reject) =>
    timer = setTimeout(() => reject(new Error(msg)), ms)
  );
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("[Scanner] Starting scan...");
    const result = await withTimeout(runScanner(), 25_000, "Scanner timed out. Please retry in a minute.");

    // Persist a selection alert in DB (best-effort)
    try {
      await connectDB();
      const AlertModel = Alert();
      if (result.picks?.length > 0) {
        await AlertModel.create({
          type:     "SELECTION",
          symbol:   "SCANNER",
          message:  `Monthly picks: ${result.picks.map(p=>p.name).join(" | ")}`,
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
    console.error("[Scanner] Error:", err);
    return res.status(err.message.includes("timed out") ? 504 : 502).json({
      success: false,
      error: "Scanner is temporarily unavailable.",
      detail: err.message,
      retryable: true,
      hint: "Market data provider is rate-limiting or slow. Retry after 60 seconds.",
    });
  }
}

module.exports = allowCors(handler);

