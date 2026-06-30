const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const pool = require('../db/pool');
const { requireAdmin, signAdminToken } = require('../middleware/adminAuth');
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
        const token = signAdminToken(username);
        return res.json({ success: true, username, token });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signAdminToken(admin.username);
    res.json({ success: true, username: admin.username, token });
  } catch (err) {
    console.error('[Admin Login]', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /admin/logout
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

// GET /admin/me
router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: req.adminId });
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

    const where = status ? `WHERE gj.status = $3` : '';
    const params = status ? [limit, offset, status] : [limit, offset];

    const { rows } = await pool.query(
      `SELECT gj.job_id, gj.pixverse_job_id, gj.queue_type, gj.mode, gj.display_model,
              gj.prompt, gj.quality, gj.aspect_ratio, gj.duration, gj.status,
              gj.result_url, gj.webp_url, gj.error_msg, gj.created_at, gj.completed_at,
              gj.user_id,
              pa.email as account_email
       FROM generation_jobs gj
       LEFT JOIN pixverse_accounts pa ON pa.id = gj.pixverse_account_id
       ${where}
       ORDER BY gj.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM generation_jobs ${status ? 'WHERE status = $1' : ''}`,
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

// POST /admin/accounts/sync-all
router.post('/accounts/sync-all', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM pixverse_accounts WHERE is_active = TRUE');
    if (rows.length === 0) return res.json({ success: true, synced: 0 });
    await Promise.allSettled(rows.map((acc) => accountManager.syncAccountCredits(acc)));
    emitAdminUpdate('accounts:updated', {});
    res.json({ success: true, synced: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Sync all failed' });
  }
});

// POST /admin/accounts/sync-used — sync only accounts that have processed at least one job
router.post('/accounts/sync-used', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT pa.* FROM pixverse_accounts pa
       INNER JOIN generation_jobs gj ON gj.pixverse_account_id = pa.id
       WHERE pa.is_active = TRUE`
    );
    if (rows.length === 0) return res.json({ success: true, synced: 0 });
    await Promise.allSettled(rows.map((acc) => accountManager.syncAccountCredits(acc)));
    emitAdminUpdate('accounts:updated', {});
    res.json({ success: true, synced: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Sync used failed' });
  }
});


// ─── DB Export ────────────────────────────────────────────────────────────────
// GET /admin/db/export
// Downloads a complete JSON snapshot of every table, including all columns and
// primary-key ids, so the file can be fully restored on any instance.
router.get("/db/export", requireAdmin, async (req, res) => {
  try {
    const [adminUsers, pixverseAccounts, queueSettings, siteAnalytics, generationJobs, uploadedImages] =
      await Promise.all([
        pool.query(`SELECT id, username, password_hash, created_at FROM admin_users ORDER BY id`),
        pool.query(`SELECT id, email, username, password, token, account_id, invite_code,
                           total_credits, remaining_credits, high_quality_times,
                           active_generations, is_active, last_used_at, created_at
        FROM pixverse_accounts ORDER BY id
      `),
      pool.query(`
        SELECT id, image_concurrency, sd_video_concurrency,
               hd_video_concurrency, updated_at
        FROM queue_settings ORDER BY id
      `),
      pool.query(`
        SELECT id, date, total_visitors, total_images_generated,
               total_videos_generated, total_hd_videos_generated,
               total_sd_videos_generated
        FROM site_analytics ORDER BY id
      `),
      pool.query(`
        SELECT id, job_id, user_id, queue_type, mode, internal_model,
                           display_model, prompt, quality, aspect_ratio, duration, seed,
                           audio, customer_img_path, customer_img_paths,
                           pixverse_job_id, pixverse_account_id, status,
                           result_url, result_path, webp_url, thumbnail_url,
                           error_msg, queue_position, created_at, completed_at
        FROM generation_jobs ORDER BY id
      `),
      pool.query(`
        SELECT id, user_id, user_id, pixverse_image_id, url, path, file_name,
               width, height, uploaded_via_account, created_at
        FROM uploaded_images ORDER BY id
      `),
      ]);

    const backup = {
      version: 3,
      exported_at: new Date().toISOString(),
      admin_users: adminUsers.rows,
      pixverse_accounts: pixverseAccounts.rows,
      queue_settings: queueSettings.rows,
      site_analytics: siteAnalytics.rows,
      generation_jobs: generationJobs.rows,
      uploaded_images: uploadedImages.rows,
    };

    const filename = `veo3-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err) {
    console.error('[DB Export]', err.message);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

// ─── DB Import ────────────────────────────────────────────────────────────────
// POST /admin/db/import
// Restores a backup created by the export route above.
//
// FK integrity strategy
// ─────────────────────
// pixverse_accounts.id is a SERIAL that is referenced by:
//   • generation_jobs.pixverse_account_id
//   • uploaded_images.uploaded_via_account
//
// Because the same email might already exist in the target DB with a *different*
// serial id than what the backup recorded, we:
//   1. Upsert every account by email  (ON CONFLICT email DO UPDATE)
//      and capture the resulting DB id via RETURNING id.
//   2. Build a map  backupId → currentDbId  from those results.
//   3. Rewrite every pixverse_account_id / uploaded_via_account in the imported
//      rows through that map before inserting, so FKs are always valid.
//
// Import order: admin_users → pixverse_accounts → queue_settings →
//               site_analytics → generation_jobs → uploaded_images
// Everything runs inside a single transaction; any error triggers full ROLLBACK.
router.post('/db/import', requireAdmin, jsonUpload.single('backup'), async (req, res) => {
  let data;
  try {
    if (!req.file) return res.status(400).json({ error: 'No backup file provided' });
    data = JSON.parse(req.file.buffer.toString('utf8'));
  } catch (parseErr) {
    return res.status(400).json({ error: 'Invalid JSON: ' + parseErr.message });
  }

  if (!data.version || !data.exported_at) {
      return res.status(400).json({ error: "Invalid backup format (missing version/exported_at)" });
  }

  let client;
    try {
      client = await pool.connect();
    } catch (connErr) {
      console.error("[DB Import] Could not get DB connection:", connErr.message);
      return res.status(500).json({ error: "Database connection failed: " + connErr.message });
    }

  const stats = {};

    // ── helpers ────────────────────────────────────────────────────────────────
    // Split an array into chunks of at most `size` elements.
    const chunk = (arr, size) => {
      const out = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    // Build parameterized multi-row VALUES for a chunk of rows.
    // Each `row` is an ordered array matching the INSERT column list.
    // Returns { sql: '($1,$2,...),($N+1,...)', params: [...] }
    const buildValues = (rows) => {
      const params = [];
      const sets = rows.map((row) => {
        const base = params.length;
        params.push(...row);
        return `(${row.map((_, i) => `$${base + i + 1}`).join(",")})`;
      });
      return { sql: sets.join(","), params };
    };

    try {
      await client.query("BEGIN");

      // ── 1. admin_users ──────────────────────────────────────────────────────
      // Small table — row-by-row is fine; upsert by username.
      if (Array.isArray(data.admin_users) && data.admin_users.length > 0) {
      for (const row of data.admin_users) {
        await client.query(
            `INSERT INTO admin_users (username, password_hash, created_at)
             VALUES ($1,$2,$3)
             ON CONFLICT (username) DO UPDATE
               SET password_hash = EXCLUDED.password_hash`,
            [row.username, row.password_hash, row.created_at ?? new Date()],
        );
      }
      stats.admin_users = data.admin_users.length;
      } else {
        stats.admin_users = 0;
    }

      // ── 2. pixverse_accounts ─────────────────────────────────────────────────
      // Bulk upsert via unnest (single query). Then fetch the actual DB ids for
      // every imported email so we can build the backupId → currentDbId map.
      const accountIdMap = {};
    if (Array.isArray(data.pixverse_accounts) && data.pixverse_accounts.length > 0) {
      const accts = data.pixverse_accounts;
      await client.query(
          `INSERT INTO pixverse_accounts
             (email, username, password, token, account_id, invite_code,
              total_credits, remaining_credits, high_quality_times,
              is_active, active_generations, last_used_at, created_at)
           SELECT
             unnest($1::text[]),  unnest($2::text[]),  unnest($3::text[]),
             unnest($4::text[]),  unnest($5::bigint[]),unnest($6::text[]),
             unnest($7::int[]),   unnest($8::int[]),   unnest($9::int[]),
             unnest($10::bool[]), unnest($11::int[]),
                unnest($12::timestamptz[]), unnest($13::timestamptz[])
         ON CONFLICT (email) DO UPDATE SET
             username           = EXCLUDED.username,
             password           = EXCLUDED.password,
             token              = EXCLUDED.token,
             account_id         = EXCLUDED.account_id,
             invite_code        = EXCLUDED.invite_code,
             total_credits      = EXCLUDED.total_credits,
             remaining_credits  = EXCLUDED.remaining_credits,
             high_quality_times = EXCLUDED.high_quality_times,
             is_active          = EXCLUDED.is_active,
             last_used_at       = EXCLUDED.last_used_at`,
        [
            accts.map((r) => r.email),
            accts.map((r) => r.username        ?? null),
            accts.map((r) => r.password        ?? null),
            accts.map((r) => r.token           ?? null),
            accts.map((r) => r.account_id      ?? null),
            accts.map((r) => r.invite_code     ?? null),
            accts.map((r) => r.total_credits      ?? 0),
            accts.map((r) => r.remaining_credits  ?? 0),
            accts.map((r) => r.high_quality_times ?? 0),
            accts.map((r) => r.is_active          ?? true),
            accts.map((r) => r.active_generations ?? 0),
            accts.map((r) => r.last_used_at    ?? null),
            accts.map((r) => r.created_at      ?? new Date()),
          ],
      );

        // Fetch current DB ids for every email we just upserted
        const emails = accts.map((r) => r.email);
        const { rows: idRows } = await client.query(
          `SELECT id, email FROM pixverse_accounts WHERE email = ANY($1::text[])`,
          [emails],
        );
        const emailToId = {};
        for (const r of idRows) emailToId[r.email] = r.id;
        for (const r of accts) {
          if (r.id != null && r.email) accountIdMap[r.id] = emailToId[r.email];
        }

      stats.pixverse_accounts = accts.length;
      } else {
        stats.pixverse_accounts = 0;
      }

      // ── 3. queue_settings ───────────────────────────────────────────────────
      if (Array.isArray(data.queue_settings) && data.queue_settings.length > 0) {
        const s = data.queue_settings[0];
        await client.query(
          `UPDATE queue_settings SET
             image_concurrency    = COALESCE($1, image_concurrency),
             sd_video_concurrency = COALESCE($2, sd_video_concurrency),
             hd_video_concurrency = COALESCE($3, hd_video_concurrency),
             updated_at           = NOW()`,
          [s.image_concurrency, s.sd_video_concurrency, s.hd_video_concurrency],
        );
        stats.queue_settings = 1;
      } else {
        stats.queue_settings = 0;
      }

      // ── 4. site_analytics ───────────────────────────────────────────────────
      // Bulk upsert via unnest — single query regardless of row count.
      if (Array.isArray(data.site_analytics) && data.site_analytics.length > 0) {
        const sa = data.site_analytics;
        await client.query(
          `INSERT INTO site_analytics
             (date, total_visitors, total_images_generated,
              total_videos_generated, total_hd_videos_generated, total_sd_videos_generated)
           SELECT
             unnest($1::date[]),unnest($2::int[]),unnest($3::int[]),
             unnest($4::int[]),unnest($5::int[]),unnest($6::int[])
           ON CONFLICT (date) DO UPDATE SET
             total_visitors            = EXCLUDED.total_visitors,
             total_images_generated    = EXCLUDED.total_images_generated,
             total_videos_generated    = EXCLUDED.total_videos_generated,
             total_hd_videos_generated = EXCLUDED.total_hd_videos_generated,
             total_sd_videos_generated = EXCLUDED.total_sd_videos_generated`,
          [
            sa.map((r) => r.date),
            sa.map((r) => r.total_visitors            ?? 0),
            sa.map((r) => r.total_images_generated    ?? 0),
            sa.map((r) => r.total_videos_generated    ?? 0),
            sa.map((r) => r.total_hd_videos_generated ?? 0),
            sa.map((r) => r.total_sd_videos_generated ?? 0),
          ],
        );
        stats.site_analytics = sa.length;
      } else {
        stats.site_analytics = 0;
      }

      // ── 5. generation_jobs ──────────────────────────────────────────────────
      // Chunked multi-row VALUES (500 rows/query).
      // customer_img_paths is TEXT[] — the pg driver serialises JS arrays
      // to PostgreSQL arrays automatically, so no special handling needed.
      // pixverse_account_id is remapped via accountIdMap before insert.
      if (Array.isArray(data.generation_jobs) && data.generation_jobs.length > 0) {
        const JOB_COLS = 25;
        const jobOnConflict = `
          ON CONFLICT (job_id) DO UPDATE SET
            internal_model      = EXCLUDED.internal_model,
            display_model       = EXCLUDED.display_model,
            pixverse_job_id     = EXCLUDED.pixverse_job_id,
            pixverse_account_id = EXCLUDED.pixverse_account_id,
            status = CASE
              WHEN generation_jobs.status IN ('queued','processing')
              THEN generation_jobs.status
              ELSE EXCLUDED.status
            END,
            result_url    = COALESCE(EXCLUDED.result_url,    generation_jobs.result_url),
            result_path   = COALESCE(EXCLUDED.result_path,   generation_jobs.result_path),
            webp_url      = COALESCE(EXCLUDED.webp_url,      generation_jobs.webp_url),
            thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, generation_jobs.thumbnail_url),
            error_msg     = COALESCE(EXCLUDED.error_msg,     generation_jobs.error_msg),
            completed_at  = COALESCE(EXCLUDED.completed_at,  generation_jobs.completed_at)`;

        for (const jobChunk of chunk(data.generation_jobs, 500)) {
          const rows = jobChunk.map((row) => {
            const accountId =
              row.pixverse_account_id != null
                ? (accountIdMap[row.pixverse_account_id] ?? null)
                : null;
            return [
              row.job_id,
              row.user_id,
              row.queue_type,
              row.mode,
              row.internal_model    ?? null,
              row.display_model     ?? null,
              row.prompt            ?? null,
              row.quality           ?? null,
              row.aspect_ratio      ?? null,
              row.duration          ?? null,
              row.seed              ?? null,
              row.audio             ?? 1,
              row.customer_img_path ?? null,
              row.customer_img_paths ?? null,
              row.pixverse_job_id   ?? null,
              accountId,
              row.status,
              row.result_url        ?? null,
              row.result_path       ?? null,
              row.webp_url          ?? null,
              row.thumbnail_url     ?? null,
              row.error_msg         ?? null,
              row.queue_position    ?? null,
              row.created_at        ?? new Date(),
              row.completed_at      ?? null,
            ];
          });

          const { sql, params } = buildValues(rows);
          await client.query(
            `INSERT INTO generation_jobs
               (job_id, user_id, queue_type, mode, internal_model, display_model,
                prompt, quality, aspect_ratio, duration, seed, audio,
                customer_img_path, customer_img_paths,
                pixverse_job_id, pixverse_account_id, status,
                result_url, result_path, webp_url, thumbnail_url,
                error_msg, queue_position, created_at, completed_at)
             VALUES ${sql} ${jobOnConflict}`,
            params,
          );
        }
        stats.generation_jobs = data.generation_jobs.length;
      } else {
        stats.generation_jobs = 0;
      }

      // ── 6. uploaded_images ──────────────────────────────────────────────────
      // Bulk insert via unnest with server-side dedup by (user_id, url).
      // uploaded_via_account FK remapped via accountIdMap.
      if (Array.isArray(data.uploaded_images) && data.uploaded_images.length > 0) {
        const imgs = data.uploaded_images;
        const { rowCount } = await client.query(
          `INSERT INTO uploaded_images
             (user_id, pixverse_image_id, url, path, file_name,
              width, height, uploaded_via_account, created_at)
           SELECT t.sid, t.piid, t.url, t.path, t.fname,
                  t.w, t.h, t.acct, t.cat
           FROM (
             SELECT
               unnest($1::text[])        AS sid,
               unnest($2::bigint[])      AS piid,
               unnest($3::text[])        AS url,
               unnest($4::text[])        AS path,
               unnest($5::text[])        AS fname,
               unnest($6::int[])         AS w,
               unnest($7::int[])         AS h,
               unnest($8::int[])         AS acct,
               unnest($9::timestamptz[]) AS cat
           ) t
           WHERE NOT EXISTS (
             SELECT 1 FROM uploaded_images ui
             WHERE ui.user_id = t.sid AND ui.url = t.url
           )`,
          [
            imgs.map((r) => r.user_id),
            imgs.map((r) => r.pixverse_image_id  ?? null),
            imgs.map((r) => r.url),
            imgs.map((r) => r.path),
            imgs.map((r) => r.file_name          ?? null),
            imgs.map((r) => r.width              ?? null),
            imgs.map((r) => r.height             ?? null),
            imgs.map((r) =>
              r.uploaded_via_account != null
                ? (accountIdMap[r.uploaded_via_account] ?? null)
                : null,
            ),
            imgs.map((r) => r.created_at         ?? new Date()),
          ],
        );
        stats.uploaded_images = rowCount ?? 0;
      } else {
        stats.uploaded_images = 0;
      }

      // ── 7. Commit ───────────────────────────────────────────────────────────
      await client.query("COMMIT");
    } catch (importErr) {
      try { await client.query("ROLLBACK"); } catch (_) {}
      try { client.release(); } catch (_) {}
      console.error("[DB Import] failed:", importErr.message);
      return res.status(500).json({ error: "Import failed: " + importErr.message });
    }

    try { client.release(); } catch (_) {}
    try { emitAdminUpdate("accounts:updated", {}); } catch (_) {}
    return res.json({ success: true, imported: stats });
  },
);


// GET /admin/models — return model info for frontend reference
router.get('/models', requireAdmin, async (req, res) => {
  const { VIDEO_MODEL_MAP, VIDEO_ASPECT_RATIOS, IMAGE_ASPECT_RATIOS, IMAGE_RESOLUTIONS } = require('../constants/models');
  res.json({ VIDEO_MODEL_MAP, VIDEO_ASPECT_RATIOS, IMAGE_ASPECT_RATIOS, IMAGE_RESOLUTIONS });
});

module.exports = router;
