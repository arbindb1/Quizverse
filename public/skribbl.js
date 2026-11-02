/* Skribbl side of the site: no account, just a name and a character. Entry page (host or play from an invite), guest home. */
const SKR_ADJ = ['Happy', 'Sneaky', 'Wobbly', 'Sleepy', 'Brave', 'Fuzzy', 'Zippy', 'Cosmic', 'Jolly', 'Silly', 'Mighty', 'Tiny'];
const SKR_NOUN = ['Doodle', 'Panda', 'Pencil', 'Noodle', 'Rocket', 'Pickle', 'Falcon', 'Waffle', 'Comet', 'Otter', 'Muffin', 'Yeti'];
const skrRandomName = () => SKR_ADJ[Math.floor(Math.random() * SKR_ADJ.length)] + SKR_NOUN[Math.floor(Math.random() * SKR_NOUN.length)];
const skrSaved = () => { try { return JSON.parse(localStorage.getItem('qv_guest') || '{}'); } catch { return {}; } };
const skrSave = (v) => { try { localStorage.setItem('qv_guest', JSON.stringify({ ...skrSaved(), ...v })); } catch { /* private mode */ } };

const skrLogo = () => `<div class="skr-logo" aria-label="Draw and Guess">${[...'Draw&Guess'].map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>`;
const authTabs = (active) => `<div class="auth-tabs"><a href="#/login" class="${active === 'login' ? 'on' : ''}">🏆 Tournament</a><a href="#/skribbl" class="${active === 'skribbl' ? 'on' : ''}">🎨 Skribbl</a></div>`;

const skrHow = () => `<div class="skr-how">
  <div><b>✏️ Draw</b><span>Pick a word and sketch it before time runs out</span></div>
  <div><b>💬 Guess</b><span>Type what you see. Faster guesses score more</span></div>
  <div><b>🏆 Win</b><span>Highest score after all rounds takes the podium</span></div></div>`;

/* ----- entry page: #/skribbl (host) and #/play/<token> (play from an invite) ----- */
async function viewSkribbl(token) {
  document.body.classList.add('skr');
  renderNav();
  let invite = null, inviteErr = '';
  if (token) {
    try { invite = await api('GET', '/play/' + encodeURIComponent(token)); } catch (e) { inviteErr = e.message; }
  }
  const saved = skrSaved();
  const joining = !!token && !!invite;
  app.innerHTML = `<div class="skr-wrap">${skrLogo()}${authTabs('skribbl')}
    <div class="skr-card">
      ${joining ? `<div class="skr-invite">🎉 <b>${esc(invite.host || 'A friend')}</b> invited you to <b>${esc(invite.name)}</b><span class="muted small"> · ${invite.players}/${invite.maxPlayers} players${invite.status !== 'lobby' ? ' · already started' : ''}</span></div>` : ''}
      ${token && !invite ? `<div class="skr-invite bad">${esc(inviteErr)}. You can still <b>create your own room</b> below.</div>` : ''}
      <label>Your name</label>
      <div class="row"><input id="gname" class="grow" maxlength="20" autocomplete="nickname" value="${esc(saved.name || skrRandomName())}"><button class="ghost" id="dice" title="Random name">🎲</button></div>
      <label>Your doodle <span class="muted small">(face shape, hair, clothes, eyes, brows, mouth, mustache, hat: mix anything)</span></label>
      <div id="gle"></div>
      <div class="err" id="gerr"></div>
      ${joining ? '<button class="skr-play" id="goplay">▶ Play!</button><button class="ghost skr-alt" id="gohost">Create a private room instead</button>'
        : '<button class="skr-play" id="gohost">✨ Create a private room</button><p class="muted small" style="text-align:center">You will get an invite link to share with your friends.</p>'}
    </div>${skrHow()}
    <p class="muted small" style="text-align:center">Want rankings, XP and tournaments? <a href="#/login">Log in to the tournament side</a></p></div>`;
  let lookNow = migrateLook(saved.look) || null;
  loadLookParts().then(async () => {
    if (!lookNow) lookNow = randomLook();
    skrSave({ look: lookNow });
    await mountLookEditor($('#gle'), lookNow, (l) => { lookNow = l; skrSave({ look: l }); });
  });
  $('#dice').onclick = () => { $('#gname').value = skrRandomName(); };
  const go = async (kind) => {
    const name = $('#gname').value.trim();
    $('#gerr').textContent = '';
    const btns = app.querySelectorAll('button');
    btns.forEach((b) => (b.disabled = true));
    try {
      skrSave({ name });
      setSession(await api('POST', '/auth/guest', { name, look: lookNow }));
      const r = kind === 'join' ? await api('POST', '/rooms/join', { token })
        : await api('POST', '/rooms', { game_type: 'draw', name: `${name}'s room`, max_players: 8, questions_per_match: 3, text_length: 'medium' });
      location.hash = '#/room/' + r.code;
    } catch (e) {
      $('#gerr').textContent = e.message;
      btns.forEach((b) => (b.disabled = false));
      if (token && kind === 'join') toast(e.message);
    }
  };
  if ($('#goplay')) $('#goplay').onclick = () => go('join');
  $('#gohost').onclick = () => go('host');
  $('#gname').onkeydown = (e) => { if (e.key === 'Enter') go(joining ? 'join' : 'host'); };
}

/* ----- a guest who is already in follows an invite straight away ----- */
async function viewPlay(token) {
  if (!me) return viewSkribbl(token);
  if (!me.guest) return viewJoin(decodeURIComponent(token || '')); // someone with an account uses the normal join page
  document.body.classList.add('skr');
  app.innerHTML = '<div class="skr-wrap">' + skrLogo() + '<p class="muted" style="text-align:center">Joining…</p></div>';
  try { location.hash = '#/room/' + (await api('POST', '/rooms/join', { token: decodeURIComponent(token || '') })).code; }
  catch (e) {
    app.innerHTML = `<div class="skr-wrap">${skrLogo()}<div class="skr-card"><h3>Could not join</h3><p class="muted">${esc(e.message)}</p><a class="btn" href="#/">Back</a></div></div>`;
  }
}

/* ----- home of a guest ----- */
async function viewGuestHome() {
  document.body.classList.add('skr');
  const [rooms, profile] = await Promise.all([api('GET', '/rooms/mine').catch(() => []), api('GET', '/profile').catch(() => null)]);
  app.innerHTML = `<div class="skr-wrap">${skrLogo()}
    <div class="skr-card">
      <div class="skr-hi"><h2 style="margin:0">Hi ${esc(me.username)}! 👋</h2><div class="muted small">Your doodle</div></div>
      <div id="gle"></div>
      <button class="skr-play" id="gohost">✨ Create a private room</button>
      <label>Got an invite? Paste the link or code</label>
      <div class="row"><input id="code" class="grow" placeholder="Invite link or room code" maxlength="120"><button id="join">Join</button></div>
      <div class="err" id="gerr"></div></div>
    ${rooms.length ? `<div class="skr-card"><h3>Your rooms</h3>${rooms.map((r) => `<div class="list-item"><div><a href="#/room/${r.code}"><b>${esc(r.name)}</b></a>
      <div class="muted small">${r.is_host ? 'Hosting' : 'Playing'} · ${r.players}/${r.max_players} players</div></div><span class="pill ${r.status}">${r.status}</span></div>`).join('')}</div>` : ''}
    ${skrHow()}</div>`;
  let lookNow = (profile && profile.look) || null, saveT = null;
  const saveLook = () => { clearTimeout(saveT); saveT = setTimeout(() => api('POST', '/profile/look', { look: lookNow }).catch((e) => toast(e.message)), 500); };
  loadLookParts().then(async () => {
    if (!lookNow) { lookNow = randomLook(); saveLook(); }
    await mountLookEditor($('#gle'), lookNow, (l) => { lookNow = l; saveLook(); });
  });
  $('#gohost').onclick = async () => {
    try { location.hash = '#/room/' + (await api('POST', '/rooms', { game_type: 'draw', name: `${me.username}'s room`, max_players: 8, questions_per_match: 3, text_length: 'medium' })).code; }
    catch (e) { $('#gerr').textContent = e.message; }
  };
  const join = async () => {
    const key = $('#code').value.trim().split('/').pop().replace(/^#?\/?(join|play)\//, '');
    if (!key) return;
    try { location.hash = '#/room/' + (await api('POST', '/rooms/join', { token: key })).code; } catch (e) { $('#gerr').textContent = e.message; }
  };
  $('#join').onclick = join;
  $('#code').onkeydown = (e) => { if (e.key === 'Enter') join(); };
}
