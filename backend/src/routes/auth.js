const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'changeme';
const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      googleId: user.google_id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

// GET /api/auth/google — start OAuth flow
router.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return res.redirect('/sign-in?error=not_configured');
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectTo = req.query.redirect_to || '/studio';

  res.cookie('oauth_state', state, {
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: 'lax',
    path: '/',
  });
  res.cookie('oauth_redirect', redirectTo, {
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: 'lax',
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /api/auth/google/callback — Google redirects here after consent
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/sign-in?error=access_denied');
  }

  const storedState = req.cookies?.oauth_state;
  if (!state || state !== storedState) {
    return res.redirect('/sign-in?error=state_mismatch');
  }

  const redirectTo = req.cookies?.oauth_redirect || '/studio';

  res.clearCookie('oauth_state', { path: '/' });
  res.clearCookie('oauth_redirect', { path: '/' });

  try {
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenRes.data;

    const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { sub: googleId, email, name, picture } = userRes.data;

    const { rows } = await pool.query(
      `INSERT INTO users (google_id, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         picture = EXCLUDED.picture,
         updated_at = NOW()
       RETURNING id, google_id, email, name, picture`,
      [googleId, email, name, picture]
    );

    const user = rows[0];
    const token = signToken(user);
    setAuthCookie(res, token);

    console.log(`[Auth] User signed in: ${user.email} (id=${user.id})`);
    res.redirect(redirectTo);
  } catch (err) {
    console.error('[Auth] Google callback error:', err.response?.data || err.message);
    res.redirect('/sign-in?error=auth_failed');
  }
});

// GET /api/auth/me — returns current user + stats
router.get('/me', async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.json({ user: null });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (_) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.json({ user: null });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE queue_type = 'image' AND status = 'completed') AS total_images,
         COUNT(*) FILTER (WHERE queue_type IN ('sd_video','hd_video') AND status = 'completed') AS total_videos,
         COUNT(*) FILTER (WHERE status IN ('queued','processing')) AS pending
       FROM generation_jobs
       WHERE user_id = $1`,
      [String(payload.userId)]
    );

    res.json({
      user: {
        id: payload.userId,
        googleId: payload.googleId,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      },
      stats: rows[0] || { total_images: 0, total_videos: 0, pending: 0 },
    });
  } catch (err) {
    console.error('[Auth Me]', err.message);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

// GET /api/auth/track — visitor tracking
router.get('/track', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO site_analytics (date, total_visitors)
       VALUES (CURRENT_DATE, 1)
       ON CONFLICT (date)
       DO UPDATE SET total_visitors = site_analytics.total_visitors + 1`
    );
    res.json({ ok: true });
  } catch (_) {
    res.json({ ok: true });
  }
});

module.exports = router;
