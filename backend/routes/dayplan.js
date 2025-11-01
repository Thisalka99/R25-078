// backend/routes/dayplan.js
import { Router } from "express";
import { prisma } from "../src/prisma.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

// Set/replace today's deadline for the user
// POST /api/dayplan
// body: { dueAt: "2025-10-13T17:00:00.000Z" }
router.post("/dayplan", authRequired, async (req, res) => {
  const { dueAt } = req.body || {};
  if (!dueAt) return res.status(400).json({ error: "DUE_AT_REQUIRED" });

  // Close any previous plans (optional) and create a new one
  const dp = await prisma.dayPlan.create({
    data: { userId: req.user.id, dueAt: new Date(dueAt) },
  });
  res.json({ dayplan: dp });
});

// Get the most recent active plan (latest)
router.get("/dayplan", authRequired, async (req, res) => {
  const dp = await prisma.dayPlan.findFirst({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ dayplan: dp || null, serverTime: new Date().toISOString() });
});

// Report summary: are all tasks complete?
router.get("/tasks/summary", authRequired, async (req, res) => {
  const total = await prisma.task.count({ where: { userId: req.user.id } });
  const done = await prisma.task.count({ where: { userId: req.user.id, isCompleted: true } });
  res.json({ total, done, allComplete: total > 0 && total === done, serverTime: new Date().toISOString() });
});

// DELETE /api/dayplan  (clear today's plan/deadline)
router.delete("/dayplan", authRequired, async (req, res) => {
 await prisma.dayPlan.deleteMany({ where: { userId: req.user.id } });
 res.json({ ok: true });
});

export default router;
