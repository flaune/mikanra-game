# Thirty-second cinematic teaser

[Download the MP4](media/mikanra-teaser-30s.mp4) · [Poster](media/mikanra-teaser-poster.jpg) · [Media verification](media/teaser-verification.json)

One tea order, preparation and a happy customer. Full-screen portrait footage, gentle original sound and only two title moments keep the story readable on a phone. The export is exactly 30 seconds, 1080 × 1920, 30 fps, H.264/yuv420p with 48 kHz AAC stereo and fast-start playback. There is no English narration, permanent frame, caption track, counter or credit footer.

This is edited, staged in-engine footage of the café repair merged in [PR #1](https://github.com/flaune/mikanra-game/pull/1), not a continuous playthrough or evidence of learning outcomes. The game is freely playable at https://mikanra-game.vercel.app/. No social upload has been created.

## Suggested upload title

Run a café. Learn Japanese. | Mikanra

## Suggested upload description

One tea, please. A small café, familiar faces, and a little Japanese along the way.

Mikanra is a cozy café game for Japanese beginners. Free desktop browser demo: https://mikanra-game.vercel.app/

Keyboard and mouse required. Edited, staged in-engine footage.

Original gameplay footage, synthesized music and sound design © 2026 Bryan. All rights reserved.

Japanese synthetic voice: OpenJTalk / HTS voice Mei, © 2009–2013 Nagoya Institute of Technology / MMDAgent Project Team, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The order recording was synthesized at 90% speed, encoded and mixed into this video. Title font: Outfit, © 2021 The Outfit Project Authors, SIL OFL 1.1. [Full project credits](https://github.com/flaune/mikanra-game/blob/main/THIRD_PARTY_NOTICES.md).

#Mikanra #LearnJapanese #CozyGames #IndieGame

## Storyboard

| Time | Picture | Overlay |
| --- | --- | --- |
| 0–3 s | Tea pours immediately into the reserved cup | “Run a café. Learn Japanese.” |
| 3–8 s | Aoi orders tea; bundled Japanese order at 3.6 s | None |
| 8–12 s | Close tea station view with heating/steam | None |
| 12–17 s | Complementary close pouring angle | None |
| 17–25 s | Aoi holds the served cup and smiles | None |
| 25–30 s | Warm café view with gentle camera movement | “Mikanra” / “Free desktop demo” |

Clean cuts join the shots. GSAP drives subtle camera moves and title fades. Titles and main action avoid the rightmost Shorts controls and bottom interface. The tea order, reserved vessel, preparation and served state use the actual game service model. The recording fixture hides HUD, dialogue choices, navigation/QA elements, work-area labels and selected background props; it lifts the teapot and aligns its pouring stream for the close-up. These cinematic changes are isolated from the published game. Preparation is retimed to fit the edit.

Music and pour/cup effects use original oscillator/noise synthesis. The Japanese recording is `public/audio/ja/ja-27.mp3` (“お茶を一つください。”). Music ducks under it. The renderer measures the encoded mix for clipping and decodes the complete file.

## Reproduce

Use Node 24, Python 3, FFmpeg/ffprobe on PATH and Playwright Chromium:

```sh
npm ci
npm ci --prefix scripts/teaser
npx playwright install chromium
```

Start a stable development server with `MIKANRA_E2E=1` on port 4175; PowerShell instructions and preview/retake options are in [the isolated studio README](../../scripts/teaser/README.md).

```sh
node scripts/capture-teaser.cjs --preview
node scripts/capture-teaser.cjs
python scripts/render-teaser.py
```

`MIKANRA_E2E_URL` selects another local development server; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an installed Chromium. GSAP is locked in its own tooling package and does not enter the game runtime. Outfit and its license are bundled for consistent titles. Python uses only its standard library.

The 900 frames, master, 360 × 640 phone preview, posters, contact sheet, soundtrack and verification JSON are written to ignored `output/teaser-cinematic/`. Copy the reviewed master and `poster.jpg` to the submission media filenames above. See [release status](RELEASE_STATUS.md) for the deployed application commit and checks.
