const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/adminAuth');
const accountManager = require('../services/accountManager');
const queueManager = require('../queues/QueueManager');
const { emitAdminUpdate } = require('../socket/index');

const router = express.Router();
const jsonUpload = multer({ storage: multer.memoryStorage() });

// POST /admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const { rows } = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);

    if (rows.length === 0) {
      // Bootstrap: create first admin if none exist and using ADMIN_SECRET
      const { rows: count } = await pool.query('SELECT COUNT(*) FROM admin_users');
      if (parseInt(count[0].count) === 0 && password === process.env.ADMIN_SECRET) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
          'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
          [username, hash]
        );
        req.session.adminId = username;
        return res.json({ success: true, username });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.adminId = admin.username;
    res.json({ success: true, username: admin.username });
  } catch (err) {
    console.error('[Admin Login]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /admin/me
router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: req.session.adminId });
});

// GET /admin/dashboard — stats
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [jobStats, accountStats, analytics, queueStats, settings] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_total,
           COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND queue_type = 'image') as today_images,
           COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND queue_type IN ('sd_video','hd_video')) as today_videos,
           COUNT(*) FILTER (WHERE status = 'queued') as queued_total,
           COUNT(*) FILTER (WHERE status = 'processing') as processing_total,
           COUNT(*) FILTER (WHERE status = 'failed') as failed_total
         FROM generation_jobs`
      ),
      pool.query(
        `SELECT id, email, username, remaining_credits, high_quality_times,
                active_generations, is_active, last_used_at
         FROM pixverse_accounts ORDER BY remaining_credits DESC`
      ),
      pool.query(
        `SELECT * FROM site_analytics WHERE date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY date DESC`
      ),
      queueManager.getQueueStats(),
      pool.query('SELECT * FROM queue_settings LIMIT 1'),
    ]);

    res.json({
      jobs: jobStats.rows[0],
      accounts: accountStats.rows,
      analytics: analytics.rows,
      queues: queueStats,
      settings: settings.rows[0] || {},
    });
  } catch (err) {
    console.error('[Admin Dashboard]', err.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /admin/jobs — paginated job list
router.get('/jobs', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    const where = status ? `WHERE status = $3` : '';
    const params = status ? [limit, offset, status] : [limit, offset];

    const { rows } = await pool.query(
      `SELECT gj.job_id, gj.queue_type, gj.mode, gj.display_model, gj.prompt,
              gj.quality, gj.status, gj.error_msg, gj.created_at, gj.completed_at,
              pa.email as account_email
       FROM generation_jobs gj
       LEFT JOIN pixverse_accounts pa ON pa.id = gj.pixverse_account_id
       ${where}
       ORDER BY gj.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM generation_jobs ${where}`,
      status ? [status] : []
    );

    res.json({ jobs: rows, total: parseInt(countRows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /admin/accounts/upload — upload pixverse accounts JSON
router.post('/accounts/upload', requireAdmin, jsonUpload.single('accounts'), async (req, res) => {
  try {
    let accountsJson;

    if (req.file) {
      accountsJson = JSON.parse(req.file.buffer.toString('utf8'));
    } else if (req.body && req.body.accounts) {
      accountsJson = typeof req.body.accounts === 'string'
        ? JSON.parse(req.body.accounts)
        : req.body.accounts;
    } else {
      return res.status(400).json({ error: 'No accounts data provided' });
    }

    const results = await accountManager.processUploadedAccounts(accountsJson);
    emitAdminUpdate('accounts:updated', { count: results.length });

    res.json({ success: true, results });
  } catch (err) {
    console.error('[Admin Accounts Upload]', err.message);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// GET /admin/accounts — list all accounts
router.get('/accounts', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, username, total_credits, remaining_credits,
              high_quality_times, active_generations, is_active, last_used_at, created_at
       FROM pixverse_accounts ORDER BY remaining_credits DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// PATCH /admin/accounts/:id/toggle — enable/disable account
router.patch('/accounts/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE pixverse_accounts SET is_active = NOT is_active WHERE id = $1 RETURNING is_active`,
      [req.params.id]
    );
    res.json({ is_active: rows[0].is_active });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle account' });
  }
});

// PUT /admin/queue/settings — update concurrency limits
router.put('/queue/settings', requireAdmin, async (req, res) => {
  try {
    const { image_concurrency, sd_video_concurrency, hd_video_concurrency } = req.body;

    await pool.query(
      `UPDATE queue_settings SET
         image_concurrency = COALESCE($1, image_concurrency),
         sd_video_concurrency = COALESCE($2, sd_video_concurrency),
         hd_video_concurrency = COALESCE($3, hd_video_concurrency),
         updated_at = NOW()`,
      [image_concurrency, sd_video_concurrency, hd_video_concurrency]
    );

    await queueManager.syncSettings();
    emitAdminUpdate('queue:settings_updated', { image_concurrency, sd_video_concurrency, hd_video_concurrency });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /admin/queue/settings
router.get('/queue/settings', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM queue_settings LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /admin/accounts/:id/sync-credits — manually re-sync one account's credits
router.post('/accounts/:id/sync-credits', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM pixverse_accounts WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Account not found' });
    const result = await accountManager.syncAccountCredits(rows[0]);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

// GET /admin/models — return model info for frontend reference
router.get('/models', requireAdmin, async (req, res) => {
  const { VIDEO_MODEL_MAP, VIDEO_ASPECT_RATIOS, IMAGE_ASPECT_RATIOS, IMAGE_RESOLUTIONS } = require('../constants/models');
  res.json({ VIDEO_MODEL_MAP, VIDEO_ASPECT_RATIOS, IMAGE_ASPECT_RATIOS, IMAGE_RESOLUTIONS });
});

module.exports = router;
