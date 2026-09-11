const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load env variables
dotenv.config();

// ── JWT Secret Production Hardening ──────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[FATAL] Production JWT_SECRET is missing or empty.');
    process.exit(1);
  }
  if (secret.length < 32) {
    console.error('[FATAL] Production JWT_SECRET is dangerously short. Must be at least 32 characters.');
    process.exit(1);
  }
  // Prevent deploying with the local development secret or simple weak words
  const weakSecrets = ['vibe_music_dev_secret_change_before_production', 'secret', '123456', 'password'];
  if (weakSecrets.includes(secret)) {
    console.error('[FATAL] Production JWT_SECRET is using a known weak/development placeholder.');
    process.exit(1);
  }
  console.log('[Auth] Production JWT_SECRET validation passed.');
}
// ─────────────────────────────────────────────────────────────────

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
// ── CORS ─────────────────────────────────────────────────────
// Build an explicit allowlist so we never silently allow all origins.
// FRONTEND_URL must be set in production (e.g. https://your-app.vercel.app).
// localhost:3000 is always permitted for local development.
const buildAllowedOrigins = () => {
  const origins = new Set(['http://localhost:3000']);

  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').map(o => o.trim()).filter(Boolean).forEach(o => origins.add(o));
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('[CORS] WARNING: FRONTEND_URL is not set. All non-localhost origins will be rejected.');
  }

  return [...origins];
};

const allowedOrigins = buildAllowedOrigins();
console.log('[CORS] Allowed origins:', allowedOrigins);

app.use(cors({
  origin: (requestOrigin, callback) => {
    // Allow server-to-server requests (no Origin header) and allowed origins
    if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${requestOrigin}' is not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // credentials: false — app uses JWT Bearer tokens, not cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded audio files as static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/songs', require('./routes/songRoutes'));
app.use('/api/playlists', require('./routes/playlistRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Vibe Music API is running 🎵' });
});

// Global error handler
const isProd = process.env.NODE_ENV === 'production';
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  // Always log the real error server-side for debugging
  if (statusCode >= 500) console.error('[Error]', err.message);
  res.status(statusCode).json({
    // In production: never expose internal error messages, stack traces, or paths
    message: isProd ? 'Internal server error' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎵 Vibe Music server running on port ${PORT}`);
});
