# Bundled audio

## Arrival

`arrival.mp3` is an original 12.5-second procedural rail texture and two-chord chime. It contains no recording, speech service output, samples, or copied station melody. `scripts/generate-arrival.cjs` uses deterministic noise and oscillators, writes a scratch WAV under `.review/`, and encodes MP3 with FFmpeg. The game also synthesizes a quiet motor sound through Web Audio. Subtitles carry the station information.

Run `npm run audio:arrival` to regenerate it. FFmpeg is a development-only dependency. Skipping stops audio; hiding the tab pauses it. The prior noncommercial train recording is excluded from this release.

## Japanese pronunciation

All 50 `ja/ja-XX.mp3` clips are synthesized locally with `pyopenjtalk-plus` 0.4.1.post9 and **HTS voice Mei**. They cover curated vocabulary, lesson answers, cafe orders, quantities and prices. No Edge-generated speech remains. Playing the game needs no API key or installed system voice for these phrases.

Mei is © 2009–2013 Nagoya Institute of Technology, Department of Computer Science / MMDAgent Project Team, under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The license is in `ja/LICENSE_mei_normal.htsvoice.txt`. Readings are synthesized at 90% speed and encoded as 24 kHz mono, 48 kbps MP3. No endorsement is implied.

Regeneration from the repository root (Python 3.11 and FFmpeg required):

```sh
python -m pip install pyopenjtalk-plus==0.4.1.post9
npm run audio:catalog
python scripts/generate-pronunciation.py --force
```

The catalog derives from game content and is stored in `scripts/pronunciation-phrases.json`; stable clip paths are generated into `src/game/voiceClips.ts`. Existing clips remain unless `--force` is supplied, and failed generation does not replace usable audio. A local development install under `.review/japanese-tts` is also supported.

Listen replays audio; Slow plays it at 72% speed with pitch preserved. Only one phrase plays at a time. Japanese browser voices are a fallback for unknown phrases or failed clips. Unknown phrases never use an English voice. Synthetic pronunciation still needs independent Japanese-instructor review; this is not a speaking-proficiency assessment.
