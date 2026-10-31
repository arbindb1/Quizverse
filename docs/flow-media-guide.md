# Quizverse media guide (Google Flow)

Quizverse can show short videos and bot pictures that you make in Google Flow. Every file is **optional**: if a file is missing the site simply looks as it did before. Drop files in these folders and refresh the page, no code change needed.

```
public/media/hero.mp4          login page background (loop)
public/media/vs-intro.mp4      behind the "A vs B" screen before every match
public/media/vs-final.mp4      behind the VS screen for semifinals and the final (falls back to vs-intro.mp4)
public/media/champion.mp4      behind the champion screen (plays once)
public/media/bots/<name>.png   bot pictures, 12 names (below)
public/media/skins/<id>.png    player character pictures, 12 skins (below); .jpg and .webp also work
public/media/skins/<id>/<action>.mp4   optional character clips (idle, win, lose, ...), see action-prompts.md
```

Bot names (files must be lowercase): `botty, robo, pixel, turbo, nova, zed, echo, byte, sparky, orbit, gizmo, cosmo`. If a room has more than 12 bots the extra ones are called "Botty 2", "Robo 2"... and reuse the same picture.

## General rules for every video

- 16:9, 720p is enough (1280x720). Length 6 to 8 seconds.
- **No text, no logos, no real people's faces** in the picture. The player names are drawn by the site on top of the video, so keep the **middle of the frame calm and fairly dark**.
- Keep each file small: **under 4 MB**. Videos play muted by default; players can turn sound on with the speaker button in the top bar, so audio is a bonus.
- Format MP4 (H.264). Compress a download with ffmpeg if it is large:
  `ffmpeg -i input.mp4 -vf scale=1280:-2 -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k output.mp4`
  (HandBrake with the "Web" preset also works.)

## Videos to generate

### 1. `hero.mp4` (login background, loops)

> Slow ambient loop: a dark navy and violet digital space with softly glowing question marks, quiz-show light bulbs and keyboard keys drifting upward like bokeh particles, gentle light rays, shallow depth of field, calm and premium, smooth slow camera drift. No text, no logos, no people.

Tip: if Flow offers "Frames to Video", use the same image as first and last frame so it loops smoothly. Sound is not needed.

### 2. `vs-intro.mp4` (every match intro)

> Cinematic esports arena before a head-to-head showdown: two powerful spotlights, one teal on the left and one magenta on the right, sweep across a dark glossy stage floor and collide in the middle with a burst of electric sparks and light. Volumetric fog, slow push-in camera, dramatic, with a clear empty dark space in the center of the frame. No text, no logos, no people.

Audio idea: low cinematic rumble building into a whoosh and impact (no vocals).

### 3. `vs-final.mp4` (semifinals and final)

> Epic championship final: a golden trophy glowing on a pedestal in the center of a huge dark arena, fire and gold embers rising, silhouettes of a cheering crowd holding glowing phones, searchlights crossing the sky, camera slowly pushing in, intense and grand, dark edges, calm dark band across the middle of the frame. No text, no logos, no recognisable faces.

Audio idea: crowd roar and a steady drumbeat.

### 4. `champion.mp4` (winner screen, plays once)

> Victory celebration: golden confetti and streamers burst from above, fireworks explode over an arena, a golden trophy rises into a beam of light in slow motion, warm light rays, joyful and triumphant, the final moment settles on a calm glowing trophy. No text, no logos.

Audio idea: cheering crowd and a short fanfare. Make sure the clip ends on a calm moment because it stops on its last frame.

## Bot pictures (12 images, now optional)

Bots now wear a random player character, so these robot pictures are only used for bots that have no character (bots in rooms created before this change). You can skip this section.

Square (1:1), about 512x512, saved as **PNG**, ideally under 150 KB. They are shown as small circles (22 px) in the bracket and lobby and as a large circle (96 px) on the VS screen.

For a consistent look, generate the first one, then use it as a reference/"ingredient" when generating the others (or reuse the same style words). Base prompt:

> Cute friendly robot mascot, head and shoulders portrait, facing the camera, centered, plain dark purple background, soft rim light, stylized 3D render, glossy, expressive eyes. No text, no logo.

Add one of these to the base prompt for each file:

| File | Add to the prompt |
| --- | --- |
| `botty.png` | round blue body, big friendly eyes |
| `robo.png` | boxy silver body, small antenna |
| `pixel.png` | retro pixel-art style, bright green screen face |
| `turbo.png` | red racing robot with goggles |
| `nova.png` | golden body with a star on the forehead |
| `zed.png` | angular matte black body, one glowing green eye |
| `echo.png` | teal robot wearing big headphones |
| `byte.png` | cube-shaped orange head, binary-code glow |
| `sparky.png` | yellow robot with a lightning-bolt antenna |
| `orbit.png` | purple round head with a planet ring around it |
| `gizmo.png` | steampunk brass robot with small gears |
| `cosmo.png` | white astronaut-helmet robot with a visor |

## Player character pictures (12 skins)

Full character descriptions and prompts are in [character-guide.md](character-guide.md); all 108 action-clip prompts are in [action-prompts.md](action-prompts.md). The short version follows.

Players unlock and pick characters (see the Locker page). Without a picture a character shows as an emoji in a coloured bubble, so these are an upgrade, not a requirement. The same style rules as the bots apply: square (1:1), about 512x512, **PNG**, under 150 KB, head-and-shoulders portrait centered on a plain dark background (they are cropped to a circle, from 24 px up to 112 px). The site animates them itself (sliding in on the VS screen, bobbing, hopping, dancing when they win, slumping when they lose, running along the typing track), so you do **not** need animated files.

Base prompt:

> Cute stylized 3D character portrait, head and shoulders, facing the camera, centered, plain dark purple background, soft rim light, glossy, expressive friendly face. No text, no logo.

Add one detail per file. The unlock rule is shown too so you can make the rarer ones fancier:

| File | Unlock | Add to the prompt |
| --- | --- | --- |
| `rookie.png` | free (default) | cheerful young quiz contestant in a casual hoodie |
| `sprout.png` | free | little leaf-sprout creature with a green sprout on its head |
| `comet.png` | free | smiling blazing comet with a fiery tail |
| `ninja.png` | level 2 | sleek ninja with a purple scarf and glowing eyes |
| `wizard.png` | level 3 | quiz wizard with a starry hat and a glowing book |
| `astronaut.png` | level 4 | astronaut with a visor reflecting stars |
| `knight.png` | level 6 | cool dark knight like the Ninja but in plate armor: charcoal-navy armor, crested helmet, glowing violet-white eyes, dark purple cape |
| `pirate.png` | play 3 tournaments | friendly cartoon pirate captain with a tricorn hat and eyepatch |
| `cub.png` | win 1 tournament | adorable tiger cub with big eyes |
| `dragon.png` | win 3 tournaments | friendly green dragon with golden horns |
| `phoenix.png` | win 5 tournaments | fiery phoenix bird with red and orange feathers |
| `legend.png` | win 10 tournaments | golden crowned champion with a glowing aura, the ultimate rare look |

Tip: generate `rookie` first and reuse it as a reference so the whole set looks like one family.

## Checking it works

1. Put the files in place and restart nothing: just hard-refresh the browser (Ctrl+Shift+R).
2. Login page shows the hero loop behind the form.
3. Host a room with bots and start it: every VS screen shows the video, bots show their pictures, and your chosen character slides in. Open the Locker page to see all 12 characters.
4. Win a tournament to see the champion clip. Use the speaker button in the top bar to switch sound on or off.

If a file is not showing, check the exact file name and that the file opens in a normal video player. Files that are missing are silently skipped.

## Rights

Check Google Flow's terms for your plan before using generated media on a public or commercial site, and keep the watermark rules in mind if your plan adds one.
