const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('[DB] Schema applied successfully');

    // Add columns if they don't exist yet (TEXT first, then we convert below)
    await pool.query(`ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`);
    await pool.query(`ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS user_id TEXT`);
    await pool.query(`ALTER TABLE uploaded_images ADD COLUMN IF NOT EXISTS user_id TEXT`);

    // // Nullify any non-numeric user_ids left over from older auth systems
    // await pool.query(`UPDATE generation_jobs SET user_id = NULL WHERE user_id IS NOT NULL AND user_id !~ '^[0-9]+$'`);
    // await pool.query(`UPDATE uploaded_images SET user_id = NULL WHERE user_id IS NOT NULL AND user_id !~ '^[0-9]+$'`);

    // // Convert user_id from TEXT → INTEGER and add FK to users table
    // await safeQuery(`ALTER TABLE generation_jobs ALTER COLUMN user_id TYPE INTEGER USING user_id::INTEGER`);
    // await safeQuery(`ALTER TABLE uploaded_images ALTER COLUMN user_id TYPE INTEGER USING user_id::INTEGER`);

    // await safeQuery(`ALTER TABLE generation_jobs ADD CONSTRAINT fk_gj_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`);
    // await safeQuery(`ALTER TABLE uploaded_images ADD CONSTRAINT fk_ui_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`);

    // // Indexes
    // await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_user ON generation_jobs(user_id)`);
    // await pool.query(`CREATE INDEX IF NOT EXISTS idx_uploaded_user ON uploaded_images(user_id)`);

    // Reset stuck jobs
    await pool.query(`UPDATE generation_jobs SET status = 'queued' WHERE status = 'processing'`);
    await pool.query(`UPDATE pixverse_accounts SET active_generations = 0`);

    console.log('[DB] Migrations complete, stuck jobs reset');
  } catch (err) {
    console.error('[DB] Migration error:', err.message);
    throw err;
  }
}

async function safeQuery(sql) {
  try {
    await pool.query(sql);
  } catch (_) {
    // Already done (column already correct type, constraint already exists, etc.)
  }
}

module.exports = runMigrations;
