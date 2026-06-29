const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_ADMIN_SECRET || 'veo3-admin-secret-change-in-prod';
const TOKEN_EXPIRY = '7d';

function signAdminToken(username) {
  return jwt.sign({ adminId: username, type: 'admin' }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'admin') throw new Error('Not admin token');
    req.adminId = payload.adminId;
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { requireAdmin, signAdminToken };
