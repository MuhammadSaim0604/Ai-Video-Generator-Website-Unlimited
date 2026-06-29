const express = require('express');
const multer = require('multer');
const pool = require('../db/pool');
const { requireUserAuth } = require('../middleware/userAuth');
const accountManager = require('../services/accountManager');

const debugLog = (...args) => { if (process.env.NODE_ENV !== 'production') console.log(...args); };
const pixverse = require('../services/pixverseClient');
const ossUploader = require('../services/ossUploader');

const router = express.Router();

// Store file in memory for OSS upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /api/upload/image
router.post('/image', requireUserAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  debugLog(`[Upload] Received file: ${req.file.originalname} size=${req.file.size} mime=${req.file.mimetype}`);

  // Select an available account for the upload
  const account = await accountManager.selectAccount('image');
  if (!account) {
    return res.status(503).json({ error: 'No Pixverse accounts available. Please try again later.' });
  }

  debugLog(`[Upload] Using account: ${account.email}`);

  try {
    // Step 1: Get OSS upload token
    debugLog('[Upload] Step 1: Getting OSS upload token...');
    const ossToken = await accountManager.withTokenRefresh(account, (token) =>
      pixverse.getUploadToken(token)
    );
    debugLog('[Upload] OSS token received. Ak:', ossToken.Ak?.substring(0, 20) + '...');

    // Step 2: Upload file to OSS via multipart
    debugLog('[Upload] Step 2: Uploading to OSS...');
    const { ossKey, fileSize } = await ossUploader.uploadToOss(
      ossToken,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    debugLog(`[Upload] OSS upload done. ossKey=${ossKey}`);

    // Step 3: Register upload with Pixverse
    debugLog('[Upload] Step 3: Registering with Pixverse batch_upload_media...');
    const results = await accountManager.withTokenRefresh(account, (token) =>
      pixverse.batchUploadMedia(token, [
        {
          name: ossKey.split('/').pop(),
          size: fileSize,
          path: ossKey,
          file_name: req.file.originalname,
        },
      ])
    );

    if (!results || results.length === 0) {
      throw new Error('Pixverse did not confirm image upload');
    }

    const uploaded = results[0];
    debugLog('[Upload] Pixverse confirmed upload. id:', uploaded.id, 'url:', uploaded.url);

    // Save to DB
    await pool.query(
      `INSERT INTO uploaded_images (user_id, pixverse_image_id, url, path, file_name, width, height, uploaded_via_account)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.userId,
        uploaded.id || uploaded.asset_id,
        uploaded.url,
        uploaded.path,
        req.file.originalname,
        uploaded.width || 0,
        uploaded.height || 0,
        account.id,
      ]
    );

    res.json({
      success: true,
      imageId: uploaded.id || uploaded.asset_id,
      url: uploaded.url,
      path: uploaded.path,
      width: uploaded.width,
      height: uploaded.height,
    });
  } catch (err) {
    const statusCode = err.response?.status;
    const responseBody = err.response?.data;
    console.error('[Upload] FAILED:', err.message);
    if (statusCode) console.error(`[Upload] HTTP ${statusCode} response:`, JSON.stringify(responseBody));
    res.status(500).json({ error: err.message || 'Upload failed' });
  } finally {
    await accountManager.releaseAccount(account.id);
  }
});

// GET /api/upload/my-images — list user's uploaded images
router.get('/my-images', requireUserAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, pixverse_image_id, url, path, file_name, width, height, created_at
       FROM uploaded_images
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch uploaded images' });
  }
});

module.exports = router;
