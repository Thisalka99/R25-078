// backend/src/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';

import predictionRouter from '../routes/prediction.js';
import authRouter from '../routes/auth.js';
import tasksRouter from '../routes/tasks.js';
import dayplanRouter from '../routes/dayplan.js';

const app = express();

// middleware
app.use(cors()); // tighten in prod
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/api', dayplanRouter);

// health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', node: process.version, fastapi: process.env.FASTAPI_URL });
});

// ---------- NEW: proxy /api/explain to FastAPI ----------
const FASTAPI = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';
app.post('/api/explain', async (req, res) => {
  try {
    // FastAPI expects { data: row }
    const { data } = await axios.post(`${FASTAPI}/explain`, req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });
    res.json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const payload = err?.response?.data || { detail: err.message || 'Explain request failed' };
    res.status(status).json(payload);
  }
});
// -------------------------------------------------------

// routes
app.use('/auth', authRouter);     // /auth/register, /auth/login, /auth/profile
app.use('/api', predictionRouter);
app.use('/api', tasksRouter);

// http + socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET","POST","PATCH","DELETE"] }
});

// expose io to routers
app.set("io", io);

// minimal auth binding for sockets: client should emit 'auth' with token after connect
io.on('connection', (socket) => {
  socket.on('auth', (payload) => {
    try {
      const { token } = payload || {};
      if (!token) return;
      // In production verify JWT and extract user id.
    } catch {}
  });

  socket.on('join_user_room', ({ userId }) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Node BFF listening on http://localhost:${PORT}`);
});
