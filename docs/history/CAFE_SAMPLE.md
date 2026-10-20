> Historical development record. Findings and local QA paths may be superseded. Use the root README and current release status for supported behavior.

# Café frontage and alley sample

The game now opens inside a moving commuter train, then arrives at a small original Tokyo-inspired café street, built in `src/game/cafeStreet.ts`. The previous neighborhood builder remains in `src/game/world.ts`. The existing imperative Three.js engine and React overlays are retained.

The exterior uses warm afternoon lighting, timber café joinery, a striped awning, tiled roofs, shop shutters, balcony rails, air conditioners, drainage channels, bicycles, plants, and overhead utility wires. Small deterministic canvas textures live in `src/game/streetMaterials.ts`; Japanese sign textures use `src/game/textures.ts`. No downloaded 3D assets or new dependencies were added. Japanese font loading still uses the existing Google Fonts link, with a bounded startup wait and system fallback.

Run `npm run dev` from this directory and open the local address Vite prints. Controls: WASD to walk, mouse to look, Shift to run, E to interact, Escape to pause (or skip the arrival). Aim at the café door to enter, or the café/bookshop signs and vending machine to read vocabulary. The furnished café interior is built in `src/game/cafeInterior.ts`; the owner welcomes the player as a new employee and introduces a first greeting.

## Train opening and desktop controls

`src/game/trainJourney.ts` creates an original toon-shaded carriage, teal seats, straps, luggage, signs, and passing trees, houses, hills, clouds, and utility poles. Stationary meshes are merged by material. It shares the street renderer and releases its resources after arrival; there is no second WebGL context. Reduced-motion preferences disable scenic movement and carriage sway.

`src/components/TitleScreen.tsx` and `src/index.css` provide the angular title lettering, Click to Play, Made by Bryan credit, sound toggle, subtitles, dark arrival transition, and a separate pause screen. Barlow Condensed has local Impact/Arial Narrow fallbacks. The bundled 8.3-second announcement and synthesized chime start only after Play. The nine-second arrival decelerates to a stop before entering the street. The opening objective points to Café Mikan, then to its owner.

Pointer lock remains the preferred input and is requested in the Play gesture. When a host refuses capture, mouse movement over the canvas looks around without holding a button; arrow keys also work. This fallback cannot capture or recenter the OS pointer, so its movement remains bounded by the browser window. Pausing and returning to menus releases capture and clears held keys. Phones/touch-first devices and viewports at or below 700px show a desktop notice linking to `https://bhach.com`, without instantiating the engine.

Current verification: `node ../.review/start-controls.test.cjs` covers capture success/failure/timeout, cancellation, button-free mouse movement, re-entry, pause/resume, arrival input gating, and skip cleanup. `node ../.review/train-journey.test.cjs` covers moving scenery, deceleration, stopping, timing, mute, reduced motion, resource cleanup, and the WAV duration. In-app-browser checks covered Play, full arrival into the street, muted Play, skip, pause/resume, mouse rotation, and the 390×844 mobile notice with no canvas or horizontal overflow. Browser error logs were empty. Earlier café Playwright results below predate the train opening; that older script uses the previous intro selectors.

Supporting fixes include transformed sample colliders, correct player capsule placement, immediate physics teleportation, the café room's destination and floor/wall collisions, pointer-lock failure recovery, pausing for vocabulary overlays, filtering hidden interaction targets, and disposing scene resources.

## Verification — September 24, 2026

- TypeScript, ESLint, and production build pass. Four pre-existing unused declarations were removed for a clean lint run.
- Chromium/Playwright checked boot, pointer lock, pause/resume, 640px viewport overflow, walking down the alley, café wall collision, entry, barista dialogue, exit, vocabulary popup, and popup dismissal. No browser errors were recorded.
- Movement/interactions were exercised through the actual engine with keyboard input and a test-only browser document that positions the camera for reproducible checks. This is not a complete human playthrough, nor a mobile/touch test.
- Screenshots and results are in `../.review/`: `cafe-street.png`, `cafe-alley.png`, `cafe-detail.png`, and `cafe-playtest-results.json`. The test script uses the locally bundled Playwright/Chromium paths and accepts `MIKANRA_PREVIEW_URL` (default `http://127.0.0.1:5174`).
- At the captured café view, the renderer reports 79 draw calls, 92,826 triangles, and 25 textures. Static opaque meshes are merged by material. These are one-view measurements, not a device-wide performance guarantee.
- Production JavaScript is about 3.58 MB (1.28 MB gzip), including Three.js and embedded Rapier WASM. Vite still reports its large-chunk warning. Asset streaming/code splitting and broader device benchmarking remain future work.

This September 24 checkpoint established the opening, first-job context, proportions, lighting, and street detail. The later interior work is described below; a broader mission system and curriculum remain future work.

## Session and vocabulary controls — September 28, 2026

Once initialized on desktop, the game now stays mounted when the viewport narrows or switches to a coarse pointer. The desktop notice suspends the scene, arrival audio and controls; restoring the viewport preserves the location, objective and open vocabulary. Normal gameplay returns paused so the player can resume deliberately. Fresh mobile visits still create no WebGL engine. This does not add persistence across page reloads.

Vocabulary uses a modal dialog with a focused Close button. Escape dismisses it; Enter and Space activate Close; dismissal returns focus to the canvas. Browser regression coverage is in `../.review/session-popup.test.cjs`, runnable from the workspace root against the local server on port 5174. Typecheck, lint, build and existing start/arrival tests also pass.

## Runtime reliability — September 28, 2026

Interactions now use the nearest ray-hit surface within range and reject targets behind visible opaque geometry. Transparent materials and invisible trigger volumes do not block sight; `userData.blocksInteraction = false` is an explicit content opt-out. Door and vending-machine assemblies stay unmerged as complete interactive targets. Highlights clone only the selected target's emissive materials, preserve shared originals and dispose the clones on deselection. The HUD receives interaction changes only when its displayed state changes.

Physics runs at 60 fixed steps per second with interpolated camera position. Ordinary slow frames catch up, up to 250ms per frame; pause, travel and viewport suspension reset the accumulator. This avoids slowing movement at 10 FPS without replaying seconds of movement after a long OS stall.

Engine/motor disposal is repeatable, scene resources are freed once per unique reference, text textures are owned by their scene, and an interrupted startup frees its motor once. Fatal render errors and WebGL context loss stop the loop, release resources and display an error directing the player to reload. Train disposal also releases shared scene resources and audio references.

Run `npm test` for the 11 runtime regression tests under `tests/runtime.test.cjs`. The extended browser script also verifies wall blocking, all active street targets, highlight screenshots and repeated disposal alongside the session/popup checks. Production build passes with the existing large-bundle warning (about 3.61 MB JavaScript, 1.28 MB gzip).

## Furnished café — September 30, 2026

The placeholder room has been replaced with an original evening kissaten interior inspired by the intimate café atmosphere in Persona 5. It includes walnut paneling and floorboards, red upholstered booths and stools, brass rails, stained-glass pendants, a detailed espresso machine and grinder, siphon brewers, cups, labeled coffee jars, a readable menu, books, a record player, original café/jazz posters, plants, street-window illustrations and a stylized owner with apron and spectacles. All geometry and texture artwork is generated locally; no downloaded game assets or new dependencies were added.

Interior lights replace exterior sunlight on entry, with one shadow-casting key light and warm pendant lighting. Exiting restores the outdoor lights. The location label changes to Café Mikan. Furniture collision leaves the central aisle open; entry, greeting and exit anchors remain compatible with the existing game.

Static meshes merge by material. Small label textures are appropriately sized and shared within this scene. The final checked exit-facing view reports 55 draw calls and 128,722 triangles; renderer memory reports 42 textures across the loaded game. These are single-view observations, not a hardware performance benchmark. JavaScript is approximately 3.63 MB (1.29 MB gzip), with the pre-existing chunk-size warning.

Verification: TypeScript, ESLint, all 11 runtime tests, start-control tests, train tests and production build pass. `node .review/interior-playtest.cjs` from the workspace root checks the central aisle, counter collision, greeting, exit, menu presence and restored exterior lights. The existing session/popup browser test also passed with the furnished room. No browser errors were recorded. Camera placement is automated for repeatability; this is not an unaided human playthrough. Screenshots and results are in `../.review/interior-*.png` and `interior-playtest-results.json`.
