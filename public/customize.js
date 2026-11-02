/* Custom Doodle: a blank funny kid that players dress up with eyes, eyebrows, a mouth, a mustache, a hat and two colours.
 * The parts are pictures in public/media/custom (cut from Flow sheets); a look is a small object, see src/look.js:
 *   { skin: '#hex', jacket: '#hex', eyes: n, brows: n|-1, mouth: n, mustache: n|-1, hat: n|-1 } */
// optional picture categories: glasses and face items only appear in the editor once their pictures are in public/media/custom (parts.json)
const LOOK_CATS = [
  { key: 'eyes', dir: 'eyes', label: '👀 Eyes', optional: false },
  { key: 'brows', dir: 'brows', label: '🤨 Brows', optional: true },
  { key: 'mouth', dir: 'mouths', label: '👄 Mouth', optional: false },
  { key: 'mustache', dir: 'mustaches', label: '🥸 Mustache', optional: true },
  { key: 'hat', dir: 'hats', label: '🎩 Hat', optional: true },
  { key: 'beard', dir: 'beards', label: '🧔 Beard', optional: true, extra: true },
  { key: 'expr', dir: 'expr', label: '😜 Expression', optional: true, extra: true }, // a whole face (eyes, brows and mouth together)
  { key: 'glasses', dir: 'glasses', label: '🕶️ Glasses', optional: true, extra: true },
  { key: 'face', dir: 'faceitems', label: '🤡 Face items', optional: true, extra: true },
  { key: 'neck', dir: 'neck', label: '📿 Neck & ears', optional: true, extra: true },
];
const SKIN_TONES = ['#facdac', '#f3b88e', '#d9a066', '#b97a4b', '#8d5a3b', '#5b3a26', '#fff0d6', '#c9e8a0', '#a6d8ff', '#ffb3d1'];
const JACKETS = ['#d32626', '#ff7a1a', '#f2b81f', '#2fa84f', '#2e7bd6', '#8e44c8', '#ff7fb0', '#333344', '#ffffff', '#8b5a2b'];
const DEFAULT_LOOK = { skin: '#facdac', jacket: '#d32626', tint: {}, bg: '', head: 0, body: 0, hair: -1, wrap: -1, wrapColor: '#ffffff', hairColor: '#3b2a20', outfit: 0, eyes: 0, brows: 0, mouth: 3, mustache: -1, beard: -1, hat: -1, glasses: -1, face: -1, expr: -1, neck: -1 };
// colours for the pictures: the palette a part can be recoloured with (the drawn parts have their own colour rows)
const TINT_COLORS = ['#111111', '#4a3020', '#7a4a21', '#c47a2c', '#e8c35a', '#d9d9d9', '#d32626', '#ff7fb0', '#8e44c8', '#2e7bd6', '#22aab8', '#2fa84f'];
const BG_COLORS = ['', '#2a2f55', '#0f6b5c', '#8a1f4b', '#b8651a', '#1f5fa8', '#5b3a8c', '#444444', '#e0b84a', '#d98ab0'];
const TINT_TABS = ['expr', 'eyes', 'brows', 'mouth', 'mustache', 'beard', 'hat', 'glasses', 'face', 'neck'];
// the plain character the Reset button goes back to: default colours, round head, average body, no hair or extras, simple eyes, no brows, a flat mouth
const BLAND_LOOK = { ...DEFAULT_LOOK, tint: {}, bg: '', eyes: 0, brows: -1, mouth: 1 };
const LOOK_BASE = [250, 205, 172]; // the skin colour of the original picture (also the bald domes of some hats)
let LOOK_PARTS = null;

// Looks saved before the Beard slot existed (in this browser) kept beards in the mustache slot: old mustache numbers 4, 5, 7, 8, 9 were beards, 0, 1, 2, 3, 6 are the mustaches
const OLD_BEARD = { 4: 0, 5: 1, 7: 2, 8: 3, 9: 4 }, OLD_MUSTACHE = { 0: 0, 1: 1, 2: 2, 3: 3, 6: 4 };
function migrateLook(l) {
  if (!l || typeof l !== 'object' || l.beard !== undefined || !(l.mustache >= 0)) return l;
  if (l.mustache in OLD_BEARD) return { ...l, mustache: -1, beard: OLD_BEARD[l.mustache] };
  return { ...l, mustache: l.mustache in OLD_MUSTACHE ? OLD_MUSTACHE[l.mustache] : -1 };
}
async function loadLookParts() {
  if (!LOOK_PARTS) LOOK_PARTS = await fetch('/media/custom/parts.json').then((r) => r.json()).catch(() => null);
  return LOOK_PARTS;
}
// eyes and hats at the end of the lists contain skin (chad pieces): the random looks only use the plain ones
const plain = (k) => LOOK_PARTS[k].filter((p) => !p.tone).length;
const randomLook = () => {
  const n = (k) => LOOK_PARTS[k].length, r = (m) => Math.floor(Math.random() * m);
  return { skin: SKIN_TONES[r(SKIN_TONES.length)], jacket: JACKETS[r(JACKETS.length)], head: r(HEADS.length), body: r(BODIES.length), hair: Math.random() < 0.8 ? r(HAIRS.length) : -1,
    hairColor: HAIR_COLORS[r(HAIR_COLORS.length)], outfit: r(OUTFITS.length), glasses: Math.random() < 0.15 && n('glasses') ? r(n('glasses')) : -1, face: -1, expr: -1, neck: -1, eyes: r(plain('eyes')), brows: r(n('brows')), mouth: r(n('mouths')),
    mustache: Math.random() < 0.4 ? r(n('mustaches')) : -1, beard: Math.random() < 0.2 ? r(n('beards')) : -1, hat: Math.random() < 0.6 ? r(plain('hats')) : -1 };
};

/* ----- where each part sits on the 1024 x 1024 picture of the blank kid (head: x 165-860, y 95-705) ----- */
// A piece may carry its own size multiplier s and centre (cx, cy); otherwise the usual line of its kind is used.
function partBox(dir, p, cxOverride) {
  const S = 1024, k = p.s || 1, w = p.w * S * k, h = p.h * S * k, cx = cxOverride || p.cx || 512;
  let cy = p.cy || 372, top = null;
  if (!p.cy) {
    if (dir === 'brows') cy = 285;
    else if (dir === 'mouths') cy = 560;
    else if (dir === 'mustaches') { if (h / w > 0.6) top = 470; else cy = 500; } // beards start under the nose and wrap the mouth
    else if (dir === 'hats') top = 215 - h; // the hat sits on the head, its brim over the forehead
  }
  if (p.top !== undefined) top = p.top; // a piece may say where its top edge goes
  const t = top !== null ? top : cy - h / 2;
  return `left:${((cx - w / 2) / S) * 100}%;top:${(t / S) * 100}%;width:${(w / S) * 100}%;height:${(h / S) * 100}%`;
}

/* ----- recolouring (skin and jacket are flat colours, so swapping them is exact) ----- */
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const imgCache = new Map();
const recolorCache = new Map();
const loadImg = (src) => imgCache.get(src) || imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; })).get(src);
async function recolored(src, skin, jacket) {
  const plainSkin = skin === DEFAULT_LOOK.skin, plainJacket = !jacket || jacket === DEFAULT_LOOK.jacket;
  if (plainSkin && plainJacket) return src;
  const key = `${src}|${skin}|${jacket || ''}`;
  if (recolorCache.has(key)) return recolorCache.get(key);
  const img = await loadImg(src);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height), d = id.data;
  const sk = hexRgb(skin), jk = jacket ? hexRgb(jacket) : null;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 30) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (!plainSkin && Math.abs(r - LOOK_BASE[0]) + Math.abs(g - LOOK_BASE[1]) + Math.abs(b - LOOK_BASE[2]) < 45) { d[i] = sk[0]; d[i + 1] = sk[1]; d[i + 2] = sk[2]; }
    else if (jk && !plainJacket && r > 150 && g < 100 && b < 100 && r - g > 80) { d[i] = jk[0]; d[i + 1] = jk[1]; d[i + 2] = jk[2]; }
  }
  ctx.putImageData(id, 0, 0);
  const url = c.toDataURL('image/png');
  recolorCache.set(key, url);
  return url;
}

// Pieces with skin in them (chad eyes, jaws, hair with a forehead): their skin-like pixels are made see-through so the head's own skin shows
const tonedCache = new Map();
async function toned(src, skin) {
  const key = src + '|' + skin;
  if (tonedCache.has(key)) return tonedCache.get(key);
  const img = await loadImg(src);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height), d = id.data, sk = hexRgb(skin);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 30) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, sat = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
    const hue = mx === mn ? 0 : mx === r ? (((g - b) / (mx - mn)) % 6) * 60 : mx === g ? ((b - r) / (mx - mn) + 2) * 60 : ((r - g) / (mx - mn) + 4) * 60;
    const h = (hue + 360) % 360;
    if (h > 42 && h < 120 && sat > 0.15 && l > 0.25) { d[i + 3] = 0; continue; } // olive fringe left where the green background met the skin
    if (h >= 8 && h <= 42 && sat >= 0.22 && l >= 0.42 && l <= 0.9) { // skin: flat skin becomes see-through (the head's own skin shows), only the shading stays as a soft dark overlay
      const f = l / 0.68;
      if (f >= 0.93) d[i + 3] = 0;
      else { d[i] = d[i + 1] = d[i + 2] = 20; d[i + 3] = Math.min(150, Math.round(((0.93 - f) / 0.2) * 150)); }
    }
  }
  ctx.putImageData(id, 0, 0);
  const url = c.toDataURL('image/png');
  tonedCache.set(key, url);
  return url;
}

// Recolour a picture: coloured parts get the new hue (keeping their light and dark shades); white or grey parts (a white beard) get the colour as their fill and keep the dark outline;
// parts that are only black ink get the colour as ink. allowFill is off for eyes, so the whites of the eyes stay white.
const rgbToHsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
const hslToRgb = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; if (s === 0) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; };
const tintCache = new Map();
async function tinted(src, hex, allowFill = true) {
  const key = src.slice(0, 80) + src.length + '|' + hex + '|' + allowFill;
  if (tintCache.has(key)) return tintCache.get(key);
  const img = await loadImg(src);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height), d = id.data;
  const [th, ts, tl] = rgbToHsl(...hexRgb(hex));
  let n = 0, colourful = 0, sumL = 0, lightGrey = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 30) continue;
    n++;
    const [, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    if (s > 0.25 && l > 0.18 && l < 0.92) { colourful++; sumL += l; } else if (s <= 0.25 && l > 0.3) lightGrey++;
  }
  const hueMode = n && colourful / n > 0.04, avgL = colourful ? sumL / colourful : 0.5;
  const fillMode = !hueMode && allowFill && n && lightGrey / n > 0.06;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 30) continue;
    const [, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    let out = null;
    if (hueMode && s > 0.25 && l > 0.18 && l < 0.92) out = hslToRgb(th, ts === 0 ? 0 : Math.min(1, ts * (0.65 + 0.6 * s)), Math.max(0.1, Math.min(0.92, l + (tl - avgL))));
    else if (fillMode && s <= 0.25 && l > 0.3) out = hslToRgb(th, ts, Math.max(0.05, Math.min(0.95, tl * (0.5 + 0.5 * l) + (tl < 0.3 ? 0 : 0))));
    else if (!hueMode && !fillMode && l < 0.5) out = hslToRgb(th, ts, Math.max(0.03, Math.min(0.9, tl * (0.55 + 0.9 * (l / 0.5)))));
    if (out) { d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; }
  }
  ctx.putImageData(id, 0, 0);
  const url = c.toDataURL('image/png');
  tintCache.set(key, url);
  return url;
}

/* ----- drawing a look: charArt() puts an empty .cc in the page, this fills it once the pictures are ready ----- */
const lookArt = (look, full) => `<span class="cc${full ? ' full' : ''}"${look && look.bg ? ` style="background:${esc(look.bg)}"` : ''} data-look="${esc(JSON.stringify(look))}"></span>`; // full: the whole body (editor), otherwise head and shoulders
async function fillLook(el) {
  let look;
  try { look = JSON.parse(el.dataset.look); } catch { return; }
  const parts = await loadLookParts();
  if (!parts || !look) return;
  const piece = (dir, idx) => (idx == null || idx < 0 || !parts[dir] ? null : parts[dir][idx] || null);
  const layer = async (dir, idx, tintKey) => {
    const p = piece(dir, idx);
    if (!p) return '';
    const src = `/media/custom/${dir}/${idx + 1}.png`;
    let url = p.tone ? await toned(src, look.skin) : dir === 'hats' ? await recolored(src, look.skin, null) : src;
    const tn = look.tint && look.tint[tintKey];
    if (Number.isInteger(tn) && TINT_COLORS[tn]) url = await tinted(url, TINT_COLORS[tn], tintKey !== 'eyes' && tintKey !== 'expr');
    if (p.pair) { // earrings: one picture, drawn on both sides (the right one mirrored)
      return `<img class="cl" alt="" style="${partBox(dir, p, 512 - p.pair)}" src="${url}"><img class="cl mir" alt="" style="${partBox(dir, p, 512 + p.pair)}" src="${url}">`;
    }
    return `<img class="cl" alt="" style="${partBox(dir, p)}" src="${url}">`;
  };
  // a whole expression replaces eyes, brows and mouth
  const hidden = new Set([piece('expr', look.expr)].filter(Boolean).flatMap((p) => String(p.hide || '').split(',')));
  // the body, face shape and hair are drawn (doodle.js); the Flow pictures go on top
  el.innerHTML = `<span class="cstage">${doodleSvg(look, { cls: 'cl cbase' })}${await layer('beards', look.beard, 'beard')}${hidden.has('mouth') ? '' : await layer('mouths', look.mouth, 'mouth')}${await layer('mustaches', look.mustache, 'mustache')}${await layer('faceitems', look.face, 'face')}${hidden.has('eyes') ? '' : await layer('eyes', look.eyes, 'eyes')}${hidden.has('brows') ? '' : await layer('brows', look.brows, 'brows')}${await layer('expr', look.expr, 'expr')}${await layer('glasses', look.glasses, 'glasses')}${await layer('neck', look.neck, 'neck')}${await layer('hats', look.hat, 'hat')}</span>`;
}
function hydrateLooks() {
  document.querySelectorAll('.cc:not([data-ok])').forEach((el) => { el.dataset.ok = '1'; fillLook(el); });
}
new MutationObserver(hydrateLooks).observe(document.documentElement, { childList: true, subtree: true });

/* ----- the editor: preview, tabs, and a grid of choices. onChange(look) is called after every change ----- */
async function mountLookEditor(el, startLook, onChange) {
  const parts = await loadLookParts();
  if (!parts) { el.innerHTML = '<p class="muted">The character parts are not installed (public/media/custom).</p>'; return () => DEFAULT_LOOK; }
  let look = { ...DEFAULT_LOOK, ...(migrateLook(startLook) || {}) };
  // three sections, each with a few small tabs, so the editor is never a wall of buttons
  const TAB_LABEL = { bg: 'Background', wrap: 'Head wrap', wrapColor: 'Wrap colour', head: 'Face shape', body: 'Body type', skin: 'Skin', hair: 'Hair', hairColor: 'Hair colour', outfit: 'Clothes', jacket: 'Clothes colour', expr: 'Whole face', eyes: 'Eyes', brows: 'Brows',
    mouth: 'Mouth', mustache: 'Mustache', beard: 'Beard', hat: 'Hat', glasses: 'Glasses', face: 'Face items', neck: 'Neck & ears' };
  const SECTIONS = [
    { key: 'body', label: '🧍 Body', tabs: ['head', 'body', 'skin', 'hair', 'hairColor', 'outfit', 'jacket', 'bg'] },
    { key: 'face', label: '😀 Face', tabs: ['expr', 'eyes', 'brows', 'mouth', 'mustache', 'beard'] },
    { key: 'extras', label: '🎩 Extras', tabs: ['hat', 'wrap', 'wrapColor', 'glasses', 'face', 'neck'] },
  ];
  const HINT = { expr: 'A whole face in one go. It replaces the eyes, brows and mouth.', hairColor: 'Colour of the hairstyle.', jacket: 'Colour of the clothes.', head: 'Pick a face shape: round, chubby, skinny, chad, gigachad and more.', body: 'Thin, chubby, fat, muscular, curvy and more. Your clothes fit the body.' };
  const hasTab = (k) => { const cat = LOOK_CATS.find((x) => x.key === k); return !cat || !cat.extra || (parts[cat.dir] && parts[cat.dir].length); };
  let section = 'body', tab = 'head';
  const set = (patch) => { look = { ...look, ...patch }; paint(); onChange(look); };
  const grid = () => {
    if (tab === 'head' || tab === 'hair' || tab === 'outfit' || tab === 'body' || tab === 'wrap') { // drawn options: small pictures made from the same shapes
      const list = tab === 'head' ? HEADS : tab === 'hair' ? HAIRS : tab === 'body' ? BODIES : tab === 'wrap' ? WRAPS : OUTFITS;
      const box = tab === 'head' ? '140 70 744 700' : tab === 'hair' || tab === 'wrap' ? '70 -60 884 920' : '0 40 1024 960';
      const none = tab === 'hair' ? `<button class="le-opt none ${look.hair === -1 ? 'on' : ''}" data-pick="-1">Bald</button>` : tab === 'wrap' ? `<button class="le-opt none ${look.wrap === -1 ? 'on' : ''}" data-pick="-1">None</button>` : '';
      return none + list.map((o, i) => `<button class="le-opt ${look[tab] === i ? 'on' : ''}" data-pick="${i}" title="${esc(o.name)}">${doodleSvg({ ...look, head: tab === 'head' ? i : 0, body: tab === 'body' ? i : look.body, hair: tab === 'hair' ? i : -1, wrap: tab === 'wrap' ? i : -1, outfit: tab === 'outfit' ? i : tab === 'body' ? look.outfit : 0, hairColor: look.hairColor, wrapColor: look.wrapColor }, { box })}</button>`).join('');
    }
    if (tab === 'skin' || tab === 'jacket' || tab === 'hairColor' || tab === 'wrapColor' || tab === 'bg') {
      const list = tab === 'skin' ? SKIN_TONES : tab === 'jacket' || tab === 'wrapColor' ? JACKETS : tab === 'bg' ? BG_COLORS : HAIR_COLORS;
      return list.map((c) => `<button class="le-sw ${look[tab] === c ? 'on' : ''}" data-color="${c}" style="background:${c || 'linear-gradient(135deg,#6a5cff,#1d1f4a)'}" aria-label="${c || 'default'}"></button>`).join('');
    }
    const cat = LOOK_CATS.find((c) => c.key === tab);
    if (!parts[cat.dir]) return '';
    const none = cat.optional ? `<button class="le-opt none ${look[tab] === -1 ? 'on' : ''}" data-pick="-1">None</button>` : '';
    return none + parts[cat.dir].map((_, i) => `<button class="le-opt ${look[tab] === i ? 'on' : ''}" data-pick="${i}"><img alt="" src="/media/custom/${cat.dir}/${i + 1}.png" loading="lazy"></button>`).join('');
  };
  // under every picture tab: a row of colours to recolour that part (the first swatch puts the original colours back)
  const tintRow = () => {
    if (!TINT_TABS.includes(tab) || !(look[tab] >= 0)) return TINT_TABS.includes(tab) ? '<p class="muted small le-tinthint">Pick one first, then you can change its colour here.</p>' : '';
    const cur = look.tint && Number.isInteger(look.tint[tab]) ? look.tint[tab] : -1;
    return `<div class="le-tint"><span class="muted small">Colour</span><button class="le-ts orig ${cur === -1 ? 'on' : ''}" data-tint="-1" title="Original colours">↺</button>${TINT_COLORS.map((c, i) => `<button class="le-ts ${cur === i ? 'on' : ''}" data-tint="${i}" style="background:${c}" aria-label="colour ${i + 1}"></button>`).join('')}</div>`;
  };
  function paint() {
    const sec = SECTIONS.find((s) => s.key === section);
    el.innerHTML = `<div class="le"><div class="le-prev">${charHtml({ skin: 'custom', look, full: true }, 'xl', '')}<div class="le-btns"><button class="ghost" data-rand>🎲 Surprise me</button><button class="ghost" data-reset title="Back to a plain character">↺ Reset</button></div></div>
      <div class="le-main"><div class="le-sections">${SECTIONS.map((s) => `<button class="${s.key === section ? 'on' : ''}" data-section="${s.key}">${s.label}</button>`).join('')}</div>
      <div class="le-tabs">${sec.tabs.filter(hasTab).map((k) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${TAB_LABEL[k]}</button>`).join('')}</div>
      ${HINT[tab] ? `<p class="muted small le-hint">${HINT[tab]}</p>` : ''}
      <div class="le-grid">${grid()}</div>${tintRow()}</div></div>`;
    hydrateLooks();
  }
  el.onclick = (e) => {
    if (e.target.closest('[data-reset]')) {
      if (!confirm('Reset your doodle to a plain character? Your current look will be lost.')) return;
      section = 'body'; tab = 'head';
      set({ ...BLAND_LOOK });
      return;
    }
    const tn = e.target.closest('[data-tint]');
    if (tn) { const t = { ...(look.tint || {}) }; if (Number(tn.dataset.tint) < 0) delete t[tab]; else t[tab] = Number(tn.dataset.tint); set({ tint: t }); return; }
    const sc = e.target.closest('[data-section]');
    if (sc) { section = sc.dataset.section; tab = SECTIONS.find((s) => s.key === section).tabs.find(hasTab); paint(); return; }
    const t = e.target.closest('[data-tab]'), c = e.target.closest('[data-color]'), p = e.target.closest('[data-pick]'), r = e.target.closest('[data-rand]');
    if (t) { tab = t.dataset.tab; paint(); }
    else if (c) set({ [tab]: c.dataset.color });
    else if (p) set({ [tab]: Number(p.dataset.pick) });
    else if (r) set(randomLook());
  };
  paint();
  return () => look;
}

/* ----- page: #/customize (accounts and guests) ----- */
async function viewCustomize() {
  const [profile] = await Promise.all([api('GET', '/profile'), loadLookParts()]);
  app.innerHTML = `<div class="card"><h2 style="margin-top:0">🎭 Make your Custom Doodle</h2>
    <p class="muted">Pick eyes, eyebrows, a mouth, a mustache, a hat and your colours. Your doodle shows up in lobbies, matches and Draw & Guess.</p>
    <div id="editor"></div><div class="row" style="margin-top:14px"><button class="green" id="savelook">Save and use this character</button><a class="btn ghost" href="#/${me.guest ? '' : 'locker'}">Cancel</a></div></div>`;
  const get = await mountLookEditor($('#editor'), profile.look || randomLook(), () => {});
  $('#savelook').onclick = async () => {
    try {
      await api('POST', '/profile/look', { look: get() });
      toast('Saved! Your Custom Doodle is selected', true);
      location.hash = me.guest ? '#/' : '#/locker';
    } catch (e) { toast(e.message); }
  };
}

/* Draw & Guess and the Skribbl side show only Custom Doodles. Players who never built one get a stable random doodle made from their name,
 * and so do bots, so the same person always looks the same. */
const doodleOnly = () => !!((me && me.guest) || (typeof R !== 'undefined' && R && R.lobby && R.lobby.gameType === 'draw'));
function seededLook(name) {
  let h = 2166136261;
  for (const ch of String(name || '?')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const n = LOOK_PARTS ? { eyes: LOOK_PARTS.eyes.length, brows: LOOK_PARTS.brows.length, mouths: LOOK_PARTS.mouths.length, mustaches: LOOK_PARTS.mustaches.length, hats: LOOK_PARTS.hats.length }
    : { eyes: 32, brows: 16, mouths: 25, mustaches: 5, beards: 5, hats: 17 };
  const r = (m) => Math.floor(rnd() * m);
  return { skin: SKIN_TONES[r(SKIN_TONES.length)], jacket: JACKETS[r(JACKETS.length)], head: r(HEADS.length), body: r(BODIES.length), hair: rnd() < 0.75 ? r(HAIRS.length) : -1,
    hairColor: HAIR_COLORS[r(HAIR_COLORS.length)], outfit: r(OUTFITS.length), glasses: -1, face: -1, expr: -1, neck: -1, eyes: r(Math.min(n.eyes, 28)), brows: r(n.brows), mouth: r(n.mouths),
    mustache: rnd() < 0.25 ? r(n.mustaches) : -1, beard: rnd() < 0.12 ? r(5) : -1, hat: rnd() < 0.35 ? r(Math.min(n.hats, 16)) : -1 };
}
