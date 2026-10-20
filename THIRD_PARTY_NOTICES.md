# Third-party notices and asset provenance

Original Mikanra material is © 2026 Bryan, all rights reserved. Third-party rights remain with their owners. No affiliation or endorsement is implied.

| Material | Role | Terms |
| --- | --- | --- |
| React, React DOM, scheduler, loose-envify, js-tokens | UI runtime | MIT |
| Three.js | Procedural 3D rendering | MIT |
| Rapier 3D | Collision and physics | Apache 2.0 |
| Rive Canvas Lite and matching WASM | Animated preparation progress | MIT |
| Tailwind CSS | Generated framework styles in the shipped CSS | MIT |
| HTS voice Mei | All 50 Japanese pronunciation clips | CC BY 3.0; © 2009–2013 Nagoya Institute of Technology / MMDAgent Project Team. Synthesized locally at 90% speed, encoded as 24 kHz mono MP3. |
| Barlow Condensed, Noto Sans JP | Requested from Google Fonts | SIL OFL 1.1 |
| Café, street, train, character geometry and textures | Procedurally authored with AI-assisted development | Original project material; all rights reserved |
| `cafe-feedback.riv` / `rive/scene.rml` | Original Rive artwork / source | Original project material; all rights reserved |
| `arrival.mp3` | Mathematical synthesis in `scripts/generate-arrival.cjs` | Original project material; all rights reserved |
| Release screenshots | Captured from this game | Original project material; all rights reserved |
| 30-second teaser | Staged in-engine captures, original oscillator/noise music and sound design, and bundled Mei order clip | Original project footage/music retain all rights reserved; Mei voice remains CC BY 3.0. Full upload credits accompany the video and its MP4 metadata. |
| Outfit | Teaser title typography; © 2021 The Outfit Project Authors | SIL OFL 1.1; font and license are included in `scripts/teaser/assets/`. |
| GSAP | Offline teaser motion composition | Standard license, https://gsap.com/standard-license/; installed only in the isolated `scripts/teaser` tooling package and not shipped to the game browser. |

The exact installed runtime versions and full license texts are in [the shipped notice index](public/licenses/index.html). Run `npm run licenses` after dependency changes. Rive's package omits its MIT license file; its notice is retained from the official [rive-wasm repository](https://github.com/rive-app/rive-wasm/blob/master/LICENSE).

The retired Freesound recording and earlier Edge-generated speech are excluded. Reference images and local speech tools are not distributed. Python models, FFmpeg and the Rive CLI are development tools; they do not ship to the browser. See [the audio guide](public/audio/README.md) for synthesis provenance and regeneration.
