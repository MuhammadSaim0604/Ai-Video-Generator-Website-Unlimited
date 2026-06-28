const pool = require('../../db/pool');
const accountManager = require('../../services/accountManager');
const pixverse = require('../../services/pixverseClient');
const { emitJobUpdate } = require('../../socket/index');

const debugLog = (...args) => { if (process.env.NODE_ENV !== 'production') console.log(...args); };

const QUEUE_DATA_RETRY_INTERVAL_MS = 2000;
const QUEUE_DATA_MAX_RETRIES = 10; // 10 × 2s = 20s max to get queue_data
const STATUS_POLL_INTERVAL_MS = 5000;
const STATUS_MAX_RETRIES = 240; // 240 × 5s = 20 min hard cap

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function videoWorker(job, queueType) {
  const {
    job_id,
    mode,
    internal_model,
    prompt,
    quality,
    aspect_ratio,
    duration,
    seed,
    customer_img_path,
  } = job;

  const parsedSeed = parseInt(seed) || Math.floor(Math.random() * 2147483647);
  const parsedDuration = parseInt(duration) || 5;

  debugLog(`[VideoWorker] START job_id=${job_id} mode=${mode} model=${internal_model} quality=${quality}`);

  let account = await accountManager.selectAccount(queueType);
  if (!account) {
    await pool.query(
      "UPDATE generation_jobs SET status = 'queued' WHERE job_id = $1",
      [job_id]
    );
    console.warn(`[VideoWorker] No account available for ${queueType}, re-queuing ${job_id}`);
    return;
  }

  try {
    // ── STEP 1: Send generation request ─────────────────────────────────────
    let pixverseResp;
    if (mode === 'i2v') {
      if (!customer_img_path) throw new Error('i2v requires customer_img_path');
      pixverseResp = await accountManager.withTokenRefresh(account, (token) =>
        pixverse.generateI2V(token, {
          prompt, model: internal_model, quality,
          duration: parsedDuration, seed: parsedSeed, customer_img_path,
        })
      );
    } else {
      pixverseResp = await accountManager.withTokenRefresh(account, (token) =>
        pixverse.generateT2V(token, {
          prompt, model: internal_model, quality,
          aspect_ratio, duration: parsedDuration, seed: parsedSeed,
        })
      );
    }

    const pixverseJobId = String(pixverseResp.video_id || pixverseResp.video_ids?.[0]);
    const costCredits = pixverseResp.cost_credits || 75;
    debugLog(`[VideoWorker] job_id=${job_id} pixverseJobId=${pixverseJobId} cost=${costCredits}`);

    // ── STEP 2: Deduct credits from account in DB ────────────────────────────
    await pool.query(
      `UPDATE pixverse_accounts
       SET remaining_credits = GREATEST(remaining_credits - $1, 0), last_used_at = NOW()
       WHERE id = $2`,
      [costCredits, account.id]
    );

    // Decrement HD times if applicable
    if (queueType === 'hd_video') {
      await pool.query(
        'UPDATE pixverse_accounts SET high_quality_times = GREATEST(high_quality_times - 1, 0) WHERE id = $1',
        [account.id]
      );
    }

    // Save pixverse_job_id and mark processing
    await pool.query(
      `UPDATE generation_jobs
       SET pixverse_job_id = $1, pixverse_account_id = $2, status = 'processing'
       WHERE job_id = $3`,
      [pixverseJobId, account.id, job_id]
    );

    emitJobUpdate(job_id, 'job:processing', { status: 'processing', pixverseJobId });

    // ── STEP 3: Wait 4s, then fetch library to get queue_data ───────────────
    debugLog(`[VideoWorker] job_id=${job_id} waiting 4s for Pixverse to queue the job...`);
    await sleep(4000);

    let asset = null;
    let estimatedGenTime = 0;

    // Retry fetching library until queue_data is present
    for (let attempt = 0; attempt < QUEUE_DATA_MAX_RETRIES; attempt++) {
      const lib = await accountManager.withTokenRefresh(account, (token) =>
        pixverse.getAssetLibrary(token, 'video')
      );
      asset = lib.find((item) => String(item.video_id) === pixverseJobId) || null;

      if (asset && asset.queue_data && asset.queue_data.estimated_gen_time !== undefined) {
        estimatedGenTime = asset.queue_data.estimated_gen_time || 0;
        debugLog(`[VideoWorker] job_id=${job_id} got queue_data. estimated_gen_time=${estimatedGenTime}s video_status=${asset.video_status}`);
        break;
      }

      debugLog(`[VideoWorker] job_id=${job_id} queue_data not ready yet (attempt ${attempt + 1}/${QUEUE_DATA_MAX_RETRIES}), retrying in 2s...`);
      await sleep(QUEUE_DATA_RETRY_INTERVAL_MS);
    }

    // ── STEP 4: Wait for estimated gen time (skip if 0) ─────────────────────
    if (estimatedGenTime > 0) {
      debugLog(`[VideoWorker] job_id=${job_id} sleeping ${estimatedGenTime}s (estimated gen time)...`);
      await sleep(estimatedGenTime * 1000);
    } else {
      debugLog(`[VideoWorker] job_id=${job_id} estimated_gen_time=0, skipping initial wait, going straight to status polling.`);
    }

    // ── STEP 5: Poll library every 5s until video_status === 1 ──────────────
    debugLog(`[VideoWorker] job_id=${job_id} starting status polling (video_status === 1 = done)...`);
    let done = false;
    let finalAsset = null;

    for (let attempt = 0; attempt < STATUS_MAX_RETRIES; attempt++) {
      const lib = await accountManager.withTokenRefresh(account, (token) =>
        pixverse.getAssetLibrary(token, 'video')
      );
      finalAsset = lib.find((item) => String(item.video_id) === pixverseJobId) || null;

      if (finalAsset && finalAsset.video_status === 1) {
        done = true;
        debugLog(`[VideoWorker] job_id=${job_id} video_status=1 ✓ — generation complete after ${attempt + 1} poll(s)`);
        break;
      }

      debugLog(`[VideoWorker] job_id=${job_id} video_status=${finalAsset?.video_status ?? 'unknown'} (poll ${attempt + 1}), waiting 5s...`);
      await sleep(STATUS_POLL_INTERVAL_MS);
    }

    if (!done) {
      throw new Error('Video generation timed out after 20 minutes');
    }

    // ── STEP 6: Extract result and save ─────────────────────────────────────
    const resultUrl   = finalAsset?.url        || null;
    const resultPath  = finalAsset?.video_path || null;
    // first_frame is populated only after video_status becomes 1
    const webpUrl     = finalAsset?.first_frame || null;

    debugLog(`[VideoWorker] job_id=${job_id} resultUrl=${resultUrl} webpUrl=${webpUrl}`);

    await pool.query(
      `UPDATE generation_jobs
       SET status = 'completed', result_url = $1, result_path = $2,
           webp_url = $3, thumbnail_url = $3, completed_at = NOW()
       WHERE job_id = $4`,
      [resultUrl, resultPath, webpUrl, job_id]
    );

    const isHD = queueType === 'hd_video';
    await pool.query(
      `INSERT INTO site_analytics (date, total_videos_generated, total_hd_videos_generated, total_sd_videos_generated)
       VALUES (CURRENT_DATE, 1, $1, $2)
       ON CONFLICT (date) DO UPDATE SET
         total_videos_generated   = site_analytics.total_videos_generated + 1,
         total_hd_videos_generated = site_analytics.total_hd_videos_generated + $1,
         total_sd_videos_generated = site_analytics.total_sd_videos_generated + $2`,
      [isHD ? 1 : 0, isHD ? 0 : 1]
    );

    emitJobUpdate(job_id, 'job:completed', {
      status: 'completed',
      resultUrl,
      resultPath,
      webpUrl,
      thumbnailUrl: webpUrl,
      type: 'video',
    });

  } finally {
    await accountManager.releaseAccount(account.id);
  }
}

module.exports = { videoWorker };
