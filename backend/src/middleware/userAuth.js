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

  // Authorization header takes priority over cookie
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const payload = extractPayload(authHeader.slice(7));
    if (payload && payload.userId) {
      req.userId = payload.userId;
      req.user = payload;
      return next();
    }
  }

  // Fallback: cookie
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) {
    const payload = extractPayload(cookieToken);
    if (payload && payload.userId) {
      req.userId = payload.userId;
      req.user = payload;
      return next();
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
