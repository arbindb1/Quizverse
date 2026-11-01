# Quizverse

A knockout **tournament game** you play in the browser, in two flavours: a **quiz tournament** and a **typing race tournament**. Create your own quizzes and categories, open a tournament room, invite friends with a link, and watch a bracket play out: every first-round match runs at the same time, winners advance, losers get crossed out, and one champion is left standing. The host can fill empty seats with bots, or play the whole thing against bots.

## Game types

- **Quiz tournament**: each duel is a set of quiz questions; most points wins.
- **Typing race tournament**: each duel is a race. Both players see the same text and type it; the first to finish it without mistakes wins the race. If time runs out, whoever typed further wins. Pick short, medium or long texts and how many races make a match (best of N). No quiz is needed.

Everything else (bracket, simultaneous matches, spectating, bots, invite links, player limit) works the same in both.

## How the game works

1. **Create** a quiz (questions with 2 to 4 answers, a time limit each) and put it in a category. Instead of typing, you can **upload an Excel sheet** (`.xlsx`, `.xls` or `.csv`) with one question per row (`Question | Answer 1-4 | Correct | Seconds`); a "Download template" button gives you a ready sheet, and you can check the imported questions before saving. The app also ships with starter categories and 10 ready-made public quizzes.
2. **Host a tournament**: pick a quiz, set the **player limit** (2 to 50), the **questions per match**, and optionally **bots** (a number, or fill every other slot).
3. **Invite players** with the invite link (`/join/<token>`) or the 6-letter room code. They log in or register and land in your lobby.
4. **Start**. Players are drawn at random into a single-elimination bracket:
   - Round 1 pairs players in order: 1 vs 2, 3 vs 4, 5 vs 6, 7 vs 8...
   - **All matches in a round start at the same time.** A match is a head-to-head duel; each question is shown to both players, answers are locked in privately, and the answer is revealed when both have answered or the timer ends.
   - The player with more points after the set number of questions wins and advances. A tie goes to **sudden death** (extra questions, up to 3, then a random winner).
   - A next-round match starts as soon as both of its feeder matches are finished, so fast players do not wait for the whole round.
   - **Questions do not repeat**: a question is never asked twice in one match, and as far as the quiz allows nobody gets the same question (or typing text) twice in the whole tournament. Matches running at the same time also get different ones. If the quiz is too small for that, the repeats are kept to a minimum. Quizzes with 20 or more questions never repeat for an 8-player tournament.
   - **While you are fighting you see only your own match** (no bracket, no other matches). When it ends, the **tournament bracket takes the place of your match** and the cut and fly animation plays: the loser is crossed out and the winner moves to the next round. Then, if your next opponent is ready, your next VS screen appears; otherwise you **spectate the other live matches** (tabs for "Watch live" and "Bracket", tap a match chip to switch).
   - Characters are shown as full pictures in rounded squares, never as small circles.
5. When a match ends the loser's name is struck out on the bracket chart (with a little pair of scissors), and the winner's name flies into the next round. The last player standing is crowned champion and final placements are saved.

If the player count is not a power of two (say 5 or 13), some players get a **bye** in round 1 and go straight to round 2.

### Scoring

Who advances: in a quiz match the player with more points; in a typing match the player who won more races (a drawn race counts for nobody). Ties go to sudden death.

- Quiz: wrong answer or no answer is 0 points; a correct answer is 500 points plus up to 500 more for speed.
- Typing race: up to 800 points for how much of the text you typed, plus 200 for finishing it. Your WPM is shown after every race.
- Typing is checked by the server: your browser reports what you typed, the server compares it with the text and ignores impossible speeds (more than 30 characters per second). Pasting is blocked.

### Bots

- The host can add 0 to 49 bots, or fill every free slot with one click. Bots have names like Botty, Robo and Pixel, and **every bot wears the default character (Rookie)**, including its clips.
- Difficulty sets how often a bot answers correctly in a quiz (easy 40%, medium 65%, hard 90%, after a random delay) and how fast it types in a race (about 26, 48 and 78 words per minute, with some variation).
- If the room is full of bots, a real player who opens the invite link takes the place of the newest bot.
- Bots can play bots; those matches run automatically.

## Analytics

The **Analytics** page (top bar, or the "My analytics" button after a tournament) shows your own numbers, bots excluded:

- **Typing:** average WPM, best WPM, average of your last 10 races with the trend against the 10 before, races typed and finished first, tournaments and match win rate, a **speed-per-race chart** with your average line, and a table of recent races.
- **Quiz:** accuracy, average answer time, tournaments and match win rate, a plain sentence about **which category you excel at and which needs practice** (a category needs at least 3 questions answered), a **bar chart of accuracy by category**, and an **accuracy-per-tournament chart**.

Only tournaments finished after this feature was added carry the category and WPM details.

## Characters and progression

Every player has a **character (skin)**. You start with three free ones (Rookie, Sprout, Comet) and unlock the rest through **XP and tournament wins**: more by reaching levels 2, 3, 4 and 6, by playing 3 tournaments, and by winning 1, 3, 5 and 10 tournaments. Pick yours on the **Locker** page, or from the lobby before a tournament starts.

Your character is shown in the lobby, on the bracket, and in the live matches, and it **animates**: it slides in on the VS screen and bobs while waiting, pops when you lock in an answer, hops when you are right and slumps when you are wrong, runs along the track in typing races, dances when you win and slumps when you are eliminated. The champion dances on the winner screen. Bots keep their own robot pictures.

XP is earned at the end of a tournament: 20 for taking part, 10 per match played, 30 per match won, plus a placement bonus (champion 100, runner-up 50, semifinalist 25, quarterfinalist 10). Level n needs 60 x (n-1)^2 XP. A room with only one human (everyone else bots) is **practice**: a quarter of the XP and no win or tournament credit, so characters cannot be farmed alone against bots.

Characters show as an emoji in a coloured bubble by default; a Google Flow picture per character (`public/media/skins/<id>.png`, `.jpg` or `.webp`) replaces it, and short clips (`public/media/skins/<id>/idle.mp4`, `win.mp4`, `lose.mp4`, ...) replace the built-in motion on the big screens. The repository includes pictures for all 12 characters and the idle, win, lose and VS face-off (`enter`) clips for Rookie and the Shadow Ninja. On the VS screen each character fills its whole card (picture or clip, name over the bottom), the left fighter plays the face-off clip, the right fighter plays a mirrored copy, and a static lightning-bolt icon with an animated "VS" sits between them. Descriptions and ready-to-paste picture prompts are in [docs/character-guide.md](docs/character-guide.md), and all 108 action-clip prompts for animating them are in [docs/action-prompts.md](docs/action-prompts.md).

## Optional videos and pictures (Google Flow)

The site can show short videos and bot pictures made in Google Flow: a looping login background, a video behind every "A vs B" screen (with a grander one for semifinals and the final), a celebration clip for the champion, and a picture for each of the 12 bot names. Everything is optional; missing files are skipped. Drop the files into `public/media/` and refresh. File names, sizes and ready-to-paste Flow prompts are in [docs/flow-media-guide.md](docs/flow-media-guide.md). A speaker button in the top bar switches video sound on or off (off by default).

## Tech stack

- **Node.js** (22 recommended) with **Express**
- **Socket.IO** for realtime lobby, matches and spectating
- **MySQL 8** through `mysql2` (tables are created automatically)
- `bcryptjs` for password hashing and `jsonwebtoken` for login tokens
- Plain HTML, CSS and JavaScript on the front end (no build step)

## Getting started

You need Node.js and a running MySQL server with a user that can create databases.

```bash
npm install
cp .env.example .env     # on Windows: copy .env.example .env
# edit .env: set DB_USER, DB_PASSWORD and a long random JWT_SECRET
npm start
```

Open <http://localhost:3000>. On first start the app creates the `quizverse` database, all tables, and the starter quizzes. Use `npm run dev` to restart automatically while developing.

To try a tournament on one machine, register different users in a normal window and in private windows (login is stored per browser profile), or just host a room with bots.

### Configuration (`.env`)

| Variable | Meaning | Default |
| --- | --- | --- |
| `PORT` | HTTP port | `3000` |
| `DB_HOST`, `DB_PORT` | MySQL host and port | `localhost`, `3306` |
| `DB_USER`, `DB_PASSWORD` | MySQL credentials | `root`, empty |
| `DB_NAME` | Database name | `quizverse` |
| `JWT_SECRET` | Secret used to sign login tokens. **Always set this in production.** | insecure dev value |

## Project structure

```
schema.sql          database tables
src/server.js       Express app and HTTP server start-up
src/db.js           MySQL pool, creates the database/tables, upgrades older databases
src/auth.js         JWT helpers and auth middleware
src/api.js          REST API: accounts, categories, quizzes, rooms, invites
src/rooms.js        lobby state shared by the API and the sockets
src/game.js         tournament engine: bracket, simultaneous matches, scoring, bots
src/seed.js         starter categories and quizzes
src/typetexts.js    passages for typing races (short, medium, long)
src/skins.js        character catalogue, levels and unlock rules
src/media.js        lists which optional pictures and clips exist (served at /api/media)
public/             the single-page front end (index.html, app.js, style.css)
public/media/       optional Flow videos and bot pictures (see docs/flow-media-guide.md)
docs/               guides (flow-media-guide.md)
```

## REST API (summary)

All routes are under `/api` and need `Authorization: Bearer <token>` except register and login.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Create an account / log in |
| GET, POST | `/categories` | List / create categories |
| GET, POST | `/quizzes` | List quizzes / create one |
| GET, PUT, DELETE | `/quizzes/:id` | Owner only: read, replace, delete |
| POST | `/rooms` | Create a room (`game_type` = `quiz` or `typerace`, `quiz_id`, `text_length`, `max_players`, `questions_per_match` (questions or races per match), `bot_count` or `fill_bots`, `bot_difficulty`) |
| GET | `/rooms/mine`, `/rooms/:code` | Your rooms / lobby state |
| PATCH | `/rooms/:code` | Host changes settings while in the lobby |
| GET | `/skins` | Public: the character catalogue |
| GET | `/profile` | Your XP, level, wins and every character with its unlock progress |
| POST | `/profile/skin` | Choose an unlocked character |
| GET, POST | `/rooms/preview/:token`, `/rooms/join` | Look at / join through an invite token or code |

Realtime events (Socket.IO) include `room:join`, `room:start`, `game:answer`, and from the server `lobby`, `game:bracket`, `match:intro`, `game:question`, `game:answered`, `game:reveal`, `match:end` and `game:end`. Typing races add `type:progress` (from the player) and `race:start`, `race:progress`, `race:end`. Correct quiz answers are never sent to the browser before the reveal.

## Database

`users` (with `xp`, `wins`, `tournaments`, `skin`), `categories`, `quizzes`, `questions`, `rooms`, `room_players` (with `score` and final `placement`) and `room_answers` (every answer given, with its match number). See `schema.sql`.

## Known limitations

- A tournament in progress lives in server memory; restarting the server ends it.
- A player who disconnects stays in the bracket and simply misses answers, so their match falls back to sudden death and then a random winner.
- No rate limiting, password reset or email verification, and no way for the host to kick a player yet.
- A script that types for a player cannot be completely ruled out in typing races (the server only caps the speed); pasting is blocked in the browser only.
- Not yet covered by automated tests.
