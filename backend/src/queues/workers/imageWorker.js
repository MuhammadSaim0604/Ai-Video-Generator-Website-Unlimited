const pool = require('../../db/pool');
const accountManager = require('../../services/accountManager');
const pixverse = require('../../services/pixverseClient');
const { emitJobUpdate } = require('../../socket/index');
const { IMAGE_QUALITY_MAP, IMAGE_CREDITS } = require('../../constants/models');

const debugLog = (...args) => { if (process.env.NODE_ENV !== 'production') console.log(...args); };

const QUEUE_DATA_RETRY_INTERVAL_MS = 2000;
const QUEUE_DATA_MAX_RETRIES = 10; // 10 × 2s = 20s max to get queue_data
const STATUS_POLL_INTERVAL_MS = 5000;
const STATUS_MAX_RETRIES = 120; // 120 × 5s = 10 min hard cap

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function imageWorker(job) {
  const {
    job_id,
    mode,
    internal_model,
    prompt,
    quality: displayQuality,
    aspect_ratio,
    seed,
    customer_img_path,
  } = job;

  const pixverseQuality = IMAGE_QUALITY_MAP[displayQuality] || displayQuality;
  const creditMap = IMAGE_CREDITS[internal_model] || {};
  const credit_change = creditMap[displayQuality] || 10;
  const parsedSeed = parseInt(seed) || Math.floor(Math.random() * 2147483647);
  const customerImgPaths = customer_img_path ? [customer_img_path] : [];

  debugLog(`[ImageWorker] START job_id=${job_id} mode=${mode} model=${internal_model} quality=${pixverseQuality}`);

  let account = await accountManager.selectAccount('image');
  if (!account) {
    await pool.query(
      "UPDATE generation_jobs SET status = 'queued' WHERE job_id = $1",
      [job_id]
    );
    console.warn(`[ImageWorker] No account available, re-queuing ${job_id}`);
    return;
  }

  try {
    // ── STEP 1: Send generation request ─────────────────────────────────────
    let pixverseResp;
    if (mode === 'i2i') {
      if (customerImgPaths.length === 0) throw new Error('i2i requires customer_img_path');
      pixverseResp = await accountManager.withTokenRefresh(account, (token) =>
        pixverse.generateI2I(token, {
          prompt, model: internal_model,
          quality: pixverseQuality,
          aspect_ratio: (aspect_ratio && aspect_ratio !== 'Auto') ? aspect_ratio : undefined,
          seed: parsedSeed, credit_change,
          customer_img_paths: customerImgPaths,
        })
      );
    } else {
      pixverseResp = await accountManager.withTokenRefresh(account, (token) =>
        pixverse.generateT2I(token, {
          prompt, model: internal_model,
          quality: pixverseQuality,
          aspect_ratio: (aspect_ratio && aspect_ratio !== 'Auto') ? aspect_ratio : undefined,
          seed: parsedSeed, credit_change,
        })
      );
    }

    const pixverseJobId = String(pixverseResp.image_id || pixverseResp.success_ids?.[0]);
    const costCredits = pixverseResp.cost_credits || credit_change;
    debugLog(`[ImageWorker] job_id=${job_id} pixverseJobId=${pixverseJobId} cost=${costCredits}`);

    // ── STEP 2: Deduct credits from account in DB ────────────────────────────
    await pool.query(
      `UPDATE pixverse_accounts
       SET remaining_credits = GREATEST(remaining_credits - $1, 0), last_used_at = NOW()
       WHERE id = $2`,
      [costCredits, account.id]
    );

    // Save pixverse_job_id and mark processing
    await pool.query(
      `UPDATE generation_jobs
       SET pixverse_job_id = $1, pixverse_account_id = $2, status = 'processing'
       WHERE job_id = $3`,
      [pixverseJobId, account.id, job_id]
    );

    emitJobUpdate(job_id, 'job:processing', { status: 'processing', pixverseJobId });

    // ── STEP 3: Wait 4s, then fetch library to get queue_data ───────────────
    debugLog(`[ImageWorker] job_id=${job_id} waiting 4s for Pixverse to queue the job...`);
    await sleep(4000);

    let asset = null;
    let estimatedGenTime = 0;

    // Retry fetching library until queue_data is present
    for (let attempt = 0; attempt < QUEUE_DATA_MAX_RETRIES; attempt++) {
      const lib = await accountManager.withTokenRefresh(account, (token) =>
        pixverse.getAssetLibrary(token, 'image')
      );
      asset = lib.find((item) => String(item.image_id) === pixverseJobId) || null;

      if (asset && asset.queue_data && asset.queue_data.estimated_gen_time !== undefined) {
        estimatedGenTime = asset.queue_data.estimated_gen_time || 0;
        debugLog(`[ImageWorker] job_id=${job_id} got queue_data. estimated_gen_time=${estimatedGenTime}s image_status=${asset.image_status}`);
        break;
      }

      debugLog(`[ImageWorker] job_id=${job_id} queue_data not ready yet (attempt ${attempt + 1}/${QUEUE_DATA_MAX_RETRIES}), retrying in 2s...`);
      await sleep(QUEUE_DATA_RETRY_INTERVAL_MS);
    }

    // ── STEP 4: Wait for estimated gen time (skip if 0) ─────────────────────
    if (estimatedGenTime > 0) {
      debugLog(`[ImageWorker] job_id=${job_id} sleeping ${estimatedGenTime}s (estimated gen time)...`);
      await sleep(estimatedGenTime * 1000);
    } else {
      debugLog(`[ImageWorker] job_id=${job_id} estimated_gen_time=0, skipping initial wait, going straight to status polling.`);
    }

    // ── STEP 5: Poll library every 5s until image_status === 1 ──────────────
    debugLog(`[ImageWorker] job_id=${job_id} starting status polling (image_status === 1 = done)...`);
    let done = false;
    let finalAsset = null;

    for (let attempt = 0; attempt < STATUS_MAX_RETRIES; attempt++) {
      const lib = await accountManager.withTokenRefresh(account, (token) =>
        pixverse.getAssetLibrary(token, 'image')
      );
      finalAsset = lib.find((item) => String(item.image_id) === pixverseJobId) || null;

      if (finalAsset && finalAsset.image_status === 1) {
        done = true;
        debugLog(`[ImageWorker] job_id=${job_id} image_status=1 ✓ — generation complete after ${attempt + 1} poll(s)`);
        break;
      }

      debugLog(`[ImageWorker] job_id=${job_id} image_status=${finalAsset?.image_status ?? 'unknown'} (poll ${attempt + 1}), waiting 5s...`);
      await sleep(STATUS_POLL_INTERVAL_MS);
    }

    if (!done) {
      throw new Error('Image generation timed out after 10 minutes');
    }

    // ── STEP 6: Extract result and save ─────────────────────────────────────
    const resultUrl  = finalAsset?.image_url  || null;
    const resultPath = finalAsset?.image_path || null;

    debugLog(`[ImageWorker] job_id=${job_id} resultUrl=${resultUrl}`);

    await pool.query(
      `UPDATE generation_jobs
       SET status = 'completed', result_url = $1, result_path = $2, completed_at = NOW()
       WHERE job_id = $3`,
      [resultUrl, resultPath, job_id]
    );

    await pool.query(
      `INSERT INTO site_analytics (date, total_images_generated)
       VALUES (CURRENT_DATE, 1)
       ON CONFLICT (date)
       DO UPDATE SET total_images_generated = site_analytics.total_images_generated + 1`
    );

    emitJobUpdate(job_id, 'job:completed', {
      status: 'completed',
      resultUrl,
      resultPath,
      type: 'image',
    });

  } finally {
    await accountManager.releaseAccount(account.id);
  }
}

module.exports = { imageWorker };
