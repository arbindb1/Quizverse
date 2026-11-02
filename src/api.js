const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./db');
const { sign, verify, requireAuth } = require('./auth');
const { isConfiguredAdmin } = require('./admin');
const { EMAIL } = require('./http');
const { lobbyState } = require('./rooms');
const game = require('./game');
const { loadStats } = require('./stats');
const { cleanLook, parseLook, DEFAULT_LOOK } = require('./look');
const { SKINS, byId, levelFor, xpAt, progressOf, isUnlocked, requirementText } = require('./skins');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (status, message) => Object.assign(new Error(message), { status });
const str = (v, max) => String(v ?? '').trim().slice(0, max);

/* ---------- Skribbl guests: only a name and a character, no account ---------- */
// A guest token may only reach the character, profile and room routes; the room routes themselves
// restrict guests to Draw & Guess rooms. Everything else (quizzes, stats, admin...) is closed to them.
const GUEST_OK = /^\/(me|skins|profile(\/skin|\/look)?|play\/[^/]+|rooms(\/.*)?)$/;
router.use((req, res, next) => {
  let u;
  try { u = verify((req.headers.authorization || '').replace(/^Bearer /, '')); } catch { return next(); }
  if (u.guest && !GUEST_OK.test(req.path)) return res.status(403).json({ error: 'Guests can only play Skribbl. Log in for the rest.' });
  next();
});

const guestLog = new Map(); // ip -> times of recent guest creations (keeps bots from filling the table)
router.post('/auth/guest', wrap(async (req, res) => {
  const name = str(req.body.name, 20).replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{N} _.\-]{2,20}$/u.test(name)) throw fail(400, 'Pick a name of 2 to 20 letters, numbers or spaces');
  // Skribbl uses only the 2D Custom Doodle: a guest always has one (the default look if none was sent)
  let look = DEFAULT_LOOK;
  if (req.body.look) { look = cleanLook(req.body.look); if (!look) throw fail(400, 'That character design is not valid'); }
  const skin = byId('custom');
  const now = Date.now();
  const recent = (guestLog.get(req.ip) || []).filter((t) => now - t < 3600000);
  if (recent.length >= 30) throw fail(429, 'Too many new guests from this address, try again later');
  guestLog.set(req.ip, [...recent, now]);
  const [r] = await db.query(
    'INSERT INTO users (username, password_hash, skin, look, is_guest, last_login_at, last_seen_at, login_count) VALUES (?, ?, ?, ?, 1, NOW(), NOW(), 1)',
    ['guest_' + crypto.randomBytes(8).toString('hex'), '!', skin.id, JSON.stringify(look)]); // '!' is not a valid hash: nobody can log in as a guest account
  const user = { id: r.insertId, username: name, guest: true, isAdmin: false };
  res.json({ token: sign(user), user });
}));

// public: what an invite link leads to (so the guest page can say who invited you before you type a name)
router.get('/play/:token', wrap(async (req, res) => {
  const [[room]] = await db.query(
    `SELECT r.name, r.status, r.max_players, r.game_type, u.username AS host_account, u.is_guest AS host_guest,
            (SELECT p.display_name FROM room_players p WHERE p.room_id = r.id AND p.user_id = r.host_id) AS host,
            (SELECT COUNT(*) FROM room_players WHERE room_id = r.id) AS players
       FROM rooms r JOIN users u ON u.id = r.host_id WHERE (r.invite_token = ? OR r.code = ?) AND r.game_type = 'draw'`,
    [req.params.token, req.params.token.toUpperCase()]);
  if (!room) throw fail(404, 'This invite link is not valid (any more)');
  res.json({ name: room.name, status: room.status, host: room.host, players: room.players, maxPlayers: room.max_players });
}));

/* ---------- auth ---------- */
router.post('/auth/register', wrap(async (req, res) => {
  const username = str(req.body.username, 30);
  const email = str(req.body.email, 190).toLowerCase();
  const password = String(req.body.password || '');
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) throw fail(400, 'Username must be 3-30 letters, numbers or underscores');
  if (/^guest_/i.test(username)) throw fail(400, 'Usernames cannot start with guest_');
  if (!EMAIL.test(email)) throw fail(400, 'Enter a valid email address');
  if (password.length < 6) throw fail(400, 'Password must be at least 6 characters');
  const [[exists]] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) throw fail(409, 'That username is taken');
  const [[mailUsed]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (mailUsed) throw fail(409, 'That email is already registered');
  const admin = isConfiguredAdmin(username, email) ? 1 : 0;
  const [r] = await db.query(
    'INSERT INTO users (username, email, password_hash, is_admin, last_login_at, last_seen_at, login_count) VALUES (?, ?, ?, ?, NOW(), NOW(), 1)',
    [username, email, await bcrypt.hash(password, 10), admin]);
  const user = { id: r.insertId, username, isAdmin: !!admin };
  res.json({ token: sign(user), user });
}));

router.post('/auth/login', wrap(async (req, res) => {
  const who = str(req.body.username, 190);
  const [[row]] = await db.query(
    'SELECT id, username, email, password_hash, is_admin, is_banned, ban_reason FROM users WHERE username = ? OR email = ?', [who, who.toLowerCase()]);
  if (!row || row.password_hash === '!' || !(await bcrypt.compare(String(req.body.password || ''), row.password_hash))) throw fail(401, 'Wrong username or password');
  if (row.is_banned) throw fail(403, `This account is suspended${row.ban_reason ? ': ' + row.ban_reason : ''}`);
  let isAdmin = !!row.is_admin;
  if (!isAdmin && isConfiguredAdmin(row.username, row.email)) {
    await db.query('UPDATE users SET is_admin = 1 WHERE id = ?', [row.id]);
    isAdmin = true;
  }
  await db.query('UPDATE users SET last_login_at = NOW(), last_seen_at = NOW(), login_count = login_count + 1 WHERE id = ?', [row.id]);
  const user = { id: row.id, username: row.username, isAdmin };
  res.json({ token: sign(user), user });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const [[u]] = await db.query('SELECT id, username, email, is_admin FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: { id: u.id, username: u.username, email: u.email, isAdmin: !!u.is_admin } });
}));

/* ---------- characters and progress ---------- */
// characters an admin unlocked by hand (on top of the ones earned through XP, wins and tournaments)
const grantsOf = async (uid) => new Set((await db.query('SELECT skin FROM user_skins WHERE user_id = ?', [uid]))[0].map((r) => r.skin));

function profileOf(u, granted = new Set()) {
  const level = levelFor(u.xp);
  return {
    xp: u.xp, wins: u.wins, tournaments: u.tournaments, skin: u.skin, level, levelXp: xpAt(level), nextXp: xpAt(level + 1),
    skins: SKINS.map((s) => {
      const pr = progressOf(u, s.unlock);
      return { id: s.id, name: s.name, emoji: s.emoji, free: s.unlock.type === 'free', unlocked: pr.have >= pr.need || granted.has(s.id),
        requirement: requirementText(s.unlock), have: Math.min(pr.have, pr.need), need: pr.need };
    }),
  };
}

// a guest has no progress: every character is open to them and nothing is earned
const forGuest = (req, p) => (req.user.guest ? { ...p, guest: true, skins: p.skins.map((s) => ({ ...s, unlocked: true })) } : p);

// public: the look of every character (needed on the login page too)
router.get('/skins', (req, res) => res.json(SKINS.map(({ id, name, emoji, c1, c2 }) => ({ id, name, emoji, c1, c2 }))));

// analytics: the player's own answers (bots are never counted), quiz and typing separately
router.get('/stats', requireAuth, wrap(async (req, res) => res.json(await loadStats(db, req.user.id))));

router.get('/profile', requireAuth, wrap(async (req, res) => {
  const [[u]] = await db.query('SELECT xp, wins, tournaments, skin, look FROM users WHERE id = ?', [req.user.id]);
  if (!u) throw fail(404, 'User not found');
  res.json({ ...forGuest(req, profileOf(u, await grantsOf(req.user.id))), look: parseLook(u.look) });
}));

router.post('/profile/skin', requireAuth, wrap(async (req, res) => {
  if (req.user.guest) throw fail(403, 'Skribbl uses your Custom Doodle: change it in the editor');
  const skin = byId(String(req.body.skin || ''));
  if (!skin) throw fail(400, 'Unknown character');
  const [[u]] = await db.query('SELECT xp, wins, tournaments, skin, look FROM users WHERE id = ?', [req.user.id]);
  if (u && skin.id === 'custom' && !parseLook(u.look)) throw fail(400, 'Design your Custom Doodle first');
  const granted = await grantsOf(req.user.id);
  if (!u || !(req.user.guest || isUnlocked(u, skin) || granted.has(skin.id))) throw fail(403, 'That character is still locked');
  await db.query('UPDATE users SET skin = ? WHERE id = ?', [skin.id, req.user.id]);
  // lobbies the player is waiting in show the new character right away
  const [rooms] = await db.query(
    "SELECT r.code FROM rooms r JOIN room_players p ON p.room_id = r.id WHERE p.user_id = ? AND r.status = 'lobby'", [req.user.id]);
  for (const r of rooms) await game.broadcastLobby(r.code);
  res.json({ ...forGuest(req, profileOf({ ...u, skin: skin.id }, granted)), look: parseLook(u.look) });
}));

// the Custom Doodle editor saves here (and equips the Custom Doodle)
router.post('/profile/look', requireAuth, wrap(async (req, res) => {
  const look = cleanLook(req.body.look);
  if (!look) throw fail(400, 'That character design is not valid');
  await db.query("UPDATE users SET skin = 'custom', look = ? WHERE id = ?", [JSON.stringify(look), req.user.id]);
  const [rooms] = await db.query(
    "SELECT r.code FROM rooms r JOIN room_players p ON p.room_id = r.id WHERE p.user_id = ? AND r.status = 'lobby'", [req.user.id]);
  for (const r of rooms) await game.broadcastLobby(r.code);
  res.json({ ok: true, look });
}));

/* ---------- categories ---------- */
router.get('/categories', requireAuth, wrap(async (req, res) => {
  const [rows] = await db.query('SELECT id, name FROM categories ORDER BY name');
  res.json(rows);
}));

router.post('/categories', requireAuth, wrap(async (req, res) => {
  const name = str(req.body.name, 50);
  if (!name) throw fail(400, 'Category name is required');
  const [[exists]] = await db.query('SELECT id, name FROM categories WHERE name = ?', [name]);
  if (exists) return res.json(exists);
  const [r] = await db.query('INSERT INTO categories (name, created_by) VALUES (?, ?)', [name, req.user.id]);
  res.json({ id: r.insertId, name });
}));

/* ---------- quizzes ---------- */
function cleanQuestions(list) {
  if (!Array.isArray(list) || !list.length || list.length > 50) throw fail(400, 'A quiz needs 1 to 50 questions');
  return list.map((q, i) => {
    const n = i + 1;
    const text = str(q.text, 500);
    const options = (Array.isArray(q.options) ? q.options : []).map((o) => str(o, 150));
    const correct = Number(q.correct_index);
    if (!text) throw fail(400, `Question ${n} has no text`);
    if (options.length < 2 || options.length > 4 || options.some((o) => !o)) throw fail(400, `Question ${n} needs 2-4 filled-in answers`);
    if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) throw fail(400, `Question ${n} needs a correct answer`);
    const time = Math.min(120, Math.max(5, Number(q.time_limit) || 20));
    return { text, options, correct, time };
  });
}

async function saveQuiz(req, quizId) {
  const title = str(req.body.title, 120);
  if (!title) throw fail(400, 'Quiz title is required');
  const questions = cleanQuestions(req.body.questions);
  const categoryId = req.body.category_id ? Number(req.body.category_id) : null;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const vals = [categoryId, title, str(req.body.description, 500), req.body.is_public ? 1 : 0];
    if (quizId) {
      await conn.query('UPDATE quizzes SET category_id=?, title=?, description=?, is_public=? WHERE id=?', [...vals, quizId]);
      await conn.query('DELETE FROM questions WHERE quiz_id = ?', [quizId]);
    } else {
      const [r] = await conn.query('INSERT INTO quizzes (category_id, title, description, is_public, owner_id) VALUES (?,?,?,?,?)', [...vals, req.user.id]);
      quizId = r.insertId;
    }
    await conn.query('INSERT INTO questions (quiz_id, position, text, options, correct_index, time_limit) VALUES ?',
      [questions.map((q, i) => [quizId, i, q.text, JSON.stringify(q.options), q.correct, q.time])]);
    await conn.commit();
    return quizId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

const quizList = `SELECT z.id, z.title, z.description, z.is_public, z.owner_id, u.username AS owner, c.name AS category, c.id AS category_id,
    (SELECT COUNT(*) FROM questions WHERE quiz_id = z.id) AS question_count
  FROM quizzes z JOIN users u ON u.id = z.owner_id LEFT JOIN categories c ON c.id = z.category_id`;

router.get('/quizzes', requireAuth, wrap(async (req, res) => {
  const mine = req.query.scope === 'mine';
  const [rows] = await db.query(
    `${quizList} WHERE ${mine ? 'z.owner_id = ?' : '(z.is_public = 1 OR z.owner_id = ?)'} ORDER BY z.id DESC`, [req.user.id]);
  res.json(rows);
}));

router.get('/quizzes/:id', requireAuth, wrap(async (req, res) => {
  const [[quiz]] = await db.query(`${quizList} WHERE z.id = ? AND z.owner_id = ?`, [req.params.id, req.user.id]);
  if (!quiz) throw fail(404, 'Quiz not found');
  const [qs] = await db.query('SELECT text, options, correct_index, time_limit FROM questions WHERE quiz_id = ? ORDER BY position, id', [quiz.id]);
  res.json({ ...quiz, questions: qs });
}));

router.post('/quizzes', requireAuth, wrap(async (req, res) => res.json({ id: await saveQuiz(req) })));

router.put('/quizzes/:id', requireAuth, wrap(async (req, res) => {
  const [[quiz]] = await db.query('SELECT owner_id FROM quizzes WHERE id = ?', [req.params.id]);
  if (!quiz || quiz.owner_id !== req.user.id) throw fail(404, 'Quiz not found');
  res.json({ id: await saveQuiz(req, Number(req.params.id)) });
}));

router.delete('/quizzes/:id', requireAuth, wrap(async (req, res) => {
  const [r] = await db.query('DELETE FROM quizzes WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
  if (!r.affectedRows) throw fail(404, 'Quiz not found');
  res.json({ ok: true });
}));

/* ---------- rooms ---------- */
const newCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');
const clampPlayers = (v) => Math.min(50, Math.max(2, Number(v) || 8));
const BOT_NAMES = ['Botty', 'Robo', 'Pixel', 'Turbo', 'Nova', 'Zed', 'Echo', 'Byte', 'Sparky', 'Orbit', 'Gizmo', 'Cosmo'];
const botName = (i) => BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? ' ' + (Math.floor(i / BOT_NAMES.length) + 1) : '');

// Make the room hold exactly `want` bots (newest bots are removed first); db can be the pool or a connection
async function setBots(q, roomId, want) {
  const [bots] = await q.query('SELECT id FROM room_players WHERE room_id = ? AND is_bot = 1 ORDER BY id', [roomId]);
  if (want > bots.length) {
    // every bot wears the default character (Rookie)
    const rows = Array.from({ length: want - bots.length }, (_, k) => [roomId, 1, botName(bots.length + k), 'rookie']);
    await q.query('INSERT INTO room_players (room_id, is_bot, display_name, skin) VALUES ?', [rows]);
  } else if (want < bots.length) {
    await q.query('DELETE FROM room_players WHERE id IN (?)', [bots.slice(want).map((b) => b.id)]);
  }
  await q.query('UPDATE rooms SET bot_count = ?, bot_enabled = ? WHERE id = ?', [want, want > 0 ? 1 : 0, roomId]);
}
const perMatch = (v) => Math.min(9, Math.max(1, Number(v) || 3));
const textLen = (v) => (['short', 'medium', 'long'].includes(v) ? v : 'medium');
const difficulty = (v) => (['easy', 'medium', 'hard'].includes(v) ? v : 'medium');

router.post('/rooms', requireAuth, wrap(async (req, res) => {
  const gameType = ['typerace', 'draw'].includes(req.body.game_type) ? req.body.game_type : 'quiz';
  if (req.user.guest && gameType !== 'draw') throw fail(403, 'Guests can only host Skribbl games');
  let quiz = null;
  if (gameType === 'quiz') [[quiz]] = await db.query(
    `SELECT z.id, z.title, (SELECT COUNT(*) FROM questions WHERE quiz_id = z.id) AS n FROM quizzes z
      WHERE z.id = ? AND (z.is_public = 1 OR z.owner_id = ?)`, [req.body.quiz_id, req.user.id]);
  if (gameType === 'quiz' && (!quiz || !quiz.n)) throw fail(400, 'Pick a quiz that has questions');
  const max = clampPlayers(req.body.max_players);
  const botCount = req.body.fill_bots ? max - 1 : Math.min(max - 1, Math.max(0, Number(req.body.bot_count) || (req.body.bot_enabled ? 1 : 0)));
  const code = newCode();
  const [r] = await db.query(
    'INSERT INTO rooms (code, invite_token, host_id, quiz_id, game_type, text_length, name, max_players, bot_difficulty, questions_per_match) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [code, crypto.randomBytes(12).toString('hex'), req.user.id, quiz ? quiz.id : null, gameType, textLen(req.body.text_length),
      str(req.body.name, 80) || (quiz ? quiz.title : gameType === 'draw' ? 'Draw & Guess' : 'Typing race'), max, difficulty(req.body.bot_difficulty), perMatch(req.body.questions_per_match)]);
  await db.query('INSERT INTO room_players (room_id, user_id, display_name) VALUES (?,?,?)', [r.insertId, req.user.id, req.user.username]);
  await setBots(db, r.insertId, botCount);
  res.json({ code });
}));

router.get('/rooms/mine', requireAuth, wrap(async (req, res) => {
  const [rows] = await db.query(
    `SELECT r.code, r.name, r.status, r.host_id = ? AS is_host, r.created_at,
            (SELECT COUNT(*) FROM room_players WHERE room_id = r.id) AS players, r.max_players
       FROM rooms r JOIN room_players p ON p.room_id = r.id AND p.user_id = ?
      ORDER BY r.id DESC LIMIT 30`, [req.user.id, req.user.id]);
  res.json(rows);
}));

router.get('/rooms/preview/:token', requireAuth, wrap(async (req, res) => {
  const [[room]] = await db.query(
    `SELECT r.code, r.name, r.status, r.max_players, u.username AS host,
            (SELECT COUNT(*) FROM room_players WHERE room_id = r.id) AS players
       FROM rooms r JOIN users u ON u.id = r.host_id WHERE r.invite_token = ? OR r.code = ?`,
    [req.params.token, req.params.token.toUpperCase()]);
  if (!room) throw fail(404, 'Invite link is invalid');
  res.json(room);
}));

router.post('/rooms/join', requireAuth, wrap(async (req, res) => {
  const key = str(req.body.token, 40);
  const conn = await db.getConnection();
  let code;
  try {
    await conn.beginTransaction();
    const [[room]] = await conn.query('SELECT id, code, status, max_players, game_type FROM rooms WHERE invite_token = ? OR code = ? FOR UPDATE', [key, key.toUpperCase()]);
    if (!room) throw fail(404, 'Invite link or code is invalid');
    if (req.user.guest && room.game_type !== 'draw') throw fail(403, 'Guests can only join Skribbl games');
    code = room.code;
    const [[member]] = await conn.query('SELECT id FROM room_players WHERE room_id = ? AND user_id = ?', [room.id, req.user.id]);
    if (!member) {
      if (room.status !== 'lobby') throw fail(400, 'This tournament has already started');
      const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM room_players WHERE room_id = ?', [room.id]);
      if (n >= room.max_players) {
        // a real player takes the place of the newest bot
        const [[bot]] = await conn.query('SELECT id FROM room_players WHERE room_id = ? AND is_bot = 1 ORDER BY id DESC LIMIT 1', [room.id]);
        if (!bot) throw fail(400, 'This room is full');
        await conn.query('DELETE FROM room_players WHERE id = ?', [bot.id]);
        await conn.query('UPDATE rooms SET bot_count = bot_count - 1, bot_enabled = (bot_count > 0) WHERE id = ?', [room.id]);
      }
      await conn.query('INSERT INTO room_players (room_id, user_id, display_name) VALUES (?,?,?)', [room.id, req.user.id, req.user.username]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  await game.broadcastLobby(code);
  res.json({ code });
}));

router.get('/rooms/:code', requireAuth, wrap(async (req, res) => {
  const state = await lobbyState(req.params.code.toUpperCase());
  if (!state || !state.players.some((p) => p.userId === req.user.id)) throw fail(404, 'Room not found');
  res.json(state);
}));

router.patch('/rooms/:code', requireAuth, wrap(async (req, res) => {
  const code = req.params.code.toUpperCase();
  const state = await lobbyState(code);
  if (!state || state.hostId !== req.user.id) throw fail(404, 'Room not found');
  if (state.status !== 'lobby') throw fail(400, 'The game has already started');
  const max = req.body.max_players !== undefined ? clampPlayers(req.body.max_players) : state.maxPlayers;
  const humans = state.players.filter((p) => !p.isBot).length;
  const botCount = req.body.fill_bots ? max - humans
    : req.body.bot_count !== undefined ? Math.min(49, Math.max(0, Number(req.body.bot_count) || 0)) : state.botCount;
  if (botCount < 0 || humans + botCount > max) {
    throw fail(400, `Players plus bots (${humans + Math.max(0, botCount)}) can't be more than the player limit (${max})`);
  }
  const [[{ id }]] = await db.query('SELECT id FROM rooms WHERE code = ?', [code]);
  await db.query('UPDATE rooms SET max_players=?, bot_difficulty=?, questions_per_match=?, text_length=? WHERE id=?',
    [max, difficulty(req.body.bot_difficulty || state.botDifficulty),
      req.body.questions_per_match !== undefined ? perMatch(req.body.questions_per_match) : state.questionsPerMatch,
      textLen(req.body.text_length || state.textLength), id]);
  await setBots(db, id, botCount);
  await game.broadcastLobby(code);
  res.json(await lobbyState(code));
}));

router.post('/rooms/:code/leave', requireAuth, wrap(async (req, res) => {
  const code = req.params.code.toUpperCase();
  const state = await lobbyState(code);
  if (!state) throw fail(404, 'Room not found');
  if (state.hostId === req.user.id) throw fail(400, 'The host cannot leave the room');
  if (state.status !== 'lobby') throw fail(400, 'The game has already started');
  await db.query('DELETE FROM room_players WHERE user_id = ? AND room_id = (SELECT id FROM rooms WHERE code = ?)', [req.user.id, code]);
  await game.broadcastLobby(code);
  res.json({ ok: true });
}));

router.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong' });
});

module.exports = router;
