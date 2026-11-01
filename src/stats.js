// Turns a player's saved answers into the numbers and chart series shown on the Analytics page.
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const round = (n, d = 0) => { const f = 10 ** d; return Math.round(n * f) / f; };
const MIN_ASKED = 3; // a category needs at least this many questions before it counts as a strength or weakness

function quizStats(rows) {
  const asked = rows.length;
  const correct = rows.filter((r) => r.is_correct).length;
  const times = rows.filter((r) => r.time_ms != null).map((r) => Number(r.time_ms));

  const cats = new Map();
  for (const r of rows) {
    const name = r.category || 'Uncategorised';
    const c = cats.get(name) || { category: name, asked: 0, correct: 0, times: [] };
    c.asked++;
    if (r.is_correct) c.correct++;
    if (r.time_ms != null) c.times.push(Number(r.time_ms));
    cats.set(name, c);
  }
  const byCategory = [...cats.values()]
    .map((c) => ({ category: c.category, asked: c.asked, correct: c.correct, accuracy: round((100 * c.correct) / c.asked, 1), avgTimeMs: round(avg(c.times)) }))
    .sort((a, b) => b.accuracy - a.accuracy || b.asked - a.asked);
  const eligible = byCategory.filter((c) => c.asked >= MIN_ASKED);

  // accuracy of each tournament, oldest first (rows arrive in the order they were played)
  const rooms = new Map();
  for (const r of rows) {
    const g = rooms.get(r.room_id) || { asked: 0, correct: 0, date: r.created_at };
    g.asked++;
    if (r.is_correct) g.correct++;
    rooms.set(r.room_id, g);
  }
  const series = [...rooms.values()].slice(-20).map((g, i) => ({ n: i + 1, accuracy: round((100 * g.correct) / g.asked, 1), asked: g.asked, date: g.date }));

  return {
    asked, correct,
    accuracy: asked ? round((100 * correct) / asked, 1) : 0,
    avgTimeMs: round(avg(times)),
    byCategory,
    best: eligible[0] || null,
    worst: eligible.length > 1 ? eligible[eligible.length - 1] : null,
    series,
  };
}

function typingStats(rows) {
  const timed = rows.filter((r) => r.wpm != null && Number(r.wpm) > 0);
  const wpms = timed.map((r) => Number(r.wpm));
  const series = timed.slice(-40).map((r, i) => ({ n: i + 1, wpm: Number(r.wpm), chars: Number(r.chars), finished: !!r.finished, date: r.created_at }));
  const last10 = wpms.slice(-10);
  const prev10 = wpms.slice(-20, -10);
  return {
    races: rows.length,
    finished: rows.filter((r) => r.finished).length,
    avgWpm: round(avg(wpms), 1),
    bestWpm: wpms.length ? Math.max(...wpms) : 0,
    last10Wpm: round(avg(last10), 1),
    trend: last10.length >= 3 && prev10.length >= 3 ? round(avg(last10) - avg(prev10), 1) : null, // change versus the 10 races before
    series,
    recent: [...series].reverse().slice(0, 8),
  };
}

function buildStats({ quizRows = [], typingRows = [], summary = [] }) {
  const sum = (type) => {
    const r = summary.find((x) => x.game_type === type) || {};
    const matches = Number(r.matches || 0);
    const matchWins = Number(r.match_wins || 0);
    return { tournaments: Number(r.tournaments || 0), wins: Number(r.wins || 0), matches, matchWins, matchWinRate: matches ? round((100 * matchWins) / matches, 1) : 0 };
  };
  return { quiz: { ...quizStats(quizRows), ...sum('quiz') }, typing: { ...typingStats(typingRows), ...sum('typerace') } };
}

module.exports = { buildStats, quizStats, typingStats };
