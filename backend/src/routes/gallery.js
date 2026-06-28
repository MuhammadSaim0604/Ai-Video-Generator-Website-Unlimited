const express = require("express");
const pool = require("../db/pool");
const sessionId = require("../middleware/sessionId");

const router = express.Router();
router.use(sessionId);

// GET /api/gallery — public gallery (recent completed jobs)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type; // 'image' | 'video' | undefined
    const offset = (page - 1) * limit;

    let whereClause = `status = 'completed' AND result_url IS NOT NULL`;
    const params = [limit, offset];

    if (type === "image") {
      whereClause += ` AND queue_type = 'image'`;
    } else if (type === "video") {
      whereClause += ` AND queue_type IN ('sd_video', 'hd_video')`;
    }

    const { rows } = await pool.query(
      `SELECT job_id, queue_type, mode, display_model, prompt, quality,
              result_url, webp_url, aspect_ratio, duration, status,
              created_at, completed_at
       FROM generation_jobs
       WHERE ${whereClause}
       ORDER BY completed_at DESC
       LIMIT $1 OFFSET $2`,
      params,
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM generation_jobs WHERE ${whereClause}`,
    );

    res.json({
      items: rows,
      total: parseInt(countRows[0].count),
      page,
      limit,
      hasMore: offset + rows.length < parseInt(countRows[0].count),
    });
  } catch (err) {
    console.error("[Gallery]", err.message);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

// GET /api/gallery/my — current user's jobs (all statuses, for studio)
router.get("/my", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT job_id, queue_type, mode, display_model, prompt, quality,
              result_url, webp_url, aspect_ratio, duration, status,
              error_msg, queue_position, created_at, completed_at
       FROM generation_jobs
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.sessionId],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch your gallery" });
  }
});

// GET /api/gallery/my-created-images — images created by this user (for Image Selector Modal)
router.get("/my-created-images", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT job_id, result_url, result_path, aspect_ratio, quality, display_model, prompt, created_at
       FROM generation_jobs
       WHERE session_id = $1
         AND queue_type = 'image'
         AND status = 'completed'
         AND result_url IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.sessionId],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch created images" });
  }
});

module.exports = router;
