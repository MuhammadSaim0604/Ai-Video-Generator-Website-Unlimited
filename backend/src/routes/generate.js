const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const sessionId = require('../middleware/sessionId');
const {
  VIDEO_MODEL_MAP,
  IMAGE_QUALITY_MAP,
  SD_RESOLUTIONS,
  HD_RESOLUTIONS,
} = require('../constants/models');

const router = express.Router();
router.use(sessionId);

// POST /api/generate/image
router.post('/image', async (req, res) => {
  try {
    const {
      model,           // 'qwen-image' or 'seedream-4.0'
      prompt,
      quality,         // '720p', '1080p', '2K', '4K' (display values)
      aspect_ratio,    // e.g. '9:16', 'Auto'
      seed,
      customer_img_path, // optional, single path from image selector
    } = req.body;

    if (!prompt || !model || !quality) {
      return res.status(400).json({ error: 'prompt, model, and quality are required' });
    }

    const validModels = ['qwen-image', 'seedream-4.0'];
    if (!validModels.includes(model)) {
      return res.status(400).json({ error: 'Invalid image model' });
    }

    const mode = customer_img_path ? 'i2i' : 't2i';
    const jobId = uuidv4();

    // Get current queue position
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*) FROM generation_jobs WHERE status = 'queued' AND queue_type = 'image'"
    );
    const queuePosition = parseInt(countRows[0].count) + 1;

    await pool.query(
      `INSERT INTO generation_jobs
         (job_id, session_id, queue_type, mode, display_model, internal_model, prompt,
          quality, aspect_ratio, seed, customer_img_path, status, queue_position)
       VALUES ($1,$2,'image',$3,$4,$4,$5,$6,$7,$8,$9,'queued',$10)`,
      [
        jobId,
        req.sessionId,
        mode,
        model,
        prompt,
        quality,
        aspect_ratio || '1:1',
        seed || Math.floor(Math.random() * 2147483647),
        customer_img_path || null,
        queuePosition,
      ]
    );

    res.json({ jobId, queuePosition, status: 'queued' });
  } catch (err) {
    console.error('[Generate Image]', err.message);
    res.status(500).json({ error: 'Failed to queue image generation' });
  }
});

// POST /api/generate/video
router.post('/video', async (req, res) => {
  try {
    const {
      model,           // Display: 'Veo 3.1' | 'Veo 3.1 Fast' | 'Veo 3.1 Standard'
      prompt,
      quality,         // '360p' | '540p' | '720p' | '1080p'
      aspect_ratio,    // e.g. '9:16' (only for t2v)
      duration,        // 1-15 seconds
      seed,
      customer_img_path, // optional — triggers i2v mode
    } = req.body;

    if (!prompt || !model || !quality || !duration) {
      return res.status(400).json({ error: 'prompt, model, quality, and duration are required' });
    }

    const internalModel = VIDEO_MODEL_MAP[model];
    if (!internalModel) {
      return res.status(400).json({ error: `Unknown video model: ${model}` });
    }

    const mode = customer_img_path ? 'i2v' : 't2v';
    const queueType = HD_RESOLUTIONS.includes(quality) ? 'hd_video' : 'sd_video';
    const jobId = uuidv4();

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM generation_jobs WHERE status = 'queued' AND queue_type = $1`,
      [queueType]
    );
    const queuePosition = parseInt(countRows[0].count) + 1;

    await pool.query(
      `INSERT INTO generation_jobs
         (job_id, session_id, queue_type, mode, display_model, internal_model, prompt,
          quality, aspect_ratio, duration, seed, customer_img_path, status, queue_position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'queued',$13)`,
      [
        jobId,
        req.sessionId,
        queueType,
        mode,
        model,
        internalModel,
        prompt,
        quality,
        aspect_ratio || '16:9',
        duration,
        seed || Math.floor(Math.random() * 2147483647),
        customer_img_path || null,
        queuePosition,
      ]
    );

    res.json({ jobId, queuePosition, queueType, status: 'queued' });
  } catch (err) {
    console.error('[Generate Video]', err.message);
    res.status(500).json({ error: 'Failed to queue video generation' });
  }
});

// GET /api/generate/status/:jobId
router.get('/status/:jobId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT job_id, status, queue_type, mode, display_model, prompt, quality,
              result_url, result_path, webp_url, error_msg, created_at, completed_at,
              queue_position
       FROM generation_jobs WHERE job_id = $1`,
      [req.params.jobId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// GET /api/generate/queue-info
router.get('/queue-info', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT queue_type, COUNT(*) as count
       FROM generation_jobs WHERE status = 'queued'
       GROUP BY queue_type`
    );
    const info = {};
    rows.forEach((r) => { info[r.queue_type] = parseInt(r.count); });
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue info' });
  }
});

module.exports = router;
