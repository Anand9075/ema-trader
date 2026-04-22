"use strict";
const { allowCors }       = require("../../lib/cors");
const { connectDB, User } = require("../../lib/db");
const { signToken }       = require("../../lib/auth");

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  await connectDB();
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  const user = await User().findOne({ email: email.toLowerCase().trim() });
  if (!user)   return res.status(401).json({ error: "Invalid email or password" });
  const ok = await user.comparePassword(password);
  if (!ok)     return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken(user._id);
  return res.json({ token, user: user.toSafeObject() });
}
module.exports = allowCors(handler);
