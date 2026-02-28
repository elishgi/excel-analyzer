import express from 'express';
import {
  helmetMiddleware,
  corsMiddleware,
  apiLimiter,
  authLimiter,
} from './middlewares/security.middleware.js';
import healthRouter      from './routes/health.routes.js';
import authRouter        from './routes/auth.routes.js';
import dictionaryRouter  from './routes/dictionary.routes.js';
import importsRouter, { transactionsRouter } from './routes/imports.routes.js';
import reportsRouter     from './routes/reports.routes.js';
import { errorHandler }  from './middlewares/error.middleware.js';

const app = express();

// ── Security ───────────────────────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(corsMiddleware);

// Handle CORS pre-flight for all routes
app.options('*', corsMiddleware);

// ── General rate limit (all /api/* routes) ────────────────────────────────────
app.use('/api', apiLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health',       healthRouter);
app.use('/api/auth',         authLimiter, authRouter);   // stricter limiter on auth
app.use('/api/dictionary',   dictionaryRouter);
app.use('/api/imports',      importsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports',      reportsRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found`, details: null });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

export default app;
