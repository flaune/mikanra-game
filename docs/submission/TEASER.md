# Thirty-second gameplay teaser

[Download the finished MP4](media/mikanra-teaser-30s.mp4) · [Poster](media/mikanra-teaser-poster.jpg)

The video is 30 seconds, 1080 × 1920 (9:16), 30 fps, H.264 with AAC stereo audio. Captions carry the message with sound off. It contains edited gameplay from the `fix/cafe-flow` repair branch, original synthesized music and two attributed Japanese pronunciation clips. It is a promotional teaser, not a continuous playthrough or evidence of learning outcomes.

The repair branch is separate from the tagged public release. Its workbench footage will match the live demo after that repair is reviewed and published. Check [release status](RELEASE_STATUS.md) before submitting the video and demo together. No social upload has been created by this package.

## Suggested upload title

Run a little café. Learn Japanese. | Mikanra

## Suggested upload description

Take a job at Café Mikan. Understand orders, make drinks and get to know the neighbors. Mikanra is a cozy browser game for Japanese beginners.

Free desktop browser demo: https://flaune.github.io/mikanra-game/

Edited gameplay. Keyboard and mouse required. Workbench footage previews the café preparation update.

Original gameplay footage and synthesized music © 2026 Bryan. All rights reserved.

Japanese synthetic voice: OpenJTalk / HTS voice Mei, © 2009–2013 Nagoya Institute of Technology / MMDAgent Project Team. Licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Voice clips were synthesized at 90% speed, encoded and mixed into this video. [Full project credits](https://github.com/flaune/mikanra-game/blob/fix/cafe-flow/THIRD_PARTY_NOTICES.md).

#Mikanra #LearnJapanese #CozyGames #IndieGame

## Edit

| Time | Message | Actual gameplay |
| --- | --- | --- |
| 0–4 s | Run a little café. Learn Japanese. | Café establishing view |
| 4–9 s | Understand the order. | Japanese customer greeting and order |
| 9–16 s | Make their morning. | Grinding, preparing and brewing coffee |
| 16–22 s | One cup. A little confidence. | Pouring tea and collecting the drink |
| 22–26 s | Come back for the people. | A returning customer's optional conversation |
| 26–30 s | Mikanra | Café and closing brand line |

The capture script seeds isolated development saves, frames the camera and hides selected HUD elements for the edit. It does not use or change a normal browser profile. Clips are trimmed and retimed to the storyboard. The workbench, dialogue and pours are functioning game systems; the title cards are added in editing.

## Reproduce

Use Node 24, Python 3 and FFmpeg/ffprobe on PATH. Install Chromium and Playwright's recording helper once:

```sh
npm ci
npx playwright install chromium ffmpeg
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

In another terminal at the repository root:

```sh
node scripts/capture-teaser.cjs
python scripts/render-teaser.py
```

`MIKANRA_E2E_URL` can select another local development URL; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an installed Chromium. The renderer uses locally installed Georgia/Arial on Windows or DejaVu fonts on Linux. Font files stay in ignored scratch output and are not part of the package. Python uses only its standard library.

Raw captures, audio scratch files, the poster, a contact sheet and media verification metadata are written to ignored `output/teaser/`. Copy only the finished MP4 and poster to `docs/submission/media/` after reviewing them. Final validation decoded the full video without errors and confirmed its duration, portrait dimensions and codecs.
