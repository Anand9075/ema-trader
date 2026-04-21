"use strict";
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

/* ── Serverless MongoDB connection cache ── */
let cached = global._mongoCache;
if (!cached) cached = global._mongoCache = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI env var is not set");
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      })
      .catch(err => { cached.promise = null; throw err; });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

/* ── USER SCHEMA ── */
const UserSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true, minlength: 6 },
  avatar:      { type: String, default: "" },
  capital:     { type: Number, default: 100000 },
  emailAlerts: { type: Boolean, default: true },
  theme:       { type: String, default: "dark" },
}, { timestamps: true });

UserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

UserSchema.methods.toSafeObject = function() {
  const o = this.toObject();
  delete o.password;
  return o;
};

/* ── TRADE SCHEMA ── */
const TradeSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name:         { type: String, required: true },
  symbol:       { type: String, default: "" },
  sector:       { type: String, default: "Other" },
  entry:        { type: Number, required: true },
  sl:           { type: Number, required: true },
  target:       { type: Number, required: true },
  target2:      { type: Number, default: 0 },
  qty:          { type: Number, default: 1 },
  status:       { type: String, default: "WAITING",
                  enum: ["WAITING","ACTIVE","TARGET","SL","MANUAL_EXIT","CLOSED"] },
  currentPrice: { type: Number, default: 0 },
  exitPrice:    { type: Number, default: 0 },
  ema200:       { type: Number, default: 0 },
  ema50:        { type: Number, default: 0 },
  rsi:          { type: Number, default: 0 },
  confidence:   { type: String, default: "MEDIUM" },
  entryType:    { type: String, default: "BREAKOUT" },
  rrRatio:      { type: Number, default: 2 },
  techScore:    { type: Number, default: 0 },
  notes:        { type: String, default: "" },
  alertsFired:  { type: [String], default: [] },
  closedAt:     { type: Date, default: null },
}, { timestamps: true });

/* ── ALERT SCHEMA ── */
const AlertSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type:      { type: String, required: true },
  symbol:    { type: String, required: true },
  message:   { type: String, required: true },
  severity:  { type: String, default: "INFO" },
  price:     { type: Number, default: 0 },
  read:      { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
}, { timestamps: true });

/* ── SNAPSHOT SCHEMA (for portfolio chart) ── */
const SnapshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date:   { type: String, required: true },   // "YYYY-MM-DD"
  value:  { type: Number, required: true },
  pnl:    { type: Number, default: 0 },
}, { timestamps: true });
SnapshotSchema.index({ userId: 1, date: 1 }, { unique: true });

/* ── Model factory (safe for serverless) ── */
function getModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

module.exports = {
  connectDB,
  User:     () => getModel("User",     UserSchema),
  Trade:    () => getModel("Trade",    TradeSchema),
  Alert:    () => getModel("Alert",    AlertSchema),
  Snapshot: () => getModel("Snapshot", SnapshotSchema),
};
