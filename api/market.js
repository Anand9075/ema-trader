"use strict";
const { allowCors }   = require("../lib/cors");
const { fetchQuotes } = require("../lib/yahoo");

function isMarketOpen() {
  const d   = new Date();
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const t = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return t >= 555 && t <= 930;   // 9:15 AM – 3:30 PM IST
}

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const INDICES = ["^NSEI", "^NSEBANK", "^INDIAVIX"];
  let indices = {};
  try {
    indices = await fetchQuotes(INDICES);
  } catch (e) {
    console.warn("[Market] fetchQuotes failed:", e.message);
  }
  return res.json({
    indices,
    marketOpen: isMarketOpen(),
    time:       new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    updated:    new Date().toISOString(),
  });
}
module.exports = allowCors(handler);