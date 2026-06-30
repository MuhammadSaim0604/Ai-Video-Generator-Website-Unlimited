require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const ConnectPgSimple = require('connect-pg-simple');
const pool = require('./db/pool');
const runMigrations = require('./db/migrate');
const { initSocket } = require('./socket/index');
const queueManager = require('./queues/QueueManager');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session (PostgreSQL-backed)
const PgSession = ConnectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true behind HTTPS in prod
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/generate', require('./routes/generate'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API config — sent to frontend to know model info
app.get('/api/config', (req, res) => {
  const {
    VIDEO_MODEL_MAP,
    VIDEO_ASPECT_RATIOS,
    VIDEO_DISPLAY_MODELS,
    IMAGE_ASPECT_RATIOS,
    IMAGE_RESOLUTIONS,
    IMAGE_CREDITS,
  } = require('./constants/models');

  res.json({
    videoModels: VIDEO_DISPLAY_MODELS,
    videoModelAspectRatios: VIDEO_ASPECT_RATIOS,
    imageModels: ['qwen-image', 'seedream-4.0'],
    imageModelAspectRatios: IMAGE_ASPECT_RATIOS,
    imageModelResolutions: IMAGE_RESOLUTIONS,
    imageCredits: IMAGE_CREDITS,
    videoDurationRange: { min: 1, max: 15 },
    videoResolutions: ['360p', '540p', '720p', '1080p'],
  });
});

// ─── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;

async function start() {
  try {
    // Run DB migrations first
    await runMigrations();

    // Init Socket.io
    initSocket(server);

    // Start queue workers
    await queueManager.init();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Backend running on port ${PORT}`);
      console.log(`[Server] Admin panel: http://localhost:${PORT}/admin`);
      console.log('[Auth] Google OAuth ready');
    });
  } catch (err) {
    console.error('[Server] Startup failed:', err.message);
    process.exit(1);
  }
}

start();
