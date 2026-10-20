> Historical development record. Findings and local QA paths may be superseded. Use the root README and current release status for supported behavior.

# Café Mikan learning update

The first shift now has six sequential lessons and 16 challenges: staff and customer greetings, drinks, polite requests, quantities, prices, and a final service scenario. The sequence teaches a phrase, asks for recall without translated answer labels, explains mistakes, and revisits earlier material in the final lesson.

## Playing

- Walk with WASD, look with the mouse or arrow keys, and interact with E.
- Find the striped café awning, enter, and speak to Haru behind the counter.
- Choose answers with 1–3 or the mouse. There is no timer or penalty for needing help.
- Open field notes with J. Completed lessons and collected words persist in this browser.
- Escape closes a lesson or notebook; incomplete lessons restart when reopened. Completed lessons remain completed. The player returns to the street on reload; exact world position and unfinished questions are not saved.
- The notebook includes romaji, camera-motion, and handheld/native-picture settings.

## Learning behavior

The curated collection has 16 entries, including four discoverable neighborhood terms. Sign readings match the actual visible kanji: 喫茶, 書店, and クリーニング. The café menu now matches the lesson drinks and prices, and is readable with E.

Correct answers without hints or prior errors increase a word's recall streak. Hints and retries do not earn independent recall credit. Review intervals range from ten minutes to two weeks; errors return after one minute. Three consecutive unassisted answers are labeled “Recalled 3+ times,” not language mastery. This is a small beginner chapter, not a complete Japanese course or an assessment of speaking proficiency.

Optional pronunciation uses a Japanese voice installed on the device. If no Japanese voice is available, the control explicitly says so. No substitute English voice is used. Listening quality and audio output were not verified on this machine because headless Chromium exposed no Japanese voice.

Save data is versioned, validated, and stored under `mikanra.learning.v1`. Corrupt data falls back safely. If storage is blocked, the game still works and labels progress as session-only.

## Visual direction

Painted sky, faceted ginkgo trees and fallen leaves, gentler warm/cool café lighting, and a soft 640-pixel-high 3D rendering preset give the scene a handheld-era feel. DOM text retains native resolution. The optional Crisp setting restores native rendering. The notebook uses paper, teal, copper accents, a custom Haru portrait, and six shift stamps. The existing procedural café, train arrival, collision system, and pointer-lock fallback are retained.

## Verification

- TypeScript, ESLint, and production build.
- 15 tests covering save validation, review scheduling, content integrity, interactions, fixed-step movement, and resource cleanup.
- Chromium playthrough: six lessons / 16 challenges, incorrect answers, hint-assisted scoring, keyboard navigation, pause/notebook input blocking, persistence after reload, settings, modal focus, 800×600 layout, and narrow-viewport recovery.
- Browser interaction tests use deterministic camera placement for the café and signs; the opening walking check uses real WASD input. This is not an unaided human usability test or a cross-device GPU benchmark.
- Browser test and screenshots: `../.review/learning-playtest.cjs`, `learning-results.json`, and `learning-*.png`.

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` from this directory. In environments that prohibit test-worker spawning, use `node --test --test-isolation=none tests/*.test.cjs`. Vite still needs permission to launch esbuild. The production bundle retains the pre-existing large-chunk warning from the Three.js/Rapier runtime.
