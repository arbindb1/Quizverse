# Quizverse

A knockout **tournament game** you play in the browser, in two flavours: a **quiz tournament** and a **typing race tournament**. Create your own quizzes and categories, open a tournament room, invite friends with a link, and watch a bracket play out: every first-round match runs at the same time, winners advance, losers get crossed out, and one champion is left standing. The host can fill empty seats with bots, or play the whole thing against bots.

## Game types

- **Quiz tournament**: each duel is a set of quiz questions; most points wins.
- **Typing race tournament**: each duel is a race. Both players see the same text and type it; the first to finish it without mistakes wins the race. If time runs out, whoever typed further wins. Pick short, medium or long texts and how many races make a match (best of N). No quiz is needed.

- **Draw & Guess (skribbl style)**: a free-for-all without a bracket. The player list keeps its join order (it is never re-sorted by score) and the drawer goes from the bottom of the list up to the top; after the top player the round ends and the next round starts at the bottom again, until all rounds are done. The drawer picks one of three secret words and draws it (12 colours, three brush sizes, **Pencil and Bucket** next to the colours: exactly one is selected at a time, choosing one deselects the other; plus eraser, undo, clear) while everyone else types guesses in the chat. The faster a guess, the more points (50 to 500), and the first to guess earns the most (each earlier guesser takes 10% off, down to 55%); the drawer earns the average of what the guessers scored. Letters of the word are revealed as time runs out, a guess that is one letter off tells the guesser "so close" privately, and players who already guessed see the secret word at the top and chat privately with the drawer. The host picks the number of rounds and the drawing time (60, 80 or 110 seconds). The secret words come from the database table `draw_words` (**1,426 words in 15 categories** are added automatically the first time the server starts; add your own with `INSERT INTO draw_words (word, category) VALUES ('volcano', 'nature');` words are lowercase letters and spaces). **Emotes:** ten quick emotes (😂 😮 👏 🔥 ❤️ 😡 🤔 😭 🥳 👀) float up from your picture for everybody (one per second). A **Hide emotes** button above the emote bar hides the bar and everybody's floating emotes for you (remembered in this browser). **👍 / 👎** sit in the top right corner of the whiteboard: every guesser can like or dislike the current drawing once per turn (after voting the buttons vanish until the next turn; the drawer does not get them); the buttons show no numbers, instead the chat says "NAME liked the drawing 👍" or "NAME disliked the drawing 👎" for everybody (including the drawer, who cannot vote). **At the end of every turn** a scoreboard card shows everybody with the points they got in that turn, highest on top, lowest (+0) at the bottom. **Removing players:** click a player's row in the list and a small menu opens on it. The **host** gets **Remove** (direct, host only); every other player gets **Vote** (any player can start or join a vote; it needs at least 3 players and more than half of the others must agree; the host cannot be voted out; the vote count shows on the player's row); a removed player is sent home, cannot come back, and if they were drawing the game moves on to the next drawer. The board is wide (16:10) and sized to the window, with the player list and chat sharing the rest. Bots guess (more often and sooner on hard) but never draw. At the end a **podium** shows the top three, then the standings. Highest score wins and earns XP like the other game types; it does not feed the quiz and typing analytics.

Everything else (invite links, player limit, bots, characters, XP) works the same in all of them; the bracket, simultaneous matches and spectating belong to the quiz and typing tournaments.

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

## Skribbl side (no account needed)

The login page has two tabs: **Tournament** (accounts, quizzes, brackets) and **Skribbl**. On the Skribbl tab you only enter a **name** and build your **Custom Doodle** (the 2D cartoon character: eyes, eyebrows, mouth, mustache, hat, colours; a dice button makes a random name). The Skribbl side and Draw & Guess rooms use only this doodle: the tournament characters are not used there. Anyone in a draw room who never built one (account holders, bots) gets a stable random doodle made from their name. If you came without an invite you get **Create a private room** (you are the host: set rounds, drawing time, player limit and bots in the lobby, then share the invite link). If you came through an invite link (`/play/<token>`) the page says who invited you and shows **Play!** (you can still create your own room instead). Guests have no password and no progress (always a Custom Doodle, no XP, levels or analytics), and they can only reach Draw & Guess rooms (the server closes every other route to a guest token). A guest keeps their name on this browser for 14 days; guest accounts are cleaned up after 14 days. People with a normal account can use the same invite link and join through the normal join page.

## Custom Doodle (build your own funny character)

The character list has a 13th entry, **Custom Doodle**: a funny cartoon kid that players build in the editor (Locker, then Create/Edit, or `#/customize`; guests get it right on the Skribbl entry page). There are no separate male and female bodies: everything is a separate choice, so any mix works (boy, girl, anything in between): **face shape** (9: round, chubby, skinny, chad, pear, square, heart, gigachad with a pinched forehead, wide angular jaw, cheek lines, stubble and a chin cleft, potato), **skin colour** (10), **hairstyle** (9 or bald: short, long straight, pigtails, twin buns, high bun, bob, spiky, curly puff, long wavy) and **hair colour** (12), **clothes** (6: jacket, t-shirt, hoodie, dress, suit and tie, tank top) and **clothes colour** (10), **eyes** (28: 16 round and funny, 12 pairs with eyelashes), **eyebrows** (16 or none), **mouth** (25 including 9 lips and makeup styles), **mustache** (5 or none) and **beard** (5 or none: long white beard, chin strap, goatee, stubble beard, soul patch, sized to the face and drawn under the mouth), **hat or hair** (17 or none, including slicked-back hair), **expression** (16 whole meme-style faces that replace eyes, brows and mouth: rage, derp, smug, shocked, crying-laughing, sweating, evil grin and more), **glasses** (16), **face items** (16: clown nose, pig nose, mask, tape, fangs, scar, bruises, tears, blush and more), and **neck and ears** (12: earrings, chains, bow tie, tie, scarf, bandana, headphones, medal, collar, lei, pearls), plus a **Surprise me** button (random look) and a **Reset** button (asks first, then goes back to a plain character: round head, average body, default colours, no hair or extras, simple eyes, no brows, flat mouth). The editor is organised in three sections: **Body** (face shape, **body type**, skin, hair, hair colour, clothes, clothes colour, background colour), **Face** (whole face, eyes, brows, mouth, mustache, beard) and **Extras** (hat, **head wrap**, wrap colour, glasses, face items, neck and ears). **Body types** (7: average, thin, chubby, fat, muscular, athletic, curvy) change the shoulders, waist, belly and arms, and the clothes fit them. **Head wraps** (4, drawn in code, any colour): turban, tall dastar, keffiyeh with headband, headscarf. **Colours:** every picture part (whole face, eyes, brows, mouth, mustache, hat, glasses, face items, neck and ears) has a colour row under its tab with 12 colours and a button to put the original colours back; skin, hair, clothes and head wrap have their own colours, and the avatar background can be coloured too. Face shape, hair and clothes are drawn in code (`public/doodle.js`); the other parts are the Flow pictures. It shows up everywhere characters do: lobbies, the Draw & Guess player list, tournament screens and the Locker.

How it works: the face parts are transparent pictures in `public/media/custom/<eyes|brows|mouths|mustaches|hats>/N.png` plus `base.png` and `parts.json` (sizes), cut from the Google Flow sheets (green background removed). A look is saved as JSON in `users.look` (validated in `src/look.js`; colours are recoloured in the browser, so skin and jacket can be any palette colour). To add parts, drop more transparent PNGs into a folder and add their entries to `parts.json`: width and height as a fraction of 1024, optionally `s` (size multiplier), `cx` and `cy` (where the centre goes on the 1024 square), `tone` (skin-coloured pieces become see-through so the head's skin shows), `pair` (draw a mirrored copy this far from the centre, for earrings) and `hide` (which parts a piece replaces, for expressions).

## Admin CMS

Admins get an **Admin** link in the top bar (`#/admin`):

- **Overview:** players, active players, page views and unique visitors, tournaments played, running rooms, quizzes; daily charts for views, visitors, sign-ups and tournaments; top pages, devices, referrers and game types; newest accounts.
- **Users:** search by name or email, sort, page, **download the list as CSV**. Open a player to see their email, last login, activity, analytics and recent tournaments, and to **set level, set or add XP, edit wins and tournaments played, rename, change email, equip or unlock/take back any character (or unlock all), make admin, suspend (with a reason) or lift it, reset the password, or delete the account**.
- **Tournaments:** list by status, watch a live one, close and delete one (players are sent home).
- **Content:** rename or delete categories, make quizzes public/private, delete quizzes.
- **Activity log:** every admin change (who, what, when) is recorded.

**Becoming the first admin:** register normally, then either set `ADMIN_USERNAMES=yourname` (or `ADMIN_EMAILS`) in the environment and restart, or run `node scripts/make-admin.js yourname` (on Coolify: open the app's Terminal tab and run it there). Admin rights are always read from the database, never from the login token, and every `/api/admin` call is checked on the server.

**Privacy:** accounts now store an **email address** (needed to register; login works with username or email) and the app counts **page views** (a random id kept in the browser, no cookies, the IP address is stored only as a one-way hash, page views are deleted after 180 days). Tell your players, and add a privacy notice if you launch publicly.

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
| `ADMIN_USERNAMES`, `ADMIN_EMAILS` | Comma separated accounts that are admins (see Admin CMS) | none |
| `JWT_SECRET` | Secret used to sign login tokens. **Always set this in production.** | insecure dev value |

## Project structure

```
schema.sql          database tables
src/server.js       Express app and HTTP server start-up
src/db.js           MySQL pool, creates the database/tables, upgrades older databases
src/auth.js         JWT helpers, auth middleware, suspended-account check
src/admin.js        admin CMS API (/api/admin)
src/track.js        anonymous page-view counter (/api/track)
src/http.js         small shared helpers (errors, validation)
src/stats.js        analytics maths and the per-player stats loader
scripts/make-admin.js  makes an account an admin
src/api.js          REST API: accounts, categories, quizzes, rooms, invites
src/rooms.js        lobby state shared by the API and the sockets
src/game.js         tournament engine: bracket, simultaneous matches, scoring, bots
src/seed.js         starter categories and quizzes
src/typetexts.js    passages for typing races (short, medium, long)
public/skribbl.js    Skribbl entry page, guest home, character picker
public/customize.js Custom Doodle editor and renderer
src/look.js         Custom Doodle validation
public/doodle.js    drawn face shapes, hairstyles and clothes of the Custom Doodle
src/draw.js         Draw & Guess engine (turns, words, hints, scoring, bots)
src/drawwords.js    the 1,426 starter words for Draw & Guess (copied into the table draw_words)
src/skins.js        character catalogue, levels and unlock rules
src/media.js        lists which optional pictures and clips exist (served at /api/media)
public/             the single-page front end (index.html, app.js, draw.js, admin.js, import.js, style.css)
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
| GET | `/me` | Who you are (admin flag read from the database) |
| POST | `/track` | Anonymous page-view counter (no login needed) |
| ANY | `/admin/*` | Admin only: overview, users (list, detail, edit, skins, password, delete), rooms, content, log |
| GET, POST | `/rooms/preview/:token`, `/rooms/join` | Look at / join through an invite token or code |

Realtime events (Socket.IO) include `room:join`, `room:start`, `game:answer`, and from the server `lobby`, `game:bracket`, `match:intro`, `game:question`, `game:answered`, `game:reveal`, `match:end` and `game:end`. Draw & Guess uses `draw:pick`, `draw:seg`, `draw:undo`, `draw:clear`, `draw:guess` (from the player) and `draw:begin`, `draw:state`, `draw:choices`, `draw:word`, `draw:seg`, `draw:redraw`, `draw:chat` (from the server); the secret word is sent only to the drawer, through a private channel. Typing races add `type:progress` (from the player) and `race:start`, `race:progress`, `race:end`. Correct quiz answers are never sent to the browser before the reveal.

## Database

`users` (with `xp`, `wins`, `tournaments`, `skin`), `categories`, `quizzes`, `questions`, `rooms`, `room_players` (with `score` and final `placement`) and `room_answers` (every answer given, with its match number). See `schema.sql`.

## Known limitations

- A tournament in progress lives in server memory; restarting the server ends it.
- A player who disconnects stays in the bracket and simply misses answers, so their match falls back to sudden death and then a random winner.
- No rate limiting, password reset or email verification, and no way for the host to kick a player yet.
- A script that types for a player cannot be completely ruled out in typing races (the server only caps the speed); pasting is blocked in the browser only.
- Not yet covered by automated tests.
