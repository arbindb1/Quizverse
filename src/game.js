const { Server } = require('socket.io');
const db = require('./db');
const { verify, accountState } = require('./auth');
const { lobbyState } = require('./rooms');
const { parseLook } = require('./look');
const TYPE_TEXTS = require('./typetexts');
const { SKINS, levelFor, isUnlocked } = require('./skins');
const draw = require('./draw');

/*
 * Single-elimination tournament with simultaneous matches. Players are shuffled into a bracket; every
 * match whose two players are known runs at the same time as the others. A match is a head-to-head
 * duel over `perMatch` questions (higher total points wins, ties go to sudden death). When a match ends
 * the winner moves on, and the next-round match starts as soon as both of its feeder matches are done.
 * Everyone in the room receives every match's events, so finished players can spectate any live match.
 */
const BOT = { easy: 0.4, medium: 0.65, hard: 0.9 };
const START_MS = 5000; // look at the bracket before the first matches
const INTRO_MS = 4500; // "A vs B" screen (long enough for the 4 s face-off clip)
const REVEAL_MS = 3000;
const MATCH_END_MS = 4000; // time for the bracket animation before the next-round match starts
const MAX_SUDDEN_DEATH = 3;
const BOT_CPS = { easy: 2.2, medium: 4, hard: 6.5 }; // characters per second a bot types at in a typing race
const MAX_CPS = 30; // a human cannot type faster than this; used to clamp reported progress
const games = new Map(); // room code -> live tournament
let io;

function init(httpServer) {
  io = new Server(httpServer);
  draw.init(io, { broadcastLobby: (c) => broadcastLobby(c), awardProgress: (g) => awardProgress(g), finalBoard: (c) => finalBoard(c) });
  io.use(async (socket, next) => {
    try {
      socket.data.user = verify(socket.handshake.auth.token || '');
    } catch {
      return next(new Error('unauthorized'));
    }
    try {
      if ((await accountState(socket.data.user.id)) !== 'ok') return next(new Error('suspended'));
    } catch { /* database hiccup: let the player in, the REST calls check again */ }
    next();
  });

  io.on('connection', (socket) => {
    socket.on('room:join', async (code, ack) => {
      try {
        code = String(code || '').toUpperCase();
        const state = await lobbyState(code);
        if (!state) throw new Error('Room not found');
        if (!state.players.some((p) => p.userId === socket.data.user.id)) throw new Error('You have not joined this room');
        socket.data.code = code;
        socket.join(code);
        socket.join(`${code}:u${socket.data.user.id}`); // private channel (the drawer's secret word goes here)
        socket.emit('lobby', state);
        const g = games.get(code);
        if (draw.has(code)) draw.sendState(socket);
        else if (g) sendState(socket, g);
        else if (state.status === 'finished') socket.emit('game:end', { board: await finalBoard(code) });
        if (ack) ack({ ok: true });
      } catch (e) {
        if (ack) ack({ ok: false, error: e.message });
      }
    });

    socket.on('room:start', async (ack) => {
      try {
        const code = socket.data.code;
        const state = code && (await lobbyState(code));
        if (!state) throw new Error('Join a room first');
        if (state.hostId !== socket.data.user.id) throw new Error('Only the host can start');
        if (state.status !== 'lobby' || games.has(code) || draw.has(code)) throw new Error('Game already started');
        if (state.players.length < 2) throw new Error('Need at least 2 players (add bots to play solo)');
        await startGame(state);
        if (ack) ack({ ok: true });
      } catch (e) {
        if (ack) ack({ ok: false, error: e.message });
      }
    });

    // Draw & Guess
    socket.on('draw:seg', (seg) => draw.onSeg(socket, seg));
    socket.on('draw:fill', (f) => draw.onFill(socket, f));
    socket.on('draw:undo', () => draw.onUndo(socket));
    socket.on('draw:clear', () => draw.onClear(socket));
    socket.on('draw:pick', (word) => draw.onPick(socket, word));
    socket.on('draw:guess', (text) => draw.onGuess(socket, text));
    socket.on('draw:emote', (e) => draw.onEmote(socket, e));
    socket.on('draw:react', (v) => draw.onReact(socket, v));
    socket.on('draw:kick', (id) => draw.onKick(socket, id));
    socket.on('draw:votekick', (id) => draw.onVoteKick(socket, id));

    socket.on('game:answer', (choice) => {
      const g = games.get(socket.data.code);
      const pid = g && g.byUser.get(socket.data.user.id);
      if (pid == null) return;
      for (const rt of g.rt.values()) {
        if (rt.m.a === pid || rt.m.b === pid) return answer(g, rt.m, g.players.get(pid), choice);
      }
    });

    // typing race: the browser reports what the player has typed so far; the server works out the progress
    socket.on('type:progress', (typed) => {
      const g = games.get(socket.data.code);
      const pid = g && g.byUser.get(socket.data.user.id);
      if (pid == null) return;
      for (const rt of g.rt.values()) {
        if (rt.m.a === pid || rt.m.b === pid) return onTyped(g, rt.m, g.players.get(pid), typed);
      }
    });
  });
  return io;
}

const broadcastLobby = async (code) => {
  const state = await lobbyState(code);
  if (state && io) io.to(code).emit('lobby', state);
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ---------- bracket ---------- */
const keyOf = (m) => `${m.round}-${m.index}`;
const makeMatch = (round, index, a, b) => ({ round, index, a, b, winner: null, scoreA: 0, scoreB: 0, status: 'pending', bye: false });

function buildBracket(ids) {
  const n = ids.length;
  let size = 2;
  while (size < n) size *= 2;
  const matches = size / 2;
  const byes = size - n;
  const byeAt = new Set();
  for (let k = 0; k < byes; k++) byeAt.add(Math.floor(((k + 0.5) * matches) / byes)); // spread byes out
  let p = 0;
  const first = [];
  for (let i = 0; i < matches; i++) {
    const a = ids[p++];
    const b = byeAt.has(i) ? null : ids[p++];
    first.push(makeMatch(0, i, a, b));
  }
  const rounds = [first];
  for (let count = matches / 2, r = 1; count >= 1; count /= 2, r++) {
    rounds.push(Array.from({ length: count }, (_, i) => makeMatch(r, i, null, null)));
  }
  return rounds;
}

function advance(g, m, winnerId) {
  m.winner = winnerId;
  m.status = 'done';
  const next = g.rounds[m.round + 1];
  if (!next) return;
  const nm = next[m.index >> 1];
  if (m.index % 2 === 0) nm.a = winnerId;
  else nm.b = winnerId;
}

// Queue every match that has both players and has not started yet
function startReady(g, delay) {
  for (const round of g.rounds) {
    for (const m of round) {
      if (m.status === 'pending' && m.a != null && m.b != null) {
        m.status = 'queued';
        after(g.timers, () => startMatch(g, m), delay);
      }
    }
  }
}

/* ---------- lifecycle ---------- */
function after(list, fn, ms) {
  list.push(setTimeout(fn, ms));
}
const clear = (list) => { list.forEach(clearTimeout); list.length = 0; };

async function startGame(state) {
  if (state.gameType === 'draw') return draw.start(state);
  const isType = state.gameType === 'typerace';
  let questions = [];
  if (!isType) [questions] = await db.query(
    `SELECT q.id, q.text, q.options, q.correct_index, q.time_limit, c.name AS category FROM questions q
       JOIN quizzes z ON z.id = q.quiz_id LEFT JOIN categories c ON c.id = z.category_id
      WHERE q.quiz_id = (SELECT quiz_id FROM rooms WHERE code = ?) ORDER BY q.position, q.id`,
    [state.code]);
  if (!isType && !questions.length) throw new Error('This quiz has no questions');
  await db.query("UPDATE rooms SET status='playing', started_at=NOW() WHERE code = ?", [state.code]);
  await db.query('UPDATE room_players SET score = 0, placement = NULL WHERE room_id = (SELECT id FROM rooms WHERE code = ?)', [state.code]);

  // every bot wears the default character (Rookie)
  for (const p of state.players.filter((x) => x.isBot)) {
    if (p.skin !== 'rookie') {
      p.skin = 'rookie';
      await db.query('UPDATE room_players SET skin = ? WHERE id = ?', [p.skin, p.id]);
    }
  }
  const players = new Map(state.players.map((p) => [p.id, { id: p.id, userId: p.userId, name: p.name, isBot: p.isBot, skin: p.isBot ? p.skin : p.skin || 'rookie', look: p.look || null, score: 0, placement: null, mp: 0, mw: 0, seen: new Map() }]));
  const g = {
    code: state.code,
    difficulty: state.botDifficulty,
    perMatch: state.questionsPerMatch,
    players,
    byUser: new Map(state.players.filter((p) => p.userId).map((p) => [p.userId, p.id])),
    rounds: buildBracket(shuffle([...players.keys()])),
    questions,
    type: state.gameType,
    texts: TYPE_TEXTS[state.textLength] || TYPE_TEXTS.medium,
    useCount: new Map(), // how often each question/text was used in this tournament
    rt: new Map(), // match key -> runtime state of a live match (kept out of the public bracket)
    matchNo: 0,
    log: [],
    timers: [],
  };
  for (const m of g.rounds[0]) {
    if (m.b == null) {
      m.bye = true;
      advance(g, m, m.a);
    }
  }
  games.set(state.code, g);
  await broadcastLobby(state.code);
  io.to(state.code).emit('game:bracket', bracketPayload(g));
  startReady(g, START_MS);
}

const bracketPayload = (g) => ({
  rounds: g.rounds,
  perMatch: g.perMatch,
  players: Object.fromEntries([...g.players.values()].map((p) => [p.id, { name: p.name, isBot: p.isBot, skin: p.skin, look: p.look }])),
});

const matchInfo = (m) => ({ round: m.round, index: m.index, a: m.a, b: m.b });

function emit(g, rt, event, payload) {
  rt.last = { event, payload };
  io.to(g.code).emit(event, payload);
}

// Bring a (re)connecting socket up to date: bracket plus the latest event of every live match
function sendState(socket, g) {
  socket.emit('game:bracket', bracketPayload(g));
  for (const rt of g.rt.values()) {
    if (!rt.last) continue;
    if (rt.last.event === 'game:question') socket.emit('game:question', questionPayload(g, rt.m));
    else if (rt.last.event === 'race:start') socket.emit('race:start', racePayload(g, rt.m));
    else socket.emit(rt.last.event, rt.last.payload);
  }
}

function startMatch(g, m) {
  const rt = { m, no: ++g.matchNo, used: new Set(), qDone: 0, answers: new Map(), phase: 'intro', timers: [], last: null };
  g.rt.set(keyOf(m), rt);
  m.status = 'live';
  m.scoreA = 0;
  m.scoreB = 0;
  emit(g, rt, 'match:intro', matchInfo(m));
  after(rt.timers, () => (g.type === 'typerace' ? nextRace(g, m) : nextQuestion(g, m)), INTRO_MS);
}

// Next question (or typing text) for a match, so that nothing repeats:
//  1. never one already asked in this match, until every item has been used up
//  2. as few repeats as possible for the two players across the whole tournament
//  3. spread items across matches that run at the same time
function pickItem(g, m, rt) {
  const items = g.type === 'typerace' ? g.texts : g.questions;
  const a = g.players.get(m.a);
  const b = g.players.get(m.b);
  let best = null;
  let bestScore = Infinity;
  items.forEach((item, i) => {
    const key = g.type === 'typerace' ? 't' + i : 'q' + item.id;
    const score = (rt.used.has(key) ? 1e6 : 0) + ((a.seen.get(key) || 0) + (b.seen.get(key) || 0)) * 1000 + (g.useCount.get(key) || 0) * 10 + Math.random();
    if (score < bestScore) { bestScore = score; best = { item, key }; }
  });
  rt.used.add(best.key);
  for (const p of [a, b]) p.seen.set(best.key, (p.seen.get(best.key) || 0) + 1);
  g.useCount.set(best.key, (g.useCount.get(best.key) || 0) + 1);
  return best.item;
}

function questionPayload(g, m) {
  const rt = g.rt.get(keyOf(m));
  const q = rt.q;
  return {
    match: matchInfo(m),
    index: rt.qDone,
    total: g.perMatch,
    sudden: rt.qDone >= g.perMatch,
    text: q.text,
    options: q.options,
    timeLimit: q.time_limit,
    remainingMs: Math.max(0, rt.endsAt - Date.now()),
    answered: [...rt.answers.keys()],
    scoreA: m.scoreA,
    scoreB: m.scoreB,
  };
}

function nextQuestion(g, m) {
  const rt = g.rt.get(keyOf(m));
  rt.q = pickItem(g, m, rt);
  rt.answers = new Map();
  rt.phase = 'question';
  rt.qStart = Date.now();
  rt.endsAt = rt.qStart + rt.q.time_limit * 1000;
  emit(g, rt, 'game:question', questionPayload(g, m));
  after(rt.timers, () => reveal(g, m), rt.q.time_limit * 1000 + 300);
  for (const id of [m.a, m.b]) {
    const bot = g.players.get(id);
    if (!bot.isBot) continue;
    const delay = rt.q.time_limit * 1000 * (0.15 + Math.random() * 0.55);
    const wrong = [...rt.q.options.keys()].filter((i) => i !== rt.q.correct_index);
    const choice = Math.random() < BOT[g.difficulty] ? rt.q.correct_index : wrong[Math.floor(Math.random() * wrong.length)];
    after(rt.timers, () => answer(g, m, bot, choice), delay);
  }
}

function answer(g, m, player, choice) {
  const rt = g.rt.get(keyOf(m));
  if (!rt || rt.phase !== 'question' || (player.id !== m.a && player.id !== m.b) || rt.answers.has(player.id)) return;
  choice = Number(choice);
  if (!Number.isInteger(choice) || choice < 0 || choice >= rt.q.options.length) return;
  const timeMs = Date.now() - rt.qStart;
  if (timeMs > rt.q.time_limit * 1000 + 300) return;
  const correct = choice === rt.q.correct_index;
  const left = Math.max(0, 1 - timeMs / (rt.q.time_limit * 1000));
  rt.answers.set(player.id, { choice, correct, timeMs, points: correct ? 500 + Math.round(500 * left) : 0 });
  io.to(g.code).emit('game:answered', { match: matchInfo(m), playerId: player.id });
  if (rt.answers.size === 2) reveal(g, m);
}

function reveal(g, m) {
  const rt = g.rt.get(keyOf(m));
  if (!rt || rt.phase !== 'question') return;
  clear(rt.timers);
  rt.phase = 'reveal';
  const results = [m.a, m.b].map((id) => {
    const a = rt.answers.get(id);
    const pts = a ? a.points : 0;
    g.players.get(id).score += pts;
    if (id === m.a) m.scoreA += pts;
    else m.scoreB += pts;
    g.log.push([id, rt.q.id, a ? a.choice : null, a && a.correct ? 1 : 0, pts, a ? a.timeMs : null, rt.no, null, rt.q.category || null]);
    return { playerId: id, choice: a ? a.choice : null, correct: !!(a && a.correct), points: pts };
  });
  rt.qDone++;
  emit(g, rt, 'game:reveal', { match: matchInfo(m), correctIndex: rt.q.correct_index, results, scoreA: m.scoreA, scoreB: m.scoreB });
  after(rt.timers, () => afterReveal(g, m), REVEAL_MS);
}

/* ---------- typing race: a duel is a number of races; the race winner scores a win ---------- */
function racePayload(g, m) {
  const rt = g.rt.get(keyOf(m));
  return {
    match: matchInfo(m),
    index: rt.qDone,
    total: g.perMatch,
    sudden: rt.qDone >= g.perMatch,
    text: rt.text,
    timeLimit: rt.limit,
    remainingMs: Math.max(0, rt.endsAt - Date.now()),
    progress: Object.fromEntries(rt.progress),
    scoreA: m.scoreA,
    scoreB: m.scoreB,
  };
}

function nextRace(g, m) {
  const rt = g.rt.get(keyOf(m));
  rt.text = pickItem(g, m, rt);
  rt.limit = Math.max(20, Math.ceil(rt.text.length / 2.5));
  rt.progress = new Map([[m.a, 0], [m.b, 0]]);
  rt.finished = new Map();
  rt.dirty = false;
  rt.phase = 'race';
  rt.qStart = Date.now();
  rt.endsAt = rt.qStart + rt.limit * 1000;
  emit(g, rt, 'race:start', racePayload(g, m));
  after(rt.timers, () => endRace(g, m, null), rt.limit * 1000 + 300);
  after(rt.timers, () => progressTick(g, m), 300);
  for (const id of [m.a, m.b]) {
    const bot = g.players.get(id);
    if (!bot.isBot) continue;
    const cps = BOT_CPS[g.difficulty] * (0.85 + Math.random() * 0.3);
    after(rt.timers, () => botTick(g, m, bot, cps), 300);
  }
}

// progress of both players, batched so a busy room does not flood everyone with messages
function progressTick(g, m) {
  const rt = g.rt.get(keyOf(m));
  if (!rt || rt.phase !== 'race') return;
  if (rt.dirty) {
    rt.dirty = false;
    io.to(g.code).emit('race:progress', { match: matchInfo(m), progress: Object.fromEntries(rt.progress) });
  }
  after(rt.timers, () => progressTick(g, m), 300);
}

function botTick(g, m, bot, cps) {
  const rt = g.rt.get(keyOf(m));
  if (!rt || rt.phase !== 'race') return;
  const typed = Math.floor(((Date.now() - rt.qStart - 800) / 1000) * cps); // bots take a moment to start
  setProgress(g, m, bot, Math.min(rt.text.length, Math.max(0, typed)));
  after(rt.timers, () => botTick(g, m, bot, cps), 250);
}

function onTyped(g, m, player, typed) {
  const rt = g.rt.get(keyOf(m));
  if (!rt || rt.phase !== 'race') return;
  typed = String(typed || '').slice(0, rt.text.length);
  let ok = 0;
  while (ok < typed.length && typed[ok] === rt.text[ok]) ok++;
  const cap = Math.floor(((Date.now() - rt.qStart) / 1000) * MAX_CPS) + 8;
  setProgress(g, m, player, Math.min(ok, cap));
}

function setProgress(g, m, player, pos) {
  const rt = g.rt.get(keyOf(m));
  if (!rt || rt.phase !== 'race' || pos <= (rt.progress.get(player.id) || 0)) return;
  rt.progress.set(player.id, pos);
  rt.dirty = true;
  if (pos >= rt.text.length && !rt.finished.has(player.id)) {
    rt.finished.set(player.id, Date.now() - rt.qStart);
    endRace(g, m, player.id);
  }
}

function endRace(g, m, finisherId) {
  const rt = g.rt.get(keyOf(m));
  if (!rt || rt.phase !== 'race') return;
  clear(rt.timers);
  rt.phase = 'raceover';
  const len = rt.text.length;
  const elapsed = Math.min(Date.now() - rt.qStart, rt.limit * 1000);
  let winnerId = finisherId;
  if (winnerId == null) { // time ran out: the one who got further wins, equal progress is a draw
    const pa = rt.progress.get(m.a), pb = rt.progress.get(m.b);
    winnerId = pa > pb ? m.a : pb > pa ? m.b : null;
  }
  const results = [m.a, m.b].map((id) => {
    const pos = rt.progress.get(id);
    const finished = rt.finished.has(id);
    const timeMs = finished ? rt.finished.get(id) : null;
    const points = Math.round((800 * pos) / len) + (finished ? 200 : 0);
    g.players.get(id).score += points;
    const wpm = Math.round(pos / 5 / ((timeMs || elapsed || 1) / 60000));
    g.log.push([id, 0, pos, finished ? 1 : 0, points, timeMs, rt.no, wpm, null]);
    return { playerId: id, pos, finished, timeMs, points, wpm };
  });
  if (winnerId === m.a) m.scoreA++;
  else if (winnerId === m.b) m.scoreB++;
  rt.qDone++;
  emit(g, rt, 'race:end', { match: matchInfo(m), winnerId, length: len, results, scoreA: m.scoreA, scoreB: m.scoreB });
  after(rt.timers, () => afterReveal(g, m), REVEAL_MS + 1500);
}

function afterReveal(g, m) {
  const rt = g.rt.get(keyOf(m));
  const decided = m.scoreA !== m.scoreB;
  const over = rt.qDone >= g.perMatch && (decided || rt.qDone >= g.perMatch + MAX_SUDDEN_DEATH);
  if (!over) return g.type === 'typerace' ? nextRace(g, m) : nextQuestion(g, m);
  const winner = decided ? (m.scoreA > m.scoreB ? m.a : m.b) : Math.random() < 0.5 ? m.a : m.b;
  endMatch(g, m, winner);
}

function endMatch(g, m, winnerId) {
  const rt = g.rt.get(keyOf(m));
  clear(rt.timers);
  g.rt.delete(keyOf(m));
  const loserId = winnerId === m.a ? m.b : m.a;
  g.players.get(winnerId).mw++;
  g.players.get(winnerId).mp++;
  g.players.get(loserId).mp++;
  advance(g, m, winnerId);
  // eliminated in the final => 2nd, in a semifinal => joint 3rd, quarterfinal => joint 5th ...
  g.players.get(loserId).placement = 2 ** (g.rounds.length - 1 - m.round) + 1;
  io.to(g.code).emit('match:end', {
    round: m.round, index: m.index, a: m.a, b: m.b, winnerId, loserId, scoreA: m.scoreA, scoreB: m.scoreB,
  });
  if (m.round === g.rounds.length - 1) after(g.timers, () => finishTournament(g), MATCH_END_MS);
  else startReady(g, MATCH_END_MS);
}

async function finalBoard(code) {
  const [rows] = await db.query(
    `SELECT p.id, p.display_name AS name, p.is_bot AS isBot, p.score, p.placement, COALESCE(u.skin, p.skin) AS skin, u.look FROM room_players p
       JOIN rooms r ON r.id = p.room_id LEFT JOIN users u ON u.id = p.user_id WHERE r.code = ? ORDER BY p.placement IS NULL, p.placement, p.score DESC, p.id`, [code]);
  // skin and look are included so the end screen can draw everybody even when the page was opened after the game finished
  return rows.map((r) => ({ ...r, isBot: !!r.isBot, look: parseLook(r.look) }));
}

// XP and tournament credit for the human players. A room with only one human (the rest bots) is practice:
// a quarter of the XP and no win/tournament credit, so unlocks cannot be farmed alone against bots.
async function awardProgress(g) {
  const humans = [...g.players.values()].filter((p) => !p.isBot && p.userId);
  const rewards = {};
  if (!humans.length) return rewards;
  const full = humans.length >= 2;
  const [rows] = await db.query('SELECT id, xp, wins, tournaments, is_guest FROM users WHERE id IN (?)', [humans.map((h) => h.userId)]);
  const before = new Map(rows.map((r) => [r.id, r]));
  const placementBonus = { 1: 100, 2: 50, 3: 25, 5: 10 };
  for (const p of humans) {
    const u = before.get(p.userId);
    if (!u || u.is_guest) continue; // guests earn nothing
    let xp = 20 + 10 * p.mp + 30 * p.mw + (placementBonus[p.placement] || 0);
    if (!full) xp = Math.round(xp * 0.25);
    const after = { xp: u.xp + xp, wins: u.wins + (full && p.placement === 1 ? 1 : 0), tournaments: u.tournaments + (full ? 1 : 0) };
    await db.query('UPDATE users SET xp = ?, wins = ?, tournaments = ? WHERE id = ?', [after.xp, after.wins, after.tournaments, p.userId]);
    rewards[p.id] = {
      xp, practice: !full, level: levelFor(after.xp),
      newSkins: SKINS.filter((s) => !isUnlocked(u, s) && isUnlocked(after, s)).map((s) => s.id),
    };
  }
  return rewards;
}

async function finishTournament(g) {
  clear(g.timers);
  const finalMatch = g.rounds[g.rounds.length - 1][0];
  g.players.get(finalMatch.winner).placement = 1;
  const rewards = await awardProgress(g).catch((e) => { console.error('Failed to save progress', e); return {}; });
  try {
    const [[room]] = await db.query('SELECT id FROM rooms WHERE code = ?', [g.code]);
    for (const p of g.players.values()) {
      await db.query('UPDATE room_players SET score = ?, placement = ?, matches_played = ?, matches_won = ? WHERE id = ?', [p.score, p.placement, p.mp, p.mw, p.id]);
    }
    if (g.log.length) {
      await db.query('INSERT INTO room_answers (room_id, player_id, question_id, choice, is_correct, points, time_ms, match_no, wpm, category) VALUES ?',
        [g.log.map((l) => [room.id, ...l])]);
    }
    await db.query("UPDATE rooms SET status='finished', finished_at=NOW() WHERE id = ?", [room.id]);
  } catch (e) {
    console.error('Failed to save results', e);
  }
  games.delete(g.code);
  io.to(g.code).emit('game:end', { board: await finalBoard(g.code), rounds: g.rounds, rewards });
  await broadcastLobby(g.code);
}

// admin tools: disconnect a suspended/deleted player, close a room (and stop its game if one is running)
function kickUser(userId) {
  if (!io) return;
  for (const s of io.sockets.sockets.values()) if (s.data.user && s.data.user.id === userId) s.disconnect(true);
}

function abortRoom(code) {
  draw.abort(code);
  const g = games.get(code);
  if (g) {
    clear(g.timers);
    for (const rt of g.rt.values()) clear(rt.timers);
    games.delete(code);
  }
  if (io) io.to(code).emit('room:closed');
}

module.exports = { init, broadcastLobby, startGame, kickUser, abortRoom };
