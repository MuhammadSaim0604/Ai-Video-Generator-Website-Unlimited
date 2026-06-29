const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'changeme';
const COOKIE_NAME = 'auth_token';

function extractPayload(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return null;
  }
}

async function optionalUserAuth(req, res, next) {
  req.userId = null;
  req.user = null;

  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) {
    const payload = extractPayload(cookieToken);
    if (payload) {
      req.userId = String(payload.userId);
      req.user = payload;
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = extractPayload(token);
    if (payload) {
      req.userId = String(payload.userId);
      req.user = payload;
    }
  }

  next();
}

async function requireUserAuth(req, res, next) {
  await optionalUserAuth(req, res, () => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    next();
  });
}

module.exports = { optionalUserAuth, requireUserAuth };
