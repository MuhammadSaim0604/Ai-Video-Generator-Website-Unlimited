const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

async function sessionIdMiddleware(req, res, next) {
  let sessionId = req.cookies && req.cookies['vid_session'];
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('vid_session', sessionId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      sameSite: 'lax',
    });
    // Track new visitor analytics
    try {
      await pool.query(
        `INSERT INTO site_analytics (date, total_visitors)
         VALUES (CURRENT_DATE, 1)
         ON CONFLICT (date)
         DO UPDATE SET total_visitors = site_analytics.total_visitors + 1`
      );
    } catch (_) {}
  }
  req.sessionId = sessionId;
  next();
}

module.exports = sessionIdMiddleware;
