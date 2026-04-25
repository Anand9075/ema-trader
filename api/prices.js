"use strict";
const { allowCors }   = require("../lib/cors");
const { fetchQuotes } = require("../lib/yahoo");

async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    const { symbols } = req.query;
    if (!symbols) return res.json({ prices: {}, updated: new Date().toISOString() });
    const list = symbols.split(",").map(s => s.trim()).filter(Boolean).slice(0, 20);
    if (list.length === 0) return res.json({ prices: {}, updated: new Date().toISOString() });
    const prices = await fetchQuotes(list);
    return res.json({ prices, updated: new Date().toISOString() });
  } catch (e) {
    console.error("[Prices]", e);
    return res.status(503).json({
      prices: {},
      error: "Live prices are temporarily unavailable.",
      detail: e.message,
      updated: new Date().toISOString(),
    });
  }
}
module.exports = allowCors(handler);
