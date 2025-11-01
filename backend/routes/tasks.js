// backend/routes/tasks.js
import { Router } from "express";
import { prisma } from "../src/prisma.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

// GET /api/tasks  (list)
router.get("/tasks", authRequired, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.user.id },
    orderBy: [{ createdAt: "desc" }]
  });
  res.json({ tasks });
});

// POST /api/tasks  (create)
router.post("/tasks", authRequired, async (req, res) => {
  const { title } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: "TITLE_REQUIRED" });

  const task = await prisma.task.create({
    data: { userId: req.user.id, title: title.trim() }
  });

  // realtime emit
  req.app.get("io")?.to(`user:${req.user.id}`).emit("task_created", task);

  res.json({ task });
});

// PATCH /api/tasks/:id  (rename)
router.patch("/tasks/:id", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const { title } = req.body || {};
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.userId !== req.user.id) return res.status(404).json({ error: "NOT_FOUND" });

  const updated = await prisma.task.update({
    where: { id },
    data: { title: title ?? task.title }
  });

  req.app.get("io")?.to(`user:${req.user.id}`).emit("task_updated", updated);
  res.json({ task: updated });
});

// POST /api/tasks/:id/complete  (toggle complete)
router.post("/tasks/:id/complete", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.userId !== req.user.id) return res.status(404).json({ error: "NOT_FOUND" });

  const isCompleted = !task.isCompleted;
  const updated = await prisma.task.update({
    where: { id },
    data: {
      isCompleted,
      completedAt: isCompleted ? new Date() : null
    }
  });

  req.app.get("io")?.to(`user:${req.user.id}`).emit("task_updated", updated);
  res.json({ task: updated });
});

// DELETE /api/tasks/:id
router.delete("/tasks/:id", authRequired, async (req, res) => {
  const id = Number(req.params.id);
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.userId !== req.user.id) return res.status(404).json({ error: "NOT_FOUND" });

  await prisma.task.delete({ where: { id } });
  req.app.get("io")?.to(`user:${req.user.id}`).emit("task_deleted", { id });
  res.json({ ok: true });
});

// DELETE /api/tasks  (clear all user's tasks)
router.delete("/tasks", authRequired, async (req, res) => {
  await prisma.task.deleteMany({ where: { userId: req.user.id } });
 // realtime notify (optional)
  req.app.get("io")?.to(`user:${req.user.id}`).emit("tasks_cleared", {});
  res.json({ ok: true });
});

export default router;
