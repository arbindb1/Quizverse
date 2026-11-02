// Character skins. Some are free, the rest unlock through level (XP), tournament wins or tournaments played.
// emoji + colours are the built-in look; a Flow picture at public/media/skins/<id>.png (or .jpg/.webp) replaces them, and clips in public/media/skins/<id>/<action>.mp4 replace the built-in motion.
const SKINS = [
  { id: 'rookie', name: 'Rookie', emoji: '🙂', c1: '#7c5cff', c2: '#4da3ff', unlock: { type: 'free' } },
  { id: 'custom', name: 'Custom Doodle', emoji: '🎭', c1: '#ffb84d', c2: '#ff5d7a', unlock: { type: 'free' } }, // built in the character editor, see look.js
  { id: 'sprout', name: 'Sprout', emoji: '🌱', c1: '#22d3a6', c2: '#7ee787', unlock: { type: 'free' } },
  { id: 'comet', name: 'Comet', emoji: '☄️', c1: '#ffb84d', c2: '#ff5d7a', unlock: { type: 'free' } },
  { id: 'ninja', name: 'Shadow Ninja', emoji: '🥷', c1: '#3a3f7a', c2: '#14172e', unlock: { type: 'level', n: 2 } },
  { id: 'wizard', name: 'Quiz Wizard', emoji: '🧙', c1: '#8e5cff', c2: '#3b2fa0', unlock: { type: 'level', n: 3 } },
  { id: 'astronaut', name: 'Astro', emoji: '🧑‍🚀', c1: '#9ad1ff', c2: '#4d7cff', unlock: { type: 'level', n: 4 } },
  { id: 'knight', name: 'Shadow Knight', emoji: '🛡️', c1: '#3a3f7a', c2: '#14172e', unlock: { type: 'level', n: 6 } },
  { id: 'pirate', name: 'Captain', emoji: '🏴‍☠️', c1: '#ff9f43', c2: '#7a3b12', unlock: { type: 'tournaments', n: 3 } },
  { id: 'cub', name: 'Tiger Cub', emoji: '🐯', c1: '#ffb347', c2: '#ff7a1a', unlock: { type: 'wins', n: 1 } },
  { id: 'dragon', name: 'Dragon', emoji: '🐲', c1: '#35e0a1', c2: '#0f7a55', unlock: { type: 'wins', n: 3 } },
  { id: 'phoenix', name: 'Phoenix', emoji: '🔥', c1: '#ff7a45', c2: '#e0245e', unlock: { type: 'wins', n: 5 } },
  { id: 'legend', name: 'Legend', emoji: '👑', c1: '#ffd84d', c2: '#c98a00', unlock: { type: 'wins', n: 10 } },
];

const byId = (id) => SKINS.find((s) => s.id === id);

// level n needs 60 * (n-1)^2 XP: 60, 240, 540, 960, 1500...
const levelFor = (xp) => 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 60));
const xpAt = (level) => 60 * (level - 1) ** 2;

// how far the player is towards an unlock rule
function progressOf(user, unlock) {
  switch (unlock.type) {
    case 'level': return { have: levelFor(user.xp), need: unlock.n };
    case 'wins': return { have: user.wins, need: unlock.n };
    case 'tournaments': return { have: user.tournaments, need: unlock.n };
    default: return { have: 1, need: 1 };
  }
}
const isUnlocked = (user, skin) => { const p = progressOf(user, skin.unlock); return p.have >= p.need; };

function requirementText(unlock) {
  switch (unlock.type) {
    case 'level': return `Reach level ${unlock.n}`;
    case 'wins': return `Win ${unlock.n} tournament${unlock.n > 1 ? 's' : ''}`;
    case 'tournaments': return `Play ${unlock.n} tournaments`;
    default: return 'Free';
  }
}

module.exports = { SKINS, byId, levelFor, xpAt, progressOf, isUnlocked, requirementText };
