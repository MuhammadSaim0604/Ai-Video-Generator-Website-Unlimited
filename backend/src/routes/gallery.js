const express = require('express');
const pool = require('../db/pool');
const { requireUserAuth } = require('../middleware/userAuth');

const router = express.Router();

// GET /api/gallery/my — current user's jobs (all statuses, for studio)
router.get('/my', requireUserAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT job_id, queue_type, mode, display_model, prompt, quality,
              result_url, webp_url, aspect_ratio, duration, status,
              error_msg, queue_position, created_at, completed_at
       FROM generation_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your gallery' });
  }
});

// GET /api/gallery/my-created-images — images created by this user (for Image Selector Modal)
router.get('/my-created-images', requireUserAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT job_id, result_url, result_path, aspect_ratio, quality, display_model, prompt, created_at
       FROM generation_jobs
       WHERE user_id = $1
         AND queue_type = 'image'
         AND status = 'completed'
         AND result_url IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch created images' });
  }
});

module.exports = router;
