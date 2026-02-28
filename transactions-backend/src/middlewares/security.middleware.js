import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// ── Helmet ────────────────────────────────────────────────────────────────────
export const helmetMiddleware = helmet({
  // Allow same-origin for health/API consumers
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// ── CORS ──────────────────────────────────────────────────────────────────────
function buildCorsOptions() {
  const raw = process.env.ALLOWED_ORIGINS ?? '';
  const whitelist = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Dev fallback: allow everything if ALLOWED_ORIGINS not set
  if (!whitelist.length) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CORS] ALLOWED_ORIGINS not set — allowing all origins (dev mode)');
      return { origin: true, credentials: true };
    }
    // Production without config → block all cross-origin
    return { origin: false };
  }

  return {
    origin(origin, callback) {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (whitelist.includes(origin)) return callback(null, true);
      callback(new Error(`Origin "${origin}" not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

export const corsMiddleware = cors(buildCorsOptions());

// ── Rate limiters ─────────────────────────────────────────────────────────────
const rateLimitResponse = (req, res) =>
  res.status(429).json({ message: 'יותר מדי בקשות. נסה שוב עוד רגע.', details: null });

/** Strict limiter for auth routes: 10 req/min per IP */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
  // Skip rate limit errors so they don't go through errorHandler
  skipFailedRequests: false,
});

/** General API limiter: 120 req/min per IP */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});
