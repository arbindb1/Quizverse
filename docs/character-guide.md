# Quizverse character guide (for Google Flow)

Use this to create each character as a picture, then animate it with action clips. Files and names are final, so you can work through them in any order.

## How the pieces fit

1. **Picture**: one portrait per character, saved as `public/media/skins/<id>.png` (`.jpg` and `.webp` also work; about 512 px is plenty). The site already uses it (circle crop, 24 to 112 px) and animates it with built-in motion (bobbing, hopping, dancing...).
2. **Action clips** (optional, for later): short videos made from that picture, saved as `public/media/skins/<id>/<action>.mp4`. The site plays them automatically: a clip replaces the built-in motion for that character and action (big sizes only: VS screen, match result, champion screen, Locker, home), and anything missing keeps the built-in motion. A picture saved next to a clip with the same name (for example `rookie/enter.jpg`) is shown as that clip's still frame until it starts. Mapping: `idle` for waiting and the VS screen (`enter` first if you have it), `win` for the winner, `lose` for the eliminated player, `champion` on the winner screen (falls back to `win`). Clips are shown in a circle, center-cropped, muted unless the speaker button is on.

## Shared style (put this in every prompt)

> Stylized 3D animated-movie look, chibi proportions (head about 60% of the body), big glossy expressive eyes, smooth soft materials, soft purple and teal rim light, plain flat dark purple background (#1b1640), character centered, head-and-shoulders portrait, friendly family-friendly mood. No text, no logos, no watermark, no existing franchise characters.

Keep the character **centered with space around it**: the site crops pictures to a circle, so anything near the edges gets cut.

## The 12 characters (final designs)

Design direction: cool, humanoid characters with attitude (outfits, three-quarter view, confident expressions), not cute blob mascots. Generate **Rookie first**, then attach it as the style reference for the others. Each prompt below goes after this sentence:

> Use the attached image as the style reference: same stylized 3D animated-movie look, same soft purple and teal rim light, same flat dark indigo background, same centered head-and-shoulders framing, same big glossy eyes with highlights.

Keep the head and shoulders centered with space around it, and end with: *No text, no logos, no watermark.*

### 1. Rookie (`rookie`, free (default))
Eager and a little nervous, always bouncy.
Prompt: *New character: Rookie, a cheerful teenage quiz contestant, short messy black hair with a cowlick, big brown eyes, a wide grin, a bright blue hoodie with a small yellow lightning-bolt patch, giving a thumbs up. Hands match the skin tone..*

### 2. Sprout (`sprout`, free)
Laid-back and confident, calm like a breeze.
Prompt: *New character: Sprout, a cool teenage nature kid with a mint-green hair swoosh that grows into two glossy leaves on top like a sprout, light freckles, bright green eyes, a confident half-smirk, an olive-green bomber jacket with a subtle vine pattern, a small dew-drop pendant on a necklace, three-quarter view with a relaxed confident attitude.*

### 3. Comet (`comet`, free)
Hyper, restless and always in motion.
Prompt: *New character: Comet, a cool teenage speedster with swept-back fiery orange hair that streams behind like a comet tail with glowing sparks, amber eyes, a confident grin, a sleek orange and charcoal racing jacket with a high collar and white star patches, three-quarter view leaning forward as if mid-sprint, the hair-tail kept short so it stays inside the frame.*

### 4. Shadow Ninja (`ninja`, level 2)
Calm, silent and dangerous.
Prompt: *New character: Shadow Ninja, a cool teenage ninja in a sleek charcoal-navy suit with a hood and a face mask, only the sharp glowing violet-white eyes visible with a confident narrowed look, a long purple scarf flowing sideways in the wind, a small plain silver headband plate with no symbol, subtle purple light glinting on the fabric, three-quarter view, calm and dangerous attitude, no weapons.*

### 5. Quiz Wizard (`wizard`, level 3)
Clever, a bit goofy, always one step ahead.
Prompt: *New character: Quiz Wizard, a cool young wizard with a tall deep-violet pointed hat decorated with gold stars and a crescent moon, round golden glasses, a neatly trimmed silver beard, a clever half-smile with one raised eyebrow, a deep-violet cloak with gold trim and a high collar, a glowing blue book floating beside him with a glowing question-mark symbol, tiny sparkles of magic in the air, three-quarter view, confident and wise attitude.*

### 6. Astro (`astronaut`, level 4)
Adventurous and endlessly curious.
Prompt: *New character: Astro, a cool young astronaut in a sleek white and orange space suit with metallic details, a round glass helmet whose visor reflects stars and a small planet, face clearly visible through clear glass with a confident grin and bright eyes, a small antenna on the helmet, a plain star mission patch on the shoulder, glowing teal light on the suit edges, three-quarter view, adventurous and curious attitude, no agency logos or flags.*

### 7. Shadow Knight (`knight`, level 6)
Calm, heavy and dangerous. The Ninja's armored sibling.
Prompt: *New character: Shadow Knight, a cool teenage knight in sleek charcoal-navy plate armor, closed helmet with a short crest and a narrow visor slit, only the sharp glowing violet-white eyes visible with a confident narrowed look, broad shoulder plates with subtle purple edge lighting, a high collar, a long dark purple cape flowing sideways in the wind, clean metal segments and stitched panels, subtle purple light glinting on the metal, three-quarter view, calm and dangerous attitude, no weapons.*

### 8. Captain (`pirate`, play 3 tournaments)
Bold, boastful and jolly.
Prompt: *New character: Captain, a cool charismatic pirate captain in his late twenties, a weathered dark tricorn hat with a gold anchor emblem, a black eyepatch over one eye, a short braided auburn beard with a few small beads, a gold earring, a confident smirk with one gold tooth, a teal captain's coat with gold buttons and a high collar, a small colorful parrot perched on one shoulder, a faint sea breeze in the hair, three-quarter view, bold and swaggering attitude.*

### 9. Tiger Cub (`cub`, win 1 tournament)
Playful, competitive and cocky.
Prompt: *New character: Tiger Cub, a cool young anthropomorphic tiger, athletic and confident, orange fur with bold black stripes, white muzzle and chest fur, bright amber eyes, a cocky grin showing one small fang, rounded ears with white insides, a black and orange track jacket with a high collar, a gold winner's medal hanging on its chest, three-quarter view, playful and competitive attitude.*

### 10. Dragon (`dragon`, win 3 tournaments)
Proud and fiery, but kind.
Prompt: *New character: Dragon, a cool young anthropomorphic dragon, emerald green scales with a lighter belly, two curved golden horns swept back, bright golden eyes with slit pupils, a confident smirk, thin wisps of smoke curling from the nostrils, a small flame floating near the snout, small wings folded behind the shoulders, a dark green jacket with gold trim and a high collar, three-quarter view, proud and fiery attitude.*

### 11. Phoenix (`phoenix`, win 5 tournaments)
Fierce and graceful.
Prompt: *New character: Phoenix, a cool teenage fire-bird hero, a crest of feather-shaped flame hair fading from crimson to orange to gold, bright amber eyes, a fierce confident smile, a feathered shoulder mantle whose tips glow like embers, a crimson and gold jacket with a high collar, glowing embers drifting up and a faint heat shimmer around the head, wings partly visible behind the shoulders, clean stylized flame shapes, three-quarter view, fierce and graceful attitude.*

### 12. Legend (`legend`, win 10 tournaments)
Calm, confident, the most premium of the cast.
Prompt: *New character: Legend, an ultimate champion hero, calm and confident, white and gold armor-jacket with glowing abstract light lines and a high collar, a crown made of golden laurel leaves and light, a long flowing golden cape, a radiant golden aura behind the head with floating light particles, a small golden trophy floating beside the shoulder, a quiet confident smile, three-quarter view, the most premium and impressive look of the whole cast.*

## Action clips (image to video)

All 108 ready-to-paste action prompts (12 characters x 9 actions) are in [action-prompts.md](action-prompts.md). The notes below explain the rules.

Use each character's picture as the first frame ("Frames to Video" / image-to-video in Flow). Clips are shown small (up to 112 px, in a circle), so keep them short and the motion big and readable.

### Rules for every clip

- Camera **locked**: no zoom, no pan, no cuts. Character stays centered with room around it.
- Same flat dark purple background, same character design (same colors and outfit), no extra characters, no text.
- No sound needed. 2 to 4 seconds (the champion clip up to 6).
- For **loops** (idle, ready, typing): use the same picture as first and last frame so it loops smoothly.
- Prefer 1:1 if Flow offers it; otherwise 16:9 with the character in the middle (it gets center-cropped).
- Compress to a small square file (about 300 to 600 KB):
  `ffmpeg -i in.mp4 -vf "crop=ih:ih,scale=360:360" -c:v libx264 -crf 30 -an out.mp4`

### The 9 actions

| File | When it plays | Length | Loop? | Prompt (replace [character] with the description above) |
| --- | --- | --- | --- | --- |
| `idle.mp4` | Waiting in the lobby, on the bracket, between matches | 3 to 4 s | yes | [character] standing in a relaxed idle pose, gentle breathing, a slow blink and one small signature movement, locked camera |
| `enter.mp4` | VS screen, when the match is announced | 2 to 3 s | no, hold last frame | [character] makes an energetic entrance and ends in a confident ready pose facing the camera, locked camera |
| `ready.mp4` | After you lock in an answer and wait for the opponent | 2 to 3 s | yes | [character] confidently waiting, a small nod and a slight smirk, arms ready, locked camera |
| `correct.mp4` | Right answer, race won | 2 s | no | [character] jumps with joy and gives a thumbs up, sparkles around, locked camera |
| `wrong.mp4` | Wrong answer, race lost | 2 s | no | [character] reacts with an "oops" shrug and a head shake, a small sweat drop, locked camera |
| `typing.mp4` | During a typing race | 2 s | yes | [character] running fast in place seen from the side facing right, determined face, speed lines, locked camera |
| `win.mp4` | You win a match | 3 to 4 s | no, hold last frame | [character] celebrates a victory with a big happy jump and confetti, ends in a triumphant pose, locked camera |
| `lose.mp4` | You are eliminated | 3 s | no, hold last frame | [character] looks defeated, shoulders drop and the character slumps sadly, a small gloomy cloud above, ends slumped, locked camera |
| `champion.mp4` | You win the whole tournament | 5 to 6 s | no, hold last frame | [character] lifts a golden trophy overhead as golden confetti and light rays burst, ends in a proud pose, locked camera |

### Each character's signature moves

Add these to the prompts so each character feels different.

| Character | Idle | Enter | Win | Lose |
| --- | --- | --- | --- | --- |
| Rookie | bounces on its toes, tugs the hoodie | hops in from the left and waves | double fist pump, then thumbs up | hood falls over the eyes, small sigh |
| Sprout | leaves sway, tiny hop | rolls in and pops upright | spins like a helicopter, a small flower blooms on its head | leaves droop and wilt, one tear drop |
| Comet | tail flickers, sparkles orbit | streaks in with a blazing trail and skids to a stop | loop-the-loop leaving a star trail | fire dims to an ember, a puff of smoke |
| Shadow Ninja | low stance, scarf flutters, eyes glint | face-off: vanishes in a smoke puff, reappears in a low stance, hand-seal, eyes flare, beckons "come at me" | fast spin and flip with violet afterimages, lands in a crouch and rises with arms crossed (cool, not celebrating) | angry: furious glare, shaking fists, a hard stomp, dark smoke (not sad) |
| Quiz Wizard | book hovers, hat wobbles | appears in a swirl of magic sparkles | raises the book, stars burst from the hat like fireworks | hat flops over the eyes, book snaps shut with a puff |
| Astro | floats and slowly rotates | flies in with a thruster puff and salutes | zero-gravity somersault with a tiny flag and stars | drifts slowly away, deflated, visor fogs up |
| Shadow Knight | stands still, cape ripples in the wind, eyes glint violet | steps out of dark mist with a heavy clank and the cape snaps open | raises a fist, cape swirls and purple light bursts from the armor | kneels, head bows, the eye glow dims and the cape settles |
| Captain | parrot hops, beard sways | swings in on a rope and lands | laughs and spins, tosses a sparkling gold coin, parrot flaps | hat falls off, parrot covers its eyes |
| Tiger Cub | tail swishes, ear twitches | pounces into frame | gives an adorable tiny roar with confetti and a spin | curls into a ball, ears down |
| Dragon | tiny flame flickers, wings flutter | sweeps a stream of fire along the ground, then beckons (face-off) | tall column of fire straight up like a firework | angry stomp, then a short sharp fire burst at the camera |
| Phoenix | feathers shimmer, embers float | bursts in as a fireball that opens into the bird | rises with wings spread in a fiery aura | feathers dim to ash gray, curls up |
| Legend | calm, hovering light, cape sways | a beam of light descends and the hero lands majestically | raises the trophy in a golden burst | kneels with dignity, aura dims |

### What to do first

108 clips is a lot, so go in this order:

1. **Pictures for all 12 characters** (they work on their own right away).
2. **Tier 1 clips**: `idle`, `win`, `lose` for the characters you care most about (start with Rookie and the free ones).
3. **Tier 2**: `enter`, `correct`, `wrong`, `typing`.
4. **Tier 3**: `ready`, `champion`.

Test the whole process on one character first, then reuse the same prompts for the rest.

## Where the files go

```
public/media/skins/rookie.png
public/media/skins/rookie/idle.mp4
public/media/skins/rookie/win.mp4
... (same for sprout, comet, ninja, wizard, astronaut, knight, pirate, cub, dragon, phoenix, legend)
```

Check Google Flow's terms for your plan before using generated media commercially.
