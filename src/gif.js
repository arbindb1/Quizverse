// Shared by player GIF uploads (src/api.js) and admin-added GIF presets (src/admin.js).
const sharp = require('sharp');

const MAX_GIF_BYTES = 2 * 1024 * 1024; // what we store and serve

// too big to store as-is: shrink it with sharp (resize down, fewer colours), trying progressively smaller until it fits
async function compressGif(buf) {
  for (const width of [480, 360, 260, 180]) {
    try {
      const out = await sharp(buf, { animated: true }).resize({ width, withoutEnlargement: true }).gif({ colours: 64, effort: 7 }).toBuffer();
      if (out.length <= MAX_GIF_BYTES) return out;
    } catch { break; } // not a GIF sharp can decode as animated: give up rather than guess
  }
  return null;
}

// buf must already look like a GIF (checked by the caller); compresses it if needed, or rejects it if even that is not enough
async function fitGif(buf) {
  if (!Buffer.isBuffer(buf) || !buf.length) return null;
  if (buf.subarray(0, 3).toString('ascii') !== 'GIF') return null;
  if (buf.length <= MAX_GIF_BYTES) return buf;
  return compressGif(buf);
}

module.exports = { MAX_GIF_BYTES, compressGif, fitGif };
