# Architecture and release boundaries

## Runtime

`App` mounts `GameCanvas`, whose desktop wrapper gates WebGL for small/coarse-pointer viewports. React owns accessible HTML overlays, forms, notebook and dialogue. The imperative `GameEngine` owns the Three.js renderer, input, location transitions and scene lifetime. Rapier is wrapped by `CharacterMotor`; simulation runs at fixed steps and resets accumulation when paused or travelling.

`cafeService` is the physical preparation state machine: four conserved reusable vessels, recipe steps, ingredient stock, timers and closing tasks. `chapterOne` connects service to customers, payment, relationships and seven-day progression. `learning` / `recall` track vocabulary discovery, help, independent recall, review scheduling and support fading. Serialized plain data is validated when restored.

The UI sends typed actions to state reducers and bridges resulting presentation to the engine. Rendering state and transient camera movement stay outside React. Scene geometries/materials/textures have explicit cleanup; async startup cancellation and fatal errors are covered by runtime tests.

## Guided work and shared layout

`cafeLayout` defines cafe-local work areas, station anchors, stable camera views and customer waypoints. The counter assembly has an explicit transform shared with collision; equipment has supported work surfaces. Individual station labels are replaced by three work-area plaques.

Workbench camera/input state is transient in the engine. React owns the focused action card; E and pointer buttons dispatch the same guarded guided command. Grouped gestures compose the existing service transitions. The optional `guided` flag and batch-wash marker live in the existing validated v1 service save; all four original vessel identities remain authoritative. Completed guided drinks move to the real tray and display on the serving mat while working, or in the carried tray during exploration.

Customers use explicit arrival, queue, approach, service and departure phases. Repeated recipe snapshots preserve route progress, restored visits start at the service position, and queue promotion waits for a clear service slot.

## Persistence

The versioned v1 local-storage keys are preserved. Saves are local to an origin/browser. Stable transitions save immediately; timer snapshots are throttled and flushed on blur/visibility changes. Equipment contents repair stale tray data. No backend, cloud sync, authentication, speech recognition or live generative model is present.

## Assets

World geometry and textures are authored procedurally. Rive's `CafeFeedback` artboard binds a progress fraction to cosmetic cup-fill/readiness feedback; failure uses static HTML feedback. The `.riv` is checked in, and `prebuild` copies the installed Canvas Lite WASM so its version matches the JS runtime. Authoring requires Rive CLI; ordinary builds do not.

Fifty Japanese audio clips ship locally, synthesized from the curated catalog with OpenJTalk/Mei. The arrival sound is original procedural synthesis. Google Fonts remain an external request. Notices ship in `public/licenses/`.

## Build and tests

Vite 8 / React plugin 6 and Tailwind 4 run on Node 24. Tailwind base compatibility rules preserve prior button and border defaults. `npm run check` includes both app and Vite-config types, lint, reducer/runtime/audio tests, and production build. `npm run test:e2e` starts local servers and executes the portable cafe preparation, finale-persistence and production-smoke scenarios.

QA fixtures reside in `tests/browser/fixtures/`, import source modules only in development, and are not production build inputs. Tests use isolated browser contexts. Generated screenshots/results are ignored; selected real game captures are included as documentation. A normal-control navigation scenario walks from the entrance through preparation, service and washing without teleporting. Other camera-positioned and seeded late-day scenarios make checks repeatable; they do not establish unaided human usability, learning efficacy or cross-device GPU performance.

The dependency optimizer scans only the app and declared browser fixtures, and React/React DOM resolve to one copy. This prevents ignored clean-checkout evidence from contaminating dev dependencies. CI uses a supported 1000×700 logical desktop viewport at half pixel density and reduced-motion settings for functional cafe checks. This reduces CPU-only rasterization work while preserving layout and interaction assertions; it is not a performance benchmark. The production smoke test retains a full-density desktop viewport. The dedicated dialogue regression uses ordinary motion and a main-thread stall to verify reveal completion and manual skipping. Held actions wait for actual service completion instead of assuming GPU speed. Typewriter progress is based on elapsed time so delayed timer callbacks cannot strand a partial sentence.
