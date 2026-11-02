// The "Custom Doodle" character: a funny cartoon kid that players build from parts. Face shape, hair and clothes are separate choices (so any
// mix works: boy, girl, anything in between); eyes, eyebrows, mouth, mustache, hat (and glasses / face items when those pictures exist) come from
// pictures in public/media/custom (see parts.json). A look is saved as JSON in users.look.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'public', 'media', 'custom', 'parts.json');
const HEX = /^#[0-9a-f]{6}$/i;
// how many drawn face shapes / hairstyles / outfits there are (the shapes are in public/doodle.js; keep these numbers in step with it)
const TINT_KEYS = ['eyes', 'brows', 'mouth', 'mustache', 'beard', 'hat', 'glasses', 'face', 'neck', 'expr']; // parts whose picture can be recoloured
const TINTS = 12; // number of colours in the tint palette (public/customize.js)
const DRAWN = { head: 9, hair: 9, outfit: 6, body: 7, wrap: 4 };

function counts() {
  try {
    const m = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { eyes: m.eyes.length, brows: m.brows.length, mouth: m.mouths.length, mustache: m.mustaches.length, beard: (m.beards || []).length, hat: m.hats.length,
      glasses: (m.glasses || []).length, face: (m.faceitems || []).length, expr: (m.expr || []).length, neck: (m.neck || []).length };
  } catch { return null; }
}

const DEFAULT_LOOK = { skin: '#facdac', jacket: '#d32626', tint: {}, bg: '', head: 0, body: 0, hair: -1, wrap: -1, wrapColor: '#ffffff', hairColor: '#3b2a20', outfit: 0, eyes: 0, brows: 0, mouth: 3, mustache: -1, hat: -1, beard: -1, glasses: -1, face: -1, expr: -1, neck: -1 };

// Returns a clean look, or null when it is not valid (never trust what the browser sends). Fields that are missing (older saved looks) get defaults.
// Looks saved before the Beard slot existed kept beards in the mustache slot: old mustache numbers 4, 5, 7, 8, 9 were beards (now beard 0 to 4),
// and the mustaches 0, 1, 2, 3, 6 are now 0 to 4.
const OLD_BEARD = { 4: 0, 5: 1, 7: 2, 8: 3, 9: 4 }, OLD_MUSTACHE = { 0: 0, 1: 1, 2: 2, 3: 3, 6: 4 };
function migrate(b) {
  if (!b || typeof b !== 'object' || b.beard !== undefined || !(b.mustache >= 0)) return b;
  if (b.mustache in OLD_BEARD) return { ...b, mustache: -1, beard: OLD_BEARD[b.mustache] };
  return { ...b, mustache: OLD_MUSTACHE[b.mustache] !== undefined ? OLD_MUSTACHE[b.mustache] : -1 };
}

function cleanLook(b) {
  b = migrate(b);
  const c = counts();
  if (!c || !b || typeof b !== 'object') return null;
  const pick = (v, n, optional, dflt) => {
    if (v === undefined || v === null) return dflt;
    const i = Number(v);
    return Number.isInteger(i) && i >= (optional ? -1 : 0) && i < n ? i : null;
  };
  const color = (v, dflt) => (v === undefined ? dflt : HEX.test(v) ? v.toLowerCase() : dflt);
  // tint: { eyes: 3, mouth: 7, ... } colour numbers per part; anything else is dropped
  const tint = {};
  if (b.tint && typeof b.tint === 'object') for (const k of TINT_KEYS) { const v = b.tint[k]; if (Number.isInteger(v) && v >= 0 && v < TINTS) tint[k] = v; }
  const look = {
    tint, bg: b.bg === '' || b.bg === undefined || b.bg === null ? '' : HEX.test(b.bg) ? b.bg.toLowerCase() : '',
    skin: color(b.skin, DEFAULT_LOOK.skin), jacket: color(b.jacket, DEFAULT_LOOK.jacket), hairColor: color(b.hairColor, DEFAULT_LOOK.hairColor),
    head: pick(b.head, DRAWN.head, false, 0), body: pick(b.body, DRAWN.body, false, 0), wrap: pick(b.wrap, DRAWN.wrap, true, -1), wrapColor: color(b.wrapColor, DEFAULT_LOOK.wrapColor), hair: pick(b.hair, DRAWN.hair, true, -1), outfit: pick(b.outfit, DRAWN.outfit, false, 0),
    eyes: pick(b.eyes, c.eyes, false), brows: pick(b.brows, c.brows, true), mouth: pick(b.mouth, c.mouth, false),
    mustache: pick(b.mustache, c.mustache, true), beard: pick(b.beard, c.beard, true, -1), hat: pick(b.hat, c.hat, true),
    glasses: pick(b.glasses, c.glasses, true, -1), face: pick(b.face, c.face, true, -1),
    expr: pick(b.expr, c.expr, true, -1), neck: pick(b.neck, c.neck, true, -1),
  };
  return Object.values(look).some((v) => v === null) ? null : look;
}
const parseLook = (s) => { try { return s ? migrate(JSON.parse(s)) : null; } catch { return null; } };

module.exports = { cleanLook, parseLook, DEFAULT_LOOK };
