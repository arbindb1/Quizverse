/* Quizverse single-page client (hash routing, no build step) */
const app = document.getElementById('app');
const navEl = document.getElementById('nav');
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let token = localStorage.getItem('qv_token');
let me = JSON.parse(localStorage.getItem('qv_user') || 'null');

/* ---------------- optional media made in Google Flow (see docs/flow-media-guide.md) ----------------
 * Every file is optional: the app asks the server which ones exist and falls back to the plain look for the rest. */
const MEDIA = { hero: '/media/hero.mp4', vs: '/media/vs-intro.mp4', vsFinal: '/media/vs-final.mp4', champion: '/media/champion.mp4' };
const have = { videos: {}, avatars: {}, skins: {}, clips: {}, posters: {} }; // filled from /api/media: which optional files exist
let SKINS = []; // characters, loaded from /api/skins
let soundOn = localStorage.getItem('qv_sound') === '1';
async function probeMedia() {
  await Promise.all([
    fetch('/api/media').then((r) => r.json()).then((m) => {
      have.videos = m.videos || {};
      have.avatars = m.bots || {};
      have.skins = m.skins || {};
      have.clips = m.clips || {};
      have.posters = m.posters || {};
    }).catch(() => {}),
    fetch('/api/skins').then((r) => r.json()).then((list) => { SKINS = list; }).catch(() => {}),
  ]);
}
const videoHtml = (key, loop = true, extra = '') => (have.videos[key]
  ? `<video class="bgvid ${extra}" src="${MEDIA[key]}" autoplay muted ${loop ? 'loop' : ''} playsinline preload="auto"></video>` : '');
function mountVideos() {
  document.querySelectorAll('video.bgvid, video.ch-clip').forEach((v) => {
    v.muted = !soundOn;
    const p = v.play();
    if (p) p.catch(() => { v.muted = true; v.play().catch(() => {}); }); // browsers may refuse sound before a click
  });
}
const botAvatar = (name) => {
  const base = String(name).replace(/ \d+$/, '').toLowerCase();
  return have.avatars[base] ? `/media/bots/${have.avatars[base]}` : null;
};

function toast(msg, ok) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = ok ? 'ok' : '';
  t.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.style.display = 'none'), 3500);
}

async function api(method, url, body) {
  const res = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if ((res.status === 401 || (res.status === 403 && /suspended/i.test(data.error || ''))) && token) { logout(); sessionStorage.setItem('qv_notice', data.error || ''); }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function setSession(data) {
  token = data.token;
  me = data.user;
  localStorage.setItem('qv_token', token);
  localStorage.setItem('qv_user', JSON.stringify(me));
}

function logout() {
  const wasGuest = me && me.guest;
  token = null;
  me = null;
  localStorage.removeItem('qv_token');
  localStorage.removeItem('qv_user');
  location.hash = wasGuest ? '#/skribbl' : '#/login';
}

function renderNav() {
  navEl.innerHTML = `<a class="brand" href="#/">Quiz<span>verse</span></a>` + (me && me.guest
    ? `<a href="#/">Home</a><span class="muted small">${esc(me.username)} (guest)</span><a href="#" id="logout">Leave</a>`
    : me
    ? `<a href="#/">Home</a><a href="#/quizzes">Quizzes</a><a href="#/new-room">New tournament</a><a href="#/locker">Locker</a><a href="#/stats">Analytics</a>${me.isAdmin ? '<a href="#/admin">Admin</a>' : ''}
       <span class="muted small">${esc(me.username)}</span><a href="#" id="logout">Log out</a>`
    : '') + `<a href="#" id="snd" title="Sound for videos">${soundOn ? '🔊' : '🔇'}</a>`;
  const l = $('#logout');
  if (l) l.onclick = (e) => { e.preventDefault(); logout(); };
  $('#snd').onclick = (e) => {
    e.preventDefault();
    soundOn = !soundOn;
    localStorage.setItem('qv_sound', soundOn ? '1' : '0');
    $('#snd').textContent = soundOn ? '🔊' : '🔇';
    mountVideos();
  };
}

/* ---------------- router ---------------- */
async function route() {
  cleanupRoom();
  const hv = document.getElementById('herovid');
  if (hv) hv.remove();
  const [, page = '', arg] = location.hash.slice(1).split('/');
  document.body.classList.remove('skr', 'draw-live');
  if (!token && !['login', 'skribbl', 'play'].includes(page)) {
    if (page === 'join') sessionStorage.setItem('qv_next', location.hash);
    location.hash = '#/login';
    return;
  }
  if (me && me.guest && !['', 'room', 'play', 'customize'].includes(page)) { location.hash = '#/'; return; } // guests only have the Skribbl side
  renderNav();
  track(page);
  refreshMe();
  try {
    if (page === 'login') return viewLogin();
    if (page === 'skribbl') return me ? (location.hash = '#/') : await viewSkribbl();
    if (page === 'play') return await viewPlay(arg);
    if (page === 'customize') return await viewCustomize();
    if (me && me.guest && page === '') return await viewGuestHome();
    if (page === 'admin') return await viewAdmin(arg);
    if (page === 'quizzes') return await viewQuizzes();
    if (page === 'locker') return await viewLocker();
    if (page === 'stats') return await viewStats();
    if (page === 'quiz') return await viewQuizEdit(arg);
    if (page === 'new-room') return await viewNewRoom(arg);
    if (page === 'join') return await viewJoin(decodeURIComponent(arg || ''));
    if (page === 'room') return viewRoom(String(arg || '').toUpperCase());
    return await viewHome();
  } catch (e) {
    app.innerHTML = `<div class="card"><h2>Oops</h2><p class="muted">${esc(e.message)}</p><a class="btn" href="#/">Go home</a></div>`;
  }
}
window.addEventListener('hashchange', route);

/* anonymous page-view counter for the admin's analytics (no cookies; random id kept in this browser) */
function track(page) {
  try {
    let vid = localStorage.getItem('qv_vid');
    if (!vid) { vid = crypto.randomUUID(); localStorage.setItem('qv_vid', vid); }
    fetch('/api/track', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify({ vid, page: page || 'home', ref: document.referrer || '' }),
    }).catch(() => {});
  } catch { /* tracking must never break the app */ }
}

// admin rights are decided by the server; keep the Admin link in step if they change while someone is logged in
let meChecked = 0;
function refreshMe() {
  if (!token || Date.now() - meChecked < 60000) return;
  meChecked = Date.now();
  api('GET', '/me').then((d) => {
    if (!me || d.user.isAdmin === !!me.isAdmin) return;
    me = { ...me, ...d.user };
    localStorage.setItem('qv_user', JSON.stringify(me));
    renderNav();
  }).catch(() => {});
}

/* ---------------- login / register ---------------- */
function viewLogin() {
  renderNav();
  if (have.videos.hero) {
    document.body.insertAdjacentHTML('afterbegin', `<div id="herovid">${videoHtml('hero', true, 'herovid')}</div>`);
    mountVideos();
  }
  app.innerHTML = `${authTabs('login')}<div class="card auth"><h2>Welcome to Quizverse</h2>
    <p class="muted">Create quizzes, host tournaments, challenge friends or the bot.</p>
    <div class="err" id="notice">${esc(sessionStorage.getItem('qv_notice') || '')}</div>
    <label id="ul">Username or email</label><input id="u" autocomplete="username">
    <div id="emailrow" style="display:none"><label>Email</label><input id="e" type="email" autocomplete="email" placeholder="you@example.com"></div>
    <label>Password</label><input id="p" type="password" autocomplete="current-password">
    <div class="err" id="err"></div>
    <div class="row"><button id="login">Log in</button><button class="ghost" id="reg">Create account</button></div></div>`;
  sessionStorage.removeItem('qv_notice');
  let creating = false;
  const go = async (kind) => {
    try {
      const body = { username: $('#u').value, password: $('#p').value };
      if (kind === 'register') body.email = $('#e').value;
      setSession(await api('POST', '/auth/' + kind, body));
      const next = sessionStorage.getItem('qv_next');
      sessionStorage.removeItem('qv_next');
      location.hash = next || '#/';
    } catch (e) { $('#err').textContent = e.message; }
  };
  $('#login').onclick = () => go('login');
  $('#reg').onclick = () => {
    if (!creating) { // first click opens the sign-up form (adds the email box), second click creates the account
      creating = true;
      $('#emailrow').style.display = '';
      $('#ul').textContent = 'Username';
      $('#p').autocomplete = 'new-password';
      $('#err').textContent = 'Choose a username, enter your email and a password, then press Create account.';
      $('#login').textContent = 'Back to log in';
      $('#login').onclick = () => { creating = false; viewLogin(); };
      return;
    }
    go('register');
  };
  $('#p').onkeydown = (e) => { if (e.key === 'Enter') go(creating ? 'register' : 'login'); };
}

/* ---------------- home ---------------- */
async function viewHome() {
  const [rooms, profile] = await Promise.all([api('GET', '/rooms/mine'), api('GET', '/profile').catch(() => null)]);
  app.innerHTML = `
    <div class="card"><div class="row">${charHtml({ skin: profile ? profile.skin : 'rookie', look: profile && profile.look }, 'lg', 'a-idle')}<div><h2 style="margin:0">Hi ${esc(me.username)} 👋</h2>${profile ? `<div class="muted small">Level ${profile.level} · ${profile.xp} XP · <a href="#/locker">Change character</a></div>` : ''}</div></div><div style="height:12px"></div>
      <div class="row"><a class="btn" href="#/new-room">Host a tournament</a><a class="btn ghost" href="#/quiz/new">Create a quiz</a></div></div>
    <div class="card"><h3>Join with an invite code</h3>
      <div class="row"><input class="grow" id="code" placeholder="Code or invite link, e.g. K7P2QX" maxlength="120"><button id="join">Join</button></div></div>
    <div class="card"><h3>Your tournaments</h3>
      ${rooms.length ? rooms.map((r) => `<div class="list-item"><div><a href="#/room/${r.code}"><b>${esc(r.name)}</b></a>
        <div class="muted small">${r.is_host ? 'Hosting' : 'Playing'} · ${r.players}/${r.max_players} players · code ${r.code}</div></div>
        <span class="pill ${r.status}">${r.status}</span></div>`).join('') : '<p class="muted">Nothing yet. Host one or join with a link.</p>'}</div>`;
  mountVideos();
  $('#join').onclick = async () => {
    let key = $('#code').value.trim();
    key = key.split('/').pop().replace(/^#?\/?join\//, '');
    try { location.hash = '#/room/' + (await api('POST', '/rooms/join', { token: key })).code; }
    catch (e) { toast(e.message); }
  };
}

/* ---------------- quizzes & categories ---------------- */
async function viewQuizzes() {
  const [mine, pub, cats] = await Promise.all([api('GET', '/quizzes?scope=mine'), api('GET', '/quizzes'), api('GET', '/categories')]);
  const others = pub.filter((q) => q.owner_id !== me.id);
  const item = (q, own) => `<div class="list-item"><div><b>${esc(q.title)}</b> ${q.is_public ? '' : '<span class="pill">private</span>'}
      <div class="muted small">${esc(q.category || 'No category')} · ${q.question_count} questions${own ? '' : ' · by ' + esc(q.owner)}</div></div>
      <div class="row">${q.question_count ? `<a class="btn green" href="#/new-room/${q.id}">Host</a>` : ''}
      ${own ? `<a class="btn ghost" href="#/quiz/${q.id}">Edit</a><button class="danger" data-del="${q.id}">Delete</button>` : ''}</div></div>`;
  app.innerHTML = `
    <div class="card"><div class="row between"><h2>My quizzes</h2><a class="btn" href="#/quiz/new">+ New quiz</a></div>
      ${mine.length ? mine.map((q) => item(q, true)).join('') : '<p class="muted">You have not created any quizzes yet.</p>'}</div>
    <div class="card"><h3>Categories</h3>
      <div class="row" style="margin-bottom:12px">${cats.map((c) => `<span class="pill">${esc(c.name)}</span>`).join('') || '<span class="muted">None yet</span>'}</div>
      <div class="row"><input class="grow" id="cat" placeholder="New category name" maxlength="50"><button id="addcat">Add category</button></div></div>
    <div class="card"><h2>Public quizzes</h2>${others.length ? others.map((q) => item(q, false)).join('') : '<p class="muted">No public quizzes from others yet.</p>'}</div>`;
  $('#addcat').onclick = async () => {
    try { await api('POST', '/categories', { name: $('#cat').value }); toast('Category added', true); viewQuizzes(); }
    catch (e) { toast(e.message); }
  };
  app.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    if (!confirm('Delete this quiz and any tournaments that used it?')) return;
    try { await api('DELETE', '/quizzes/' + b.dataset.del); viewQuizzes(); } catch (e) { toast(e.message); }
  }));
}

const blankQuestion = () => ({ text: '', options: ['', '', '', ''], correct_index: 0, time_limit: 20 });

/* ---- Excel import for the quiz editor ---- */
let xlsxPromise = null;
const loadXlsx = () => (window.XLSX ? Promise.resolve(window.XLSX) : (xlsxPromise = xlsxPromise || new Promise((ok, fail) => {
  const s = document.createElement('script');
  s.src = '/vendor/xlsx.js';
  s.onload = () => ok(window.XLSX);
  s.onerror = () => fail(new Error('Could not load the spreadsheet reader'));
  document.head.appendChild(s);
})));

async function downloadQuizTemplate() {
  const X = await loadXlsx();
  const ws = X.utils.aoa_to_sheet(QUIZ_TEMPLATE);
  ws['!cols'] = [{ wch: 44 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, ws, 'Quiz');
  X.writeFile(wb, 'quizverse-quiz-template.xlsx');
}

async function viewQuizEdit(id) {
  const cats = await api('GET', '/categories');
  let draft = { title: '', description: '', category_id: '', is_public: true, questions: [blankQuestion()] };
  if (id && id !== 'new') {
    const q = await api('GET', '/quizzes/' + id);
    draft = {
      title: q.title, description: q.description, category_id: q.category_id || '', is_public: !!q.is_public,
      questions: q.questions.map((x) => ({ ...x, options: [...x.options, '', '', ''].slice(0, 4) })),
    };
  }
  let importNote = '';
  // read the first sheet of an .xlsx/.xls/.csv file and add its questions to the editor (the user reviews them before saving)
  const importExcel = async (file) => {
    const X = await loadXlsx();
    const wb = X.read(await file.arrayBuffer(), { type: 'array' });
    const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
    const { questions, problems } = parseQuizRows(rows);
    const list = problems.slice(0, 10).map((p) => `<li>Row ${p.row}: ${esc(p.reason)}</li>`).join('') + (problems.length > 10 ? `<li>…and ${problems.length - 10} more</li>` : '');
    if (!questions.length) {
      importNote = `<div class="import-warn"><b>No questions were imported from "${esc(file.name)}".</b>${list ? `<ul>${list}</ul>` : ' The sheet looks empty.'}</div>`;
    } else {
      const blank = draft.questions.length === 1 && !draft.questions[0].text.trim() && draft.questions[0].options.every((o) => !o.trim());
      const room = 50 - (blank ? 0 : draft.questions.length);
      const take = questions.slice(0, room);
      draft.questions = (blank ? [] : draft.questions).concat(take);
      importNote = `<div class="import-ok">✅ Imported ${take.length} question${take.length === 1 ? '' : 's'} from "${esc(file.name)}". Check them below, then press Save.${questions.length > take.length ? ` (A quiz holds at most 50 questions, ${questions.length - take.length} were left out.)` : ''}</div>${list ? `<div class="import-warn">Skipped rows:<ul>${list}</ul></div>` : ''}`;
    }
    draw();
  };
  const draw = () => {
    app.innerHTML = `<div class="card"><h2>${id && id !== 'new' ? 'Edit quiz' : 'Create quiz'}</h2>
      <label>Title</label><input data-f="title" maxlength="120" value="${esc(draft.title)}">
      <label>Description (optional)</label><textarea data-f="description" rows="2" maxlength="500">${esc(draft.description)}</textarea>
      <label>Category</label>
      <div class="row"><select class="grow" data-f="category_id"><option value="">No category</option>
        ${cats.map((c) => `<option value="${c.id}" ${String(c.id) === String(draft.category_id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <input class="grow" id="newcat" placeholder="or create a new category" maxlength="50"><button class="ghost" id="addcat">Add</button></div>
      <label class="check"><input type="checkbox" data-f="is_public" ${draft.is_public ? 'checked' : ''}> Public (others can host tournaments with this quiz)</label></div>
      <div class="card"><h3>📥 Import questions from Excel</h3>
        <p class="muted small">Upload a .xlsx, .xls or .csv file with one question per row: <b>Question | Answer 1 | Answer 2 | Answer 3 | Answer 4 | Correct | Seconds</b>. Correct can be 1–4, A–D or the exact answer text; Seconds is optional; leave answers 3 and 4 empty for true/false. You can check everything before saving.</p>
        <div class="row"><input type="file" id="xlfile" accept=".xlsx,.xls,.csv" style="max-width:340px"><button class="ghost" id="xltemplate">Download template</button></div>${importNote}</div>
      ${draft.questions.map((q, i) => `<div class="q-card"><div class="row between"><b>Question ${i + 1}</b>
        ${draft.questions.length > 1 ? `<button class="danger" data-rm="${i}">Remove</button>` : ''}</div>
        <input data-q="${i}" data-k="text" placeholder="Question text" maxlength="500" value="${esc(q.text)}">
        ${q.options.map((o, j) => `<div class="opt-row"><input type="radio" name="c${i}" data-q="${i}" data-k="correct" value="${j}" ${q.correct_index === j ? 'checked' : ''} title="Correct answer">
          <input data-q="${i}" data-o="${j}" placeholder="Answer ${j + 1}${j > 1 ? ' (optional)' : ''}" maxlength="150" value="${esc(o)}"></div>`).join('')}
        <label>Seconds to answer</label><input type="number" min="5" max="120" data-q="${i}" data-k="time_limit" value="${q.time_limit}" style="max-width:120px"></div>`).join('')}
      <div class="row"><button class="ghost" id="addq">+ Add question</button><button id="save">Save quiz</button></div>
      <p class="muted small">Select the radio button next to the correct answer. Leave answers 3 and 4 blank for true/false style questions.</p>`;
  };
  draw();
  const onField = (e) => {
    const t = e.target;
    if (t.dataset.f) draft[t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value;
    else if (t.dataset.o !== undefined) draft.questions[t.dataset.q].options[t.dataset.o] = t.value;
    else if (t.dataset.k === 'correct') draft.questions[t.dataset.q].correct_index = Number(t.value);
    else if (t.dataset.k) draft.questions[t.dataset.q][t.dataset.k] = t.dataset.k === 'time_limit' ? Number(t.value) : t.value;
  };
  app.oninput = onField;
  app.onchange = (e) => {
    if (e.target.id === 'xlfile') {
      if (e.target.files[0]) importExcel(e.target.files[0]).catch((err) => toast(err.message));
      return;
    }
    onField(e);
  };
  app.onclick = async (e) => {
    const t = e.target;
    try {
      if (t.id === 'xltemplate') await downloadQuizTemplate();
      else if (t.id === 'addq') { draft.questions.push(blankQuestion()); draw(); }
      else if (t.dataset.rm !== undefined) { draft.questions.splice(Number(t.dataset.rm), 1); draw(); }
      else if (t.id === 'addcat') {
        const c = await api('POST', '/categories', { name: $('#newcat').value });
        if (!cats.some((x) => x.id === c.id)) cats.push(c);
        draft.category_id = c.id;
        draw();
      } else if (t.id === 'save') {
        const questions = draft.questions.map((q, i) => {
          const options = [];
          let correct = -1;
          q.options.forEach((o, j) => { if (o.trim()) { if (j === q.correct_index) correct = options.length; options.push(o.trim()); } });
          if (correct < 0) throw new Error(`Question ${i + 1}: the correct answer can't be blank`);
          return { text: q.text, options, correct_index: correct, time_limit: q.time_limit };
        });
        const body = { ...draft, questions, category_id: draft.category_id || null };
        const r = id && id !== 'new' ? await api('PUT', '/quizzes/' + id, body) : await api('POST', '/quizzes', body);
        toast('Quiz saved', true);
        location.hash = '#/quizzes';
        return r;
      }
    } catch (err) { toast(err.message); }
  };
}

/* ---------------- locker: characters and progress ---------------- */
async function viewLocker() {
  const p = await api('GET', '/profile');
  const cur = skinInfo(p.skin);
  const pct = Math.max(0, Math.min(100, Math.round(((p.xp - p.levelXp) / (p.nextXp - p.levelXp)) * 100)));
  app.innerHTML = `<div class="card"><div class="row">${charHtml({ skin: p.skin, look: p.look }, 'xl', 'a-idle')}
    <div class="grow"><h2 style="margin:0">${esc(me.username)}</h2><div class="muted">${esc(cur.name)} · Level ${p.level}</div>
    <div class="xpbar"><div style="width:${pct}%"></div></div>
    <div class="muted small">${p.xp} XP · ${p.nextXp - p.xp} XP to level ${p.level + 1}</div>
    <div class="muted small">🏆 ${p.wins} tournament win${p.wins === 1 ? '' : 's'} · 🎮 ${p.tournaments} tournament${p.tournaments === 1 ? '' : 's'} played</div></div></div></div>
    <div class="card"><h3>Characters</h3>
    <p class="muted small">Your chosen character shows up in tournaments and animates on the VS screen, during matches and when you win. Earn XP by playing and winning matches, and unlock more by levelling up and winning tournaments. Rooms where you are the only human (the rest bots) give practice XP only.</p>
    <div class="skin-grid">${p.skins.map((s) => `<div class="skin ${s.unlocked ? '' : 'locked'} ${s.id === p.skin ? 'on' : ''}">
      <div class="skin-art">${charHtml({ skin: s.id, look: s.id === 'custom' ? p.look : null }, 'lg', s.unlocked ? 'a-hover' : '')}${s.unlocked ? '' : '<span class="lock">🔒</span>'}</div>
      <b>${esc(s.name)}</b>
      <div class="muted small">${s.unlocked ? (s.free ? 'Free' : 'Unlocked') : `${esc(s.requirement)} (${s.have}/${s.need})`}</div>
      ${s.id === 'custom' ? `<button data-customize>${p.look ? '✏️ Edit' : '✨ Create'}</button>${p.look && s.id !== p.skin ? `<button class="ghost" data-skin="custom">Select</button>` : ''}` : s.unlocked ? `<button data-skin="${s.id}" ${s.id === p.skin ? 'disabled' : ''}>${s.id === p.skin ? 'Selected' : 'Select'}</button>` : ''}</div>`).join('')}</div></div>`;
  mountVideos();
  app.onclick = async (e) => {
    if (e.target.closest('[data-customize]')) { location.hash = '#/customize'; return; }
    const b = e.target.closest('[data-skin]');
    if (!b) return;
    try { await api('POST', '/profile/skin', { skin: b.dataset.skin }); toast('Character selected', true); viewLocker(); }
    catch (err) { toast(err.message); }
  };
}

/* ---------------- analytics ---------------- */
const tile = (label, value, sub = '') => `<div class="tile"><div class="tile-v">${value}</div><div class="tile-l">${label}</div>${sub ? `<div class="tile-s">${sub}</div>` : ''}</div>`;
const fmtDate = (d) => { const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
const niceMax = (m) => [8, 20, 40, 60, 80, 100, 120, 160, 200, 240, 320, 400].find((v) => v >= m * 1.05) || Math.ceil((m * 1.05) / 80) * 80;

// A simple line chart drawn as SVG: values over time, optional dashed average line, tooltips on the dots
function lineChart(values, { unit = '', avg = null, max = null, titles = [], from = '', to = '' } = {}) {
  if (!values.length) return '<p class="muted">Nothing to chart yet.</p>';
  const W = 640, H = 230, L = 48, R = 14, T = 14, B = 28;
  const top = max || niceMax(Math.max(...values, avg || 0));
  const x = (i) => (values.length === 1 ? (L + W - R) / 2 : L + (i / (values.length - 1)) * (W - L - R));
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${L}" x2="${W - R}" y1="${y(top * f)}" y2="${y(top * f)}" class="grid"/><text x="${L - 6}" y="${y(top * f) + 4}" text-anchor="end" class="axis">${Math.round(top * f)}${unit}</text>`).join('');
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const dots = values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4.5" class="dot"><title>${esc(titles[i] || v + unit)}</title></circle>`).join('');
  const avgLine = avg ? `<line x1="${L}" x2="${W - R}" y1="${y(avg)}" y2="${y(avg)}" class="avgline"/><text x="${W - R}" y="${y(avg) - 6}" text-anchor="end" class="axis avgtext">average ${Math.round(avg)}${unit}</text>` : '';
  const xs = `<text x="${L}" y="${H - 6}" class="axis">${esc(from)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" class="axis">${esc(to)}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${grid}${avgLine}<polyline points="${line}" class="series"/>${dots}${xs}</svg>`;
}

const categoryBars = (rows) => rows.map((c) => `<div class="bar-row"><div class="bar-label" title="${esc(c.category)}">${esc(c.category)}</div>
  <div class="bar-track"><div class="bar-fill ${c.accuracy >= 70 ? 'good' : c.accuracy >= 45 ? 'mid' : 'low'}" style="width:${Math.max(c.accuracy, 2)}%"></div></div>
  <div class="bar-val">${c.accuracy}% <span class="muted small">${c.correct}/${c.asked}</span></div></div>`).join('');

function quizStatsHtml(q) {
  if (!q.asked) return '<div class="card"><p class="muted">No quiz answers yet. Play a quiz tournament and your strengths show up here.</p></div>';
  const best = q.best ? `<p>🌟 You <b>excel at ${esc(q.best.category)}</b>: ${q.best.accuracy}% right (${q.best.correct} of ${q.best.asked}).</p>`
    : '<p class="muted">Answer at least 3 questions in a category to see where you excel.</p>';
  const worst = q.worst ? `<p>🎯 <b>Practice ${esc(q.worst.category)}</b>: only ${q.worst.accuracy}% right (${q.worst.correct} of ${q.worst.asked}).</p>` : '';
  return `<div class="tiles">${tile('Accuracy', q.accuracy + '%', `${q.correct} of ${q.asked} answers right`)}${tile('Average answer time', (q.avgTimeMs / 1000).toFixed(1) + 's')}
      ${tile('Tournaments played', q.tournaments, `${q.wins} won`)}${tile('Match win rate', q.matches ? q.matchWinRate + '%' : '–', `${q.matchWins} of ${q.matches} matches`)}</div>
    <div class="card"><h3>Where you excel</h3>${best}${worst}</div>
    <div class="card"><h3>Accuracy by category</h3>${categoryBars(q.byCategory)}</div>
    <div class="card"><h3>Accuracy per tournament</h3>${lineChart(q.series.map((p) => p.accuracy), { unit: '%', max: 100, avg: q.accuracy,
      titles: q.series.map((p) => `Tournament ${p.n}: ${p.accuracy}% (${p.asked} questions) ${fmtDate(p.date)}`), from: q.series[0] ? fmtDate(q.series[0].date) : '', to: q.series.length > 1 ? fmtDate(q.series[q.series.length - 1].date) : '' })}</div>`;
}

function typingStatsHtml(t) {
  if (!t.races) return '<div class="card"><p class="muted">No typing races yet. Play a typing race tournament and your speed shows up here.</p></div>';
  const trend = t.trend == null ? 'play more races for a trend' : `${t.trend >= 0 ? '▲' : '▼'} ${Math.abs(t.trend)} vs the 10 races before`;
  return `<div class="tiles">${tile('Average speed', t.avgWpm + ' WPM')}${tile('Best speed', t.bestWpm + ' WPM')}${tile('Last 10 races', t.last10Wpm + ' WPM', trend)}
      ${tile('Races typed', t.races, `${t.finished} finished first`)}${tile('Tournaments played', t.tournaments, `${t.wins} won`)}${tile('Match win rate', t.matches ? t.matchWinRate + '%' : '–', `${t.matchWins} of ${t.matches} matches`)}</div>
    <div class="card"><h3>Speed per race (last ${t.series.length})</h3>${lineChart(t.series.map((p) => p.wpm), { unit: '', avg: t.avgWpm,
      titles: t.series.map((p) => `Race ${p.n}: ${p.wpm} WPM, ${p.chars} characters${p.finished ? ', finished' : ''} ${fmtDate(p.date)}`), from: t.series[0] ? fmtDate(t.series[0].date) : '', to: t.series.length > 1 ? fmtDate(t.series[t.series.length - 1].date) : '' })}
      <p class="muted small">WPM = words per minute (5 characters = 1 word). Hover a dot for details.</p></div>
    <div class="card"><h3>Recent races</h3><table class="rtable"><tr><th>Date</th><th>Speed</th><th>Characters</th><th>Result</th></tr>
      ${t.recent.map((p) => `<tr><td>${fmtDate(p.date)}</td><td><b>${p.wpm} WPM</b></td><td>${p.chars}</td><td>${p.finished ? '🏁 finished first' : 'time ran out'}</td></tr>`).join('')}</table></div>`;
}

async function viewStats() {
  const s = await api('GET', '/stats');
  let tab = s.typing.races > s.quiz.asked ? 'typing' : 'quiz';
  const draw = () => {
    app.innerHTML = `<div class="card"><h2 style="margin:0">📊 Your analytics</h2><p class="muted small" style="margin-bottom:0">Based on the tournaments you played. Bots are not counted.</p></div>
      <div class="tabs"><button class="tab ${tab === 'quiz' ? 'on' : ''}" data-stab="quiz">🧠 Quiz</button><button class="tab ${tab === 'typing' ? 'on' : ''}" data-stab="typing">⌨️ Typing</button></div>
      ${tab === 'quiz' ? quizStatsHtml(s.quiz) : typingStatsHtml(s.typing)}`;
  };
  draw();
  app.onclick = (e) => {
    const b = e.target.closest('[data-stab]');
    if (b) { tab = b.dataset.stab; draw(); }
  };
}

/* ---------------- create room ---------------- */
async function viewNewRoom(quizId) {
  const quizzes = (await api('GET', '/quizzes')).filter((q) => q.question_count > 0);
  app.innerHTML = `<div class="card"><h2>Host a tournament</h2>
    <label>Game type</label><select id="gtype" style="max-width:320px"><option value="quiz">🧠 Quiz tournament</option><option value="typerace">⌨️ Typing race tournament</option><option value="draw">🎨 Draw & Guess (skribbl)</option></select>
    <div id="quizwrap"><label>Quiz</label>${quizzes.length ? `<select id="quiz">${quizzes.map((q) => `<option value="${q.id}" ${String(q.id) === quizId ? 'selected' : ''}>${esc(q.title)} (${q.question_count} Q${q.category ? ' · ' + esc(q.category) : ''})</option>`).join('')}</select>` : '<p class="muted">You need a quiz first. <a href="#/quiz/new">Create one</a> or pick the typing race.</p>'}</div>
    <div id="lenwrap" style="display:none"><label id="tlenlabel">Text length</label><select id="tlen" style="max-width:200px"><option value="short">Short</option><option value="medium" selected>Medium</option><option value="long">Long</option></select>
      <p class="muted small" id="lenhelp">Both players type the same text. First to finish it without mistakes wins the race; if time runs out, whoever typed further wins.</p></div>
    <label>Room name (optional)</label><input id="name" maxlength="80">
    <label>Player limit (including you, 2 to 50)</label><input id="max" type="number" min="2" max="50" value="8" style="max-width:140px">
    <label id="ppmlabel">Questions per match (head-to-head duel, 1 to 9)</label><input id="ppm" type="number" min="1" max="9" value="3" style="max-width:140px">
    <label>Number of bots (they fill player slots)</label><input id="bots" type="number" min="0" max="49" value="0" style="max-width:140px">
    <label class="check"><input type="checkbox" id="fill"> Fill every other slot with bots (just me against bots)</label>
    <div id="diffwrap" style="display:none"><label>Bot difficulty</label><select id="diff" style="max-width:200px">
      <option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select></div>
    <div class="row" style="margin-top:16px"><button id="create">Create room</button></div></div>`;
  const showDiff = () => ($('#diffwrap').style.display = $('#fill').checked || Number($('#bots').value) > 0 ? 'block' : 'none');
  $('#bots').oninput = $('#fill').onchange = showDiff;
  $('#gtype').onchange = () => {
    const kind = $('#gtype').value, typing = kind === 'typerace', drawing = kind === 'draw';
    $('#quizwrap').style.display = typing || drawing ? 'none' : 'block';
    $('#lenwrap').style.display = typing || drawing ? 'block' : 'none';
    $('#tlenlabel').textContent = drawing ? 'Drawing time' : 'Text length';
    $('#tlen').innerHTML = drawing ? '<option value="short">60 seconds</option><option value="medium" selected>80 seconds</option><option value="long">110 seconds</option>'
      : '<option value="short">Short</option><option value="medium" selected>Medium</option><option value="long">Long</option>';
    $('#lenhelp').textContent = drawing ? 'Everybody takes turns drawing a secret word while the others guess it in the chat. Faster guesses score more. No bracket: the highest score wins. Bots guess but never draw.'
      : 'Both players type the same text. First to finish it without mistakes wins the race; if time runs out, whoever typed further wins.';
    $('#ppmlabel').textContent = drawing ? 'Rounds (everyone draws once per round, 1 to 9)' : typing ? 'Races per match (best of, 1 to 9)' : 'Questions per match (head-to-head duel, 1 to 9)';
    $('#ppm').value = drawing ? 3 : typing ? 1 : 3;
  };
  $('#create').onclick = async () => {
    try {
      const r = await api('POST', '/rooms', {
        game_type: $('#gtype').value, text_length: $('#tlen').value,
        quiz_id: $('#quiz') ? $('#quiz').value : null, name: $('#name').value, max_players: $('#max').value, questions_per_match: $('#ppm').value,
        bot_count: $('#bots').value, fill_bots: $('#fill').checked, bot_difficulty: $('#diff').value,
      });
      location.hash = '#/room/' + r.code;
    } catch (e) { toast(e.message); }
  };
}

/* ---------------- join via invite link ---------------- */
async function viewJoin(key) {
  const p = await api('GET', '/rooms/preview/' + encodeURIComponent(key));
  app.innerHTML = `<div class="card auth"><h2>${esc(p.name)}</h2>
    <p class="muted">Hosted by <b>${esc(p.host)}</b> · ${p.players}/${p.max_players} players · <span class="pill ${p.status}">${p.status}</span></p>
    <button id="go" ${p.status !== 'lobby' && false ? 'disabled' : ''}>Join tournament</button></div>`;
  $('#go').onclick = async () => {
    try { location.hash = '#/room/' + (await api('POST', '/rooms/join', { token: key })).code; }
    catch (e) { toast(e.message); }
  };
}

/* ---------------- room: lobby + live knockout tournament (simultaneous matches) ---------------- */
let sock = null;
let R = null;

function cleanupRoom() {
  if (sock) { sock.disconnect(); sock = null; }
  if (R) { clearInterval(R.tick); clearInterval(R.dtick); clearTimeout(R.animT); clearTimeout(R.holdT); }
  document.querySelectorAll('.fly').forEach((e) => e.remove());
  R = null;
  app.oninput = app.onchange = app.onclick = app.onpaste = null;
}

const keyOf = (m) => `${m.round}-${m.index}`;
const nm = (id) => (id != null && R.pl[id] ? R.pl[id].name : '?');
const skinInfo = (id) => SKINS.find((s) => s.id === id) || { id: id || 'rookie', name: 'Rookie', emoji: '🙂', c1: '#7c5cff', c2: '#4da3ff' };
// The picture of a character: a Flow image if one was added, otherwise an emoji in a coloured bubble
function charArt(p) {
  if (p && doodleOnly()) return lookArt(p.look || seededLook(p.name), p.full); // Skribbl and Draw & Guess: only the 2D Custom Doodle
  if (p && p.skin === 'custom' && p.look) return lookArt(p.look, p.full); // the Custom Doodle (customize.js)
  if (p && p.isBot && !p.skin) {
    const src = botAvatar(p.name);
    return src ? `<img class="ch-img" src="${src}" alt="">` : '<span class="ch-emoji" style="--c1:#ffb84d;--c2:#ff8a4d">🤖</span>';
  }
  const sk = skinInfo(p && p.skin);
  return have.skins[sk.id]
    ? `<img class="ch-img" src="/media/skins/${have.skins[sk.id]}" alt="">`
    : `<span class="ch-emoji" style="--c1:${sk.c1};--c2:${sk.c2}">${sk.emoji}</span>`;
}
// size: sm | md | lg | xl     anim: a-idle a-pop a-hop a-sad a-dance a-run a-enterL a-enterR a-hover
// A character's own clip (public/media/skins/<id>/<action>.mp4) replaces the built-in motion, on the big sizes only
const ANIM_ACTION = { 'a-enterL': ['enter', 'idle'], 'a-enterR': ['enter', 'idle'], 'a-idle': ['idle'], 'a-dance': ['win'], 'a-champion': ['champion', 'win'], 'a-sad': ['lose'], 'a-hop': ['correct'] };
const LOOPING = new Set(['idle', 'ready', 'typing']);
function clipFor(p, size, anim) {
  if (doodleOnly()) return null; // doodles are still pictures
  const have_ = p && p.skin && (size === 'lg' || size === 'xl' || size === 'full') && have.clips[p.skin];
  const action = have_ && (ANIM_ACTION[anim] || []).find((a) => have_.includes(a));
  const still = action && have.posters[p.skin] && have.posters[p.skin][action];
  return action ? { src: `/media/skins/${p.skin}/${action}.mp4`, loop: LOOPING.has(action), action, poster: still ? `/media/skins/${p.skin}/${still}` : null } : null;
}
function charHtml(p, size = 'sm', anim = '') {
  const clip = clipFor(p, size, anim);
  if (!clip) return `<span class="char ${size} ${anim}">${charArt(p)}</span>`;
  const posterSrc = clip.poster || (have.skins[p.skin] ? `/media/skins/${have.skins[p.skin]}` : null);
  const poster = posterSrc ? ` poster="${posterSrc}"` : '';
  const enter = /enter/.test(anim) ? anim : ''; // the slide-in still comes from the page, the clip does the acting
  const flip = clip.action === 'enter' && anim === 'a-enterR' ? ' mirror' : '';
  return `<span class="char ${size} clipwrap ${enter}"><video class="ch-clip${flip}" src="${clip.src}"${poster} autoplay muted ${clip.loop ? 'loop' : ''} playsinline preload="auto"></video></span>`;
}
const charOf = (id, size, anim) => (id != null && R.pl[id] ? charHtml(R.pl[id], size, anim) : '');
const nmBot = (id) => {
  const p = id != null && R.pl[id];
  return p ? charHtml(p, 'sm') + esc(p.name) : esc(nm(id));
};
const roundName = (r, total) => {
  const left = total - 1 - r;
  return left === 0 ? 'Final' : left === 1 ? 'Semifinal' : left === 2 ? 'Quarterfinal' : 'Round ' + (r + 1);
};
const myPlayer = () => R.lobby && R.lobby.players.find((p) => p.userId === me.id);
const placeLabel = (p) => (p === 1 ? '🏆 Champion' : p === 2 ? '🥈 Runner-up' : p ? 'Top ' + (p - 1) : '');
const inMatch = (m) => { const mine = myPlayer(); return !!mine && (m.a === mine.id || m.b === mine.id); };
const liveKeys = () => Object.keys(R.ms).filter((k) => R.ms[k].phase !== 'done')
  .sort((x, y) => R.ms[x].match.round - R.ms[y].match.round || R.ms[x].match.index - R.ms[y].match.index);

// What this viewer sees:
//   match    - I am in a live match: only my own match, nothing else (no bracket, no other matches)
//   bracket  - the tournament chart: before the first matches, right after my match ends, or when nothing is live
//   spectate - another live match, with a switcher and a tab for the bracket
function viewMode() {
  const live = liveKeys();
  const mine = live.find((k) => inMatch(R.ms[k].match));
  if (mine) return { mode: 'match', key: mine };
  const watched = R.focus && R.ms[R.focus] && (live.includes(R.focus) || R.ms[R.focus].phase === 'done') ? R.focus : null;
  if (!R.holdBracket && R.tab !== 'bracket' && (live.length || watched)) return { mode: 'spectate', key: watched || live[0] };
  return { mode: 'bracket', key: null };
}
const currentFocus = () => viewMode().key;

/* ----- bracket chart ----- */
function bracketHtml(rounds) {
  if (!rounds) return '';
  const total = rounds.length;
  const mineId = (myPlayer() || {}).id;
  const slot = (m, side) => {
    const id = m[side];
    const key = `${m.round}-${m.index}-${side}`;
    let cls = 'b-slot';
    let style = '';
    let label;
    if (id == null) { label = m.round === 0 ? 'BYE' : 'TBD'; cls += ' tbd'; }
    else {
      label = nmBot(id);
      if (m.winner === id) cls += ' winner';
      else if (m.winner != null) {
        cls += ' out';
        if (R.cutting.has(key)) { cls += ' cutting'; style = ` style="--delay:-${Date.now() - R.cutting.get(key)}ms"`; }
      }
      if (id === mineId) cls += ' mine';
    }
    if (R.hide.has(key)) cls += ' hide';
    const score = m.status === 'done' && !m.bye && id != null ? (side === 'a' ? m.scoreA : m.scoreB) : '';
    return `<div class="${cls}" data-slot="${key}"${style}><span class="nm">${label}</span><span class="sc">${score}</span></div>`;
  };
  const cols = rounds.map((round, r) => `<div class="b-round"><div class="b-title">${roundName(r, total)}</div>
    <div class="b-matches">${round.map((m) => {
      const live = m.status === 'live';
      return `<div class="b-match ${live ? 'live watchable' : ''}" ${live ? `data-watch="${keyOf(m)}" title="Click to watch"` : ''}>${slot(m, 'a')}${slot(m, 'b')}</div>`;
    }).join('')}</div></div>`).join('');
  const champ = rounds[total - 1][0].winner;
  const showChamp = champ != null && !R.hide.has('champ');
  return `<div class="bracket">${cols}<div class="b-round"><div class="b-title">Champion</div><div class="b-matches">
    <div class="b-match"><div class="b-slot champ ${showChamp ? 'winner' : 'tbd'}" data-slot="champ"><span class="nm">🏆 ${showChamp ? esc(nm(champ)) : '?'}</span></div></div></div></div></div>`;
}

/* ----- play layout: #panel (what the viewer sees) and #aux (live matches and results, spectators only) ----- */
function ensurePlayLayout() {
  if ($('#panel')) return false;
  app.innerHTML = '<div id="panel"></div><div id="aux"></div>';
  return true;
}

const feedHtml = () => (R.feed.length ? `<div class="card"><h3>Results</h3>${R.feed.map((f) => `<div class="feed-item">${f}</div>`).join('')}</div>` : '');

function bannerText() {
  if (R.banner) return R.banner;
  const mine = myPlayer();
  const out = R.bracket.some((round) => round.some((m) => m.status === 'done' && mine && (m.a === mine.id || m.b === mine.id) && m.winner !== mine.id));
  if (!R.matchesSeen) return 'The tournament begins! Your match starts in a moment.';
  return out ? '💀 You are out. The next matches are about to start…' : '⏳ You advanced! Waiting for your next opponent…';
}

function tabsHtml() {
  const n = liveKeys().length;
  if (!n) return '';
  const onBracket = viewMode().mode === 'bracket';
  return `<div class="tabs"><button class="tab ${onBracket ? '' : 'on'}" data-tab="live">👁 Watch live (${n})</button><button class="tab ${onBracket ? 'on' : ''}" data-tab="bracket">🏆 Bracket</button></div>`;
}

const bracketViewHtml = () => `<div class="card banner" id="bannerBox">${bannerText()}</div>${tabsHtml()}<div class="card"><h3>Tournament bracket</h3><div id="brk">${bracketHtml(R.bracket)}</div></div>`;

function refresh(which, key) {
  if (!R || !R.lobby || R.phase !== 'play' || !R.bracket) return;
  const v = viewMode();
  const fresh = ensurePlayLayout();
  const sig = v.mode + ':' + (v.key || '');
  const changed = fresh || R.sig !== sig;
  R.sig = sig;

  if (v.mode === 'bracket') {
    if (changed || !$('#brk')) $('#panel').innerHTML = bracketViewHtml();
    else if (which !== 'panel') {
      $('#brk').innerHTML = bracketHtml(R.bracket);
      const box = $('#bannerBox');
      if (box) box.innerHTML = bannerText();
    }
    $('#aux').innerHTML = feedHtml();
    return;
  }

  // a match panel: my own match (nothing else is shown) or one I am spectating
  if (changed || (which !== 'bracket' && (!key || key === v.key))) {
    const s = R.ms[v.key];
    const raceId = s && s.phase === 'race' ? `${v.key}-${s.index}` : null;
    if (!changed && raceId && $('#passage') && $('#passage').dataset.race === raceId) updateRace(); // keep the typing box (and its focus) alive
    else {
      $('#panel').innerHTML = (v.mode === 'spectate' ? tabsHtml() : '') + panelHtml();
      updateRace(); tickNow(); mountVideos();
      const tb = $('#typebox');
      if (tb) tb.focus();
    }
  }
  $('#aux').innerHTML = v.mode === 'spectate' ? liveHtml() + feedHtml() : '';
}

function liveHtml() {
  const keys = liveKeys();
  if (!keys.length) return '';
  const fk = currentFocus();
  return `<div class="card live-strip"><span class="muted small">⚡ LIVE NOW (${keys.length} match${keys.length > 1 ? 'es' : ''}) · tap one to watch</span><div class="row" style="margin-top:8px">
    ${keys.map((k) => { const s = R.ms[k]; return `<button class="chip ${k === fk ? 'on' : ''}" data-watch="${k}">${nmBot(s.match.a)} <b>${s.sA}</b> – <b>${s.sB}</b> ${nmBot(s.match.b)}</button>`; }).join('')}</div></div>`;
}

function panelHtml() {
  const total = R.bracket.length;
  const fk = currentFocus();
  const mine = myPlayer();
  if (!fk) {
    const out = R.bracket.some((round) => round.some((m) => m.status === 'done' && mine && (m.a === mine.id || m.b === mine.id) && m.winner !== mine.id));
    return `<div class="card banner">${R.matchesSeen ? (out ? '💀 You are out. The next matches are about to start…' : '⏳ You advanced! Waiting for your next opponent…') : 'The tournament begins! All first-round matches start at the same time.'}</div>`;
  }
  const s = R.ms[fk], m = s.match;
  const playing = inMatch(m) && s.phase !== 'done';
  const watching = playing ? '' : `<div class="watching">👀 Watching ${roundName(m.round, total)}: ${nmBot(m.a)} vs ${nmBot(m.b)}</div>`;
  const duel = (answered, animFor = (id) => (answered.has(id) ? 'a-pop' : 'a-idle')) => `<div class="duel">
    <div class="duel-p ${answered.has(m.a) ? 'locked' : ''}">${charOf(m.a, 'md', animFor(m.a))}<div class="n">${esc(nm(m.a))}</div><div class="s">${s.sA}</div><div class="ok">${answered.has(m.a) ? '✔ locked in' : '&nbsp;'}</div></div>
    <div class="vs-mid sm">VS</div>
    <div class="duel-p ${answered.has(m.b) ? 'locked' : ''}">${charOf(m.b, 'md', animFor(m.b))}<div class="n">${esc(nm(m.b))}</div><div class="s">${s.sB}</div><div class="ok">${answered.has(m.b) ? '✔ locked in' : '&nbsp;'}</div></div></div>`;

  const typing = R.lobby.gameType === 'typerace';
  if (s.phase === 'race') {
    const bars = [m.a, m.b].map((id) => `<div class="duel-p"><div class="n">${esc(nm(id))}</div><div class="s">${id === m.a ? s.sA : s.sB}</div>
      <div class="track"><div class="pbar"><div id="pb${id}"></div></div><div class="runner" id="pr${id}">${charOf(id, 'md', 'a-run')}</div></div><div class="ok" id="pt${id}">&nbsp;</div></div>`);
    return `<div class="card">${watching}<div class="row between"><span class="muted">${roundName(m.round, total)} · ${s.sudden ? '<b style="color:var(--warn)">SUDDEN DEATH</b>' : `Race ${s.index + 1} / ${s.total}`}</span><b id="secs"></b></div>
      <div class="duel">${bars[0]}<div class="vs-mid sm">VS</div>${bars[1]}</div>
      <div class="timer"><div id="bar"></div></div>
      <div id="passage" class="passage" data-race="${fk}-${s.index}"></div>
      ${playing ? '<input id="typebox" class="typebox" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type the text above. Fix mistakes to keep going!">' : '<p class="muted small">👀 Watching the race live.</p>'}</div>`;
  }
  if (s.phase === 'raceover') {
    const r = s.raceEnd;
    return `<div class="card">${watching}<h3>${r.winnerId != null ? `🏁 ${nmBot(r.winnerId)} wins the race!` : '⏱ Time is up, it is a draw'}</h3>
      <div class="vs podium">${[m.a, m.b].map((id) => `<div class="pod">${charOf(id, 'lg', r.winnerId === id ? 'a-dance' : r.winnerId == null ? 'a-idle' : 'a-sad')}<div>${esc(nm(id))}</div></div>`).join('<div class="vs-mid sm">VS</div>')}</div>
      ${r.results.map((x) => `<div class="player ${mine && x.playerId === mine.id ? 'me' : ''}"><span>${nmBot(x.playerId)} ${x.finished ? '✔ finished' : ''}</span><span class="score">${x.wpm} WPM · ${x.pos}/${r.length} chars${x.timeMs ? ' · ' + (x.timeMs / 1000).toFixed(1) + 's' : ''}</span></div>`).join('')}
      <p class="muted small" style="text-align:center">Race wins: ${nmBot(m.a)} ${s.sA} – ${s.sB} ${nmBot(m.b)}</p></div>`;
  }
  if (s.phase === 'intro') {
    const big = m.round >= total - 2 && have.videos.vsFinal ? 'vsFinal' : 'vs'; // semifinal and final get the grander clip
    return `<div class="card stage">${videoHtml(big)}${watching}<p class="muted" style="text-align:center;font-weight:700">${roundName(m.round, total).toUpperCase()} · MATCH ${m.index + 1}</p>
      <div class="vs"><div class="vs-card left ${mine && m.a === mine.id ? 'mine' : ''}">${charOf(m.a, 'full', 'a-enterL')}<div class="vs-name">${esc(nm(m.a))}</div></div><div class="vs-mid"><span class="bolt">⚡</span><span class="vs-text">VS</span></div>
      <div class="vs-card right ${mine && m.b === mine.id ? 'mine' : ''}">${charOf(m.b, 'full', 'a-enterR')}<div class="vs-name">${esc(nm(m.b))}</div></div></div>
      <p class="muted" style="text-align:center">${typing ? `Type the same text faster than your rival. Best of ${R.perMatch} race${R.perMatch > 1 ? 's' : ''}.` : `Most points over ${R.perMatch} question${R.perMatch > 1 ? 's' : ''} advances.`} ${playing ? 'Get ready!' : ''}</p></div>`;
  }
  if (s.phase === 'question') {
    const q = s.q;
    return `<div class="card">${watching}<div class="row between"><span class="muted">${roundName(m.round, total)} · ${q.sudden ? '<b style="color:var(--warn)">SUDDEN DEATH</b>' : `Question ${q.index + 1} / ${q.total}`}</span><b id="secs"></b></div>
      ${duel(s.answered)}
      <div class="timer"><div id="bar"></div></div><div class="q-text">${esc(q.text)}</div>
      <div class="answers">${q.options.map((o, i) => playing
        ? `<button class="answer ${s.picked === i ? 'picked' : ''}" data-pick="${i}" ${s.picked != null ? 'disabled' : ''}>${esc(o)}</button>`
        : `<div class="answer watch">${esc(o)}</div>`).join('')}</div>
      <p class="muted small" style="margin-top:14px">${playing ? (s.picked != null ? 'Locked in! Waiting for your opponent…' : 'Answer fast for more points!') : ''}</p></div>`;
  }
  if (s.phase === 'reveal') {
    const r = s.reveal, q = s.q || { options: [] };
    const my = r.results.find((x) => mine && x.playerId === mine.id);
    const gain = (id) => { const x = r.results.find((y) => y.playerId === id); return x && x.points ? '+' + x.points : x && x.choice !== null ? 'wrong' : 'no answer'; };
    return `<div class="card">${watching}<h3>${my ? (my.correct ? '✅ Correct! +' + my.points : my.choice !== null ? '❌ Wrong' : '⏱ No answer') : 'Answer revealed'}</h3>
      <div class="answers">${q.options.map((o, i) => `<div class="answer ${i === r.correctIndex ? 'correct' : my && my.choice === i ? 'wrong' : ''}">${esc(o)}</div>`).join('')}</div>
      ${duel(new Set(), (id) => { const x = r.results.find((y) => y.playerId === id); return x && x.correct ? 'a-hop' : 'a-sad'; })}<p class="muted small" style="text-align:center">${esc(nm(m.a))}: ${gain(m.a)} · ${esc(nm(m.b))}: ${gain(m.b)}</p></div>`;
  }
  // done: show the result for a few seconds
  const res = s.result;
  const iWon = mine && res.winnerId === mine.id, iLost = mine && res.loserId === mine.id;
  return `<div class="card banner">${iWon ? '🎉 You won!' : iLost ? '💀 You are eliminated' : ''}<div class="vs podium"><div class="pod">${charOf(res.winnerId, 'lg', 'a-dance')}<div>${esc(nm(res.winnerId))}</div></div><div class="vs-mid sm">›</div><div class="pod">${charOf(res.loserId, 'lg', 'a-sad')}<div>${esc(nm(res.loserId))}</div></div></div><div>${nmBot(res.winnerId)} beats ${nmBot(res.loserId)} (${res.scoreA}–${res.scoreB})</div></div>`;
}

function tickNow() {
  const fk = R && currentFocus();
  const s = fk && R.ms[fk];
  if (!s || (s.phase !== 'question' && s.phase !== 'race')) return;
  const left = Math.max(0, s.deadline - Date.now());
  const bar = $('#bar'), secs = $('#secs');
  if (bar) bar.style.width = (left / ((s.phase === 'race' ? s.timeLimit : s.q.timeLimit) * 1000)) * 100 + '%';
  if (secs) secs.textContent = Math.ceil(left / 1000) + 's';
}

const commonPrefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };

// Paint the passage (typed / mistake / next / rest) and both progress bars without touching the typing box
function updateRace() {
  const fk = R && currentFocus(), s = fk && R.ms[fk];
  if (!s || s.phase !== 'race' || !$('#passage')) return;
  const m = s.match, text = s.text, box = $('#typebox');
  const mine = myPlayer();
  let ok, bad = 0;
  if (box) { ok = commonPrefix(box.value, text); bad = Math.min(box.value.length, text.length) - ok; }
  else ok = Math.max(s.progress[m.a] || 0, s.progress[m.b] || 0);
  $('#passage').innerHTML = `<span class="ok">${esc(text.slice(0, ok))}</span><span class="bad">${esc(text.slice(ok, ok + bad))}</span><span class="cur">${esc(text.charAt(ok + bad))}</span><span class="rest">${esc(text.slice(ok + bad + 1))}</span>`;
  for (const id of [m.a, m.b]) {
    const p = box && mine && mine.id === id ? ok : s.progress[id] || 0; // my own bar follows my keystrokes instantly
    const bar = $('#pb' + id), label = $('#pt' + id);
    if (bar) bar.style.width = (p / text.length) * 100 + '%';
    const runner = $('#pr' + id);
    if (runner) { const pct = (p / text.length) * 100; runner.style.left = pct + '%'; runner.style.transform = `translateX(-${pct}%)`; }
    if (label) label.textContent = `${p}/${text.length}`;
  }
}

/* ----- socket wiring ----- */
function viewRoom(code) {
  R = { code, lobby: null, phase: 'wait', bracket: null, pl: {}, ms: {}, focus: null, tab: 'live', holdBracket: false, feed: [], hide: new Set(), cutting: new Map(), matchesSeen: false };
  app.innerHTML = '<p class="muted">Connecting…</p>';
  sock = io({ auth: { token } });
  sock.on('connect_error', (err) => {
    if (err && err.message === 'suspended') { sock.close(); logout(); sessionStorage.setItem('qv_notice', 'This account is suspended'); return; }
    toast('Connection problem, retrying…');
  });
  sock.on('room:closed', () => { toast('This tournament was closed by an admin'); location.hash = '#/'; });
  sock.on('connect', () => sock.emit('room:join', code, (res) => {
    if (!res.ok) { toast(res.error); location.hash = '#/'; }
  }));
  R.tick = setInterval(tickNow, 100);
  wireDraw();
  api('GET', '/profile').then((p) => { if (R) { R.profile = p; drawRoom(); } }).catch(() => {});

  app.onclick = (e) => {
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const fk = currentFocus(), s = fk && R.ms[fk];
      if (!s || s.picked != null || s.phase !== 'question' || !inMatch(s.match)) return;
      s.picked = Number(pick.dataset.pick);
      sock.emit('game:answer', s.picked);
      refresh('panel');
      return;
    }
    if (liveKeys().some((k) => inMatch(R.ms[k].match))) return; // fighters only ever see their own match
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      R.tab = tab.dataset.tab;
      if (R.tab === 'live') R.holdBracket = false;
      return refresh('both');
    }
    const watch = e.target.closest('[data-watch]');
    if (watch && R.ms[watch.dataset.watch]) {
      R.focus = watch.dataset.watch;
      R.tab = 'live';
      R.holdBracket = false;
      refresh('both');
    }
  };

  // typing race: report what was typed (throttled; sent at once when the whole text is complete)
  app.oninput = (e) => {
    if (e.target.id !== 'typebox') return;
    const fk = currentFocus(), s = fk && R.ms[fk];
    if (!s || s.phase !== 'race') return;
    updateRace();
    if (e.target.value === s.text) { clearTimeout(R.sendT); R.sendT = null; sock.emit('type:progress', e.target.value); return; }
    if (!R.sendT) R.sendT = setTimeout(() => { R.sendT = null; const b = $('#typebox'); if (b) sock.emit('type:progress', b.value); }, 120);
  };
  app.onpaste = (e) => { if (e.target.id === 'typebox') e.preventDefault(); }; // no copy-paste cheating

  sock.on('lobby', (s) => { R.lobby = s; drawRoom(); });

  sock.on('game:bracket', (p) => {
    R.bracket = p.rounds; R.pl = p.players; R.perMatch = p.perMatch;
    R.ms = {}; // live matches are re-sent right after this event
    if (R.phase !== 'end') R.phase = 'play';
    drawRoom();
  });
  sock.on('match:intro', (m) => {
    R.matchesSeen = true;
    R.ms[keyOf(m)] = { match: m, phase: 'intro', answered: new Set(), sA: 0, sB: 0, picked: null };
    R.bracket[m.round][m.index].status = 'live';
    refresh('both', keyOf(m));
  });
  sock.on('game:question', (q) => {
    const k = keyOf(q.match);
    const s = R.ms[k] || (R.ms[k] = { match: q.match, answered: new Set(), picked: null });
    Object.assign(s, { phase: 'question', q, picked: s.q && s.q.index === q.index && s.picked != null ? s.picked : null,
      answered: new Set(q.answered || []), deadline: Date.now() + q.remainingMs, sA: q.scoreA, sB: q.scoreB });
    R.matchesSeen = true;
    refresh('panel', k);
  });
  sock.on('game:answered', ({ match, playerId }) => {
    const s = R.ms[keyOf(match)];
    if (!s) return;
    s.answered.add(playerId);
    if (currentFocus() === keyOf(match)) refresh('panel');
  });
  sock.on('game:reveal', (r) => {
    const s = R.ms[keyOf(r.match)];
    if (!s) return;
    Object.assign(s, { phase: 'reveal', reveal: r, sA: r.scoreA, sB: r.scoreB });
    refresh('panel', keyOf(r.match));
  });
  sock.on('race:start', (q) => {
    const k = keyOf(q.match);
    const s = R.ms[k] || (R.ms[k] = { match: q.match });
    Object.assign(s, { phase: 'race', text: q.text, timeLimit: q.timeLimit, index: q.index, total: q.total, sudden: q.sudden,
      deadline: Date.now() + q.remainingMs, progress: q.progress, sA: q.scoreA, sB: q.scoreB });
    R.matchesSeen = true;
    refresh('panel', k);
  });
  sock.on('race:progress', ({ match, progress }) => {
    const s = R.ms[keyOf(match)];
    if (!s || s.phase !== 'race') return;
    s.progress = progress;
    if (currentFocus() === keyOf(match)) updateRace();
  });
  sock.on('race:end', (r) => {
    const s = R.ms[keyOf(r.match)];
    if (!s) return;
    Object.assign(s, { phase: 'raceover', raceEnd: r, sA: r.scoreA, sB: r.scoreB });
    refresh('panel', keyOf(r.match));
  });
  sock.on('match:end', (m) => {
    const k = keyOf(m);
    const iWasIn = inMatch(m);
    const wasShown = currentFocus() === k;
    const s = R.ms[k] || (R.ms[k] = { match: m, answered: new Set(), sA: 0, sB: 0 });
    s.phase = 'done';
    s.result = { winnerId: m.winnerId, loserId: m.loserId, scoreA: m.scoreA, scoreB: m.scoreB };
    if (iWasIn) {
      // the chart replaces the match, with the cut and fly animation; then the next VS (if ready) or the other matches
      const iWon = m.winnerId === (myPlayer() || {}).id;
      R.holdBracket = true;
      R.tab = 'live';
      R.banner = `${iWon ? '🎉 You won! ' : '💀 You are eliminated. '}${nmBot(m.winnerId)} beat ${nmBot(m.loserId)} (${m.scoreA}–${m.scoreB}).${iWon ? ' Waiting for your next opponent…' : ' You can watch the other matches.'}`;
      clearTimeout(R.holdT);
      R.holdT = setTimeout(() => { if (R) { R.holdBracket = false; R.banner = null; refresh('both', '_'); } }, 6000);
    } else if (wasShown || R.focus === k) {
      R.focus = k; // a match being watched keeps its result on screen for a moment
      setTimeout(() => { if (R && R.focus === k) { R.focus = null; refresh('both', '_'); } }, 3500);
    }

    const mm = R.bracket[m.round][m.index];
    Object.assign(mm, { winner: m.winnerId, scoreA: m.scoreA, scoreB: m.scoreB, status: 'done' });
    // elimination: red line (with scissors) is drawn through the loser's name
    const loserKey = `${m.round}-${m.index}-${m.loserId === m.a ? 'a' : 'b'}`;
    R.cutting.set(loserKey, Date.now());
    setTimeout(() => { if (R) { R.cutting.delete(loserKey); refresh('bracket'); } }, 1500);
    // winner moves into the next round slot, which stays hidden until the winner has flown there
    const next = nextSlotKey(m);
    if (next !== 'champ') {
      const nm2 = R.bracket[m.round + 1][m.index >> 1];
      nm2[m.index % 2 ? 'b' : 'a'] = m.winnerId;
    }
    R.hide.add(next);
    R.feed.unshift(`${nmBot(m.winnerId)} beat ${nmBot(m.loserId)} <span class="muted">(${m.scoreA}–${m.scoreB}, ${roundName(m.round, R.bracket.length)})</span>`);
    R.feed = R.feed.slice(0, 8);
    refresh('both', k);
    setTimeout(() => flyWinner(m), 1700);
  });
  sock.on('game:end', (p) => {
    for (const s of p.board) if (!R.pl[s.id]) R.pl[s.id] = { name: s.name, isBot: s.isBot, skin: s.skin, look: s.look }; // opened after the game: no live player data yet
    R.phase = 'end'; R.board = p.board; R.rewards = p.rewards || {}; R.hide = new Set(); R.cutting = new Map();
    if (p.rounds) R.bracket = p.rounds;
    drawRoom();
  });
}

const nextSlotKey = (m) => (m.round + 1 < R.bracket.length ? `${m.round + 1}-${m.index >> 1}-${m.index % 2 ? 'b' : 'a'}` : 'champ');

// Winner's name flies from its slot in this match to its slot in the next round
function flyWinner(m) {
  if (!R || R.phase !== 'play') return;
  const nextKey = nextSlotKey(m);
  const src = document.querySelector(`[data-slot="${m.round}-${m.index}-${m.winnerId === m.a ? 'a' : 'b'}"]`);
  const dst = document.querySelector(`[data-slot="${nextKey}"]`);
  const done = () => { if (R) { R.hide.delete(nextKey); refresh('bracket'); } };
  if (!src || !dst) return done();
  const from = src.getBoundingClientRect(), to = dst.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly';
  el.innerHTML = nmBot(m.winnerId);
  Object.assign(el.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
  document.body.appendChild(el);
  const dx = to.left - from.left, dy = to.top - from.top;
  el.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: `translate(${dx * 0.5}px,${dy * 0.5}px) scale(1.25)`, offset: 0.5 },
    { transform: `translate(${dx}px,${dy}px) scale(1)` },
  ], { duration: 1400, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => { el.remove(); done(); };
  setTimeout(() => { el.remove(); done(); }, 1800); // safety net so the destination slot never stays hidden
}

function drawRoom() {
  if (!R || !R.lobby) return;
  const L = R.lobby;
  const isHost = L.hostId === me.id;
  const mine = myPlayer();
  document.body.classList.toggle('skr', L.gameType === 'draw');
  document.body.classList.toggle('draw-live', R.phase === 'draw'); // the drawing game uses the whole window
  if (R.phase === 'draw') return drawDrawUI();
  if (R.phase === 'play') return refresh('both');
  if (R.phase === 'end') {
    const board = R.board || [];
    const champ = board[0];
    const rw = R.rewards && mine && R.rewards[mine.id];
    const rewardHtml = rw ? `<div class="card reward"><h3>⭐ +${rw.xp} XP${rw.practice ? ' (practice room: a quarter of the XP, no win credit)' : ''} · Level ${rw.level}</h3>${rw.newSkins.length ? `<p>🎉 New character${rw.newSkins.length > 1 ? 's' : ''} unlocked: ${rw.newSkins.map((id) => `<b>${esc(skinInfo(id).name)}</b>`).join(', ')}! <a href="#/locker">Open your locker</a></p>` : ''}</div>` : '';
    app.innerHTML = `${L.gameType === 'draw' ? podiumHtml(board, mine && mine.id) : `<div class="card champion stage">${videoHtml('champion', false)}${champ ? charOf(champ.id, 'xl', 'a-champion') : ''}<div style="font-size:48px">🏆</div><h2>${champ ? esc(champ.name) : '?'} is the champion!</h2></div>`}
      ${rewardHtml}
      ${R.bracket ? `<div class="card"><h3>Final bracket</h3>${bracketHtml(R.bracket)}</div>` : ''}
      <div class="card">${L.gameType === 'draw' ? '' : '<h3>Standings</h3>'}${(L.gameType === 'draw' ? [] : board).map((s) => `<div class="player ${mine && s.id === mine.id ? 'me' : ''}">
        <span>${charOf(s.id, 'sm')}${esc(s.name)}${s.isBot ? '<span class="tag bot">BOT</span>' : ''} <span class="muted small">${placeLabel(s.placement)}</span></span><span class="score">${s.score} pts</span></div>`).join('')}
      <div class="row" style="margin-top:14px"><a class="btn" href="#/">Home</a>${me.guest ? '' : '<a class="btn ghost" href="#/stats">📊 My analytics</a>'}${isHost && !me.guest ? '<a class="btn green" href="#/new-room">Host another</a>' : ''}</div></div>`;
    mountVideos();
    return;
  }
  drawLobby(L, isHost);
}

function drawLobby(L, isHost) {
  const link = `${location.origin}/${L.gameType === 'draw' ? 'play' : 'join'}/${L.inviteToken}`;
  const full = L.players.length >= L.maxPlayers && !L.botCount;
  const typing = L.gameType === 'typerace';
  const drawing = L.gameType === 'draw';
  let size = 2;
  while (size < L.players.length) size *= 2;
  const rounds = Math.log2(size);
  app.innerHTML = `
    <div class="card"><div class="row between"><div><h2 style="margin:0">${esc(L.name)}</h2>
      <div class="muted small">${drawing ? `🎨 Draw & Guess · ${L.questionsPerMatch} round${L.questionsPerMatch === 1 ? '' : 's'} · ${({ short: 60, medium: 80, long: 110 })[L.textLength] || 80}s per drawing` : typing ? `⌨️ Typing race · ${L.textLength} texts` : `${esc(L.quizTitle)} · ${L.questionCount} questions`} · host ${esc(L.hostName)}</div></div>
      <div style="text-align:right"><div class="muted small">Room code</div><div class="code">${L.code}</div></div></div></div>
    ${L.status === 'finished' ? '<div class="card"><p>This tournament has finished.</p><a class="btn" href="#/">Home</a></div>' : `
    <div class="card"><h3>Invite players</h3>
      <div class="invite"><input id="link" readonly value="${esc(link)}"><button id="copy">Copy link</button></div>
      <p class="muted small">${drawing ? 'Anyone with this link can join with just a name until the room is full or the game starts.' : 'Anyone with this link can join (after logging in) until the room is full or the tournament starts.'}</p></div>
    <div class="card"><div class="row between"><h3>Players (${L.players.length}/${L.maxPlayers})</h3>${full ? '<span class="pill playing">Room full</span>' : ''}</div>
      ${L.players.map((p) => `<div class="player ${p.userId === me.id ? 'me' : ''}"><span>${charHtml(p, 'sm', 'a-idle')}${esc(p.name)}${p.isHost ? '<span class="tag">HOST</span>' : ''}${p.isBot ? '<span class="tag bot">BOT</span>' : ''}</span></div>`).join('')}
      <p class="muted small">${drawing ? 'Free-for-all: in every round each player draws once while the others guess. Bots guess but never draw. Highest score wins.' : 'Knockout format: players are drawn at random into a bracket and play head-to-head.'} ${!drawing && L.players.length >= 2 ? `With ${L.players.length} players that is ${rounds} round${rounds > 1 ? 's' : ''}${size > L.players.length ? ` (${size - L.players.length} player${size - L.players.length > 1 ? 's' : ''} get a bye in round 1)` : ''}.` : ''}</p></div>
    ${R.profile ? `<div class="card"><div class="row between"><div class="row">${charHtml({ skin: R.profile.skin, look: R.profile.look, name: me.username }, 'md', 'a-idle')}<div><b>${drawing ? 'Your doodle' : 'Your character'}</b><div class="muted small">${R.profile.guest ? 'Guest: just for fun, no XP' : `Level ${R.profile.level} · ${R.profile.xp} XP`}</div></div></div>
      <div class="row">${drawing ? '' : `<select id="myskin">${R.profile.skins.filter((k) => k.unlocked).map((k) => `<option value="${k.id}" ${k.id === R.profile.skin ? 'selected' : ''}>${k.emoji} ${esc(k.name)}</option>`).join('')}</select>`}${R.profile.guest || drawing ? '<a class="btn ghost" href="#/customize">🎭 Customize your doodle</a>' : '<a class="btn ghost" href="#/locker">Locker</a>'}</div></div></div>` : ''}
    ${isHost ? `<div class="card"><h3>Host settings</h3><div class="row">
      <div><label>Player limit</label><input id="max" type="number" min="2" max="50" value="${L.maxPlayers}" style="width:110px"></div>
      <div><label>${drawing ? 'Rounds' : typing ? 'Races per match' : 'Questions per match'}</label><input id="ppm" type="number" min="1" max="9" value="${L.questionsPerMatch}" style="width:110px"></div>
      ${typing || drawing ? `<div><label>${drawing ? 'Drawing time' : 'Text length'}</label><select id="tlen">${['short', 'medium', 'long'].map((d) => `<option value="${d}" ${L.textLength === d ? 'selected' : ''}>${drawing ? ({ short: '60 s', medium: '80 s', long: '110 s' })[d] : d}</option>`).join('')}</select></div>` : ''}
      <div><label>Bots</label><input id="bots" type="number" min="0" max="49" value="${L.botCount}" style="width:90px"></div>
      <div><button class="ghost" id="fill" style="margin-top:26px">Fill all slots with bots</button></div>
      <div><label>Bot difficulty</label><select id="diff" ${L.botCount > 0 ? '' : 'disabled'}>${['easy', 'medium', 'hard'].map((d) => `<option value="${d}" ${L.botDifficulty === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div></div>
      <div class="row" style="margin-top:16px"><button class="green" id="start" ${L.players.length < 2 ? 'disabled' : ''}>${drawing ? 'Start game' : 'Start tournament'}</button>
      ${L.players.length < 2 ? '<span class="muted small">Invite a friend or add bots to start.</span>' : ''}</div></div>`
      : `<div class="card"><p class="muted">Waiting for the host to start…</p><button class="ghost" id="leave">Leave room</button></div>`}`}`;
  const patch = async () => {
    try {
      await api('PATCH', '/rooms/' + L.code, {
        max_players: $('#max').value, questions_per_match: $('#ppm').value, text_length: $('#tlen') ? $('#tlen').value : undefined,
        bot_count: $('#bots').value, bot_difficulty: $('#diff').value,
      });
    } catch (e) { toast(e.message); drawRoom(); }
  };
  if ($('#fill')) $('#fill').onclick = async () => {
    try { await api('PATCH', '/rooms/' + L.code, { fill_bots: true, bot_difficulty: $('#diff').value }); }
    catch (e) { toast(e.message); }
  };
  if ($('#copy')) $('#copy').onclick = async () => {
    try { await navigator.clipboard.writeText(link); } catch { $('#link').select(); document.execCommand('copy'); }
    toast('Invite link copied', true);
  };
  ['#max', '#ppm', '#tlen', '#bots', '#diff'].forEach((s) => $(s) && ($(s).onchange = patch));
  if ($('#myskin')) $('#myskin').onchange = async () => {
    try { R.profile = await api('POST', '/profile/skin', { skin: $('#myskin').value }); } catch (e) { toast(e.message); }
  };
  if ($('#start')) $('#start').onclick = () => sock.emit('room:start', (res) => !res.ok && toast(res.error));
  if ($('#leave')) $('#leave').onclick = async () => {
    try { await api('POST', `/rooms/${L.code}/leave`); location.hash = '#/'; } catch (e) { toast(e.message); }
  };
}

probeMedia().catch(() => {}).then(route);
