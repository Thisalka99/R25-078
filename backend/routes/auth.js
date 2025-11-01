// backend/routes/auth.js
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../src/prisma.js";
const router = Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
}

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, ageGroup, gender } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "EMAIL_EXISTS" });

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hash, ageGroup: ageGroup || null, gender: gender || null }
    });
    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, ageGroup: user.ageGroup, gender: user.gender } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "REGISTER_FAILED" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, ageGroup: user.ageGroup, gender: user.gender } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "LOGIN_FAILED" });
  }
});

// PATCH /auth/profile  (update ageGroup/gender)
router.patch("/profile", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "NO_TOKEN" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const { ageGroup, gender } = req.body || {};
    const user = await prisma.user.update({
      where: { id: payload.sub },
      data: { ageGroup: ageGroup ?? undefined, gender: gender ?? undefined }
    });
    res.json({ user: { id: user.id, email: user.email, ageGroup: user.ageGroup, gender: user.gender } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "PROFILE_UPDATE_FAILED" });
  }
});

export default router;
