// backend/routes/history.js
import { Router } from "express";

const router = Router();

// In-memory store (dev only). Replace with a DB in prod.
const store = {
  logs: [] // { ts, payload, result }
};

// GET /api/history
router.get("/", (req, res) => {
  res.json({ logs: store.logs.slice(-200).reverse() }); // latest first, limit 200
});

// POST /api/history (internal helper if needed)
router.post("/", (req, res) => {
  const { payload, result } = req.body || {};
  const ts = new Date().toISOString();
  store.logs.push({ ts, payload, result });
  res.json({ ok: true });
});

// util to export push function
export function pushLog(entry) {
  const ts = new Date().toISOString();
  store.logs.push({ ts, ...entry });
}

export default router;
