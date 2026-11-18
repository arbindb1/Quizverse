// the animations players can pick (the GIFs in public/media/anim/<id>.gif). This fixed list ships with the repo;
// an admin can add more on top of it through the CMS (stored in the anim_presets table, same file layout) - see allAnims().
const ANIMS = [
  { id: 'cinema', name: 'Absolute Cinema' },
  { id: 'shush', name: 'Shush' },
  { id: 'brain', name: 'Big Brain' },
  { id: 'puppet', name: 'Side-eye' },
  { id: 'fine', name: 'This is Fine' },
  { id: 'kneel', name: 'Smirk' },
  { id: 'tears', name: 'Sob' },
  { id: 'noice', name: 'Noice' },
  { id: 'hedge', name: 'Hide' },
  { id: 'lizard', name: 'Wave' },
  { id: 'kitten', name: 'Cat Dance' },
  { id: 'skeleton', name: 'Clang' },
  { id: 'handshake', name: 'Cat Hands' },
  { id: 'awe', name: 'Awe' },
  { id: 'stretchcat', name: 'Stretch Cat' },
  { id: 'toothy', name: 'Buck Teeth' },
  { id: 'prairie', name: 'Prairie Dog' },
  { id: 'baby', name: 'Dancing Baby' },
  { id: 'shock', name: 'Shocked' },
  { id: 'medic', name: 'Smug Medic' },
  { id: 'pog', name: 'Pog' },
];
const fs = require('fs');
const path = require('path');
const db = require('./db');
const EXT = ['mp4', 'webm', 'gif', 'webp', 'png'];

// the built-in list plus whatever an admin added (anim_presets), merged in one place so every caller agrees on it
async function allAnims() {
  const [rows] = await db.query('SELECT id, name FROM anim_presets ORDER BY created_at');
  return [...ANIMS, ...rows];
}
// true if v is a selectable animation id (built-in or admin-added); used to validate a player's choice before saving it
async function animId(v) {
  if (ANIMS.some((a) => a.id === v)) return v;
  const [[row]] = await db.query('SELECT id FROM anim_presets WHERE id = ?', [v]);
  return row ? v : null;
}
// { id: 'mp4' | ... } for the animations whose file exists
function scanAnims(dir, list = ANIMS) {
  const out = {};
  for (const a of list) { const e = EXT.find((x) => fs.existsSync(path.join(dir, a.id + '.' + x))); if (e) out[a.id] = e; }
  return out;
}
// how long one play of each image clip lasts, in ms (durations.json, written when the clips were prepared)
function durations(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'durations.json'), 'utf8')); } catch { return {}; }
}
module.exports = { ANIMS, allAnims, animId, scanAnims, durations };
