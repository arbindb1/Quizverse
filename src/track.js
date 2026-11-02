const crypto = require('crypto');
const express = require('express');
const db = require('./db');
const { verify } = require('./auth');
const { wrap, errorHandler } = require('./http');

// Page-view tracking for the admin analytics. Stores a random visitor id (made by the browser), the page name only
// (never room codes or ids), the device type, the referring site's host name and a salted hash of the IP address.
const router = express.Router();
const PAGES = new Set(['home', 'login', 'quizzes', 'quiz', 'new-room', 'join', 'room', 'locker', 'stats', 'admin']);
const lastSeen = new Map(); // visitor id -> time of the last stored view, to ignore floods

router.post('/', wrap(async (req, res) => {
  const vid = String(req.body.vid || '');
  if (!/^[a-f0-9-]{32,36}$/i.test(vid)) return res.json({ ok: false });
  const now = Date.now();
  if (now - (lastSeen.get(vid) || 0) < 400) return res.json({ ok: true });
  lastSeen.set(vid, now);
  if (lastSeen.size > 5000) for (const [k, t] of lastSeen) if (now - t > 60000) lastSeen.delete(k);

  const page = PAGES.has(req.body.page) ? req.body.page : 'other';
  const device = /Mobi|Android|iPhone|iPad/i.test(String(req.headers['user-agent'] || '')) ? 'mobile' : 'desktop';
  const ref = String(req.body.ref || '').toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 100) || null;
  let userId = null;
  try { userId = verify((req.headers.authorization || '').replace(/^Bearer /, '')).id; } catch { /* anonymous visitor */ }
  const ip = crypto.createHash('sha256').update(String(req.ip) + (process.env.JWT_SECRET || '')).digest('hex').slice(0, 16);

  await db.query('INSERT INTO visits (visitor_id, user_id, page, device, ref_host, ip_hash) VALUES (?,?,?,?,?,?)', [vid, userId, page, device, ref, ip]);
  if (userId) await db.query('UPDATE users SET last_seen_at = NOW() WHERE id = ?', [userId]);
  res.json({ ok: true });
}));

router.use(errorHandler);
module.exports = router;
