const pool = require('../db/pool');
const pixverse = require('./pixverseClient');

/**
 * Select the best available Pixverse account for a given job type.
 * Rules:
 *  - active_generations < 2 (Pixverse limit: 2 concurrent per account)
 *  - For HD jobs: high_quality_times > 0
 *  - Sort by highest remaining credits
 * Locks the slot by incrementing active_generations atomically.
 */
async function selectAccount(jobType) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let query;
    if (jobType === 'hd_video') {
      query = `
        SELECT * FROM pixverse_accounts
        WHERE is_active = TRUE
          AND active_generations < 2
          AND high_quality_times > 0
        ORDER BY remaining_credits DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
    } else {
      query = `
        SELECT * FROM pixverse_accounts
        WHERE is_active = TRUE
          AND active_generations < 2
        ORDER BY remaining_credits DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
    }

    const { rows } = await client.query(query);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const account = rows[0];
    await client.query(
      `UPDATE pixverse_accounts
       SET active_generations = active_generations + 1, last_used_at = NOW()
       WHERE id = $1`,
      [account.id]
    );

    await client.query('COMMIT');
    return account;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Release the account slot after a job finishes (success or fail).
 */
async function releaseAccount(accountId) {
  await pool.query(
    `UPDATE pixverse_accounts
     SET active_generations = GREATEST(active_generations - 1, 0)
     WHERE id = $1`,
    [accountId]
  );
}

/**
 * Refresh account token using stored credentials.
 * Returns the new token.
 */
async function refreshToken(account) {
  try {
    const result = await pixverse.login(account.email, account.password);
    const newToken = result.Token;
    await pool.query(
      'UPDATE pixverse_accounts SET token = $1 WHERE id = $2',
      [newToken, account.id]
    );
    return newToken;
  } catch (err) {
    console.error(`[AccountManager] Token refresh failed for ${account.email}:`, err.message);
    await pool.query('UPDATE pixverse_accounts SET is_active = FALSE WHERE id = $1', [account.id]);
    throw err;
  }
}

/**
 * Execute a Pixverse API call with automatic token refresh on auth error.
 */
async function withTokenRefresh(account, apiFn) {
  try {
    return await apiFn(account.token);
  } catch (err) {
    if (pixverse.isAuthError(err)) {
      console.log(`[AccountManager] Token expired for ${account.email}, refreshing...`);
      const newToken = await refreshToken(account);
      account.token = newToken;
      return await apiFn(newToken);
    }
    throw err;
  }
}

/**
 * Sync account credits and high_quality_times from Pixverse.
 */
async function syncAccountCredits(account) {
  const fetchAll = (token) => Promise.all([
    pixverse.getCredits(token),
    pixverse.getWorkspaceCredits(token),
  ]);

  try {
    let token = account.token;
    let credits, workspace;

    try {
      [credits, workspace] = await Promise.all([
        pixverse.getCredits(token),
        pixverse.getWorkspaceCredits(token),
      ]);
    } catch (err) {
        token = await refreshToken(account);
        [credits, workspace] = await Promise.all([
          pixverse.getCredits(token),
          pixverse.getWorkspaceCredits(token),
        ]);
      }

    const remainingCredits = workspace;
    const highQualityTimes = credits.high_quality_times;

    await pool.query(
      `UPDATE pixverse_accounts
       SET remaining_credits = $1, high_quality_times = $2
       WHERE id = $3`,
      [remainingCredits, highQualityTimes, account.id]
    );

    return { remainingCredits, highQualityTimes };
  } catch (err) {
    console.error(`[AccountManager] Sync credits failed for ${account.email}:`, err.message);
    return null;
  }
}

/**
 * Process uploaded accounts JSON and upsert into DB.
 * JSON format: { email: { email, username, password, token, invite_code, account_id } }
 */
async function processUploadedAccounts(accountsJson) {
  const results = [];

  for (const [email, data] of Object.entries(accountsJson)) {
    try {
      let { token, password, username, invite_code, account_id } = data;

      // Test token validity — try to get credits
      // If ANY error occurs (including "logged in elsewhere"), force a fresh login
      // since we always have the password for uploaded accounts.
      let creditsData = null;
      let workspaceCredits = 0;
      try {
        const [c, w] = await Promise.all([
          pixverse.getCredits(token),
          pixverse.getWorkspaceCredits(token),
        ]);
        creditsData = c;
        workspaceCredits = w;
      } catch (tokenErr) {
        // Re-login regardless of error type — covers:
        //   • 401/403 token expiry
        //   • "account has been logged in elsewhere" (stale session)
        //   • any other session invalidation
        console.log(`[AccountManager] Token invalid for ${email} (${tokenErr.message}), re-logging in…`);
        const loginResult = await pixverse.login(email, password);
        token = loginResult.Token;
        const [c, w] = await Promise.all([
          pixverse.getCredits(token),
          pixverse.getWorkspaceCredits(token),
        ]);
        creditsData = c;
        workspaceCredits = w;
      }

      const highQualityTimes = creditsData ? creditsData.high_quality_times : 0;

      await pool.query(
        `INSERT INTO pixverse_accounts
           (email, username, password, token, account_id, invite_code, total_credits, remaining_credits, high_quality_times, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         ON CONFLICT (email) DO UPDATE SET
           username = EXCLUDED.username,
           password = EXCLUDED.password,
           token = EXCLUDED.token,
           account_id = EXCLUDED.account_id,
           invite_code = EXCLUDED.invite_code,
           total_credits = EXCLUDED.total_credits,
           remaining_credits = EXCLUDED.remaining_credits,
           high_quality_times = EXCLUDED.high_quality_times,
           is_active = TRUE`,
        [email, username, password, token, account_id, invite_code, workspaceCredits, workspaceCredits, highQualityTimes]
      );

      results.push({ email, status: 'success', credits: workspaceCredits, highQualityTimes });
    } catch (err) {
      console.error(`[AccountManager] Failed to process account ${email}:`, err.message);
      results.push({ email, status: 'error', error: err.message });
    }
  }

  return results;
}

module.exports = {
  selectAccount,
  releaseAccount,
  refreshToken,
  withTokenRefresh,
  syncAccountCredits,
  processUploadedAccounts,
};
