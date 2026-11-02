# Quizverse action prompts (Google Flow, 108 clips)

Ready-to-paste prompts for every action of every character. Generated from the final designs; see [character-guide.md](character-guide.md) for the pictures and rules.

## Start frames by mood (do this first)

A video starts from the picture you give it, so a smiling picture makes every clip open with a smile, even `lose`. Make two extra versions of each character's picture in Flow (image edit, attach the original as the reference), then use the right one as the first frame.

**Neutral version** prompt:

> Use the attached image as the reference: same character, same outfit, same framing, same flat dark indigo background and same style, but with a calm focused expression, a small closed-mouth smirk, and both arms relaxed down, no thumbs up. Keep the head and shoulders centered. No text, no logos, no watermark.

**Sad version** prompt:

> Use the attached image as the reference: same character, same outfit, same framing, same flat dark indigo background and same style, but with a sad disappointed expression, eyebrows raised in the middle, a downturned mouth, shoulders slightly slumped, both arms down, no thumbs up. Keep the head and shoulders centered. No text, no logos, no watermark.

| Clip | First frame | Last frame |
| --- | --- | --- |
| idle | original (smiling) | original, so it loops |
| enter, correct, win, champion | original (smiling) | empty |
| ready | neutral | neutral, so it loops |
| typing | neutral | neutral, so it loops |
| wrong | neutral | empty |
| lose | neutral | sad, so the clip ends slumped |

If a smile still shows at the start of wrong or lose, begin the prompt with "the smile disappears immediately".

## VS face-off clip (`enter`)

On the VS screen the two fighters stand on either side of a static lightning-bolt icon (drawn by the site, so do **not** put a bolt in the clip). Each character gets one face-off clip made **facing right**. The left fighter plays it as is and the right fighter gets an automatic mirrored copy, so they stare at each other. Save it as `public/media/skins/<id>/enter.mp4` (it replaces `idle` on the VS screen) and save the competitive picture next to it as `public/media/skins/<id>/enter.jpg` (it is shown until the clip starts). Rookie's pair is already installed.

1. Make a **competitive picture** first (image edit, attach the original as the reference):

> Use the attached image as the reference: same character, same outfit, same framing, same flat dark indigo background and same style, but in a competitive face-off pose: turned slightly toward the right side of the frame, leaning forward a little, eyes narrowed and locked on an opponent off-screen to the right, a confident determined smirk, eyebrows lowered, both fists raised in front of the chest, ready to compete. No thumbs up, no lightning effects. Keep the head and shoulders centered with space around it. No text, no logos, no watermark.

2. Video tab, **Frames**, first frame = the competitive picture, 4 s, then paste (replace the description with the character's):

> Animate the character from the picture, [character description]: staring intensely toward the right side of the frame with a competitive face, narrowed eyes and a confident smirk, slowly clenching a fist and giving a small determined nod, a faint glow in the eyes and a subtle pulse of energy in the air, then holding the fierce stare. The character keeps facing right. No lightning bolts, no lightning effects. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

For Rookie the description is: *the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch*. Characters that are not human can use their own stare (the Shadow Knight: eyes flare violet; the Dragon: smoke curls from the nostrils; the Phoenix: embers rise; the Wizard: the book snaps open).

## How to use

1. In Flow open the **Video** tab and pick the character's **picture as the first frame** (the same `public/media/skins/<id>.png` or `.jpg`).
2. Paste the action's prompt. Flow clips may come out around 8 seconds: trim to the length shown.
3. For **loop** clips (idle, ready, typing) also use the same picture as the **last frame**.
4. If a clip changes the character's look, regenerate it and add "keep the exact same character design as the first frame".
5. Save as `public/media/skins/<id>/<action>.mp4`, for example `public/media/skins/rookie/win.mp4`.
6. Square-crop and shrink with: `ffmpeg -i in.mp4 -vf "crop=ih:ih,scale=360:360" -c:v libx264 -crf 30 -an out.mp4`

Order of work: **idle, win, lose** first (the most visible), then enter, correct, wrong, typing, then ready and champion.

| Action | When it plays | Length | Loop |
| --- | --- | --- | --- |
| `idle` | Waiting in the lobby, on the bracket, between matches | 3 to 4 s | yes |
| `enter` | VS screen entrance | 2 to 3 s | no |
| `ready` | After locking in an answer | 2 to 3 s | yes |
| `correct` | Right answer or race won | 2 s | no |
| `wrong` | Wrong answer or race lost | 2 s | no |
| `typing` | During a typing race | 2 s | yes |
| `win` | Winning a match | 3 to 4 s | no |
| `lose` | Being eliminated (ends slumped) | 3 s | no |
| `champion` | Winning the tournament (ends holding the trophy) | 5 to 6 s | no |

Every prompt already contains this ending: *Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.*

---

## 1. Rookie (`rookie`)

**idle** (3 to 4 s, loop, file `public/media/skins/rookie/idle.mp4`)

> Animate the character from the picture, the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch: bouncing lightly on the toes, tugging at the hoodie, the thumbs-up relaxing into a small wave and returning. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/rookie/enter.mp4`)

> Animate the character from the picture, the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch: hopping in from the left with an energetic jump, landing with a bounce and waving. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/rookie/ready.mp4`)

> Animate the character from the picture, the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch: rolling the shoulders once with a small smirk. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/rookie/correct.mp4`)

> Animate the character from the picture, the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch: jumping with joy, a fist pump, then a big thumbs up, golden sparkles popping around. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/rookie/wrong.mp4`)

> Animate the character from the picture, the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch: an oops shrug and a head shake with an embarrassed grin, a small sweat drop appearing. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/rookie/typing.mp4`)

> Animate the character from the picture, the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch: turning to the side facing right and running fast in place, arms pumping, hair bouncing, light speed lines behind. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/rookie/win.mp4`)

> Animate the character from the picture, the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch: a double fist pump and a big happy jump with confetti falling, ending in a triumphant thumbs-up pose. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/rookie/lose.mp4`)

> Animate the character from the picture, the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch: shoulders dropping, the hood falling forward over the eyes, a sigh and a slump, a small gray cloud above the head. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/rookie/champion.mp4`)

> Animate the character from the picture, the cheerful teenage boy with messy black hair and a blue hoodie with a small yellow lightning-bolt patch: lifting a golden trophy overhead with both hands as golden confetti and warm light rays burst, laughing with pride. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 2. Sprout (`sprout`)

**idle** (3 to 4 s, loop, file `public/media/skins/sprout/idle.mp4`)

> Animate the character from the picture, the cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves, and an olive-green vine-pattern bomber jacket: the leaves on the head swaying gently in a breeze, weight shifting with a relaxed smirk. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/sprout/enter.mp4`)

> Animate the character from the picture, the cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves, and an olive-green vine-pattern bomber jacket: rolling in from the left in a quick somersault and popping upright in a cool pose. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/sprout/ready.mp4`)

> Animate the character from the picture, the cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves, and an olive-green vine-pattern bomber jacket: flicking one of the leaves with a finger. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/sprout/correct.mp4`)

> Animate the character from the picture, the cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves, and an olive-green vine-pattern bomber jacket: snapping the fingers, a small flower blooming in the hair for a moment, green sparkles around. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/sprout/wrong.mp4`)

> Animate the character from the picture, the cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves, and an olive-green vine-pattern bomber jacket: a wince, the leaves drooping for a moment, scratching the head with an awkward smile. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/sprout/typing.mp4`)

> Animate the character from the picture, the cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves, and an olive-green vine-pattern bomber jacket: turning to the side facing right and sprinting in place, leaves streaming back, green speed lines. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/sprout/win.mp4`)

> Animate the character from the picture, the cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves, and an olive-green vine-pattern bomber jacket: spinning like a helicopter with arms out, a flower blooming in the hair and petals flying around. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/sprout/lose.mp4`)

> Animate the character from the picture, the cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves, and an olive-green vine-pattern bomber jacket: the leaves wilting and drooping, shoulders dropping into a slump, a single dew drop falling like a tear. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/sprout/champion.mp4`)

> Animate the character from the picture, the cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves, and an olive-green vine-pattern bomber jacket: raising a golden trophy overhead as green and gold confetti falls and a big flower blooms in the hair. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 3. Comet (`comet`)

**idle** (3 to 4 s, loop, file `public/media/skins/comet/idle.mp4`)

> Animate the character from the picture, the cool teenage speedster with swept-back fiery orange hair that streams like a comet tail, and an orange and charcoal racing jacket: the fiery hair-tail flickering and waving, sparks floating around, restless bouncing. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/comet/enter.mp4`)

> Animate the character from the picture, the cool teenage speedster with swept-back fiery orange hair that streams like a comet tail, and an orange and charcoal racing jacket: streaking in from the left leaving a blazing sparkle trail and skidding to a stop in a cool pose. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/comet/ready.mp4`)

> Animate the character from the picture, the cool teenage speedster with swept-back fiery orange hair that streams like a comet tail, and an orange and charcoal racing jacket: tapping a foot impatiently, sparks popping. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/comet/correct.mp4`)

> Animate the character from the picture, the cool teenage speedster with swept-back fiery orange hair that streams like a comet tail, and an orange and charcoal racing jacket: a fist pump and a quick mid-air flip, a burst of orange sparks. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/comet/wrong.mp4`)

> Animate the character from the picture, the cool teenage speedster with swept-back fiery orange hair that streams like a comet tail, and an orange and charcoal racing jacket: the hair-flames dimming for a moment, a wince and rubbing the back of the neck, a small puff of smoke. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/comet/typing.mp4`)

> Animate the character from the picture, the cool teenage speedster with swept-back fiery orange hair that streams like a comet tail, and an orange and charcoal racing jacket: turning to the side facing right and dashing in place at top speed, the hair-tail streaming back like a comet tail, speed streaks and sparks. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/comet/win.mp4`)

> Animate the character from the picture, the cool teenage speedster with swept-back fiery orange hair that streams like a comet tail, and an orange and charcoal racing jacket: a victory loop-the-loop leaving a sparkling star trail, landing in a pose with sparks bursting. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/comet/lose.mp4`)

> Animate the character from the picture, the cool teenage speedster with swept-back fiery orange hair that streams like a comet tail, and an orange and charcoal racing jacket: the fire in the hair dimming to a small ember, a slump, a thin puff of smoke rising. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/comet/champion.mp4`)

> Animate the character from the picture, the cool teenage speedster with swept-back fiery orange hair that streams like a comet tail, and an orange and charcoal racing jacket: raising a golden trophy overhead as the hair-tail blazes bright gold, golden confetti and fireworks bursting. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 4. Shadow Ninja (`ninja`)

**Face-off picture for the Ninja (use as the LAST frame of `enter`; the first frame is the normal Ninja picture, so no `enter.jpg` still is needed):**

> Use the attached image as the reference. Keep the eyes exactly as in the reference: the same glowing violet-white eyes, the glow must stay and burn a little brighter. Same character, same outfit, same framing, same flat dark indigo background and same style, but in a competitive face-off pose: in a low fighting stance turned toward the right side of the frame, the head turned to glare at an opponent off-screen to the right, one hand extended forward toward the right with the fingers curled in a "come at me" beckon, the other fist held low, the purple scarf flaring sideways, faint wisps of dark smoke around the feet. No weapons, no lightning effects. Keep the head and shoulders centered with space around it. No text, no logos, no watermark.

**idle** (3 to 4 s, loop, file `public/media/skins/ninja/idle.mp4`)

> Animate the character from the picture, the cool teenage ninja in a charcoal-navy suit and hood with glowing violet-white eyes and a long purple scarf: standing in a low calm stance, the scarf fluttering, the eyes glinting violet. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/ninja/enter.mp4`)

> Animate the character from the picture, the cool teenage ninja in a charcoal-navy suit and hood with glowing violet-white eyes and a long purple scarf: a dramatic face-off entrance facing right: vanishing in a puff of dark smoke and reappearing in a low stance with the scarf whipping sideways, a quick ninja hand-seal with two fingers raised in front of the mask, the eyes flaring bright violet-white and leaving a faint glowing trail as the head turns toward the right side of the frame, then beckoning an opponent off-screen with one hand ("come at me") and holding a fierce glare. The character keeps facing right. The eyes stay glowing violet-white throughout. No weapons, no lightning bolts, no lightning effects. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/ninja/ready.mp4`)

> Animate the character from the picture, the cool teenage ninja in a charcoal-navy suit and hood with glowing violet-white eyes and a long purple scarf: crossing the arms and giving a slow nod. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/ninja/correct.mp4`)

> Animate the character from the picture, the cool teenage ninja in a charcoal-navy suit and hood with glowing violet-white eyes and a long purple scarf: a quick fist pump and a small spin, the scarf swirling, tiny violet sparkles. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/ninja/wrong.mp4`)

> Animate the character from the picture, the cool teenage ninja in a charcoal-navy suit and hood with glowing violet-white eyes and a long purple scarf: a slow head shake and a shrug, a small sweat drop beside the hood. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/ninja/typing.mp4`)

> Animate the character from the picture, the cool teenage ninja in a charcoal-navy suit and hood with glowing violet-white eyes and a long purple scarf: turning to the side facing right and dashing in place with ninja speed, the scarf streaming back, speed lines. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/ninja/win.mp4`)

> Animate the character from the picture, the cool teenage ninja in a charcoal-navy suit and hood with glowing violet-white eyes and a long purple scarf: a swift ninja move: a fast spin with the scarf whipping around, a flip through the air leaving faint violet afterimage trails, landing in a low crouch with one hand on the ground, then rising slowly and crossing the arms in a calm confident pose as the eyes flare brighter violet-white, a small puff of dark smoke and a few violet sparks, no confetti, no smiling, no celebrating. The eyes stay glowing violet-white throughout. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/ninja/lose.mp4`)

> Animate the character from the picture, the cool teenage ninja in a charcoal-navy suit and hood with glowing violet-white eyes and a long purple scarf: furious: the eyebrows slamming down, the eyes narrowing and flaring brighter violet-white, the fists clenching and shaking, one hard stomp, the scarf whipping sideways, a puff of dark smoke rising from the shoulders, ending in a seething stance glaring straight at the camera, no slumping, no sadness. The eyes stay glowing violet-white throughout. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/ninja/champion.mp4`)

> Animate the character from the picture, the cool teenage ninja in a charcoal-navy suit and hood with glowing violet-white eyes and a long purple scarf: holding a golden trophy overhead as golden confetti and violet light rays burst, the scarf waving proudly. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 5. Quiz Wizard (`wizard`)

**idle** (3 to 4 s, loop, file `public/media/skins/wizard/idle.mp4`)

> Animate the character from the picture, the cool young wizard with a tall violet star-covered hat, round golden glasses, a silver beard, a violet cloak and a glowing floating blue book: the floating book hovering and turning a page by itself, the hat tip wobbling, adjusting the glasses. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/wizard/enter.mp4`)

> Animate the character from the picture, the cool young wizard with a tall violet star-covered hat, round golden glasses, a silver beard, a violet cloak and a glowing floating blue book: appearing in a swirl of magic sparkles with the cloak billowing, striking a wise pose. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/wizard/ready.mp4`)

> Animate the character from the picture, the cool young wizard with a tall violet star-covered hat, round golden glasses, a silver beard, a violet cloak and a glowing floating blue book: raising one eyebrow and tapping the floating book. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/wizard/correct.mp4`)

> Animate the character from the picture, the cool young wizard with a tall violet star-covered hat, round golden glasses, a silver beard, a violet cloak and a glowing floating blue book: snapping the fingers, stars bursting from the book, a grin and a thumbs up. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/wizard/wrong.mp4`)

> Animate the character from the picture, the cool young wizard with a tall violet star-covered hat, round golden glasses, a silver beard, a violet cloak and a glowing floating blue book: the book snapping shut with a small puff of smoke, a wince, pushing up the glasses. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/wizard/typing.mp4`)

> Animate the character from the picture, the cool young wizard with a tall violet star-covered hat, round golden glasses, a silver beard, a violet cloak and a glowing floating blue book: turning to the side facing right and running quickly in place holding the hat on with one hand, the book flying alongside, sparkles trailing. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/wizard/win.mp4`)

> Animate the character from the picture, the cool young wizard with a tall violet star-covered hat, round golden glasses, a silver beard, a violet cloak and a glowing floating blue book: raising the glowing book overhead and stars bursting out of the hat like fireworks. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/wizard/lose.mp4`)

> Animate the character from the picture, the cool young wizard with a tall violet star-covered hat, round golden glasses, a silver beard, a violet cloak and a glowing floating blue book: the hat flopping over the eyes, the book dropping shut, a sigh and a slump, a tiny gray cloud above. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/wizard/champion.mp4`)

> Animate the character from the picture, the cool young wizard with a tall violet star-covered hat, round golden glasses, a silver beard, a violet cloak and a glowing floating blue book: lifting a golden trophy overhead as stars, golden confetti and magic light rays burst around, the book spinning. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 6. Astro (`astronaut`)

**idle** (3 to 4 s, loop, file `public/media/skins/astronaut/idle.mp4`)

> Animate the character from the picture, the cool young astronaut in a white and orange space suit with a round glass helmet reflecting stars: floating gently in zero gravity, rotating slowly a little, a slow blink, a small thumbs up. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/astronaut/enter.mp4`)

> Animate the character from the picture, the cool young astronaut in a white and orange space suit with a round glass helmet reflecting stars: flying in from the left with a small thruster puff and a quick salute. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/astronaut/ready.mp4`)

> Animate the character from the picture, the cool young astronaut in a white and orange space suit with a round glass helmet reflecting stars: a confident nod and a tap on the helmet. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/astronaut/correct.mp4`)

> Animate the character from the picture, the cool young astronaut in a white and orange space suit with a round glass helmet reflecting stars: a happy zero-gravity somersault with a fist pump, stars sparkling around. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/astronaut/wrong.mp4`)

> Animate the character from the picture, the cool young astronaut in a white and orange space suit with a round glass helmet reflecting stars: a shrug, the visor fogging up for a moment, wiping it with a glove. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/astronaut/typing.mp4`)

> Animate the character from the picture, the cool young astronaut in a white and orange space suit with a round glass helmet reflecting stars: turning to the side facing right and zooming forward in place with a thruster flame, speed lines and stars streaking back. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/astronaut/win.mp4`)

> Animate the character from the picture, the cool young astronaut in a white and orange space suit with a round glass helmet reflecting stars: a zero-gravity somersault planting a tiny flag in a victorious pose, stars bursting. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/astronaut/lose.mp4`)

> Animate the character from the picture, the cool young astronaut in a white and orange space suit with a round glass helmet reflecting stars: drifting slowly downward, deflated, shoulders slumped, the visor fogging up. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/astronaut/champion.mp4`)

> Animate the character from the picture, the cool young astronaut in a white and orange space suit with a round glass helmet reflecting stars: lifting a golden trophy overhead while floating, golden confetti and light rays bursting around. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 7. Shadow Knight (`knight`)

**idle** (3 to 4 s, loop, file `public/media/skins/knight/idle.mp4`)

> Animate the character from the picture, the cool dark Shadow Knight in charcoal-navy plate armor with a crested helmet, glowing violet-white eyes and a dark purple cape: standing still, the cape rippling in the wind, the eyes glinting violet. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/knight/enter.mp4`)

> Animate the character from the picture, the cool dark Shadow Knight in charcoal-navy plate armor with a crested helmet, glowing violet-white eyes and a dark purple cape: stepping out of dark mist with a heavy clank, the cape snapping open. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/knight/ready.mp4`)

> Animate the character from the picture, the cool dark Shadow Knight in charcoal-navy plate armor with a crested helmet, glowing violet-white eyes and a dark purple cape: clenching a fist and giving a slow confident nod. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/knight/correct.mp4`)

> Animate the character from the picture, the cool dark Shadow Knight in charcoal-navy plate armor with a crested helmet, glowing violet-white eyes and a dark purple cape: raising a fist, the cape swirling, a small violet light burst from the armor. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/knight/wrong.mp4`)

> Animate the character from the picture, the cool dark Shadow Knight in charcoal-navy plate armor with a crested helmet, glowing violet-white eyes and a dark purple cape: bowing the head slightly and shaking it, the eye glow flickering. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/knight/typing.mp4`)

> Animate the character from the picture, the cool dark Shadow Knight in charcoal-navy plate armor with a crested helmet, glowing violet-white eyes and a dark purple cape: turning to the side facing right and marching fast in place with heavy steps, the cape streaming behind, speed lines. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/knight/win.mp4`)

> Animate the character from the picture, the cool dark Shadow Knight in charcoal-navy plate armor with a crested helmet, glowing violet-white eyes and a dark purple cape: raising a fist to the sky, the cape swirling and purple light bursting from the armor. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/knight/lose.mp4`)

> Animate the character from the picture, the cool dark Shadow Knight in charcoal-navy plate armor with a crested helmet, glowing violet-white eyes and a dark purple cape: kneeling and bowing the head, the eye glow dimming and the cape settling. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/knight/champion.mp4`)

> Animate the character from the picture, the cool dark Shadow Knight in charcoal-navy plate armor with a crested helmet, glowing violet-white eyes and a dark purple cape: raising a golden trophy overhead with both hands as golden confetti and purple light rays burst, the cape flowing. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 8. Captain (`pirate`)

**idle** (3 to 4 s, loop, file `public/media/skins/pirate/idle.mp4`)

> Animate the character from the picture, the swaggering pirate captain with a tricorn hat, eyepatch, braided auburn beard, teal coat and a colorful parrot on the shoulder: the parrot hopping on the shoulder, the beard swaying in a sea breeze, a gold coin twirling over the fingers. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/pirate/enter.mp4`)

> Animate the character from the picture, the swaggering pirate captain with a tricorn hat, eyepatch, braided auburn beard, teal coat and a colorful parrot on the shoulder: swinging in from the left on a rope and landing with a grin and a bow. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/pirate/ready.mp4`)

> Animate the character from the picture, the swaggering pirate captain with a tricorn hat, eyepatch, braided auburn beard, teal coat and a colorful parrot on the shoulder: stroking the beard and giving a wink. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/pirate/correct.mp4`)

> Animate the character from the picture, the swaggering pirate captain with a tricorn hat, eyepatch, braided auburn beard, teal coat and a colorful parrot on the shoulder: laughing loudly and flipping a gold coin that sparkles, the parrot flapping its wings. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/pirate/wrong.mp4`)

> Animate the character from the picture, the swaggering pirate captain with a tricorn hat, eyepatch, braided auburn beard, teal coat and a colorful parrot on the shoulder: a groan and a slap on the forehead, the parrot covering its eyes with a wing. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/pirate/typing.mp4`)

> Animate the character from the picture, the swaggering pirate captain with a tricorn hat, eyepatch, braided auburn beard, teal coat and a colorful parrot on the shoulder: turning to the side facing right and running fast in place, the coat flapping, the parrot flying alongside, speed lines. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/pirate/win.mp4`)

> Animate the character from the picture, the swaggering pirate captain with a tricorn hat, eyepatch, braided auburn beard, teal coat and a colorful parrot on the shoulder: laughing and spinning on the heel, tossing a sparkling gold coin, the parrot flapping, confetti falling. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/pirate/lose.mp4`)

> Animate the character from the picture, the swaggering pirate captain with a tricorn hat, eyepatch, braided auburn beard, teal coat and a colorful parrot on the shoulder: the hat falling off, a sigh and a slump, the parrot covering its eyes. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/pirate/champion.mp4`)

> Animate the character from the picture, the swaggering pirate captain with a tricorn hat, eyepatch, braided auburn beard, teal coat and a colorful parrot on the shoulder: lifting a golden trophy overhead laughing loudly, gold coins and confetti raining down, the parrot cheering. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 9. Tiger Cub (`cub`)

**idle** (3 to 4 s, loop, file `public/media/skins/cub/idle.mp4`)

> Animate the character from the picture, the athletic young anthropomorphic tiger with orange fur and black stripes, a black and orange track jacket and a gold winner's medal: the tail swishing, an ear twitching, bouncing lightly on the feet with a cocky grin. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/cub/enter.mp4`)

> Animate the character from the picture, the athletic young anthropomorphic tiger with orange fur and black stripes, a black and orange track jacket and a gold winner's medal: pouncing into frame from the left, landing in a crouch and standing up with a grin. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/cub/ready.mp4`)

> Animate the character from the picture, the athletic young anthropomorphic tiger with orange fur and black stripes, a black and orange track jacket and a gold winner's medal: cracking the knuckles with a grin. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/cub/correct.mp4`)

> Animate the character from the picture, the athletic young anthropomorphic tiger with orange fur and black stripes, a black and orange track jacket and a gold winner's medal: a fist pump and a quick jump, the medal bouncing on the chest, sparkles. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/cub/wrong.mp4`)

> Animate the character from the picture, the athletic young anthropomorphic tiger with orange fur and black stripes, a black and orange track jacket and a gold winner's medal: the ears dropping, scratching the head with a sheepish grin, a small sweat drop. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/cub/typing.mp4`)

> Animate the character from the picture, the athletic young anthropomorphic tiger with orange fur and black stripes, a black and orange track jacket and a gold winner's medal: turning to the side facing right and sprinting on all fours in place, tail up, speed lines. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/cub/win.mp4`)

> Animate the character from the picture, the athletic young anthropomorphic tiger with orange fur and black stripes, a black and orange track jacket and a gold winner's medal: letting out a big roar with a fist pump, confetti falling, the medal glinting. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/cub/lose.mp4`)

> Animate the character from the picture, the athletic young anthropomorphic tiger with orange fur and black stripes, a black and orange track jacket and a gold winner's medal: slumping, the ears flattening, the tail curling around, a small gray cloud above. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/cub/champion.mp4`)

> Animate the character from the picture, the athletic young anthropomorphic tiger with orange fur and black stripes, a black and orange track jacket and a gold winner's medal: lifting a golden trophy overhead with a big roar, golden confetti and light rays bursting, the medal glowing. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 10. Dragon (`dragon`)

**idle** (3 to 4 s, loop, file `public/media/skins/dragon/idle.mp4`)

> Animate the character from the picture, the cool young anthropomorphic emerald dragon with curved golden horns, small folded wings and a dark green jacket: a tiny flame flickering near the snout, smoke curling from the nostrils, the folded wings fluttering slightly. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/dragon/enter.mp4`)

> Animate the character from the picture, the cool young anthropomorphic emerald dragon with curved golden horns, small folded wings and a dark green jacket: sweeping a long stream of fire from the mouth along the ground toward the right, then beckoning with one claw (come and get it), the wings flaring once. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/dragon/ready.mp4`)

> Animate the character from the picture, the cool young anthropomorphic emerald dragon with curved golden horns, small folded wings and a dark green jacket: puffing out a smoke ring with a smirk. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/dragon/correct.mp4`)

> Animate the character from the picture, the cool young anthropomorphic emerald dragon with curved golden horns, small folded wings and a dark green jacket: a fist pump and a small burst of sparks, the wings flaring briefly. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/dragon/wrong.mp4`)

> Animate the character from the picture, the cool young anthropomorphic emerald dragon with curved golden horns, small folded wings and a dark green jacket: hiccuping a puff of smoke, the wings drooping, rubbing the back of the neck. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/dragon/typing.mp4`)

> Animate the character from the picture, the cool young anthropomorphic emerald dragon with curved golden horns, small folded wings and a dark green jacket: turning to the side facing right and running fast in place with the wings flapping, flames trailing, speed lines. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/dragon/win.mp4`)

> Animate the character from the picture, the cool young anthropomorphic emerald dragon with curved golden horns, small folded wings and a dark green jacket: raising the head and breathing one tall column of fire from the mouth straight up like a firework that bursts into golden sparks, the wings spreading wide. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/dragon/lose.mp4`)

> Animate the character from the picture, the cool young anthropomorphic emerald dragon with curved golden horns, small folded wings and a dark green jacket: an angry stomp, then a short sharp burst of fire from the mouth straight at the camera, fists clenched, thick smoke from the nostrils, the wings snapping open then drooping. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/dragon/champion.mp4`)

> Animate the character from the picture, the cool young anthropomorphic emerald dragon with curved golden horns, small folded wings and a dark green jacket: lifting a golden trophy overhead while breathing golden fireworks, the wings spreading wide, confetti falling. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 11. Phoenix (`phoenix`)

**idle** (3 to 4 s, loop, file `public/media/skins/phoenix/idle.mp4`)

> Animate the character from the picture, the cool teenage fire-bird hero with a crest of flame-feather hair, a feathered ember-tipped shoulder mantle and a crimson and gold jacket: the flame-feather crest flickering, embers drifting upward, the ember-tipped feathers shimmering. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/phoenix/enter.mp4`)

> Animate the character from the picture, the cool teenage fire-bird hero with a crest of flame-feather hair, a feathered ember-tipped shoulder mantle and a crimson and gold jacket: bursting in as a fireball from the left that opens up into the character in a strong pose. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/phoenix/ready.mp4`)

> Animate the character from the picture, the cool teenage fire-bird hero with a crest of flame-feather hair, a feathered ember-tipped shoulder mantle and a crimson and gold jacket: brushing a flame feather back with a confident smile. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/phoenix/correct.mp4`)

> Animate the character from the picture, the cool teenage fire-bird hero with a crest of flame-feather hair, a feathered ember-tipped shoulder mantle and a crimson and gold jacket: a fist pump with sparks of fire bursting around, the wings flaring out for a moment. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/phoenix/wrong.mp4`)

> Animate the character from the picture, the cool teenage fire-bird hero with a crest of flame-feather hair, a feathered ember-tipped shoulder mantle and a crimson and gold jacket: the flames dimming briefly, a wince and rubbing the neck, a small puff of ash. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/phoenix/typing.mp4`)

> Animate the character from the picture, the cool teenage fire-bird hero with a crest of flame-feather hair, a feathered ember-tipped shoulder mantle and a crimson and gold jacket: turning to the side facing right and flying forward in place with wings beating, a fire trail streaming behind, speed lines. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/phoenix/win.mp4`)

> Animate the character from the picture, the cool teenage fire-bird hero with a crest of flame-feather hair, a feathered ember-tipped shoulder mantle and a crimson and gold jacket: rising with wings spread wide in a blazing fire aura, embers and golden feathers flying. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/phoenix/lose.mp4`)

> Animate the character from the picture, the cool teenage fire-bird hero with a crest of flame-feather hair, a feathered ember-tipped shoulder mantle and a crimson and gold jacket: the flames dimming to a gray ash color, a slump, the wings curling around the body. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/phoenix/champion.mp4`)

> Animate the character from the picture, the cool teenage fire-bird hero with a crest of flame-feather hair, a feathered ember-tipped shoulder mantle and a crimson and gold jacket: lifting a golden trophy overhead as a huge fiery aura and golden feathers burst, wings spread wide. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

---

## 12. Legend (`legend`)

**idle** (3 to 4 s, loop, file `public/media/skins/legend/idle.mp4`)

> Animate the character from the picture, the calm champion hero in a white and gold armor-jacket with a laurel-and-light crown, a flowing golden cape and a golden aura: standing calm and still, the golden cape swaying, the aura pulsing softly, light particles drifting. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**enter** (2 to 3 s, file `public/media/skins/legend/enter.mp4`)

> Animate the character from the picture, the calm champion hero in a white and gold armor-jacket with a laurel-and-light crown, a flowing golden cape and a golden aura: a beam of golden light descending and the hero landing majestically, the cape settling. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**ready** (2 to 3 s, loop, file `public/media/skins/legend/ready.mp4`)

> Animate the character from the picture, the calm champion hero in a white and gold armor-jacket with a laurel-and-light crown, a flowing golden cape and a golden aura: a slow confident nod, the aura brightening slightly. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**correct** (2 s, file `public/media/skins/legend/correct.mp4`)

> Animate the character from the picture, the calm champion hero in a white and gold armor-jacket with a laurel-and-light crown, a flowing golden cape and a golden aura: raising one fist, a burst of golden light pulsing outward. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**wrong** (2 s, file `public/media/skins/legend/wrong.mp4`)

> Animate the character from the picture, the calm champion hero in a white and gold armor-jacket with a laurel-and-light crown, a flowing golden cape and a golden aura: closing the eyes and shaking the head calmly, the aura dimming for a moment then returning. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**typing** (2 s, loop, file `public/media/skins/legend/typing.mp4`)

> Animate the character from the picture, the calm champion hero in a white and gold armor-jacket with a laurel-and-light crown, a flowing golden cape and a golden aura: turning to the side facing right and striding fast in place, the golden cape streaming behind, light trails. The last frame matches the first frame so it loops. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**win** (3 to 4 s, file `public/media/skins/legend/win.mp4`)

> Animate the character from the picture, the calm champion hero in a white and gold armor-jacket with a laurel-and-light crown, a flowing golden cape and a golden aura: lifting the floating trophy overhead in a golden burst of light. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**lose** (3 s, file `public/media/skins/legend/lose.mp4`)

> Animate the character from the picture, the calm champion hero in a white and gold armor-jacket with a laurel-and-light crown, a flowing golden cape and a golden aura: kneeling with dignity, the aura dimming and the cape settling around. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.

**champion** (5 to 6 s, file `public/media/skins/legend/champion.mp4`)

> Animate the character from the picture, the calm champion hero in a white and gold armor-jacket with a laurel-and-light crown, a flowing golden cape and a golden aura: lifting a golden trophy overhead as a huge golden light burst, confetti and rays fill the frame, the aura blazing. Locked camera, no zoom, no pan, no cuts. Same flat dark indigo background, same character design as the first frame, no text, no extra characters, the character stays centered.


### Dragon: fire from the mouth (image-prompt touches)

Every win, lose and face-off move of the Dragon uses fire from the mouth, each with a different move. For the start/end pictures add:

- face-off picture: *a thin stream of flame and embers curling from the lips*
- win picture: *head raised, a column of golden embers rising from the mouth*
- angry (lose) picture: *jaws slightly open, orange glow inside the mouth, thick smoke*
