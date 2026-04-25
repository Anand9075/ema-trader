"use strict";
const { allowCors }       = require("../../lib/cors");
const { connectDB, User } = require("../../lib/db");
const { requireAuth }     = require("../../lib/auth");

async function handler(req, res) {
  await connectDB();

  /* ── GET: fetch current user profile ── */
  if (req.method === "GET") {
    const user = await User().findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user.toSafeObject());
  }

  /* ── PUT: update profile / change password ── */
  if (req.method === "PUT") {
    const { name, capital, emailAlerts, theme, currentPassword, newPassword } = req.body || {};

    const user = await User().findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Apply non-password updates
    if (name        !== undefined) user.name        = name.trim();
    if (capital     !== undefined) user.capital      = Number(capital);
    if (emailAlerts !== undefined) user.emailAlerts  = emailAlerts;
    if (theme       !== undefined) user.theme        = theme;

    // Password change
    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ error: "currentPassword is required to change password" });
      const ok = await user.comparePassword(currentPassword);
      if (!ok)
        return res.status(401).json({ error: "Current password is incorrect" });
      if (newPassword.length < 6)
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      user.password = newPassword;  // pre-save hook will hash it
    }

    await user.save();
    return res.json(user.toSafeObject());
  }

  return res.status(405).json({ error: "Method not allowed" });
}
module.exports = allowCors(requireAuth(handler));
