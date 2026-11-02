const db = require('./db');
const { ALL: FALLBACK_WORDS } = require('./drawwords'); // only used if the table draw_words cannot be read

/*
 * Draw & Guess (skribbl style). A free-for-all instead of a bracket: in every round each human player gets one
 * turn as the drawer. The drawer picks one of three words and draws it; everybody else types guesses. The faster
 * a guess, the more points; the drawer earns points when others guess. Bots never draw but they guess.
 * The drawing travels as small stroke segments (coordinates 0..1) that the server relays and keeps so that a
 * reconnecting player can see the picture so far. The secret word is only ever sent to the drawer.
 */
const DRAW_SECONDS = { short: 60, medium: 80, long: 110 };
const CHOOSE_MS = 15000;
const REVEAL_MS = 5000;
const BOT_GUESS_CHANCE = { easy: 0.35, medium: 0.6, hard: 0.85 };
const MAX_STROKES = 1500;
const MAX_POINTS = 40000;
const games = new Map();
let io, hooks;

const clear = (g) => { g.timers.forEach(clearTimeout); g.timers.length = 0; };
const after = (g, fn, ms) => g.timers.push(setTimeout(fn, ms));
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
const pick = (arr, n) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
const toUser = (g, p, event, payload) => p.userId && io.to(`${g.code}:u${p.userId}`).emit(event, payload);

// one edit (insert, delete or change a letter) away from the word: "close"
function nearly(a, b) {
  if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

function init(server, h) { io = server; hooks = h; }
const has = (code) => games.has(code);

async function start(state) {
  let words = FALLBACK_WORDS;
  try {
    const [rows] = await db.query('SELECT word FROM draw_words');
    if (rows.length >= 30) words = rows.map((r) => r.word);
  } catch (e) { console.error('Could not read draw_words, using the built-in list', e.message); }
  const [[room]] = await db.query('SELECT id FROM rooms WHERE code = ?', [state.code]);
  await db.query("UPDATE rooms SET status='playing', started_at=NOW() WHERE id = ?", [room.id]);
  await db.query('UPDATE room_players SET score = 0, placement = NULL WHERE room_id = ?', [room.id]);
  await db.query("UPDATE room_players SET skin = 'rookie' WHERE room_id = ? AND is_bot = 1", [room.id]);
  const players = new Map(state.players.map((p) => [p.id, {
    id: p.id, userId: p.userId, name: p.name, isBot: p.isBot, skin: p.isBot ? 'rookie' : p.skin || 'rookie', look: p.look || null, score: 0, mp: 0, mw: 0, placement: null,
  }]));
  const humans = [...players.values()].filter((p) => !p.isBot);
  const g = {
    code: state.code, roomId: room.id, players, words, difficulty: state.botDifficulty,
    rounds: state.questionsPerMatch, drawSeconds: DRAW_SECONDS[state.textLength] || 80,
    order: humans.map((p) => p.id).reverse(), round: 1, turn: -1, // like skribbl: the list keeps its join order, the drawer goes from the bottom up to the top
    phase: 'wait', drawerId: null, word: null, options: [], used: new Set(),
    guessed: new Map(), gains: {}, strokes: [], points: 0, endsAt: 0, hintMask: [], hintAt: [],
    timers: [], chatAt: new Map(), emoteAt: new Map(), votes: new Map(), kickVotes: new Map(), hostId: state.hostId,
    userPlayer: (uid) => [...players.values()].find((p) => p.userId === uid)?.id,
  };
  games.set(state.code, g);
  await hooks.broadcastLobby(state.code);
  io.to(state.code).emit('draw:begin', { rounds: g.rounds, players: playersPayload(g) });
  after(g, () => nextTurn(g), 2500);
}

const playersPayload = (g) => Object.fromEntries([...g.players.values()].map((p) => [p.id, { name: p.name, isBot: p.isBot, skin: p.skin, look: p.look }]));
const scores = (g) => Object.fromEntries([...g.players.values()].map((p) => [p.id, p.score]));
const hintOf = (g) => (g.word ? [...g.word].map((ch, i) => (ch === ' ' ? ' ' : g.hintMask[i] ? ch : null)) : []);

// what everybody may know about the current turn (never the word, except after the turn)
function publicState(g) {
  return {
    round: g.round, rounds: g.rounds, phase: g.phase, drawerId: g.drawerId, endsAt: g.endsAt, drawSeconds: g.drawSeconds,
    hint: g.phase === 'reveal' ? [...g.word] : hintOf(g), word: g.phase === 'reveal' ? g.word : undefined,
    scores: scores(g), gains: g.phase === 'reveal' ? g.gains : undefined, guessed: [...g.guessed.keys()],
    voters: [...g.votes.keys()], likes: [...g.votes.values()].filter((v) => v === 1).length, dislikes: [...g.votes.values()].filter((v) => v === -1).length,
    humans: [...g.players.values()].filter((p) => !p.isBot).length, hostId: g.hostId,
    kickVotes: Object.fromEntries([...g.kickVotes].map(([id, set]) => [id, [...set]])),
  };
}
const push = (g) => io.to(g.code).emit('draw:state', publicState(g));

function nextTurn(g) {
  clear(g);
  g.turn++;
  if (g.turn >= g.order.length) { g.turn = 0; g.round++; }
  if (g.round > g.rounds || !g.order.length) return finish(g);
  g.drawerId = g.order[g.turn];
  g.word = null;
  g.guessed = new Map();
  g.gains = {};
  g.votes = new Map(); // likes and dislikes are per drawing
  g.strokes = [];
  g.points = 0;
  g.phase = 'choosing';
  const pool = g.words.filter((w) => !g.used.has(w));
  g.options = pick(pool.length >= 3 ? pool : g.words, 3);
  g.endsAt = Date.now() + CHOOSE_MS;
  push(g);
  io.to(g.code).emit('draw:redraw', { strokes: [] });
  toUser(g, g.players.get(g.drawerId), 'draw:choices', { words: g.options });
  after(g, () => chooseWord(g, g.options[0]), CHOOSE_MS);
}

function chooseWord(g, word) {
  if (g.phase !== 'choosing' || !g.options.includes(word)) return;
  clear(g);
  g.word = word;
  g.used.add(word);
  g.phase = 'drawing';
  g.endsAt = Date.now() + g.drawSeconds * 1000;
  g.hintMask = [...word].map((ch) => ch === ' ');
  push(g);
  toUser(g, g.players.get(g.drawerId), 'draw:word', { word });
  // letters are revealed as time passes (one at 50% and one more at 75% of the time, only for words of 4+ letters)
  const letters = [...word].map((c, i) => i).filter((i) => word[i] !== ' ');
  if (letters.length >= 4) {
    for (const f of [0.5, 0.75]) {
      after(g, () => {
        const hidden = letters.filter((i) => !g.hintMask[i]);
        if (g.phase !== 'drawing' || hidden.length <= 2) return;
        g.hintMask[hidden[Math.floor(Math.random() * hidden.length)]] = true;
        push(g);
      }, g.drawSeconds * 1000 * f);
    }
  }
  // bots guess now and then: more often and sooner on hard
  for (const p of g.players.values()) {
    if (!p.isBot || Math.random() > BOT_GUESS_CHANCE[g.difficulty]) continue;
    after(g, () => { if (g.phase === 'drawing' && g.strokes.length) correct(g, p); }, g.drawSeconds * 1000 * (0.25 + Math.random() * 0.6));
  }
  after(g, () => endTurn(g), g.drawSeconds * 1000);
}

function correct(g, p) {
  if (g.phase !== 'drawing' || p.id === g.drawerId || g.guessed.has(p.id)) return;
  const left = Math.max(0, g.endsAt - Date.now()) / (g.drawSeconds * 1000);
  // like skribbl: more points the more time is left, and the first to guess earns the most (each earlier guesser takes 10% off, down to 55%)
  const pts = Math.round((50 + 450 * left) * Math.max(0.55, 1 - 0.1 * g.guessed.size));
  g.guessed.set(p.id, pts);
  p.score += pts;
  g.gains[p.id] = pts;
  if (!p.isBot) p.mp++;
  io.to(g.code).emit('draw:chat', { kind: 'correct', name: p.name });
  push(g);
  toUser(g, p, 'draw:word', { word: g.word }); // whoever guessed it gets to see the word, like the drawer
  if (g.guessed.size >= g.players.size - 1) endTurn(g); // everybody has it
}

function endTurn(g) {
  if (g.phase !== 'drawing') return;
  clear(g);
  const drawer = g.players.get(g.drawerId);
  const total = [...g.guessed.values()].reduce((a, b) => a + b, 0);
  const gain = g.players.size > 1 ? Math.round(total / (g.players.size - 1)) : 0; // the drawer earns the average guesser's points
  drawer.score += gain;
  g.gains[drawer.id] = (g.gains[drawer.id] || 0) + gain;
  g.phase = 'reveal';
  g.endsAt = Date.now() + REVEAL_MS;
  push(g);
  after(g, () => nextTurn(g), REVEAL_MS);
}

async function finish(g) {
  clear(g);
  const ranked = [...g.players.values()].sort((a, b) => b.score - a.score);
  ranked.forEach((p, i) => { p.placement = i > 0 && p.score === ranked[i - 1].score ? ranked[i - 1].placement : i + 1; });
  const rewards = await hooks.awardProgress(g).catch((e) => { console.error('Failed to save progress', e); return {}; });
  try {
    for (const p of g.players.values()) {
      await db.query('UPDATE room_players SET score = ?, placement = ?, matches_played = ?, matches_won = 0 WHERE id = ?', [p.score, p.placement, p.mp, p.id]);
    }
    await db.query("UPDATE rooms SET status='finished', finished_at=NOW() WHERE id = ?", [g.roomId]);
  } catch (e) {
    console.error('Failed to save results', e);
  }
  games.delete(g.code);
  io.to(g.code).emit('game:end', { board: await hooks.finalBoard(g.code), rewards });
  await hooks.broadcastLobby(g.code);
}

/* ----- what players send ----- */
const num = (v, lo, hi) => (typeof v === 'number' && v >= lo && v <= hi ? v : null);

function onSeg(socket, seg) {
  const g = games.get(socket.data.code);
  const pid = g && g.userPlayer(socket.data.user.id);
  if (!g || g.phase !== 'drawing' || pid !== g.drawerId || !seg || !Array.isArray(seg.pts)) return;
  const color = /^#[0-9a-f]{6}$/i.test(seg.c) ? seg.c : '#000000';
  const size = num(seg.s, 1, 40) || 4;
  const pts = seg.pts.slice(0, 200);
  if (pts.length < 2 || pts.length % 2 || pts.some((v) => num(v, 0, 1) === null)) return;
  let st = g.strokes[g.strokes.length - 1];
  if (!st || st.id !== seg.id) {
    if (g.strokes.length >= MAX_STROKES) return;
    st = { id: seg.id, c: color, s: size, pts: [] };
    g.strokes.push(st);
  }
  if (g.points + pts.length > MAX_POINTS) return;
  g.points += pts.length;
  st.pts.push(...pts);
  socket.to(g.code).emit('draw:seg', { id: st.id, c: st.c, s: st.s, pts });
}

function onFill(socket, f) {
  const g = games.get(socket.data.code);
  if (!g || g.phase !== 'drawing' || !f || g.userPlayer(socket.data.user.id) !== g.drawerId) return;
  const x = num(f.x, 0, 1), y = num(f.y, 0, 1);
  if (x === null || y === null || g.strokes.length >= MAX_STROKES) return;
  const st = { id: f.id, fill: true, x, y, c: /^#[0-9a-f]{6}$/i.test(f.c) ? f.c : '#000000' };
  g.strokes.push(st);
  socket.to(g.code).emit('draw:fill', st);
}

function onUndo(socket) {
  const g = games.get(socket.data.code);
  if (!g || g.phase !== 'drawing' || g.userPlayer(socket.data.user.id) !== g.drawerId) return;
  g.strokes.pop();
  io.to(g.code).emit('draw:redraw', { strokes: g.strokes });
}

function onClear(socket) {
  const g = games.get(socket.data.code);
  if (!g || g.phase !== 'drawing' || g.userPlayer(socket.data.user.id) !== g.drawerId) return;
  g.strokes = [];
  io.to(g.code).emit('draw:redraw', { strokes: [] });
}

function onPick(socket, word) {
  const g = games.get(socket.data.code);
  if (g && g.userPlayer(socket.data.user.id) === g.drawerId) chooseWord(g, String(word));
}

function onGuess(socket, text) {
  const g = games.get(socket.data.code);
  const p = g && g.players.get(g.userPlayer(socket.data.user.id));
  if (!g || !p || g.phase !== 'drawing') return;
  const now = Date.now();
  if (now - (g.chatAt.get(p.id) || 0) < 400) return; // no flooding
  g.chatAt.set(p.id, now);
  const raw = String(text || '').trim().slice(0, 60);
  const guess = norm(raw);
  if (!guess) return;
  if (p.id === g.drawerId || g.guessed.has(p.id)) { // drawer and finished guessers chat privately with each other
    const circle = [g.drawerId, ...g.guessed.keys()].map((id) => g.players.get(id));
    for (const q of circle) toUser(g, q, 'draw:chat', { kind: 'private', name: p.name, text: raw });
    return;
  }
  if (guess === g.word) return correct(g, p);
  io.to(g.code).emit('draw:chat', { kind: 'guess', name: p.name, text: raw });
  if (nearly(guess, g.word)) socket.emit('draw:chat', { kind: 'close' });
}

// a (re)connecting player gets the current picture and turn
function sendState(socket) {
  const g = games.get(socket.data.code);
  if (!g) return;
  const p = g.players.get(g.userPlayer(socket.data.user.id));
  socket.emit('draw:begin', { rounds: g.rounds, players: playersPayload(g) });
  socket.emit('draw:state', publicState(g));
  socket.emit('draw:redraw', { strokes: g.strokes });
  if (p && p.id === g.drawerId) {
    if (g.phase === 'choosing') socket.emit('draw:choices', { words: g.options });
    if (g.phase === 'drawing') socket.emit('draw:word', { word: g.word });
  } else if (p && g.phase === 'drawing' && g.guessed.has(p.id)) socket.emit('draw:word', { word: g.word }); // reloaded after guessing
}

/* ----- emotes, likes and dislikes ----- */
const EMOTES = ['😂', '😮', '👏', '🔥', '❤️', '😡', '🤔', '😭', '🥳', '👀'];
const who = (socket) => {
  const g = games.get(socket.data.code);
  return { g, p: g && g.players.get(g.userPlayer(socket.data.user.id)) };
};
const say = (g, text) => io.to(g.code).emit('draw:chat', { kind: 'system', text });

function onEmote(socket, e) {
  const { g, p } = who(socket);
  if (!g || !p || !EMOTES.includes(e)) return;
  const now = Date.now();
  if (now - (g.emoteAt.get(p.id) || 0) < 1000) return; // no flooding
  g.emoteAt.set(p.id, now);
  io.to(g.code).emit('draw:emote', { id: p.id, e });
}

// like (1) or dislike (-1) the current drawing; the drawer cannot vote on their own picture; one vote each per turn
function onReact(socket, v) {
  const { g, p } = who(socket);
  if (!g || !p || (v !== 1 && v !== -1) || p.id === g.drawerId || !['drawing', 'reveal'].includes(g.phase)) return;
  if (g.votes.has(p.id)) return; // one vote per drawing: after voting the buttons are gone for the rest of the turn
  g.votes.set(p.id, v);
  io.to(g.code).emit('draw:chat', { kind: 'react', v, name: p.name }); // everybody sees who liked or disliked the drawing
  push(g);
}

/* ----- removing players: only the host can remove someone directly; any player can start a vote (at least 3 people, more than half of the others must agree) ----- */
async function kickPlayer(g, t, how) {
  const i = g.order.indexOf(t.id);
  const wasDrawer = g.drawerId === t.id && ['choosing', 'drawing'].includes(g.phase);
  g.players.delete(t.id);
  g.guessed.delete(t.id);
  delete g.gains[t.id];
  g.votes.delete(t.id);
  g.kickVotes.delete(t.id);
  for (const set of g.kickVotes.values()) set.delete(t.id);
  if (i >= 0) { g.order.splice(i, 1); if (i <= g.turn) g.turn--; } // the next turn then goes to whoever is next in line
  await db.query('DELETE FROM room_players WHERE id = ?', [t.id]).catch(() => {});
  io.to(`${g.code}:u${t.userId}`).emit('draw:kicked', { how });
  io.in(`${g.code}:u${t.userId}`).socketsLeave([g.code, `${g.code}:u${t.userId}`]);
  say(g, `${t.name} was ${how === 'vote' ? 'voted out' : 'removed'} from the game`);
  io.to(g.code).emit('draw:players', { players: playersPayload(g) });
  hooks.broadcastLobby(g.code);
  const humansLeft = [...g.players.values()].filter((x) => !x.isBot).length;
  if (!humansLeft) { clear(g); return finish(g); }
  if (wasDrawer) { clear(g); return nextTurn(g); }
  if (g.phase === 'drawing' && g.guessed.size >= g.players.size - 1) return endTurn(g);
  push(g);
}

async function onKick(socket, targetId) {
  const { g, p } = who(socket);
  const t = g && g.players.get(Number(targetId));
  if (!g || !p || !t || t.isBot || t.id === p.id) return;
  if (socket.data.user.id !== g.hostId) return socket.emit('draw:chat', { kind: 'system', text: 'Only the host can remove players. You can start a vote instead.' });
  if (games.get(g.code) === g) await kickPlayer(g, t, 'host');
}

function onVoteKick(socket, targetId) {
  const { g, p } = who(socket);
  const t = g && g.players.get(Number(targetId));
  if (!g || !p || !t || t.isBot || t.id === p.id || p.isBot) return;
  const humans = [...g.players.values()].filter((x) => !x.isBot);
  if (humans.length < 3) return socket.emit('draw:chat', { kind: 'system', text: 'A vote needs at least 3 players. In a smaller game only the host can remove someone.' });
  if (t.userId === g.hostId) return socket.emit('draw:chat', { kind: 'system', text: 'The host cannot be voted out.' });
  const set = g.kickVotes.get(t.id) || new Set();
  if (set.has(p.id)) return;
  set.add(p.id);
  g.kickVotes.set(t.id, set);
  const need = Math.floor((humans.length - 1) / 2) + 1; // more than half of everybody except the target
  say(g, `${p.name} voted to remove ${t.name} (${set.size}/${need})`);
  if (set.size >= need) kickPlayer(g, t, 'vote'); else push(g);
}

function abort(code) {
  const g = games.get(code);
  if (g) { clear(g); games.delete(code); }
}

module.exports = { init, has, start, sendState, abort, onSeg, onFill, onUndo, onClear, onPick, onGuess, onEmote, onReact, onKick, onVoteKick, EMOTES };
