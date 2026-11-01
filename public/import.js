/* Reads quiz questions from spreadsheet rows (an array of arrays) for the quiz editor's Excel import.
 *
 * One question per row:  Question | Answer 1 | Answer 2 | Answer 3 | Answer 4 | Correct | Seconds
 *  - Correct can be 1-4, A-D, or the exact text of the right answer.
 *  - Seconds is optional (default 20, kept between 5 and 120).
 *  - A header row is optional. If it names its columns (Question, Answer 1.., Correct, Seconds) the columns may be in any order.
 *  - Answers 3 and 4 may be left empty (true/false questions).
 * Rows that cannot be used are returned in `problems` with the row number and the reason, never silently dropped.
 */
(function (root) {
  const clean = (v) => String(v == null ? '' : v).trim();

  const QUIZ_TEMPLATE = [
    ['Question', 'Answer 1', 'Answer 2', 'Answer 3', 'Answer 4', 'Correct', 'Seconds'],
    ['What is the capital of Nepal?', 'Pokhara', 'Kathmandu', 'Lalitpur', 'Biratnagar', 2, 20],
    ['The Nile flows through Cairo.', 'True', 'False', '', '', 'A', 15],
    ['Which gas do plants absorb from the air?', 'Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium', 'Carbon dioxide', 20],
  ];

  // Returns null when the first row is data, { fallback: true } for an unrecognised header, or a column map
  function detectHeader(row) {
    const h = row.map((c) => clean(c).toLowerCase());
    if (!h.some((c) => /question|answer|option|choice|correct/.test(c))) return null;
    const slots = [-1, -1, -1, -1];
    h.forEach((c, i) => {
      const m = c.match(/(?:answer|option|choice)\s*[#_-]?\s*([1-4a-d])\b/);
      if (m) slots['1234'.includes(m[1]) ? Number(m[1]) - 1 : m[1].charCodeAt(0) - 97] = i;
    });
    const question = h.findIndex((c) => /question/.test(c));
    if (question < 0 || slots.filter((i) => i >= 0).length < 2) return { fallback: true };
    return { question, answers: slots, correct: h.findIndex((c) => /correct|right/.test(c)), seconds: h.findIndex((c) => /second|time/.test(c)) };
  }

  function parseQuizRows(rows) {
    let map = { question: 0, answers: [1, 2, 3, 4], correct: 5, seconds: 6 };
    let first = 0;
    if (rows.length) {
      const header = detectHeader(rows[0] || []);
      if (header) { first = 1; if (!header.fallback) map = header; }
    }
    const questions = [];
    const problems = [];
    for (let r = first; r < rows.length; r++) {
      const row = rows[r] || [];
      const rowNo = r + 1;
      const get = (i) => (i >= 0 ? row[i] : '');
      const text = clean(get(map.question));
      const cells = map.answers.map((i) => clean(get(i)));
      if (!text && cells.every((c) => !c)) continue; // empty row
      if (!text) { problems.push({ row: rowNo, reason: 'no question text' }); continue; }
      if (cells.filter(Boolean).length < 2) { problems.push({ row: rowNo, reason: 'needs at least 2 answers' }); continue; }
      const raw = clean(get(map.correct));
      if (!raw) { problems.push({ row: rowNo, reason: 'no correct answer given' }); continue; }
      let idx = -1;
      if (raw.length > 1) idx = cells.findIndex((c) => c && c.toLowerCase() === raw.toLowerCase());
      if (idx < 0 && /^[1-4]$/.test(raw)) idx = Number(raw) - 1;
      else if (idx < 0 && /^[a-dA-D]$/.test(raw)) idx = raw.toLowerCase().charCodeAt(0) - 97;
      else if (idx < 0) idx = cells.findIndex((c) => c && c.toLowerCase() === raw.toLowerCase());
      if (idx < 0 || idx > 3 || !cells[idx]) { problems.push({ row: rowNo, reason: `the correct answer "${raw}" is not one of the answers` }); continue; }
      let secs = Number(clean(get(map.seconds)));
      if (!Number.isFinite(secs) || secs <= 0) secs = 20;
      secs = Math.min(120, Math.max(5, Math.round(secs)));
      questions.push({ text: text.slice(0, 500), options: cells.map((c) => c.slice(0, 150)), correct_index: idx, time_limit: secs });
    }
    return { questions, problems };
  }

  root.parseQuizRows = parseQuizRows;
  root.QUIZ_TEMPLATE = QUIZ_TEMPLATE;
  if (typeof module !== 'undefined' && module.exports) module.exports = { parseQuizRows, QUIZ_TEMPLATE };
})(typeof window !== 'undefined' ? window : globalThis);
