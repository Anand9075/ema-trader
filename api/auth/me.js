"use strict";
// BUG FIXED: was User()() — double invocation. Now correctly User()
const { allowCors }       = require("../../lib/cors");
const { connectDB, User } = require("../../lib/db");
const  requireAuth      = require("../../lib/auth");

async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    const user = await User().findById(req.userId);   // ← FIXED: was User()()
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user.toSafeObject());
  }

  if (req.method === "PUT") {
    const { name, capital, emailAlerts, theme } = req.body || {};
    const user = await User().findByIdAndUpdate(    // ← FIXED: was User()()
      req.userId,
      { ...(name        !== undefined && { name }),
        ...(capital      !== undefined && { capital: Number(capital) }),
        ...(emailAlerts  !== undefined && { emailAlerts }),
        ...(theme        !== undefined && { theme }) },
      { new: true, runValidators: false }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user.toSafeObject());
  }

  return res.status(405).json({ error: "Method not allowed" });
}

module.exports = allowCors(requireAuth(handler));