/* Quizverse admin CMS: analytics, accounts, tournaments, content, activity log (only reachable for admins; the server checks too) */
const aTabs = [['', 'Overview'], ['users', 'Users'], ['rooms', 'Tournaments'], ['content', 'Content'], ['log', 'Activity log']];
const aState = { users: { q: '', sort: 'id', dir: 'desc', page: 1 }, rooms: { status: '', page: 1 } };
const aFmt = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '–');
const aDay = (d) => { const [, m, dd] = String(d).split('-'); return `${dd}/${m}`; };

async function viewAdmin(arg = '') {
  if (!me || !me.isAdmin) { app.innerHTML = '<div class="card"><h2>Admins only</h2><p class="muted">Your account does not have admin rights.</p><a class="btn" href="#/">Go home</a></div>'; return; }
  const tab = /^u\d+$/.test(arg) ? 'users' : arg;
  const head = `<h2>Admin</h2><div class="row admin-tabs">${aTabs.map(([k, l]) => `<a class="btn ${k === tab ? '' : 'ghost'}" href="#/admin${k ? '/' + k : ''}">${l}</a>`).join('')}</div><div style="height:14px"></div>`;
  app.innerHTML = head + '<p class="muted">Loading…</p>';
  const body = /^u\d+$/.test(arg) ? await adminUser(Number(arg.slice(1))) : tab === 'users' ? await adminUsers()
    : tab === 'rooms' ? await adminRooms() : tab === 'content' ? await adminContent() : tab === 'log' ? await adminLog() : await adminOverview();
  app.innerHTML = head + body.html;
  if (body.wire) body.wire();
}

/* ----- overview ----- */
const aList = (rows, empty = 'No data yet.') => (rows.length
  ? rows.map((r) => `<div class="list-item"><span>${esc(r.label)}</span><b>${r.count}</b></div>`).join('') : `<p class="muted">${empty}</p>`);

async function adminOverview() {
  const o = await api('GET', '/admin/overview');
  const t = o.totals;
  const chart = (rows, title) => `<div class="card"><h3>${title}</h3>${lineChart(rows.map((p) => p.value), { titles: rows.map((p) => `${p.date}: ${p.value}`), from: aDay(rows[0].date), to: aDay(rows[rows.length - 1].date) })}</div>`;
  return {
    html: `<div class="tiles">
      ${tile('Skribbl guests', t.guests, `${t.guests7} in the last 7 days`)}
      ${tile('Players', t.users, `+${t.usersNew7} this week · +${t.usersNew1} today`)}
      ${tile('Active players', t.active7, `last 7 days · ${t.active1} in the last 24h`)}
      ${tile('Page views', t.visits30, `last 30 days · ${t.visits1} today`)}
      ${tile('Unique visitors', t.visitors7, 'last 7 days')}
      ${tile('Tournaments played', t.tournaments, `${t.tournaments7} this week`)}
      ${tile('Running now', t.liveRooms + t.lobbyRooms, `${t.liveRooms} playing · ${t.lobbyRooms} in lobby`)}
      ${tile('Quizzes', t.quizzes, `${t.questions} questions · ${t.categories} categories`)}
      ${tile('Avg players per tournament', t.avgPlayers || '–')}</div>
      ${chart(o.series.visits, 'Page views per day (30 days)')}
      ${chart(o.series.visitors, 'Unique visitors per day')}
      ${chart(o.series.signups, 'New accounts per day')}
      ${chart(o.series.tournaments, 'Tournaments finished per day')}
      <div class="tiles">
        <div class="card"><h3>Top pages</h3>${aList(o.topPages)}</div>
        <div class="card"><h3>Devices</h3>${aList(o.devices)}</div>
        <div class="card"><h3>Where visitors come from</h3>${aList(o.referrers, 'Mostly direct visits.')}</div>
        <div class="card"><h3>Game types played</h3>${aList(o.gameTypes)}</div></div>
      <div class="card"><h3>Newest accounts</h3>${o.recentUsers.map((u) => `<div class="list-item"><div><a href="#/admin/u${u.id}"><b>${esc(u.username)}</b></a>
        <div class="muted small">${esc(u.email || 'no email')}</div></div><span class="muted small">${aFmt(u.created_at)}</span></div>`).join('') || '<p class="muted">No accounts yet.</p>'}</div>`,
  };
}

/* ----- users ----- */
async function adminUsers() {
  const s = aState.users;
  const d = await api('GET', `/admin/users?q=${encodeURIComponent(s.q)}&sort=${s.sort}&dir=${s.dir}&page=${s.page}&limit=25`);
  const pages = Math.max(1, Math.ceil(d.total / d.limit));
  const th = (k, l) => `<th><a href="#" data-sort="${k}">${l}${s.sort === k ? (s.dir === 'asc' ? ' ▲' : ' ▼') : ''}</a></th>`;
  return {
    html: `<div class="card"><div class="row"><input class="grow" id="uq" placeholder="Search username or email" value="${esc(s.q)}"><button id="usearch">Search</button>
      <a class="btn ghost" href="#" id="ucsv">Download CSV</a></div>
      <p class="muted small">${d.total} account${d.total === 1 ? '' : 's'}</p>
      <div style="overflow-x:auto"><table class="atable"><tr>${th('username', 'Player')}${th('email', 'Email')}${th('xp', 'Level / XP')}${th('wins', 'Wins')}${th('tournaments', 'Played')}${th('created_at', 'Joined')}${th('last_seen_at', 'Last seen')}<th>Status</th></tr>
      ${d.users.map((u) => `<tr><td><a href="#/admin/u${u.id}"><b>${esc(u.username)}</b></a></td><td>${esc(u.email || '–')}</td><td>L${u.level} · ${u.xp}</td><td>${u.wins}</td><td>${u.tournaments}</td>
        <td>${aFmt(u.created_at)}</td><td>${aFmt(u.last_seen_at)}</td><td>${u.is_banned ? '<span class="pill playing">suspended</span>' : ''}${u.is_admin ? ' <span class="pill lobby">admin</span>' : ''}</td></tr>`).join('')}</table></div>
      <div class="row" style="margin-top:10px"><button class="ghost" id="uprev" ${s.page <= 1 ? 'disabled' : ''}>Previous</button><span class="muted">Page ${d.page} of ${pages}</span><button class="ghost" id="unext" ${s.page >= pages ? 'disabled' : ''}>Next</button></div></div>`,
    wire() {
      const again = () => viewAdmin('users');
      $('#usearch').onclick = () => { s.q = $('#uq').value.trim(); s.page = 1; again(); };
      $('#uq').onkeydown = (e) => { if (e.key === 'Enter') $('#usearch').click(); };
      $('#uprev').onclick = () => { s.page--; again(); };
      $('#unext').onclick = () => { s.page++; again(); };
      app.querySelectorAll('[data-sort]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const k = a.dataset.sort; s.dir = s.sort === k && s.dir === 'desc' ? 'asc' : 'desc'; s.sort = k; s.page = 1; again(); }; });
      $('#ucsv').onclick = async (e) => {
        e.preventDefault();
        const all = await api('GET', `/admin/users?q=${encodeURIComponent(s.q)}&sort=${s.sort}&dir=${s.dir}&limit=5000`);
        // a leading = + - @ would be run as a formula by Excel, so those cells are prefixed with an apostrophe
        const cell = (v) => { let t = String(v ?? ''); if (/^[=+\-@]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
        const rows = [['username', 'email', 'level', 'xp', 'wins', 'tournaments', 'joined', 'last_seen', 'suspended', 'admin'],
          ...all.users.map((u) => [u.username, u.email, u.level, u.xp, u.wins, u.tournaments, u.created_at, u.last_seen_at, u.is_banned ? 'yes' : 'no', u.is_admin ? 'yes' : 'no'])];
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv' }));
        a.download = 'quizverse-users.csv';
        a.click();
      };
    },
  };
}

async function adminUser(id) {
  const d = await api('GET', '/admin/users/' + id);
  const u = d.user, q = d.stats.quiz, ty = d.stats.typing;
  const self = u.id === me.id;
  return {
    html: `<p><a href="#/admin/users">← All users</a></p>
      <div class="card"><div class="row">${charHtml({ skin: u.skin }, 'lg', 'a-idle')}<div><h3 style="margin:0">${esc(u.username)} ${u.is_admin ? '<span class="pill lobby">admin</span>' : ''} ${u.is_banned ? '<span class="pill playing">suspended</span>' : ''}</h3>
        <div class="muted">${esc(u.email || 'no email')}</div>
        <div class="muted small">Joined ${aFmt(u.created_at)} · last login ${aFmt(u.last_login_at)} · last seen ${aFmt(u.last_seen_at)} · ${u.login_count} logins · ${d.visits.visits} page views</div></div></div></div>
      <div class="tiles">${tile('Level', u.level, `${u.xp} XP`)}${tile('Tournament wins', u.wins, `${u.tournaments} played`)}${tile('Quiz accuracy', q.asked ? q.accuracy + '%' : '–', `${q.asked} answers`)}${tile('Best typing speed', ty.bestWpm ? ty.bestWpm + ' WPM' : '–', ty.races + ' races')}</div>
      <div class="card"><h3>Edit account</h3><div class="aform">
        <label>Username</label><input id="f-username" value="${esc(u.username)}">
        <label>Email</label><input id="f-email" value="${esc(u.email || '')}">
        <label>Level (sets XP to exactly what that level needs)</label><div class="row"><input id="f-level" type="number" min="1" max="100" value="${u.level}"><button id="set-level">Set level</button></div>
        <label>XP</label><div class="row"><input id="f-xp" type="number" min="0" value="${u.xp}"><button id="set-xp">Set XP</button><input id="f-addxp" type="number" placeholder="+/- XP" style="max-width:120px"><button id="add-xp" class="ghost">Add</button></div>
        <label>Tournament wins / tournaments played</label><div class="row"><input id="f-wins" type="number" min="0" value="${u.wins}"><input id="f-tour" type="number" min="0" value="${u.tournaments}"></div>
        <div class="err" id="aerr"></div>
        <button id="save">Save username, email, wins and played</button></div></div>
      <div class="card"><h3>Characters</h3><p class="muted small">Unlocked ones are earned through XP, wins or tournaments, or granted here. Granting never takes away an earned character.</p>
        ${d.skins.map((s) => `<div class="list-item"><div>${esc(s.emoji)} <b>${esc(s.name)}</b> ${u.skin === s.id ? '<span class="pill lobby">equipped</span>' : ''}
          <div class="muted small">${esc(s.requirement)} · ${s.byRule ? 'earned' : s.granted ? 'granted by admin' : 'locked'}</div></div>
          <div class="row">${u.skin !== s.id ? `<button class="ghost" data-equip="${s.id}">Equip</button>` : ''}${s.granted ? `<button class="ghost" data-rev="${s.id}">Take back</button>` : !s.byRule ? `<button data-grant="${s.id}">Unlock</button>` : ''}</div></div>`).join('')}
        <div style="margin-top:10px"><button id="unlock-all" class="ghost">Unlock every character</button></div></div>
      <div class="card"><h3>Account controls</h3>
        <div class="row"><button class="ghost" id="toggle-admin" ${self ? 'disabled' : ''}>${u.is_admin ? 'Remove admin' : 'Make admin'}</button>
        ${u.is_banned ? '<button id="unban">Lift suspension</button>' : `<input id="reason" placeholder="Reason (shown to the player)" ${self ? 'disabled' : ''}><button class="danger" id="ban" ${self ? 'disabled' : ''}>Suspend</button>`}</div>
        <div class="row" style="margin-top:10px"><input id="newpw" type="text" placeholder="New password (min 6)"><button class="ghost" id="resetpw">Reset password</button>
        <button class="danger" id="delete" ${self ? 'disabled' : ''}>Delete account</button></div>${u.ban_reason ? `<p class="muted small">Suspension reason: ${esc(u.ban_reason)}</p>` : ''}</div>
      <div class="card"><h3>Recent tournaments</h3>${d.rooms.map((r) => `<div class="list-item"><div><b>${esc(r.name)}</b> <span class="muted small">${esc(r.code)} · ${({ typerace: 'typing race', draw: 'draw & guess' })[r.game_type] || 'quiz'}</span></div>
        <span class="muted small">${r.status === 'finished' ? (r.placement === 1 ? '🏆 won' : r.placement ? 'place ' + r.placement : 'finished') : r.status} · ${aFmt(r.created_at)}</span></div>`).join('') || '<p class="muted">Nothing played yet.</p>'}</div>`,
    wire() {
      const send = async (method, url, body, okMsg) => {
        try { await api(method, '/admin/users/' + id + url, body); toast(okMsg || 'Saved', true); viewAdmin('u' + id); }
        catch (e) { $('#aerr').textContent = e.message; toast(e.message); }
      };
      const num = (sel) => Number($(sel).value);
      $('#save').onclick = () => send('PATCH', '', { username: $('#f-username').value, email: $('#f-email').value, wins: num('#f-wins'), tournaments: num('#f-tour') });
      $('#set-level').onclick = () => send('PATCH', '', { level: num('#f-level') }, 'Level updated');
      $('#set-xp').onclick = () => send('PATCH', '', { xp: num('#f-xp') }, 'XP updated');
      $('#add-xp').onclick = () => { const v = $('#f-addxp').value; if (v !== '') send('PATCH', '', { add_xp: Number(v) }, 'XP added'); };
      app.querySelectorAll('[data-equip]').forEach((b) => { b.onclick = () => send('PATCH', '', { skin: b.dataset.equip }, 'Character equipped (and unlocked)'); });
      app.querySelectorAll('[data-grant]').forEach((b) => { b.onclick = () => send('POST', '/skins', { skin: b.dataset.grant, grant: true }, 'Character unlocked'); });
      app.querySelectorAll('[data-rev]').forEach((b) => { b.onclick = () => send('POST', '/skins', { skin: b.dataset.rev, grant: false }, 'Character taken back'); });
      $('#unlock-all').onclick = async () => {
        try { for (const s of d.skins) if (!s.unlocked) await api('POST', `/admin/users/${id}/skins`, { skin: s.id, grant: true }); toast('Everything unlocked', true); viewAdmin('u' + id); }
        catch (e) { toast(e.message); }
      };
      $('#toggle-admin').onclick = () => { if (confirm(u.is_admin ? `Remove admin rights from ${u.username}?` : `Give ${u.username} full admin rights?`)) send('PATCH', '', { is_admin: !u.is_admin }); };
      const ban = $('#ban');
      if (ban) ban.onclick = () => { if (confirm(`Suspend ${u.username}? They are logged out and cannot sign in.`)) send('PATCH', '', { is_banned: true, ban_reason: $('#reason').value }, 'Suspended'); };
      const unban = $('#unban');
      if (unban) unban.onclick = () => send('PATCH', '', { is_banned: false, ban_reason: '' }, 'Suspension lifted');
      $('#resetpw').onclick = async () => {
        try { await api('POST', `/admin/users/${id}/password`, { password: $('#newpw').value }); toast('Password changed', true); $('#newpw').value = ''; }
        catch (e) { toast(e.message); }
      };
      $('#delete').onclick = async () => {
        if (prompt(`This permanently deletes ${u.username} and their history. Type the username to confirm:`) !== u.username) return;
        try { await api('DELETE', '/admin/users/' + id); toast('Account deleted', true); location.hash = '#/admin/users'; } catch (e) { toast(e.message); }
      };
    },
  };
}

/* ----- tournaments ----- */
async function adminRooms() {
  const s = aState.rooms;
  const d = await api('GET', `/admin/rooms?status=${s.status}&page=${s.page}`);
  const pages = Math.max(1, Math.ceil(d.total / d.limit));
  return {
    html: `<div class="card"><div class="row">${['', 'lobby', 'playing', 'finished'].map((k) => `<button class="${s.status === k ? '' : 'ghost'}" data-status="${k}">${k || 'All'}</button>`).join('')}</div>
      <p class="muted small">${d.total} tournament${d.total === 1 ? '' : 's'}</p>
      ${d.rooms.map((r) => `<div class="list-item"><div><b>${esc(r.name)}</b> <span class="pill ${r.status}">${r.status}</span>
        <div class="muted small">${esc(r.code)} · ${({ typerace: 'typing race', draw: 'draw & guess' })[r.game_type] || 'quiz'} · host ${esc(r.host)} · ${r.humans} players + ${r.players - r.humans} bots · ${aFmt(r.created_at)}</div></div>
        <div class="row">${r.status !== 'finished' ? `<a class="btn ghost" href="#/room/${r.code}">Watch</a>` : ''}<button class="danger" data-del="${r.code}">Close & delete</button></div></div>`).join('') || '<p class="muted">None.</p>'}
      <div class="row" style="margin-top:10px"><button class="ghost" id="rprev" ${s.page <= 1 ? 'disabled' : ''}>Previous</button><span class="muted">Page ${d.page} of ${pages}</span><button class="ghost" id="rnext" ${s.page >= pages ? 'disabled' : ''}>Next</button></div></div>`,
    wire() {
      app.querySelectorAll('[data-status]').forEach((b) => { b.onclick = () => { s.status = b.dataset.status; s.page = 1; viewAdmin('rooms'); }; });
      $('#rprev').onclick = () => { s.page--; viewAdmin('rooms'); };
      $('#rnext').onclick = () => { s.page++; viewAdmin('rooms'); };
      app.querySelectorAll('[data-del]').forEach((b) => {
        b.onclick = async () => {
          if (!confirm(`Close and delete tournament ${b.dataset.del}? Players in it are sent home.`)) return;
          try { await api('DELETE', '/admin/rooms/' + b.dataset.del); toast('Tournament deleted', true); viewAdmin('rooms'); } catch (e) { toast(e.message); }
        };
      });
    },
  };
}

/* ----- content ----- */
async function adminContent() {
  const d = await api('GET', '/admin/content');
  return {
    html: `<div class="card"><h3>Categories</h3>${d.categories.map((c) => `<div class="list-item"><div><b>${esc(c.name)}</b> <span class="muted small">${c.quizzes} quizzes</span></div>
        <div class="row"><button class="ghost" data-rename="${c.id}" data-name="${esc(c.name)}">Rename</button><button class="danger" data-delcat="${c.id}" data-name="${esc(c.name)}">Delete</button></div></div>`).join('') || '<p class="muted">None.</p>'}</div>
      <div class="card"><h3>Quizzes</h3>${d.quizzes.map((z) => `<div class="list-item"><div><b>${esc(z.title)}</b> ${z.is_public ? '' : '<span class="pill">private</span>'}
        <div class="muted small">${esc(z.category || 'No category')} · ${z.questions} questions · by ${esc(z.owner)} · used in ${z.used} tournaments</div></div>
        <div class="row"><button class="ghost" data-vis="${z.id}" data-pub="${z.is_public ? 1 : 0}">${z.is_public ? 'Make private' : 'Make public'}</button><button class="danger" data-delquiz="${z.id}" data-name="${esc(z.title)}">Delete</button></div></div>`).join('') || '<p class="muted">None.</p>'}</div>`,
    wire() {
      const run = async (fn, msg) => { try { await fn(); toast(msg, true); viewAdmin('content'); } catch (e) { toast(e.message); } };
      app.querySelectorAll('[data-rename]').forEach((b) => { b.onclick = () => { const n = prompt('New category name', b.dataset.name); if (n) run(() => api('PATCH', '/admin/categories/' + b.dataset.rename, { name: n }), 'Renamed'); }; });
      app.querySelectorAll('[data-delcat]').forEach((b) => { b.onclick = () => { if (confirm(`Delete category "${b.dataset.name}"? Its quizzes become uncategorised.`)) run(() => api('DELETE', '/admin/categories/' + b.dataset.delcat), 'Deleted'); }; });
      app.querySelectorAll('[data-vis]').forEach((b) => { b.onclick = () => run(() => api('PATCH', '/admin/quizzes/' + b.dataset.vis, { is_public: b.dataset.pub !== '1' }), 'Updated'); });
      app.querySelectorAll('[data-delquiz]').forEach((b) => { b.onclick = () => { if (confirm(`Delete quiz "${b.dataset.name}" and all its questions?`)) run(() => api('DELETE', '/admin/quizzes/' + b.dataset.delquiz), 'Deleted'); }; });
    },
  };
}

/* ----- activity log ----- */
async function adminLog() {
  const d = await api('GET', '/admin/log');
  return {
    html: `<div class="card"><h3>What admins changed</h3><p class="muted small">The latest 150 actions.</p>${d.log.map((l) => `<div class="list-item"><div><b>${esc(l.action.replace(/_/g, ' '))}</b> ${l.target ? '· ' + esc(l.target) : ''}
      <div class="muted small">by ${esc(l.admin_name)} · ${aFmt(l.created_at)}</div>${l.details ? `<div class="muted small" style="word-break:break-all">${esc(l.details)}</div>` : ''}</div></div>`).join('') || '<p class="muted">Nothing yet.</p>'}</div>`,
  };
}
