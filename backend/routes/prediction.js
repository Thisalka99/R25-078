// backend/routes/prediction.js
import { Router } from 'express';
import axios from 'axios';
import { pushLog } from './history.js';  // add this line

const router = Router();
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

router.get('/schema', async (req, res) => {
  try {
    const r = await axios.get(`${FASTAPI_URL}/schema`, { timeout: 10000 });
    res.json(r.data);
  } catch (err) {
    console.error('Schema error:', err?.response?.data || err.message);
    res.status(err?.response?.status || 500).json({
      error: 'SCHEMA_FAILED',
      detail: err?.response?.data || err.message
    });
  }
});

router.post('/predict', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || !('data' in req.body)) {
      return res.status(400).json({ error: 'BAD_REQUEST', detail: 'Body must include a `data` field.' });
    }
    const r = await axios.post(`${FASTAPI_URL}/predict`, req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });
    // Log request & response (last result only for brevity)
    const first = r?.data?.results?.[0] ?? null;
    pushLog({ payload: req.body, result: first });
    res.json(r.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const detail = err?.response?.data || err.message;
    console.error('Predict error:', detail);
    res.status(status).json({ error: 'PREDICT_FAILED', detail });
  }
});



// POST /api/predict_text -> FastAPI /predict_text
router.post('/predict_text', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || !('text' in req.body)) {
      return res.status(400).json({ error: 'BAD_REQUEST', detail: 'Body must include a `text` field (string or list).' });
    }
    const { threshold } = req.query; // optional
    const url = `${FASTAPI_URL}/predict_text${threshold ? `?threshold=${encodeURIComponent(threshold)}` : ''}`;
    const r = await axios.post(url, req.body, { headers: {'Content-Type':'application/json'}, timeout: 30000 });
    res.json(r.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: 'PREDICT_TEXT_FAILED', detail: err?.response?.data || err.message });
  }
});

// POST /api/predict_text_per_question -> FastAPI /predict_text_per_question
router.post('/predict_text_per_question', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || !('text' in req.body)) {
      return res.status(400).json({ error: 'BAD_REQUEST', detail: 'Body must include a `text` field (string or list).' });
    }
    const { threshold } = req.query; // optional
    const url = `${FASTAPI_URL}/predict_text_per_question${threshold ? `?threshold=${encodeURIComponent(threshold)}` : ''}`;
    const r = await axios.post(url, req.body, { headers: {'Content-Type':'application/json'}, timeout: 60000 });
    res.json(r.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ error: 'PREDICT_TEXT_PER_Q_FAILED', detail: err?.response?.data || err.message });
  }
});


export default router;
