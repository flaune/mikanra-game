> Historical development record. Findings and local QA paths may be superseded. Use the root README and current release status for supported behavior.

# Mikanra improvement review — September 28, 2026

## Café interior completed — September 30, 2026

The visual work in item 2 is implemented in `src/game/cafeInterior.ts`: furnished walnut/red-leather café, stained-glass pendants, local warm lighting, coffee equipment, books/records, original posters, a readable menu and styled owner. Interior lighting and the location label switch on entry/exit. Browser verification covers a clear central aisle, counter collision, greeting and café exit without errors. Static material batching and shared scene-local labels keep the checked view at 55 draw calls. See `CAFE_SAMPLE.md` and `../.review/interior-wide.png`. Doorway transitions and the broader first-shift gameplay loop remain separate future work.

## Follow-up fixes — September 28, 2026

Items 5–7 now have runtime fixes and regression coverage. Interaction uses nearest ray-hit distance with visible opaque scene geometry as blockers, including a fresh check when E is pressed. Door and vending-machine parts remain one target. Highlighting uses temporary per-target material clones, restores the original material references, and only publishes changed prompts. Fixed 1/60-second physics steps with camera interpolation preserve ordinary slow-frame movement; catch-up is bounded to 250ms per frame. Cleanup is idempotent, releases partial startup allocations, cancels the font wait, deduplicates shared scene resources, and removes the global text-texture cache. Fatal frame errors or context loss stop and dispose the engine before reporting an error.

Runtime validation: `npm test` passes 11 focused tests, including 10/30/60/144 FPS timing, actual engine movement, shared/array highlights, wall blocking, real Rapier disposal, startup cancellation and failure, and terminal render/context errors. Typecheck, lint, production build and prior control/arrival tests pass. The extended browser regression verifies café entry/greeting/exit, all active street sign/machine targets, E blocked by an inserted wall, preserved resize/popup controls, and one disposal per tracked geometry/material on repeated cleanup. No uncaught browser errors were recorded. Long OS stalls intentionally drop excess simulation time; automatic context recreation and out-of-bounds recovery remain outside these fixes.

Item 3 is fixed: after desktop initialization, resizing keeps the engine and session mounted, suspends rendering/audio/input behind the notice, and returns to the same location and objective. Initial mobile visits still do not instantiate an engine. This preserves the current page session; reload persistence remains future work.

The vocabulary portion of item 4 is fixed: a native modal dialog focuses a real Close button, supports Escape/Enter/Space, blocks background focus and restores canvas focus on dismissal. Open vocabulary survives resize. Dialogue navigation and motion settings remain separate work.

Validation: typecheck, lint, production build, existing control/arrival tests and `node .review/session-popup.test.cjs` from the workspace root all pass. The new browser regression covers real React UI plus deterministic engine positioning, with no uncaught browser errors. Screenshots: `../.review/session-title.png` and `../.review/vocabulary-keyboard.png`. The review below and its original diagnostics describe the pre-fix state.

## Original review

The opening and street now work as a playable introduction. The highest-value next milestone is a complete first café shift: a finished room, a small task with meaningful feedback, and progress that survives returning to the game. Fix the remaining session/input defects alongside that work.

This is a review, not an implementation pass. Application source was not changed. Diagnostic scripts, screenshots and results were added under `../.review`; the production build was regenerated.

## Verified today

| Check | Result |
| --- | --- |
| TypeScript and ESLint | Pass |
| Production build | Pass; JavaScript 3,599.23 kB, 1,282.55 kB gzip; large-chunk warning |
| Existing start-control tests | Pass |
| Existing train-journey tests | Pass |
| Chromium: title → muted arrival → street → pause | Pass |
| Engine harness: café entry → greeting → exit | Pass |
| Narrow viewport | Desktop notice, zero canvases; returning to desktop resets to title |
| Browser uncaught JavaScript errors | None in this run |

The café harness uses the actual engine and keyboard interaction with deliberate camera positioning. It does not establish that an unfamiliar player can find everything unaided. Screenshot review covered title, street and interior. This was not a cross-browser, GPU performance or full accessibility audit. Audio-on playback was not listened to in this pass. An initial sandbox build failure was resolved through approved execution.

## Recommended work, in order

### 1. Finish the first-shift gameplay loop

**Current gap:** `src/game/dialogue.ts:96` has one greeting exchange. On completion, `src/game/engine.ts:366` changes objective text to exploring; there is no persistent completion state, task sequence, learned-word collection or saved progress. Speaking again restarts the same lesson, and entering again resets the objective to speaking to the owner. The legacy order actions at `dialogue.ts:35` are not implemented and are not used by the active greeting.

**Next:** Add a short sequence such as greeting → identify a menu item → take one order → serve it → receive feedback. Record completed steps and learned phrases in versioned local save data. Give returning players a Continue option. Keep this small enough to finish before adding more streets.

**Done when:** A new player can complete a coherent shift, see a completion result, reload, and resume with the same progress. Repeated interactions respect completed steps.

### 2. Bring the café interior up to the exterior's standard

**Observed:** The street has a detailed frontage, but the destination is an almost empty box with plain tables, a cuboid espresso machine and a placeholder figure. The menu is missing from the player's view. `src/game/components.ts:615` rotates the front-sided menu toward the back wall; the screenshot confirms it is absent.

**Next:** Correct the menu orientation, add café windows/lighting, seating and small counter props, and replace the owner placeholder with a readable character. Match the exterior's timber, color and signage. Add a brief doorway transition so travel feels intentional.

**Evidence:** `../.review/review-street.png` and `../.review/review-interior.png`.

### 3. Preserve the session when the window becomes narrow

**Reproduced:** Start the game, resize from 1440px to 640px, then restore 1440px. The game restarts at the train title. `src/components/GameCanvas.tsx:14–22` swaps out the entire game component at 700px or for coarse pointers, disposing its engine and React state.

**Next:** Keep session data outside that conditional and pause behind a viewport notice, or restore a session snapshot when recreating the engine. A desktop player resizing or zooming should not lose their place. Keep the intentional phone notice; mobile gameplay is a separate scope decision.

### 4. Make vocabulary and dialogue usable from the keyboard

**Reproduced:** Read the café sign and press Escape: the popup stays open. `src/components/GameCanvas.tsx:128` uses a clickable `div`, including a visual “Click to close” element that is not a button. The paused engine ignores keyboard input. Dialogue buttons are native buttons but focus is not transferred into the dialogue.

**Next:** Use real dialog semantics, a focused Close button, Escape dismissal, focus containment and focus restoration. Give dialogue predictable Enter/Space and choice navigation. Surface mouse sensitivity and an option to disable walking bob/FOV motion; reduced motion currently applies mainly to the opening.

### 5. Correct interaction selection and highlighting

**Probe-confirmed:** `src/game/interaction.ts:36–75` selects a registered target through an opaque wall because it only raycasts interactive objects. It compares object-center distances, not hit distances. Looking at a target repeatedly creates new result objects. Highlight clearing at lines 110–121 restores intensity to 1 rather than the original value; a 0.65-intensity test material changed to 1.

**Next:** Include blocking geometry in selection, use nearest hit distance, and publish changes only when the target changes. Snapshot all modified properties per unique material; shared materials should not leave other objects highlighted. Hidden-parent filtering is already present and should be retained.

**Acceptance:** Visible target works, occluded target does not, nearest surface wins, and materials return exactly to their previous appearance. A stationary prompt does not keep rerendering the HUD.

### 6. Decouple movement from rendering speed

**Probe-confirmed:** `src/game/engine.ts:502–513` caps each frame at 45ms and steps once. With one second of render timestamps, the actual tick logic advances approximately 1.0 seconds at 60 FPS but only 0.45 seconds at 10 FPS. This demonstrates the timing defect, not a measured hardware frame rate.

**Next:** Use a fixed simulation step with bounded catch-up and separate camera presentation. Test comparable movement at several frame rates and with occasional long frames.

### 7. Finish lifecycle and error recovery

**Source-derived:** After motor creation, initialization waits for fonts (`engine.ts:113–116`). If disposal happens during that wait, `dispose()` frees the motor and the continuation frees it again. The motor disposal method is not idempotent. Startup exceptions also lack a common partial-initialization cleanup path.

**Source-derived:** A frame exception pauses the game but still schedules the next animation frame (`engine.ts:526–532`), so a persistent renderer failure can repeat indefinitely. There is no explicit WebGL context-loss UI or recovery button.

**Next:** Make cleanup idempotent, retain local ownership until initialization succeeds, and stop scheduling on terminal errors. Add focused tests for unmount during the font wait, startup failure after allocation, and persistent render failure.

**Defensive observation:** A harness teleport deliberately placed the player outside the south boundary; the player then fell indefinitely without recovery. This is not evidence that a player can escape the normal street. Add a safe-spawn recovery for future travel/collision failures if needed.

### 8. Improve delivery and repeatability

- The mobile notice still imports the game engine statically through `GameCanvas.tsx:2`. Lazy-load the desktop runtime so notice-only devices can avoid the Three.js/Rapier bundle. Measure loading before choosing further splitting; splitting alone does not reduce all required bytes.
- Add a single validation command covering typecheck, lint and focused tests. `build` currently runs only Vite.
- Move reusable tests into the project and make browser/runtime paths configurable. The old `cafe-playtest.cjs` still expects the previous title button and coffee-order dialogue, so it cannot verify the current journey unchanged.
- Update the old architecture review or clearly label it historical: several serious findings there have been fixed. Retire unused legacy world/content paths when no longer needed.
- Run an unaided desktop playthrough and a second-browser check after repairs. Record actual load time and frame costs on representative hardware before treating rendering performance as established.

## Earlier issues already addressed

Current active-scene code transforms placed colliders, teleports immediately, registers the café floor/walls at the correct destination, provides pointer-lock fallback, pauses for sign reading, filters hidden-parent interaction targets, and disposes scene resources. Browser café entry/exit passed today. The previous lint errors and unsupported Rapier WASM URL initialization have also been removed. These should not be copied into a new backlog as wholly unfixed defects; lifecycle cleanup still has the narrower gaps described above.

## Reproduction artifacts

- `../.review/current-review.cjs` and `current-review-results.json`: browser and engine-harness observations. Requires the local server on port 5174 and the existing machine-specific Playwright paths.
- `../.review/remaining-probes.cjs` and `remaining-probes-results.json`: source-based timing and actual Three.js interaction diagnostics. These intentionally report current defects; they are not passing regression tests.
- `../.review/review-title.png`, `review-street.png`, `review-interior.png`: current visual evidence.

Recommended next batch: preserve session state, fix modal keyboard behavior and the menu, then build and save one complete first shift. Address timing and lifecycle before substantially expanding content.
