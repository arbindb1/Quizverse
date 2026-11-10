// the animations players can pick (the GIFs in public/media/anim/<id>.gif)
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
const animId = (v) => (ANIMS.some((a) => a.id === v) ? v : null);
const fs = require('fs');
const path = require('path');
const EXT = ['mp4', 'webm', 'gif', 'webp', 'png'];
// { id: 'mp4' | ... } for the animations whose file exists
function scanAnims(dir) {
  const out = {};
  for (const a of ANIMS) { const e = EXT.find((x) => fs.existsSync(path.join(dir, a.id + '.' + x))); if (e) out[a.id] = e; }
  return out;
}
// how long one play of each image clip lasts, in ms (durations.json, written when the clips were prepared)
function durations(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'durations.json'), 'utf8')); } catch { return {}; }
}
module.exports = { ANIMS, animId, scanAnims, durations };
