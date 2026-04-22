"use strict";
const { allowCors }       = require("../../lib/cors");
const { connectDB, User } = require("../../lib/db");
const { signToken }       = require("../../lib/auth");

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  await connectDB();
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: "name, email and password are required" });
  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const UserModel = User();
  const existing  = await UserModel.findOne({ email: email.toLowerCase().trim() });
  if (existing)   return res.status(409).json({ error: "An account with this email already exists" });

  const user  = await UserModel.create({ name: name.trim(), email, password });
  const token = signToken(user._id);
  return res.status(201).json({ token, user: user.toSafeObject() });
}
module.exports = allowCors(handler);
