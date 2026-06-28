const pool = require('../db/pool');
const { emitJobUpdate, emitAdminUpdate } = require('../socket/index');

/**
 * In-memory queue backed by PostgreSQL.
 * No Redis needed — jobs are persisted in DB, workers poll for new jobs.
 */
class Queue {
  constructor(name, workerFn) {
    this.name = name;
    this.workerFn = workerFn;
    this.active = 0;
    this.maxConcurrency = 5; // default, overridden by DB settings
    this.running = false;
    this.pollInterval = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.pollInterval = setInterval(() => this._tick(), 2000);
    console.log(`[Queue:${this.name}] Started, concurrency=${this.maxConcurrency}`);
  }

  stop() {
    this.running = false;
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  async _tick() {
    if (this.active >= this.maxConcurrency) return;

    const available = this.maxConcurrency - this.active;
    if (available <= 0) return;

    try {
      // Pick pending jobs from DB
      const { rows } = await pool.query(
        `UPDATE generation_jobs
         SET status = 'processing'
         WHERE job_id IN (
           SELECT job_id FROM generation_jobs
           WHERE status = 'queued' AND queue_type = $1
           ORDER BY created_at ASC
           LIMIT $2
         )
         RETURNING *`,
        [this.name, available]
      );

      for (const job of rows) {
        this.active++;
        this._processJob(job).finally(() => {
          this.active--;
        });
      }
    } catch (err) {
      console.error(`[Queue:${this.name}] Tick error:`, err.message);
    }
  }

  async _processJob(job) {
    try {
      emitJobUpdate(job.job_id, 'job:processing', {
        status: 'processing',
        queueType: job.queue_type,
      });
      emitAdminUpdate('queue:update', { queueType: this.name, active: this.active });

      await this.workerFn(job);

    } catch (err) {
      const errDetail = err.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : err.message;
      console.error(`[Queue:${this.name}] Job ${job.job_id} failed:`, errDetail);
      await pool.query(
        `UPDATE generation_jobs SET status = 'failed', error_msg = $1, completed_at = NOW() WHERE job_id = $2`,
        [errDetail, job.job_id]
      );
      emitJobUpdate(job.job_id, 'job:failed', { status: 'failed', error: errDetail });
    }
  }

  async updateConcurrency(max) {
    this.maxConcurrency = max;
    console.log(`[Queue:${this.name}] Concurrency updated to ${max}`);
  }
}

class QueueManager {
  constructor() {
    this.imageQueue = null;
    this.sdVideoQueue = null;
    this.hdVideoQueue = null;
  }

  async init() {
    const { imageWorker } = require('./workers/imageWorker');
    const { videoWorker } = require('./workers/videoWorker');

    this.imageQueue = new Queue('image', imageWorker);
    this.sdVideoQueue = new Queue('sd_video', (job) => videoWorker(job, 'sd_video'));
    this.hdVideoQueue = new Queue('hd_video', (job) => videoWorker(job, 'hd_video'));

    // Load concurrency settings from DB
    await this.syncSettings();

    this.imageQueue.start();
    this.sdVideoQueue.start();
    this.hdVideoQueue.start();

    // Re-sync settings every 30s (in case admin changes them)
    setInterval(() => this.syncSettings(), 30000);

    console.log('[QueueManager] All queues started');
  }

  async syncSettings() {
    try {
      const { rows } = await pool.query('SELECT * FROM queue_settings LIMIT 1');
      if (rows.length > 0) {
        const s = rows[0];
        if (this.imageQueue) this.imageQueue.maxConcurrency = s.image_concurrency;
        if (this.sdVideoQueue) this.sdVideoQueue.maxConcurrency = s.sd_video_concurrency;
        if (this.hdVideoQueue) this.hdVideoQueue.maxConcurrency = s.hd_video_concurrency;
      }
    } catch (err) {
      console.error('[QueueManager] syncSettings error:', err.message);
    }
  }

  async getQueueStats() {
    const { rows } = await pool.query(
      `SELECT queue_type, status, COUNT(*) as count
       FROM generation_jobs
       GROUP BY queue_type, status`
    );

    const stats = {
      image: { queued: 0, processing: 0, completed: 0, failed: 0 },
      sd_video: { queued: 0, processing: 0, completed: 0, failed: 0 },
      hd_video: { queued: 0, processing: 0, completed: 0, failed: 0 },
    };

    for (const row of rows) {
      if (stats[row.queue_type]) {
        stats[row.queue_type][row.status] = parseInt(row.count);
      }
    }

    return stats;
  }
}

const queueManager = new QueueManager();
module.exports = queueManager;
