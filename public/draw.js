/* Draw & Guess client (skribbl style): canvas, tools, guessing chat. Wired into the room by app.js (wireDraw / drawDrawUI). */
const DRAW_COLORS = ['#000000', '#7f7f7f', '#ffffff', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1', '#1e88e5', '#8e24aa', '#ec407a', '#795548'];
const DRAW_SIZES = [3, 8, 18];
const DRAW_W = 1280, DRAW_H = 800; // 16:10: a wide board; strokes are sent as 0..1 fractions, so every screen shows the same picture

function wireDraw() {
  R.d = { s: null, word: null, choices: null, strokes: [], chat: [], color: '#000000', size: 8, tool: 'pen', built: false, pending: [], strokeId: 0, drawing: false };
  R.dtick = setInterval(drawTick, 250);

  sock.on('draw:begin', (p) => { R.phase = 'draw'; R.pl = p.players; R.d.rounds = p.rounds; drawDrawUI(); });
  sock.on('draw:state', (s) => {
    const prev = R.d.s;
    R.d.s = s;
    if (!prev || prev.round !== s.round || prev.drawerId !== s.drawerId || s.phase === 'choosing') { R.d.word = null; R.d.myVote = 0; if (s.phase === 'choosing') R.d.choices = null; }
    const note = `${nm(s.drawerId)} is choosing a word…`;
    const lastMsg = R.d.chat[R.d.chat.length - 1];
    if (s.phase === 'choosing' && (!prev || prev.phase !== 'choosing') && !(lastMsg && lastMsg.text === note)) R.d.chat.push({ kind: 'system', text: note });
    R.phase = 'draw';
    drawDrawUI();
  });
  sock.on('draw:choices', ({ words }) => { R.d.choices = words; drawDrawUI(); });
  sock.on('draw:word', ({ word }) => { R.d.word = word; drawDrawUI(); });
  sock.on('draw:redraw', ({ strokes }) => { R.d.strokes = strokes.map((s) => ({ ...s, pts: s.pts ? [...s.pts] : undefined })); repaint(); });
  sock.on('draw:seg', (seg) => addSeg(seg));
  sock.on('draw:fill', (f) => { R.d.strokes.push({ ...f }); const c = dCanvas(); if (c) floodFill(c.getContext('2d'), f.x, f.y, f.c); });
  sock.on('draw:emote', ({ id, e }) => floatEmote(id, e));
  sock.on('draw:players', ({ players }) => { R.pl = players; R.d.menuFor = null; if (R.d.s) drawPlayers(); }); // somebody was removed
  sock.on('draw:kicked', ({ how }) => { toast(how === 'vote' ? 'The other players voted you out of the game' : 'The host removed you from the game'); location.hash = '#/'; });
  sock.on('draw:chat', (m) => {
    R.d.chat.push(m);
    if (R.d.chat.length > 80) R.d.chat.shift();
    drawChat();
  });
}

// Size the board to the space that is really there: as wide as the window allows, as tall as the height allows; the two side panels share whatever is left over
function fitBoard() {
  const main = document.querySelector('.draw-main');
  if (!main) return;
  if (window.innerWidth < 1000) { main.style.removeProperty('--cw'); return; }
  const tools = document.getElementById('dtools');
  const freeH = main.clientHeight - (tools ? tools.offsetHeight : 0) - 12;
  const maxW = Math.min(main.clientWidth - 250 - 300 - 28, main.clientWidth * 0.66); // the panels keep their minimum width, and the board never takes more than two thirds
  const cw = Math.max(360, Math.min(maxW, freeH * (DRAW_W / DRAW_H)));
  main.style.setProperty('--cw', Math.floor(cw) + 'px');
}
if (!window.__fitBoard) { window.__fitBoard = true; window.addEventListener('resize', () => { if (typeof fitBoard === 'function') fitBoard(); }); }

const dCanvas = () => document.getElementById('dcanvas');
const amDrawer = () => R && R.d && R.d.s && myPlayer() && R.d.s.drawerId === myPlayer().id;

/* ----- the picture ----- */
function paintStroke(ctx, st, from = 0) {
  ctx.strokeStyle = ctx.fillStyle = st.c;
  ctx.lineWidth = st.s;
  ctx.lineCap = ctx.lineJoin = 'round';
  const p = st.pts;
  if (p.length === 2) { ctx.beginPath(); ctx.arc(p[0] * DRAW_W, p[1] * DRAW_H, st.s / 2, 0, Math.PI * 2); ctx.fill(); return; }
  ctx.beginPath();
  ctx.moveTo(p[from] * DRAW_W, p[from + 1] * DRAW_H);
  for (let i = from + 2; i < p.length; i += 2) ctx.lineTo(p[i] * DRAW_W, p[i + 1] * DRAW_H);
  ctx.stroke();
}

function repaint() {
  const c = dCanvas();
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, DRAW_W, DRAW_H);
  for (const st of R.d.strokes) (st.fill ? floodFill(ctx, st.x, st.y, st.c) : paintStroke(ctx, st));
}

// Paint bucket: fills the area of similar colour around the point (every browser runs the same fill, so pictures match)
function floodFill(ctx, fx, fy, hex) {
  const W = DRAW_W, H = DRAW_H;
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const x0 = Math.min(W - 1, Math.floor(fx * W)), y0 = Math.min(H - 1, Math.floor(fy * H));
  const i0 = (y0 * W + x0) * 4;
  const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
  const nr = parseInt(hex.slice(1, 3), 16), ng = parseInt(hex.slice(3, 5), 16), nb = parseInt(hex.slice(5, 7), 16);
  if (tr === nr && tg === ng && tb === nb) return;
  const near = (i) => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) <= 90; // a little slack so soft line edges get covered
  const seen = new Uint8Array(W * H);
  const stack = [x0, y0];
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    let l = x;
    while (l >= 0 && !seen[y * W + l] && near((y * W + l) * 4)) l--;
    l++;
    let up = false, down = false;
    for (let xx = l; xx < W && !seen[y * W + xx] && near((y * W + xx) * 4); xx++) {
      const i = y * W + xx;
      seen[i] = 1;
      d[i * 4] = nr; d[i * 4 + 1] = ng; d[i * 4 + 2] = nb; d[i * 4 + 3] = 255;
      if (y > 0) { const ok = !seen[i - W] && near((i - W) * 4); if (ok && !up) { stack.push(xx, y - 1); up = true; } else if (!ok) up = false; }
      if (y < H - 1) { const ok = !seen[i + W] && near((i + W) * 4); if (ok && !down) { stack.push(xx, y + 1); down = true; } else if (!ok) down = false; }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function addSeg(seg) {
  const c = dCanvas();
  let st = R.d.strokes[R.d.strokes.length - 1];
  if (!st || st.id !== seg.id) { st = { id: seg.id, c: seg.c, s: seg.s, pts: [] }; R.d.strokes.push(st); }
  st.pts.push(...seg.pts);
  if (c) paintStroke(c.getContext('2d'), { c: st.c, s: st.s, pts: seg.pts }); // each batch starts where the previous one ended
}

/* ----- drawing with the mouse or a finger ----- */
function bindCanvas(c) {
  const d = R.d;
  const at = (e) => { const r = c.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  const flush = () => {
    d.flushT = null;
    if (!d.pending.length) return;
    const pts = d.pending.flat();
    d.pending = [d.pending[d.pending.length - 1]]; // the next batch starts where this one ended, so the line stays connected
    if (pts.length >= 2) sock.emit('draw:seg', { id: d.strokeId, c: d.cur.c, s: d.cur.s, pts: pts.map((v) => Math.round(v * 10000) / 10000) });
  };
  c.onpointerdown = (e) => {
    if (!amDrawer() || R.d.s.phase !== 'drawing') return;
    e.preventDefault();
    const fillAt = d.tool === 'fill' ? at(e) : null;
    if (fillAt) { // paint bucket: one click, no dragging
      const f = { id: (Date.now() % 1000000000) + Math.floor(Math.random() * 1000), x: Math.round(fillAt[0] * 10000) / 10000, y: Math.round(fillAt[1] * 10000) / 10000, c: d.color };
      R.d.strokes.push({ ...f, fill: true });
      floodFill(c.getContext('2d'), f.x, f.y, f.c);
      sock.emit('draw:fill', f);
      return;
    }
    c.setPointerCapture(e.pointerId);
    d.drawing = true;
    d.strokeId = (Date.now() % 1000000000) + Math.floor(Math.random() * 1000);
    d.cur = { c: d.tool === 'eraser' ? '#ffffff' : d.color, s: d.tool === 'eraser' ? d.size * 2 : d.size, id: d.strokeId, pts: [] };
    R.d.strokes.push(d.cur);
    const p = at(e);
    d.pending = [p];
    d.cur.pts.push(...p);
    paintStroke(c.getContext('2d'), d.cur);
    if (!d.flushT) d.flushT = setTimeout(flush, 40);
  };
  c.onpointermove = (e) => {
    if (!d.drawing) return;
    const p = at(e);
    d.pending.push(p);
    d.cur.pts.push(...p);
    paintStroke(c.getContext('2d'), d.cur, Math.max(0, d.cur.pts.length - 4));
    if (!d.flushT) d.flushT = setTimeout(flush, 40);
  };
  const up = () => { if (!d.drawing) return; d.drawing = false; clearTimeout(d.flushT); flush(); d.pending = []; };
  c.onpointerup = c.onpointercancel = up;
}

/* ----- the screen ----- */
const hintHtml = (hint) => (hint && hint.length ? hint.map((ch) => (ch === ' ' ? '<span class="hgap"></span>' : `<span class="hl">${ch === null ? '' : esc(ch)}</span>`)).join('') : '');

function buildDrawShell() {
  app.innerHTML = `<div class="draw">
    <div class="card draw-top"><div class="dleft"><span id="dround" class="muted small"></span><span id="dwho" class="dwho"></span></div><div id="dhint" class="dhint"></div><span id="dtimer" class="dtimer"></span><button class="ghost fsbtn" id="dfs" title="Full screen" aria-label="Full screen">⛶</button><div class="tbar"><div id="dbar"></div></div></div>
    <div class="draw-main">
      <div class="card draw-players" id="dplayers"></div>
      <div class="draw-center"><div class="canvas-wrap"><canvas id="dcanvas" width="${DRAW_W}" height="${DRAW_H}"></canvas><div id="doverlay" class="doverlay"></div><div id="dlike" class="dlike dlike-corner"></div></div><div id="dtools" class="dtools"></div></div>
      <div class="card draw-chat"><div id="dchat" class="dchat"></div><button class="ghost emotoggle" id="demotetoggle" type="button"></button><div class="demotes" id="demotes">${EMOTES.map((e) => `<button data-emote="${e}" aria-label="emote ${e}">${e}</button>`).join('')}</div><input id="dguess" maxlength="60" autocomplete="off" placeholder="Type your guess…"></div>
    </div></div>`;
  const c = dCanvas();
  bindCanvas(c);
  $('#dfs').onclick = () => { // real full screen (the browser chrome goes away); press again or Esc to leave
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  };
  $('#demotetoggle').onclick = () => { setEmotesHidden(!emotesHidden()); updateEmoteUi(); };
  updateEmoteUi();
  $('#demotes').onclick = (e) => { const b = e.target.closest('[data-emote]'); if (b) sock.emit('draw:emote', b.dataset.emote); };
  $('#dlike').onclick = (e) => { // 👍 / 👎 on the drawing (not for the drawer), one vote each, the last one counts
    const b = e.target.closest('[data-react]');
    if (!b || amDrawer()) return;
    R.d.myVote = Number(b.dataset.react);
    sock.emit('draw:react', R.d.myVote);
    drawLike(); // the buttons vanish right away
  };
  $('#dplayers').onclick = (e) => { // click a player: a small menu opens on their row (the buttons in it are the confirmation)
    const k = e.target.closest('[data-kick]'), v = e.target.closest('[data-vote]'), x = e.target.closest('[data-close]');
    if (k) { sock.emit('draw:kick', Number(k.dataset.kick)); R.d.menuFor = null; return drawPlayers(); }
    if (v) { sock.emit('draw:votekick', Number(v.dataset.vote)); R.d.menuFor = null; return drawPlayers(); }
    if (x) { R.d.menuFor = null; return drawPlayers(); }
    if (e.target.closest('.pmenu')) return;
    const row = e.target.closest('.player.clickable');
    R.d.menuFor = row && R.d.menuFor !== Number(row.dataset.pid) ? Number(row.dataset.pid) : null;
    drawPlayers();
  };
  $('#dguess').onkeydown = (e) => {
    if (e.key !== 'Enter' || !e.target.value.trim()) return;
    sock.emit('draw:guess', e.target.value);
    e.target.value = '';
  };
  $('#dtools').onclick = (e) => {
    const b = e.target.closest('[data-dc]');
    if (!b) return;
    const d = R.d;
    if (b.dataset.dc === 'color') { d.color = b.dataset.v; if (d.tool === 'eraser') d.tool = 'pen'; }
    else if (b.dataset.dc === 'size') d.size = Number(b.dataset.v);
    else if (['pen', 'fill', 'eraser'].includes(b.dataset.dc)) d.tool = b.dataset.dc; // one tool at a time: choosing one deselects the others
    else if (b.dataset.dc === 'undo') sock.emit('draw:undo');
    else if (b.dataset.dc === 'clear') sock.emit('draw:clear');
    drawTools();
  };
  $('#doverlay').onclick = (e) => {
    const w = e.target.closest('[data-word]');
    if (w) { sock.emit('draw:pick', w.dataset.word); R.d.choices = null; drawOverlay(); }
  };
  R.d.built = true;
  repaint();
}

function drawDrawUI() {
  if (!R || R.phase !== 'draw' || !R.d || !R.d.s) return;
  document.body.classList.add('draw-live');
  if (!dCanvas()) buildDrawShell();
  const s = R.d.s;
  const drawer = amDrawer();
  $('#dround').textContent = `Round ${Math.min(s.round, s.rounds)} of ${s.rounds}`;
  const hint = R.d.word ? [...R.d.word] : s.hint; // the word is only known to the drawer and to those who already guessed it
  $('#dhint').innerHTML = s.phase === 'choosing' ? '<span class="muted">choosing a word…</span>' : hintHtml(hint)
    + (s.phase !== 'reveal' ? `<span class="muted small hlen"> ${hint.filter((x) => x !== ' ').length} letters${drawer ? ' · you are drawing' : R.d.word && s.phase === 'drawing' ? ' · you got it!' : ''}</span>` : '');
  $('#dwho').textContent = s.phase === 'choosing' || s.phase === 'drawing' ? (drawer ? '✏️ You are drawing' : `✏️ ${nm(s.drawerId)} is drawing`) : '';
  drawPlayers();
  drawLike();
  drawOverlay();
  drawTools();
  drawChat();
  const g = $('#dguess');
  if (g) {
    g.disabled = s.phase !== 'drawing';
    g.placeholder = drawer ? 'Chat with the guessers…' : (s.guessed.includes(myPlayer() && myPlayer().id) ? 'You got it! Chat here…' : 'Type your guess…');
  }
  drawTick();
  fitBoard();
}

function drawPlayers() {
  const s = R.d.s, mine = myPlayer();
  const ids = Object.keys(R.pl).map(Number).sort((a, b) => a - b); // fixed order (join order), never re-sorted by score
  const rank = (id) => 1 + ids.filter((o) => (s.scores[o] || 0) > (s.scores[id] || 0)).length; // place by score, shown as a badge
  // every row has the same fixed slots (big picture, name + place + status icon, score) so nothing moves when an icon appears
  const mineLobby = R.lobby && R.lobby.players.find((p) => p.userId === me.id);
  const canKick = !!mine && !!R.lobby && R.lobby.hostId === me.id; // only the host removes directly, everybody else votes
  const hostPlayerId = R.lobby && (R.lobby.players.find((p) => p.userId === R.lobby.hostId) || {}).id;
  const need = Math.floor((Math.max(1, s.humans) - 1) / 2) + 1;
  const hint = !mine ? '' : canKick ? 'Click a player to remove them' : s.humans >= 3 ? 'Click a player to vote to remove them' : '';
  $('#dplayers').innerHTML = '<h3>Players</h3>' + (hint ? `<p class="muted small phint">${hint}</p>` : '') + ids.map((id) => {
    const target = R.pl[id], votes = (s.kickVotes && s.kickVotes[id]) || [];
    const can = !!mine && id !== mine.id && !(target && target.isBot); // click a player to open their menu (not yourself, not bots)
    let menu = '';
    if (can && R.d.menuFor === id) {
      const name = esc(nm(id));
      menu = canKick ? `<div class="pmenu"><span>Remove ${name} from the game?</span><span class="pm-b"><button class="danger" data-kick="${id}">🚫 Remove</button><button class="ghost" data-close>Cancel</button></span></div>`
        : id === hostPlayerId ? '<div class="pmenu"><span>The host cannot be voted out.</span><span class="pm-b"><button class="ghost" data-close>OK</button></span></div>'
        : s.humans < 3 ? '<div class="pmenu"><span>A vote needs at least 3 players. Only the host can remove someone now.</span><span class="pm-b"><button class="ghost" data-close>OK</button></span></div>'
        : `<div class="pmenu"><span>Vote to remove ${name}? (${votes.length}/${need})</span><span class="pm-b"><button data-vote="${id}" ${votes.includes(mine.id) ? 'disabled' : ''}>${votes.includes(mine.id) ? '🗳 Voted' : '🗳 Vote'}</button><button class="ghost" data-close>Cancel</button></span></div>`;
    }
    const act = menu + (can && votes.length && !canKick ? `<span class="pvote" title="Votes to remove ${esc(nm(id))}">🗳 ${votes.length}/${need}</span>` : '');
    const gain = s.phase === 'reveal' && s.gains && s.gains[id] ? `+${s.gains[id]}` : '';
    const status = id === s.drawerId ? '✏️' : s.guessed.includes(id) ? '<span class="ok">✔</span>' : '';
    return `<div class="player ${can ? 'clickable' : ''} ${mine && id === mine.id ? 'me' : ''} ${id === s.drawerId ? 'drawing' : ''} ${s.guessed.includes(id) ? 'guessed' : ''}" data-pid="${id}">${act}
      <span class="pa">${charOf(id, 'sm')}</span>
      <span class="pinfo"><span class="pnm" title="${esc(nm(id))}">${esc(nm(id))}</span><span class="psub"><span class="rk">#${rank(id)}</span><span class="pst">${status}</span></span></span>
      <span class="psc"><b>${s.scores[id] || 0}</b><i class="ok">${gain}</i></span></div>`;
  }).join('');
}

function drawOverlay() {
  const s = R.d.s, o = $('#doverlay');
  let html = '';
  if (s.phase === 'choosing') {
    html = amDrawer() ? `<h3>Pick a word to draw</h3><div class="row" style="justify-content:center">${(R.d.choices || []).map((w) => `<button data-word="${esc(w)}">${esc(w)}</button>`).join('') || '<span class="muted">…</span>'}</div>`
      : `<h3>${esc(nm(s.drawerId))} is choosing a word</h3>`;
  } else if (s.phase === 'reveal') {
    // end of the turn: every player with the points they got in this turn, the highest on top
    const rows = Object.keys(R.pl).map(Number).map((id) => ({ id, gain: (s.gains && s.gains[id]) || 0, total: s.scores[id] || 0 }))
      .sort((a, b) => b.gain - a.gain || b.total - a.total || a.id - b.id);
    html = `<h3>The word was <span class="ok">${esc(s.word)}</span></h3>
      <div class="rcard">${rows.map((r) => `<div class="rrow ${r.gain ? '' : 'zero'}"><span class="rpic">${charOf(r.id, 'sm')}</span><span class="rname">${esc(nm(r.id))}${r.id === s.drawerId ? ' ✏️' : ''}</span><span class="rgain">+${r.gain}</span></div>`).join('')}</div>`;
  }
  o.innerHTML = html;
  o.style.display = html ? 'flex' : 'none';
}

function drawTools() {
  const t = $('#dtools'), s = R.d.s, d = R.d;
  if (!(amDrawer() && s.phase === 'drawing')) { t.innerHTML = amDrawer() ? '' : '<span class="muted small">Watch the drawing and type your guess in the chat →</span>'; return; }
  t.innerHTML = `${DRAW_COLORS.map((c) => `<button class="swatch ${d.tool !== 'eraser' && d.color === c ? 'on' : ''}" data-dc="color" data-v="${c}" style="background:${c}" aria-label="colour ${c}"></button>`).join('')}
    <span class="sep"></span><button class="ghost tool ${d.tool === 'pen' ? 'on' : ''}" data-dc="pen" aria-pressed="${d.tool === 'pen'}" title="Pencil">✏️ Pencil</button><button class="ghost tool ${d.tool === 'fill' ? 'on' : ''}" data-dc="fill" aria-pressed="${d.tool === 'fill'}" title="Paint bucket">🪣 Bucket</button>
    <span class="sep"></span>${DRAW_SIZES.map((z) => `<button class="ghost sz ${d.size === z ? 'on' : ''}" data-dc="size" data-v="${z}"><i style="width:${z + 4}px;height:${z + 4}px"></i></button>`).join('')}
    <button class="ghost tool ${d.tool === 'eraser' ? 'on' : ''}" data-dc="eraser" aria-pressed="${d.tool === 'eraser'}">🧽 Eraser</button><button class="ghost" data-dc="undo">↩ Undo</button><button class="ghost" data-dc="clear">🗑 Clear</button>`;
}

function drawChat() {
  const el = $('#dchat');
  if (!el) return;
  el.innerHTML = R.d.chat.map((m) => (m.kind === 'correct' ? `<div class="cm ok"><b>${esc(m.name)}</b> guessed the word! 🎉</div>`
    : m.kind === 'close' ? '<div class="cm warn">So close! 🔥</div>'
    : m.kind === 'react' ? `<div class="cm react ${m.v > 0 ? 'up' : 'down'}"><b>${esc(m.name)}</b> ${m.v > 0 ? 'liked the drawing 👍' : 'disliked the drawing 👎'}</div>`
    : m.kind === 'system' ? `<div class="cm muted">${esc(m.text)}</div>`
    : `<div class="cm ${m.kind === 'private' ? 'priv' : ''}"><b>${esc(m.name)}:</b> ${esc(m.text)}</div>`)).join('');
  el.scrollTop = el.scrollHeight;
}

function drawTick() {
  const el = document.getElementById('dtimer');
  if (!el || !R || !R.d || !R.d.s) return;
  const left = Math.max(0, Math.ceil((R.d.s.endsAt - Date.now()) / 1000));
  el.textContent = R.d.s.phase === 'drawing' ? `⏱ ${left}s` : R.d.s.phase === 'choosing' ? `${left}s` : '';
  el.classList.toggle('low', R.d.s.phase === 'drawing' && left <= 10);
  const bar = document.getElementById('dbar');
  if (bar) {
    const total = R.d.s.phase === 'choosing' ? 15 : R.d.s.drawSeconds;
    const pct = ['drawing', 'choosing'].includes(R.d.s.phase) ? Math.max(0, Math.min(100, ((R.d.s.endsAt - Date.now()) / (total * 1000)) * 100)) : 0;
    bar.style.width = pct + '%';
    bar.className = pct < 20 ? 'low' : '';
  }
}

/* end of a Draw & Guess game: podium with the top three, like skribbl */
function podiumHtml(board, myId) {
  const slot = (rank, cls) => {
    const s = board[rank];
    if (!s) return `<div class="pod ${cls}"></div>`;
    return `<div class="pod ${cls}"><div class="pod-who">${rank === 0 ? '<div class="crown">👑</div>' : ''}${charOf(s.id, rank === 0 ? 'lg' : 'md', rank === 0 ? 'a-champion' : '')}
      <div class="pod-name">${esc(s.name)}</div><div class="pod-score">${s.score} pts</div></div><div class="pod-step"><span>${rank + 1}</span></div></div>`;
  };
  return `<div class="card podium-card"><h2 style="text-align:center">🏆 ${board[0] ? esc(board[0].name) + ' wins!' : 'Game over'}</h2><div class="podium">${slot(1, 'second')}${slot(0, 'first')}${slot(2, 'third')}</div>
    ${board.length > 3 ? `<div class="pgrid">${board.slice(3).map((s, i) => `<div class="pg ${s.id === myId ? 'me' : ''}"><span class="pg-rk">#${s.placement || i + 4}</span>${charOf(s.id, 'md')}<b class="pg-name" title="${esc(s.name)}">${esc(s.name)}</b><span class="pg-sc">${s.score} pts</span></div>`).join('')}</div>` : ''}</div>`;
}

/* ----- emotes, likes ----- */
const EMOTES = ['😂', '😮', '👏', '🔥', '❤️', '😡', '🤔', '😭', '🥳', '👀']; // the same list as the server (src/draw.js)

// hide emotes: the emote bar goes away and other people's emotes no longer float over the player list (remembered in this browser)
const emotesHidden = () => { if (typeof window.__emotesHidden === 'boolean') return window.__emotesHidden; try { return localStorage.getItem('qv_hide_emotes') === '1'; } catch { return false; } };
const setEmotesHidden = (v) => { try { localStorage.setItem('qv_hide_emotes', v ? '1' : '0'); } catch { /* private mode: the choice just lasts until the page closes */ } window.__emotesHidden = v; };
function updateEmoteUi() {
  const hidden = emotesHidden();
  const bar = document.getElementById('demotes'), btn = document.getElementById('demotetoggle');
  if (bar) bar.style.display = hidden ? 'none' : '';
  if (btn) { btn.textContent = hidden ? '🙂 Show emotes' : '🙈 Hide emotes'; btn.setAttribute('aria-pressed', hidden ? 'true' : 'false'); }
  if (hidden) document.querySelectorAll('.emofly').forEach((el) => el.remove());
}

// an emote floats up from the player's picture (drawn in its own layer so the player list redrawing does not remove it)
function floatEmote(id, e) {
  if (emotesHidden()) return; // the player chose not to see emotes
  const row = document.querySelector(`#dplayers .player[data-pid="${id}"] .pa`);
  if (!row) return;
  const r = row.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'emofly';
  el.textContent = e;
  Object.assign(el.style, { left: r.left + r.width / 2 - 16 + 'px', top: r.top + 'px' });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2100);
}

// 👍 / 👎 under the timer while a drawing is up and in the reveal; the drawer only sees the counts
function drawLike() {
  const el = document.getElementById('dlike');
  if (!el || !R.d.s) return;
  const s = R.d.s, show = s.phase === 'drawing' || s.phase === 'reveal';
  if (!show) { el.innerHTML = ''; return; }
  const mine = myPlayer(), drawer = amDrawer();
  const voted = !!R.d.myVote || !!(mine && s.voters && s.voters.includes(mine.id));
  if (drawer || voted || !mine) { el.innerHTML = ''; return; } // the drawer cannot vote, and after voting the buttons are gone for the rest of the turn
  const my = 0;
  el.classList.toggle('ro', drawer); // the drawer only sees the counts, and the buttons never get in the way of their pen
  el.innerHTML = `<button class="lk ${my === 1 ? 'on' : ''}" data-react="1" ${drawer ? 'disabled' : ''} title="Like this drawing">👍</button><button class="lk ${my === -1 ? 'on bad' : ''}" data-react="-1" ${drawer ? 'disabled' : ''} title="Dislike this drawing">👎</button>`;
}
