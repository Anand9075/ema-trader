"use strict";
const { allowCors }   = require("../lib/cors");
const { fetchQuotes } = require("../lib/yahoo");

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { symbols } = req.query;
  if (!symbols) return res.json({ prices: {}, updated: new Date().toISOString() });
  const list   = symbols.split(",").map(s => s.trim()).filter(Boolean);
  if (list.length === 0) return res.json({ prices: {}, updated: new Date().toISOString() });
  const prices = await fetchQuotes(list);
  return res.json({ prices, updated: new Date().toISOString() });
}
module.exports = allowCors(handler);
