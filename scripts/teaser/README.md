# Offline teaser studio

This private tooling package keeps GSAP out of the game runtime and its dependency lockfile. Install with `npm ci --prefix scripts/teaser` after the ordinary root `npm ci`. Outfit is bundled here under SIL OFL 1.1; its full license accompanies the font. GSAP uses its [standard license](https://gsap.com/standard-license/).

Start a stable development server on port 4175 with `MIKANRA_E2E=1`. On PowerShell:

```powershell
$env:MIKANRA_E2E='1'
npm run dev -- --host 127.0.0.1 --port 4175 --strictPort
```

In a second terminal:

```sh
node scripts/capture-teaser.cjs --preview
node scripts/capture-teaser.cjs
python scripts/render-teaser.py
```

Python 3, FFmpeg/ffprobe on PATH, and Playwright Chromium are required. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an installed browser; `MIKANRA_E2E_URL` selects another local development server. Preview captures six storyboard frames. `--preview --frames=630` checks one frame, and `--frames=360,361` can replace selected full-resolution frames without recapturing everything.

The capture runs the actual Three.js scene and authoritative service reducers in an isolated development fixture. A seeded one-cup tea order progresses through preparation and service to Aoi. Real-time animation is paused, and state, expressions, steam, GSAP titles and camera framing advance deterministically at 30 fps. This is edited, staged in-engine footage, not a continuous user playthrough. The fixture hides HUD elements, work-area labels, payment props and background Haru. Its cinematic presentation adapter lifts the teapot and aligns its stream with the reserved cup. These changes never run in the published game.

The composition has only an opening title and a closing title. Sound design and music are original oscillator/noise synthesis; the spoken order is bundled Mei/OpenJTalk `ja-27.mp3`. Include the full upload credits when sharing the final video.

All 900 lossless frames, previews, the master MP4, phone-size copy, posters, contact sheet, audio scratch and verification report stay under ignored `output/teaser-cinematic/`. The renderer checks frame count, codecs, exact duration, decoding and audio peak. Review the complete edit before copying the master and poster to the submission media folder.
