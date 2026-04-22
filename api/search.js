"use strict";
const { allowCors }    = require("../lib/cors");
const { searchLocal }  = require("../lib/nse-stocks");
const { searchSymbol } = require("../lib/yahoo");

async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const q = (req.query.q || "").trim();

  // Always return instant local results
  const local = searchLocal(q);

  // For queries >= 3 chars, also try Yahoo Finance (with 4s timeout)
  let remote = [];
  if (q.length >= 3) {
    try {
      remote = await Promise.race([
        searchSymbol(q),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
      ]) || [];
    } catch { /* silent — fall back to local */ }
  }

  // Merge: local results first, then remote extras (deduped)
  const seen   = new Set(local.map(s => s.symbol));
  const merged = [...local, ...remote.filter(r => !seen.has(r.symbol))].slice(0, 12);

  return res.json({ results: merged, source: remote.length > 0 ? "merged" : "local" });
}
module.exports = allowCors(handler);
