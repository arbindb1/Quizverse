const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const game = require('./game');
const { requireAuth, requireAdmin, forgetAccount } = require('./auth');
const { wrap, fail, str, EMAIL, errorHandler } = require('./http');
const { SKINS, byId, levelFor, xpAt, progressOf, requirementText } = require('./skins');
const { loadStats } = require('./stats');

const router = express.Router();
const REAL = "u.password_hash <> '!'"; // the built-in "quizverse" account owns the starter quizzes and is not a person

/* ---------- who is an admin ---------- */
const list = (v) => String(v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// ADMIN_USERNAMES / ADMIN_EMAILS (comma separated) name accounts that are admins as soon as they register or log in
function isConfiguredAdmin(username, email) {
  return list(process.env.ADMIN_USERNAMES).includes(String(username || '').toLowerCase())
    || (!!email && list(process.env.ADMIN_EMAILS).includes(String(email).toLowerCase()));
}

async function bootstrapAdmins() {
  const names = list(process.env.ADMIN_USERNAMES);
  const mails = list(process.env.ADMIN_EMAILS);
  let n = 0;
  if (names.length) n += (await db.query('UPDATE users SET is_admin = 1 WHERE is_admin = 0 AND LOWER(username) IN (?)', [names]))[0].affectedRows;
  if (mails.length) n += (await db.query('UPDATE users SET is_admin = 1 WHERE is_admin = 0 AND LOWER(email) IN (?)', [mails]))[0].affectedRows;
  if (n) console.log(`Made ${n} account(s) admin from ADMIN_USERNAMES / ADMIN_EMAILS`);
}

/* ---------- small pure helpers (unit tested) ---------- */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lastDays = (n, now = new Date()) => Array.from({ length: n }, (_, i) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i))));
// rows from SQL ({ d: 'YYYY-MM-DD', n: 3 }) -> one value per day, zero where nothing happened
const fillDays = (rows, days, field = 'n') => {
  const by = new Map(rows.map((r) => [r.d, Number(r[field])]));
  return days.map((date) => ({ date, value: by.get(date) || 0 }));
};

const int = (v, min, max, name) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw fail(400, `${name} must be a whole number from ${min} to ${max}`);
  return n;
};

// Validates the fields an admin may change on an account and turns them into column values
function parsePatch(body) {
  const set = {};
  if (body.username !== undefined) {
    const u = str(body.username, 30);
    if (!/^[A-Za-z0-9_]{3,30}$/.test(u)) throw fail(400, 'Username must be 3-30 letters, numbers or underscores');
    set.username = u;
  }
  if (body.email !== undefined) {
    const e = str(body.email, 190).toLowerCase();
    if (e && !EMAIL.test(e)) throw fail(400, 'Enter a valid email address');
    set.email = e || null;
  }
  if (body.level !== undefined) set.xp = xpAt(int(body.level, 1, 100, 'Level')); // a level is set by giving exactly the XP it needs
  if (body.xp !== undefined) set.xp = int(body.xp, 0, 10000000, 'XP');
  if (body.add_xp !== undefined) set.add_xp = int(body.add_xp, -1000000, 1000000, 'XP to add');
  if (body.wins !== undefined) set.wins = int(body.wins, 0, 100000, 'Wins');
  if (body.tournaments !== undefined) set.tournaments = int(body.tournaments, 0, 100000, 'Tournaments');
  if (body.skin !== undefined) {
    if (!byId(String(body.skin))) throw fail(400, 'Unknown character');
    set.skin = String(body.skin);
  }
  if (body.is_admin !== undefined) set.is_admin = body.is_admin ? 1 : 0;
  if (body.is_banned !== undefined) set.is_banned = body.is_banned ? 1 : 0;
  if (body.ban_reason !== undefined) set.ban_reason = str(body.ban_reason, 200) || null;
  return set;
}

/* ---------- every admin route needs a logged-in admin ---------- */
router.use(requireAuth, requireAdmin);

const logAction = (req, action, target, details) => db.query(
  'INSERT INTO admin_log (admin_id, admin_name, action, target, details) VALUES (?,?,?,?,?)',
  [req.user.id, req.user.username, action, target || null, details ? JSON.stringify(details).slice(0, 2000) : null],
).catch((e) => console.error('Could not write the admin log', e));

/* ---------- overview: totals, daily series, breakdowns ---------- */
router.get('/overview', wrap(async (req, res) => {
  const q = async (sql, p = []) => (await db.query(sql, p))[0];
  const [[u]] = await db.query(`SELECT COUNT(*) AS users,
      SUM(created_at >= NOW() - INTERVAL 1 DAY) AS new1, SUM(created_at >= NOW() - INTERVAL 7 DAY) AS new7, SUM(created_at >= NOW() - INTERVAL 30 DAY) AS new30,
      SUM(last_seen_at >= NOW() - INTERVAL 1 DAY) AS active1, SUM(last_seen_at >= NOW() - INTERVAL 7 DAY) AS active7
    FROM users u WHERE ${REAL}`);
  const [[v]] = await db.query(`SELECT COUNT(*) AS total, SUM(created_at >= NOW() - INTERVAL 1 DAY) AS d1, SUM(created_at >= NOW() - INTERVAL 7 DAY) AS d7,
      SUM(created_at >= NOW() - INTERVAL 30 DAY) AS d30, COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL 7 DAY THEN visitor_id END) AS visitors7 FROM visits`);
  const [[r]] = await db.query(`SELECT SUM(status = 'finished') AS finished, SUM(status = 'finished' AND finished_at >= NOW() - INTERVAL 7 DAY) AS finished7,
      SUM(status = 'playing') AS live, SUM(status = 'lobby') AS lobby FROM rooms`);
  const [[gu]] = await db.query('SELECT COUNT(*) AS n, SUM(created_at >= NOW() - INTERVAL 7 DAY) AS n7 FROM users WHERE is_guest = 1');
  const [[c]] = await db.query('SELECT (SELECT COUNT(*) FROM quizzes) AS quizzes, (SELECT COUNT(*) FROM questions) AS questions, (SELECT COUNT(*) FROM categories) AS categories');
  const [[avg]] = await db.query(`SELECT ROUND(AVG(x.n), 1) AS avg FROM (SELECT COUNT(*) AS n FROM room_players p JOIN rooms r ON r.id = p.room_id AND r.status = 'finished' GROUP BY p.room_id) x`);

  const days = lastDays(30);
  const [visitRows, signupRows, tournamentRows, topPages, devices, referrers, gameTypes, recentUsers] = await Promise.all([
    q("SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS u FROM visits WHERE created_at >= CURDATE() - INTERVAL 29 DAY GROUP BY d"),
    q(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS n FROM users u WHERE ${REAL} AND created_at >= CURDATE() - INTERVAL 29 DAY GROUP BY d`),
    q("SELECT DATE_FORMAT(finished_at, '%Y-%m-%d') AS d, COUNT(*) AS n FROM rooms WHERE status = 'finished' AND finished_at >= CURDATE() - INTERVAL 29 DAY GROUP BY d"),
    q('SELECT page, COUNT(*) AS n FROM visits WHERE created_at >= NOW() - INTERVAL 30 DAY GROUP BY page ORDER BY n DESC LIMIT 8'),
    q('SELECT device, COUNT(*) AS n FROM visits WHERE created_at >= NOW() - INTERVAL 30 DAY GROUP BY device ORDER BY n DESC'),
    q('SELECT ref_host AS host, COUNT(*) AS n FROM visits WHERE ref_host IS NOT NULL AND created_at >= NOW() - INTERVAL 30 DAY GROUP BY ref_host ORDER BY n DESC LIMIT 8'),
    q("SELECT game_type AS type, COUNT(*) AS n FROM rooms WHERE status = 'finished' GROUP BY game_type"),
    q(`SELECT id, username, email, created_at FROM users u WHERE ${REAL} ORDER BY id DESC LIMIT 8`),
  ]);
  const N = (x) => Number(x || 0);
  res.json({
    totals: {
      users: N(u.users), usersNew1: N(u.new1), usersNew7: N(u.new7), usersNew30: N(u.new30), active1: N(u.active1), active7: N(u.active7),
      visits: N(v.total), visits1: N(v.d1), visits7: N(v.d7), visits30: N(v.d30), visitors7: N(v.visitors7),
      tournaments: N(r.finished), tournaments7: N(r.finished7), liveRooms: N(r.live), lobbyRooms: N(r.lobby),
      guests: N(gu.n), guests7: N(gu.n7), quizzes: N(c.quizzes), questions: N(c.questions), categories: N(c.categories), avgPlayers: N(avg.avg),
    },
    series: { visits: fillDays(visitRows, days), visitors: fillDays(visitRows, days, 'u'), signups: fillDays(signupRows, days), tournaments: fillDays(tournamentRows, days) },
    topPages: topPages.map((x) => ({ label: x.page, count: N(x.n) })),
    devices: devices.map((x) => ({ label: x.device, count: N(x.n) })),
    referrers: referrers.map((x) => ({ label: x.host, count: N(x.n) })),
    gameTypes: gameTypes.map((x) => ({ label: x.type === 'typerace' ? 'Typing race' : x.type === 'draw' ? 'Draw & Guess' : 'Quiz', count: N(x.n) })),
    recentUsers,
  });
}));

/* ---------- users ---------- */
const USER_COLS = 'id, username, email, xp, wins, tournaments, skin, is_admin, is_banned, ban_reason, created_at, last_login_at, last_seen_at, login_count';
const SORTS = new Set(['id', 'username', 'email', 'xp', 'wins', 'tournaments', 'created_at', 'last_seen_at', 'last_login_at']);

router.get('/users', wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(5000, Math.max(1, Number(req.query.limit) || 25));
  const sort = SORTS.has(req.query.sort) ? req.query.sort : 'id';
  const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';
  const like = `%${String(req.query.q || '').trim().replace(/[%_]/g, '')}%`;
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users u WHERE ${REAL} AND (u.username LIKE ? OR u.email LIKE ?)`, [like, like]);
  const [rows] = await db.query(
    `SELECT ${USER_COLS} FROM users u WHERE ${REAL} AND (u.username LIKE ? OR u.email LIKE ?) ORDER BY ${sort} ${dir}, id DESC LIMIT ? OFFSET ?`,
    [like, like, limit, (page - 1) * limit]);
  res.json({ total, page, limit, users: rows.map((x) => ({ ...x, level: levelFor(x.xp), is_admin: !!x.is_admin, is_banned: !!x.is_banned })) });
}));

async function userDetail(id) {
  const [[u]] = await db.query(`SELECT ${USER_COLS} FROM users WHERE id = ?`, [id]);
  if (!u) throw fail(404, 'User not found');
  const [grants] = await db.query('SELECT skin FROM user_skins WHERE user_id = ?', [id]);
  const granted = new Set(grants.map((g) => g.skin));
  const skins = SKINS.map((s) => {
    const pr = progressOf(u, s.unlock);
    const byRule = pr.have >= pr.need;
    return { id: s.id, name: s.name, emoji: s.emoji, requirement: requirementText(s.unlock), byRule, granted: granted.has(s.id), unlocked: byRule || granted.has(s.id) };
  });
  const [rooms] = await db.query(
    `SELECT r.code, r.name, r.game_type, r.status, p.placement, p.score, r.created_at FROM room_players p
       JOIN rooms r ON r.id = p.room_id WHERE p.user_id = ? ORDER BY r.id DESC LIMIT 8`, [id]);
  const [[visits]] = await db.query('SELECT COUNT(*) AS visits, MAX(created_at) AS last_visit FROM visits WHERE user_id = ?', [id]);
  return { user: { ...u, level: levelFor(u.xp), is_admin: !!u.is_admin, is_banned: !!u.is_banned }, skins, rooms, visits, stats: await loadStats(db, id) };
}

router.get('/users/:id', wrap(async (req, res) => res.json(await userDetail(Number(req.params.id)))));

const realUser = async (id) => {
  const [[u]] = await db.query('SELECT id, username, email, xp, wins, tournaments, skin, is_admin, is_banned, password_hash FROM users WHERE id = ?', [id]);
  if (!u) throw fail(404, 'User not found');
  if (u.password_hash === '!') throw fail(400, 'That is the built-in system account');
  return u;
};

router.patch('/users/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const cur = await realUser(id);
  const set = parsePatch(req.body);
  if (id === req.user.id && (set.is_admin === 0 || set.is_banned === 1)) throw fail(400, "You can't remove your own admin rights or suspend yourself");
  if (set.username && set.username !== cur.username) {
    const [[taken]] = await db.query('SELECT id FROM users WHERE username = ? AND id <> ?', [set.username, id]);
    if (taken) throw fail(409, 'That username is taken');
  }
  if (set.email && set.email !== cur.email) {
    const [[taken]] = await db.query('SELECT id FROM users WHERE email = ? AND id <> ?', [set.email, id]);
    if (taken) throw fail(409, 'That email is already registered');
  }
  if (set.add_xp !== undefined) {
    set.xp = Math.max(0, (set.xp !== undefined ? set.xp : cur.xp) + set.add_xp);
    delete set.add_xp;
  }
  const cols = Object.keys(set);
  if (!cols.length) throw fail(400, 'Nothing to change');
  await db.query(`UPDATE users SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => set[c]), id]);
  if (set.skin) await db.query('INSERT IGNORE INTO user_skins (user_id, skin, granted_by) VALUES (?,?,?)', [id, set.skin, req.user.id]); // choosing a locked character unlocks it
  if (set.is_banned !== undefined) {
    forgetAccount(id);
    if (set.is_banned) game.kickUser(id);
  }
  const before = {};
  for (const c of cols) before[c] = cur[c];
  await logAction(req, set.is_banned === 1 ? 'suspend' : set.is_banned === 0 ? 'unsuspend' : 'edit', cur.username, { before, after: set });
  res.json(await userDetail(id));
}));

router.post('/users/:id/skins', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const cur = await realUser(id);
  const skin = byId(String(req.body.skin || ''));
  if (!skin) throw fail(400, 'Unknown character');
  if (req.body.grant) await db.query('INSERT IGNORE INTO user_skins (user_id, skin, granted_by) VALUES (?,?,?)', [id, skin.id, req.user.id]);
  else await db.query('DELETE FROM user_skins WHERE user_id = ? AND skin = ?', [id, skin.id]);
  await logAction(req, req.body.grant ? 'grant_character' : 'revoke_character', cur.username, { skin: skin.id });
  res.json(await userDetail(id));
}));

router.post('/users/:id/password', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const cur = await realUser(id);
  const password = String(req.body.password || '');
  if (password.length < 6) throw fail(400, 'Password must be at least 6 characters');
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(password, 10), id]);
  await logAction(req, 'reset_password', cur.username);
  res.json({ ok: true });
}));

router.delete('/users/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const cur = await realUser(id);
  if (id === req.user.id) throw fail(400, "You can't delete your own account here");
  game.kickUser(id);
  forgetAccount(id);
  await db.query('DELETE FROM users WHERE id = ?', [id]);
  await logAction(req, 'delete_account', cur.username, { email: cur.email });
  res.json({ ok: true });
}));

/* ---------- rooms ---------- */
router.get('/rooms', wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 25;
  const status = ['lobby', 'playing', 'finished'].includes(req.query.status) ? req.query.status : null;
  const where = status ? 'WHERE r.status = ?' : '';
  const args = status ? [status] : [];
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM rooms r ${where}`, args);
  const [rows] = await db.query(
    `SELECT r.code, r.name, r.game_type, r.status, r.max_players, r.created_at, r.finished_at, u.username AS host,
            (SELECT COUNT(*) FROM room_players p WHERE p.room_id = r.id) AS players,
            (SELECT COUNT(*) FROM room_players p WHERE p.room_id = r.id AND p.is_bot = 0) AS humans
       FROM rooms r JOIN users u ON u.id = r.host_id ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`, [...args, limit, (page - 1) * limit]);
  res.json({ total, page, limit, rooms: rows });
}));

router.delete('/rooms/:code', wrap(async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const [[room]] = await db.query('SELECT id, name FROM rooms WHERE code = ?', [code]);
  if (!room) throw fail(404, 'Room not found');
  game.abortRoom(code);
  await db.query('DELETE FROM rooms WHERE id = ?', [room.id]);
  await logAction(req, 'delete_room', code, { name: room.name });
  res.json({ ok: true });
}));

/* ---------- content: quizzes and categories ---------- */
router.get('/content', wrap(async (req, res) => {
  const [quizzes] = await db.query(
    `SELECT z.id, z.title, z.is_public, z.created_at, u.username AS owner, c.name AS category,
            (SELECT COUNT(*) FROM questions q WHERE q.quiz_id = z.id) AS questions, (SELECT COUNT(*) FROM rooms r WHERE r.quiz_id = z.id) AS used
       FROM quizzes z JOIN users u ON u.id = z.owner_id LEFT JOIN categories c ON c.id = z.category_id ORDER BY z.id DESC LIMIT 300`);
  const [categories] = await db.query('SELECT c.id, c.name, (SELECT COUNT(*) FROM quizzes z WHERE z.category_id = c.id) AS quizzes FROM categories c ORDER BY c.name');
  res.json({ quizzes: quizzes.map((x) => ({ ...x, is_public: !!x.is_public })), categories });
}));

router.patch('/quizzes/:id', wrap(async (req, res) => {
  const [[z]] = await db.query('SELECT id, title FROM quizzes WHERE id = ?', [req.params.id]);
  if (!z) throw fail(404, 'Quiz not found');
  await db.query('UPDATE quizzes SET is_public = ? WHERE id = ?', [req.body.is_public ? 1 : 0, z.id]);
  await logAction(req, 'quiz_visibility', z.title, { is_public: !!req.body.is_public });
  res.json({ ok: true });
}));

router.delete('/quizzes/:id', wrap(async (req, res) => {
  const [[z]] = await db.query('SELECT id, title FROM quizzes WHERE id = ?', [req.params.id]);
  if (!z) throw fail(404, 'Quiz not found');
  await db.query('DELETE FROM quizzes WHERE id = ?', [z.id]);
  await logAction(req, 'delete_quiz', z.title);
  res.json({ ok: true });
}));

router.patch('/categories/:id', wrap(async (req, res) => {
  const name = str(req.body.name, 50);
  if (!name) throw fail(400, 'Category name is required');
  const [[clash]] = await db.query('SELECT id FROM categories WHERE name = ? AND id <> ?', [name, req.params.id]);
  if (clash) throw fail(409, 'A category with that name already exists');
  const [r] = await db.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
  if (!r.affectedRows) throw fail(404, 'Category not found');
  await logAction(req, 'rename_category', name);
  res.json({ ok: true });
}));

router.delete('/categories/:id', wrap(async (req, res) => {
  const [[c]] = await db.query('SELECT id, name FROM categories WHERE id = ?', [req.params.id]);
  if (!c) throw fail(404, 'Category not found');
  await db.query('DELETE FROM categories WHERE id = ?', [c.id]); // quizzes in it simply become uncategorised
  await logAction(req, 'delete_category', c.name);
  res.json({ ok: true });
}));

/* ---------- activity log ---------- */
router.get('/log', wrap(async (req, res) => {
  const [rows] = await db.query('SELECT id, admin_name, action, target, details, created_at FROM admin_log ORDER BY id DESC LIMIT 150');
  res.json({ log: rows });
}));

router.use(errorHandler);

module.exports = { router, isConfiguredAdmin, bootstrapAdmins, parsePatch, fillDays, lastDays };
