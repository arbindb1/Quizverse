const jwt = require('jsonwebtoken');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET not set, using an insecure development secret');

const sign = (user) => jwt.sign({ id: user.id, username: user.username, ...(user.guest ? { guest: true } : {}) }, SECRET, { expiresIn: '14d' });
const verify = (token) => jwt.verify(token, SECRET);

// A suspended or deleted account is refused even while its login token is still valid.
// The database is asked at most every 30 seconds per user; an admin action clears the entry at once.
const states = new Map(); // user id -> { state: 'ok' | 'banned' | 'gone', at }
async function accountState(id) {
  const hit = states.get(id);
  if (hit && Date.now() - hit.at < 30000) return hit.state;
  const [[row]] = await db.query('SELECT is_banned FROM users WHERE id = ?', [id]);
  const state = !row ? 'gone' : row.is_banned ? 'banned' : 'ok';
  states.set(id, { state, at: Date.now() });
  return state;
}
const forgetAccount = (id) => states.delete(id);

async function requireAuth(req, res, next) {
  let user;
  try {
    user = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
  } catch {
    return res.status(401).json({ error: 'Please log in' });
  }
  try {
    const state = await accountState(user.id);
    if (state === 'gone') return res.status(401).json({ error: 'Please log in' });
    if (state === 'banned') return res.status(403).json({ error: 'This account is suspended' });
  } catch (e) {
    return next(e);
  }
  req.user = user;
  next();
}

// Admin rights are always read from the database, never from the token, so revoking them works at once
async function requireAdmin(req, res, next) {
  try {
    const [[row]] = await db.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
    if (!row || !row.is_admin) return res.status(403).json({ error: 'Admins only' });
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { sign, verify, requireAuth, requireAdmin, accountState, forgetAccount };
