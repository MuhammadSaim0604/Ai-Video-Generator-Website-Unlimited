const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  try {
    await pool.query(sql);
    console.log('[DB] Schema applied successfully');

    // Add thumbnail_url column if it was added after the initial schema deployment
    await pool.query(
      `ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`
    );

    // Reset any stuck processing jobs on startup
    await pool.query(
      "UPDATE generation_jobs SET status = 'queued' WHERE status = 'processing'"
    );

    // Reset active_generations counters (in case of crash)
    await pool.query('UPDATE pixverse_accounts SET active_generations = 0');

    console.log('[DB] Reset stuck jobs and active generation counters');
  } catch (err) {
    console.error('[DB] Migration error:', err.message);
    throw err;
  }
}

module.exports = runMigrations;
