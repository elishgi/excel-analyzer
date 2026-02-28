import 'dotenv/config';
import app from './app.js';
import { connectDB } from './dal/db.js';

const PORT = process.env.PORT || 3000;

// ── Process-level safety nets ─────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  process.exit(1);
});

function validateRequiredEnv() {
  const envErrors = [];
  const mongoUrl = process.env.MONGO_URL?.trim();
  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!mongoUrl) {
    envErrors.push('MONGO_URL is required and cannot be empty.');
  }

  if (!jwtSecret) {
    envErrors.push('JWT_SECRET is required and cannot be empty.');
  } else if (jwtSecret.length < 32) {
    envErrors.push('JWT_SECRET must be at least 32 characters long.');
  }

  if (!process.env.JWT_EXPIRES_IN?.trim()) {
    process.env.JWT_EXPIRES_IN = '7d';
  }

  if (envErrors.length > 0) {
    console.error('❌ Server startup failed due to invalid environment configuration:');
    envErrors.forEach((error, index) => {
      console.error(`   ${index + 1}. ${error}`);
    });
    process.exit(1);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
validateRequiredEnv();
await connectDB();

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n📴 ${signal} received – shutting down gracefully`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
