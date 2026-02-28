const isProd = () => process.env.NODE_ENV === 'production';

export function errorHandler(err, req, res, next) {
  // Prevent headers-already-sent crashes
  if (res.headersSent) return next(err);

  // ── CORS error (thrown by cors package) ──────────────────────────────────────
  if (err.message?.startsWith('Origin') && err.message.includes('not allowed by CORS')) {
    return res.status(403).json({ message: err.message, details: null });
  }

  // ── Mongoose: invalid ObjectId ───────────────────────────────────────────────
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ message: 'Invalid ID format', details: null });
  }

  // ── Mongoose: duplicate key ──────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] ?? 'field';
    return res.status(409).json({
      message: `Duplicate value for field: ${field}`,
      details: isProd() ? null : (err.keyValue ?? null),
    });
  }

  // ── Mongoose: schema validation ──────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: 'Validation failed',
      details: isProd() ? null : details,
    });
  }

  // ── Express: malformed JSON body ─────────────────────────────────────────────
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body', details: null });
  }

  // ── JWT ──────────────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token', details: null });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired', details: null });
  }

  // ── App errors (AppError instances) ──────────────────────────────────────────
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Internal Server Error';

  if (statusCode === 500) {
    console.error('[ERROR]', err);
    // Never leak stack or internals in production
    return res.status(500).json({
      message: isProd() ? 'Internal Server Error' : message,
      details: isProd() ? null : (err.stack ?? null),
    });
  }

  // 4xx AppErrors — safe to return details in dev, hide in prod
  res.status(statusCode).json({
    message,
    details: isProd() ? null : (err.details ?? null),
  });
}
