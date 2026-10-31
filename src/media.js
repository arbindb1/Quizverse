const fs = require('fs');
const path = require('path');

const IMAGE = /\.(png|jpe?g|webp)$/i;
const entries = (dir) => { try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; } };
const baseName = (file) => file.replace(/\.[^.]+$/, '').toLowerCase();

// Which optional Flow media exist in public/media. The browser uses this to decide what to show.
//   videos: hero.mp4, vs-intro.mp4, vs-final.mp4, champion.mp4
//   bots:   bots/<name>.<png|jpg|webp>
//   skins:  skins/<id>.<png|jpg|webp>
//   clips:  skins/<id>/<action>.mp4
//   posters: skins/<id>/<action>.<png|jpg|webp>, the still frame shown before that clip starts
function scanMedia(root) {
  const has = (f) => fs.existsSync(path.join(root, f));
  const videos = { hero: has('hero.mp4'), vs: has('vs-intro.mp4'), vsFinal: has('vs-final.mp4'), champion: has('champion.mp4') };
  const bots = {};
  for (const f of entries(path.join(root, 'bots'))) if (f.isFile() && IMAGE.test(f.name)) bots[baseName(f.name)] = f.name;
  const skins = {};
  const clips = {};
  const posters = {};
  for (const e of entries(path.join(root, 'skins'))) {
    if (e.isFile() && IMAGE.test(e.name)) skins[baseName(e.name)] = e.name;
    else if (e.isDirectory()) {
      const actions = entries(path.join(root, 'skins', e.name)).filter((f) => f.isFile() && /\.mp4$/i.test(f.name)).map((f) => baseName(f.name));
      if (actions.length) clips[e.name.toLowerCase()] = actions;
      for (const f of entries(path.join(root, 'skins', e.name))) {
        if (f.isFile() && IMAGE.test(f.name)) (posters[e.name.toLowerCase()] ||= {})[baseName(f.name)] = f.name;
      }
    }
  }
  return { videos, bots, skins, clips, posters };
}

module.exports = { scanMedia };
