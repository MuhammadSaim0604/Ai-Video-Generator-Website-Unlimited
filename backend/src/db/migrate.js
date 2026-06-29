const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('[DB] Schema applied successfully');

    await pool.query(`ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`);
    await pool.query(`ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS user_id TEXT`);
    await pool.query(`ALTER TABLE uploaded_images ADD COLUMN IF NOT EXISTS user_id TEXT`);

    try { await pool.query(`ALTER TABLE generation_jobs ALTER COLUMN session_id DROP NOT NULL`); } catch (_) {}
    try { await pool.query(`ALTER TABLE uploaded_images ALTER COLUMN session_id DROP NOT NULL`); } catch (_) {}

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_user ON generation_jobs(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_uploaded_user ON uploaded_images(user_id)`);

    await pool.query(`UPDATE generation_jobs SET status = 'queued' WHERE status = 'processing'`);
    await pool.query(`UPDATE pixverse_accounts SET active_generations = 0`);

    console.log('[DB] Migrations complete, stuck jobs reset');
  } catch (err) {
    console.error('[DB] Migration error:', err.message);
    throw err;
  }
}

module.exports = runMigrations;
