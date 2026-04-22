"use strict";
const jwt = require("jsonwebtoken");

const SECRET  = process.env.JWT_SECRET  || "dev_secret_CHANGE_IN_PRODUCTION_min_32_chars";
const EXPIRES = process.env.JWT_EXPIRES_IN || "7d";

function signToken(userId) {
  return jwt.sign({ id: String(userId) }, SECRET, { expiresIn: EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

/**
 * requireAuth — middleware that reads the Bearer token, verifies it,
 * and attaches req.userId. Returns 401 if missing/invalid.
 */
function requireAuth(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.slice(7);
    try {
      const decoded = verifyToken(token);
      req.userId = decoded.id;
      return await handler(req, res);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
    }
  };
}

module.exports = { signToken, verifyToken, requireAuth };
