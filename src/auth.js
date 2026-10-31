const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET not set, using an insecure development secret');

const sign = (user) => jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '14d' });
const verify = (token) => jwt.verify(token, SECRET);

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  try {
    req.user = verify(header.replace(/^Bearer /, ''));
    next();
  } catch {
    res.status(401).json({ error: 'Please log in' });
  }
}

module.exports = { sign, verify, requireAuth };
