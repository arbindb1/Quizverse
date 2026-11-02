require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const db = require('./db');
const game = require('./game');
const api = require('./api');
const { seed } = require('./seed');
const { scanMedia } = require('./media');
const track = require('./track');
const { router: adminRouter, bootstrapAdmins } = require('./admin');

const app = express();
app.set('trust proxy', 1); // behind Coolify's proxy: req.ip is the visitor, not the proxy
app.use(express.json({ limit: '200kb' }));
const MEDIA_DIR = path.join(__dirname, '..', 'public', 'media');
app.get('/api/media', (req, res) => res.set('Cache-Control', 'no-store').json(scanMedia(MEDIA_DIR)));
// the spreadsheet reader used by the quiz editor's Excel import, served from our own server (works offline)
app.get('/vendor/xlsx.js', (req, res) => res.sendFile(require.resolve('xlsx/dist/xlsx.full.min.js'), { maxAge: '7d' }));
app.use('/api/track', track);
app.use('/api/admin', adminRouter);
app.use('/api', api);
app.get('/play/:token', (req, res) => res.redirect(`/#/play/${encodeURIComponent(req.params.token)}`));
app.get('/join/:token', (req, res) => res.redirect(`/#/join/${encodeURIComponent(req.params.token)}`));
app.use(express.static(path.join(__dirname, '..', 'public')));

const server = http.createServer(app);
game.init(server);

const port = Number(process.env.PORT || 3000);
db.init()
  .then(seed)
  .then(bootstrapAdmins)
  .then(() => server.listen(port, () => console.log(`Quizverse running at http://localhost:${port}`)))
  .catch((e) => {
    console.error('Could not start. Is MySQL running and are the DB_* values in .env correct?\n', e.message);
    process.exit(1);
  });
