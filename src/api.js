const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./db');
const { sign, requireAuth } = require('./auth');
const { lobbyState } = require('./rooms');
const game = require('./game');
const { buildStats } = require('./stats');
const { SKINS, byId, levelFor, xpAt, progressOf, isUnlocked, requirementText } = require('./skins');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (status, message) => Object.assign(new Error(message), { status });
const str = (v, max) => String(v ?? '').trim().slice(0, max);

/* ---------- auth ---------- */
router.post('/auth/register', wrap(async (req, res) => {
  const username = str(req.body.username, 30);
  const password = String(req.body.password || '');
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) throw fail(400, 'Username must be 3-30 letters, numbers or underscores');
  if (password.length < 6) throw fail(400, 'Password must be at least 6 characters');
  const [[exists]] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) throw fail(409, 'That username is taken');
  const [r] = await db.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, await bcrypt.hash(password, 10)]);
  const user = { id: r.insertId, username };
  res.json({ token: sign(user), user });
}));

router.post('/auth/login', wrap(async (req, res) => {
  const [[row]] = await db.query('SELECT id, username, password_hash FROM users WHERE username = ?', [str(req.body.username, 30)]);
  if (!row || !(await bcrypt.compare(String(req.body.password || ''), row.password_hash))) throw fail(401, 'Wrong username or password');
  const user = { id: row.id, username: row.username };
  res.json({ token: sign(user), user });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: { id: req.user.id, username: req.user.username } }));

/* ---------- characters and progress ---------- */
function profileOf(u) {
  const level = levelFor(u.xp);
  return {
    xp: u.xp, wins: u.wins, tournaments: u.tournaments, skin: u.skin, level, levelXp: xpAt(level), nextXp: xpAt(level + 1),
    skins: SKINS.map((s) => {
      const pr = progressOf(u, s.unlock);
      return { id: s.id, name: s.name, emoji: s.emoji, free: s.unlock.type === 'free', unlocked: pr.have >= pr.need,
        requirement: requirementText(s.unlock), have: Math.min(pr.have, pr.need), need: pr.need };
    }),
  };
}

// public: the look of every character (needed on the login page too)
router.get('/skins', (req, res) => res.json(SKINS.map(({ id, name, emoji, c1, c2 }) => ({ id, name, emoji, c1, c2 }))));

// analytics: the player's own answers (bots are never counted), quiz and typing separately
router.get('/stats', requireAuth, wrap(async (req, res) => {
  const uid = req.user.id;
  const [quizRows] = await db.query(
    `SELECT a.room_id, a.is_correct, a.time_ms, a.created_at,
            COALESCE(a.category, (SELECT c.name FROM questions q JOIN quizzes z ON z.id = q.quiz_id JOIN categories c ON c.id = z.category_id WHERE q.id = a.question_id)) AS category
       FROM room_answers a JOIN room_players p ON p.id = a.player_id AND p.user_id = ?
       JOIN rooms r ON r.id = a.room_id AND r.game_type = 'quiz' ORDER BY a.id`, [uid]);
  const [typingRows] = await db.query(
    `SELECT a.room_id, a.choice AS chars, a.is_correct AS finished, a.time_ms, a.created_at,
            COALESCE(a.wpm, CASE WHEN a.is_correct = 1 AND a.time_ms > 0 THEN ROUND(a.choice / 5 / (a.time_ms / 60000)) END) AS wpm
       FROM room_answers a JOIN room_players p ON p.id = a.player_id AND p.user_id = ?
       JOIN rooms r ON r.id = a.room_id AND r.game_type = 'typerace' ORDER BY a.id`, [uid]);
  const [summary] = await db.query(
    `SELECT r.game_type, COUNT(*) AS tournaments, SUM(p.placement = 1) AS wins, SUM(p.matches_played) AS matches, SUM(p.matches_won) AS match_wins
       FROM room_players p JOIN rooms r ON r.id = p.room_id WHERE p.user_id = ? AND r.status = 'finished' GROUP BY r.game_type`, [uid]);
  res.json(buildStats({ quizRows, typingRows, summary }));
}));

router.get('/profile', requireAuth, wrap(async (req, res) => {
  const [[u]] = await db.query('SELECT xp, wins, tournaments, skin FROM users WHERE id = ?', [req.user.id]);
  if (!u) throw fail(404, 'User not found');
  res.json(profileOf(u));
}));

router.post('/profile/skin', requireAuth, wrap(async (req, res) => {
  const skin = byId(String(req.body.skin || ''));
  if (!skin) throw fail(400, 'Unknown character');
  const [[u]] = await db.query('SELECT xp, wins, tournaments, skin FROM users WHERE id = ?', [req.user.id]);
  if (!u || !isUnlocked(u, skin)) throw fail(403, 'That character is still locked');
  await db.query('UPDATE users SET skin = ? WHERE id = ?', [skin.id, req.user.id]);
  // lobbies the player is waiting in show the new character right away
  const [rooms] = await db.query(
    "SELECT r.code FROM rooms r JOIN room_players p ON p.room_id = r.id WHERE p.user_id = ? AND r.status = 'lobby'", [req.user.id]);
  for (const r of rooms) await game.broadcastLobby(r.code);
  res.json(profileOf({ ...u, skin: skin.id }));
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
  const gameType = req.body.game_type === 'typerace' ? 'typerace' : 'quiz';
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
      str(req.body.name, 80) || (quiz ? quiz.title : 'Typing race'), max, difficulty(req.body.bot_difficulty), perMatch(req.body.questions_per_match)]);
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
    const [[room]] = await conn.query('SELECT id, code, status, max_players FROM rooms WHERE invite_token = ? OR code = ? FOR UPDATE', [key, key.toUpperCase()]);
    if (!room) throw fail(404, 'Invite link or code is invalid');
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
