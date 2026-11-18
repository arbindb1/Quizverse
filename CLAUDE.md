# Quizverse

Node.js (CommonJS) + Express 4 + Socket.io 4 + MySQL (mysql2). Vanilla JS SPA in `public/`, no build step.
Not the Laravel backend, not the Flutter app (Fokus).

## Commands
- Install: `npm install`
- Setup: `cp .env.example .env` then fill `DB_*` and `JWT_SECRET` (MySQL must be running; DB is auto-created)
- Run: `npm start` (http://localhost:3000)
- Dev (auto-reload): `npm run dev`
- Make admin: `node scripts/make-admin.js <username>`
- Tests: none exist. Verify by running the app in a browser (open 2+ tabs for multiplayer).

## Code style
- CommonJS only (`require`/`module.exports`); no TypeScript, no ESM, no bundler, no new deps without reason.
- 2-space indent, single quotes, semicolons, `const`/arrow functions, async/await (no `.then` chains in new code).
- Comments explain *why*, in plain English; keep files small and single-purpose.
- Route handlers: wrap with `wrap(...)`, throw `fail(status, msg)`, trim/clamp input with `str(v, max)` (`src/http.js`).
- SQL: always parameterized `db.query(sql, [params])`; never interpolate user input.
- Frontend: escape all user text with `esc()` before inserting HTML; scripts load as plain globals from `index.html`.

## Architecture rules
- `src/server.js` boots: `db.init()` -> `seed` -> `bootstrapAdmins` -> listen. Startup order matters.
- Schema: base tables in `schema.sql`; every later change goes in `src/db.js` via `ensureColumn`/`ensureIndex`
  (idempotent, safe on existing DBs). Never require manual migrations.
- REST under `/api` (`src/api.js`), `/api/admin` (`src/admin.js`), `/api/track`. Realtime via Socket.io in `src/game.js`.
- Server is authoritative: scoring, timers, bot play, typing validation (`MAX_CPS`) and word checks run server-side;
  clients only send intents. Live game state is in-memory (`games` Map keyed by room code); MySQL stores results.
- Draw & Guess logic lives in `src/draw.js` (socket events `draw:*`); tournaments (quiz/typerace) in `src/game.js`.
- Auth: JWT (`src/auth.js`, 14d). Admin/ban status always read from DB, never trusted from the token.
- Guests: only Draw & Guess routes (`GUEST_OK` regex in `src/api.js`); keep new routes closed to guests by default.
- Media in `public/media/` is optional: server scans files (`/api/media`, `/api/anims`) and the UI falls back if missing.
  New animation: add id to `src/anims.js` and duration to `public/media/anim/durations.json`.
- Deployed behind Coolify proxy (`trust proxy` on). Never commit `.env`.
- Keep `README.md` in sync when changing gameplay or scoring rules.
