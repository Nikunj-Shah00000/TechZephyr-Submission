import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

export async function hashPassword(password) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password, hash) { return bcrypt.compare(password, hash); }

export function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "development-only-secret", { expiresIn: "7d" });
}

export function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "development-only-secret");
    req.userId = payload.userId;
    next();
  } catch { res.status(401).json({ error: "Invalid or expired session" }); }
}
