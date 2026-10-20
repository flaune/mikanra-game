> Historical development record. Findings and local QA paths may be superseded. Use the root README and current release status for supported behavior.

# Mikanra architecture review — 2026-09-22

The current React overlay / imperative Three.js / Rapier arrangement can support the next stage of this game. Stabilize spatial data, travel, input state and lifecycle ownership before adding locations or progression. An engine migration is not required to address the findings below.

## Scope and verification

Reviewed all application source modules and the project configuration. Application source is unchanged. Installed the locked dependencies and ran:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Fail: four unused declarations |
| `npm run build -- --outDir .review-build` | Pass; large bundle warning |
| `node .review/architecture-probes.cjs` from the workspace root | Completed; outputs reproduce defects described below |

The diagnostic script is outside the project in `../.review/architecture-probes.cjs`. It runs the actual TypeScript modules and installed Three.js/Rapier libraries. Canvas drawing and browser APIs are stubbed. Its Vite-only WASM URL import is replaced for Node; the installed Rapier compatibility package initializes from embedded WASM and ignores that URL argument. These are diagnostic observations, not a passing regression suite. No interactive browser playtest, GPU memory measurement, network waterfall or frame-rate benchmark was performed.

## Confirmed findings, in repair order

### 1. P1 — Placed objects have colliders at their local coordinates

**Location:** `src/game/world.ts:39-47`; collider construction in `src/game/components.ts:34-36`; `src/game/physics.ts:61-71`.

Builders translate and rotate the Three.js group, but their collider definitions remain local. `applyBuild` registers those definitions directly with the physics world, losing both translation and rotation. The café renders at `(4, 0, 4)` while its main collider is registered at `(0, 1.5, 0)`. Houses, shops and props similarly accumulate collision volumes near the origin. This produces invisible obstacles and lets the player pass through rendered objects elsewhere.

**Evidence:** The world-construction probe captures the café collider as `[0, 1.5, 0, 2.5, 1.5, 2]`, despite the café group being at `[4, 0, 4]`.

**Repair:** Define collider positions as local data explicitly. Apply the same placement transform to rendering and physics, including rotation. Add orientation support to the collider adapter or attach local colliders to a transformed fixed rigid body. Validate translated and 90-degree-rotated non-square objects.

### 2. P1 — Teleports are overwritten before the physics step

**Location:** `src/game/physics.ts:126-132` and `src/game/physics.ts:98-105`.

`teleport()` schedules a next kinematic position. The next `move()` reads the body's old current position and schedules another position before calling `world.step()`. This replaces the pending teleport. The engine's separate `position` vector is then overwritten with the old physics location.

**Evidence:** After requesting `(100, 0, 2)`, the next movement frame remains at approximately `(0, 1.9973, 14)` in the probe.

**Repair:** Implement an immediate teleport that synchronizes the body's current and next transforms, cached position, fall speed and grounded state. Refresh any physics query state needed before the next collision query. Test entry and exit followed by movement, including movement held during travel. Rapier distinguishes [current translation from next kinematic translation](https://rapier.rs/javascript3d/classes/RigidBody.html).

### 3. P1 — Café destination and physics do not describe the same room

**Location:** `src/game/engine.ts:30`, `src/game/world.ts:315-362`, `src/game/components.ts:557-577`.

The interior is rendered around `(100, 0, 100)`, but entry targets `(100, 0, 2)`, 98 units away in Z. Its barista and exit triggers are near Z=97.5 and Z=103.4. All eight interior collider definitions are returned but never registered, and the interior floor has no collider definition at all. The exterior floor only spans X=-25 to 25. Fixing teleport alone would therefore send the player outside the room and floor; fixing the coordinates alone would still leave the room without physical boundaries.

**Evidence:** World probe: interior origin `[100, 0, 100]`; zero registered colliders in that region; eight unused collider definitions.

**Repair:** Give each location a single transform, local spawn/exit anchors, collision definitions and interaction definitions. Derive world positions from those anchors. Add a floor collider and register the room's colliders. Validate the complete enter → walk → speak → exit cycle.

### 4. P1 — Pointer-lock failure leaves start stuck

**Location:** `src/game/engine.ts:316-323` and `src/game/engine.ts:215-220`.

`start()` sets `active = true` before pointer lock succeeds. A rejected request is silently ignored. With no lock, React continues to show the start overlay, but subsequent `start()` calls return because `active` is already true. Movement can also run without the intended mouse capture.

**Evidence:** A rejected request followed by another `start()` produces only one pointer-lock request; `active` remains true.

**Repair:** Use explicit starting/playing/paused states. Enter playing only when the canvas actually owns pointer lock. On synchronous exceptions, rejection or `pointerlockerror`, clear the pending start and expose a retryable status. Test both Promise-returning and event-only browser behavior.

### 5. P2 — Sign popups do not own input or pause state

**Location:** `src/game/engine.ts:258-274`, `src/game/engine.ts:312-314`, `src/components/GameCanvas.tsx:98-117` and `src/components/GameCanvas.tsx:187`.

Opening a sign only sends React an info object. It leaves movement, mouse look and pointer lock active. The full-screen popup asks the player to click to close, but pointer-locked mouse events remain targeted at the captured canvas. Pressing Escape releases the lock, then the later-rendered start overlay covers the info popup because its condition does not exclude `info`.

**Repair:** Make reading a real game mode: clear held input, pause movement, release pointer lock, show one modal, and suppress the start overlay. Dismiss through an accessible button or Escape and explicitly resume or return to paused state. See [pointer-lock behavior](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API).

### 6. P2 — Async startup can allocate a physics world after disposal

**Location:** `src/game/engine.ts:101-104` and `src/game/engine.ts:422-433`.

If the component unmounts while `CharacterMotor.create()` is awaiting WASM initialization, `dispose()` runs with no motor. Initialization later assigns a new motor, notices `alive` is false and returns without freeing it. Startup failures after allocating the motor/world also report an error without releasing partially initialized resources.

**Evidence:** The deferred-creation probe resolves a motor after engine disposal and records zero motor disposals.

**Repair:** Await into a local variable, free it if initialization has been cancelled, and only then transfer ownership to the engine. Use a common, idempotent cleanup path for partial failure and normal unmount. Add an unmount-during-load regression test.

### 7. P2 — Interaction ignores blocking geometry and location activation

**Location:** `src/game/interaction.ts:46-59`.

Only registered interactive meshes participate in raycasts, so walls cannot block a target. Selection is based on the object's origin distance rather than the nearest ray intersection. There is also no explicit active-location filter. Hidden render groups are not a sufficient interaction lifecycle contract; interior triggers are currently separate root children.

**Evidence:** A target two units ahead is selected even when an opaque wall is one unit ahead in the diagnostic scene.

**Repair:** Compare nearest ray-hit distance against blocking geometry or a physics visibility query; use an explicit blocker policy so intended trigger volumes still work. Restrict candidates to the active location. Test a visible target, an occluded target and two overlapping targets.

### 8. P2 — Scene resources have no complete cleanup owner

**Location:** `src/game/engine.ts:422-433`, `src/game/textures.ts:3` and the resource allocations throughout `src/game/components.ts`.

Engine cleanup calls `renderer.dispose()` but never disposes scene geometries, materials, textures or light shadow resources. The module-level texture cache has no release operation. This leaves resource lifetime implicit during remounts and will be a problem for location unloading. The async physics leak above is directly reproduced; GPU memory growth has not been measured.

**Repair:** Return a world resource owner with a disposal method. Track shared materials/geometries/textures so they are freed once, and define whether the text-texture cache is engine-scoped or reference-counted. Validate repeated mount/unmount and future location unload cycles. Three.js exposes explicit [material disposal](https://threejs.org/docs/pages/Material.html#dispose).

### 9. P2 — Highlighting permanently changes emissive intensity

**Location:** `src/game/interaction.ts:87-116`.

Highlighting stores the emissive color but not its intensity. Clearing forces intensity to 1. The vending panel starts at 0.3, so looking at it and away changes its appearance. Shared materials can also receive multiple mesh-level snapshots of an already-modified material.

**Evidence:** The probe starts with intensity 0.3 and records intensity 1 after clearing the highlight.

**Repair:** Snapshot and restore all modified properties once per unique material, and change highlights only when the target changes. Handle material arrays explicitly if they are introduced.

### 10. P2 — Unchanged interaction state triggers React updates every frame

**Location:** `src/game/interaction.ts:65-70`, `src/game/engine.ts:398-401`, `src/components/GameCanvas.tsx:29`.

While looking at a target, `update()` allocates a new result object every frame and `tick()` sends it to React state. Even if the prompt is unchanged, the object identity changes, causing recurring renders of the full overlay component. Highlight restoration/reapplication and vector allocations also occur every frame. No frame-rate impact has been measured.

**Repair:** Publish an interaction event only when the target or displayed content changes. Keep transient movement and camera state inside the runtime. Measure render counts before adding more HUD surfaces.

### 11. P2 — Movement slows down when render frames exceed 45 ms

**Location:** `src/game/engine.ts:392-399`, `src/game/physics.ts:88-105`.

Simulation steps once per render frame with a clamped delta. At 10 FPS, each 100 ms frame advances only 45 ms of movement, so one real second advances about 0.45 simulated seconds. There is no accumulator. This is a source-derived timing result, not a measured hardware performance issue.

**Repair:** Introduce a fixed-step accumulator with bounded catch-up, skip zero-duration simulation steps, and keep camera presentation separate. Verify consistent movement over the same simulated input at 30/60/144 FPS and under occasional long frames.

## Smaller defects and unfinished contracts

- **Café menu faces into the back wall:** `components.ts:615-616` places a front-sided plane at the back wall and rotates its normal toward negative Z, away from the room. Source geometry indicates it will be culled from the player side; verify visually after travel is repaired.
- **Storefront orientation disagrees with layout comments:** the bookstore and konbini fronts point away from the main street; the station entrance mesh is near Z=-30.08 but the entrance trigger is at Z=-25.8. Use named front/door anchors instead of independent trigger coordinates, then visually validate the intended layout.
- **Dialogue actions are silently ignored:** `dialogue.ts:35-37` mentions an `onAction` callback that does not exist. Coffee/water choices advance text only. This can be acceptable for the current mockup, but define an explicit command/result contract before adding orders, currency, vocabulary rewards or quest progression. Node-level `action` is also unused.
- **Lint is currently red:** unused `wheelMat` in `components.ts:491`; `CAFE_INTERIOR_EXIT`, `CAFE_EXTERIOR_DOOR` and `Placed` in `world.ts:32-35`. The build script does not include type checking or lint, so build success alone is insufficient validation.
- **WASM initialization bypasses its actual public signature:** `physics.ts:2,34-36` imports a private package file and casts `RAPIER.init` to an unsupported options signature. Installed compat 0.20.0 declares `init(): Promise<void>` and its source initializes embedded base64 WASM. The build emits an extra 2,021.20 kB WASM artifact while JS is 3,556.38 kB (1,267.71 kB gzip). Remove the unused URL path/type cast or deliberately select an external-WASM integration. Do not assume the emitted standalone file is downloaded without a network trace.
- **Fatal-frame errors continue scheduling frames:** `engine.ts:413-419` reports an error but unconditionally schedules again. A persistent render exception can repeat until reload. Enter a terminal error state and stop the loop before exposing recovery.

## Architecture changes before larger features

Preserve the useful boundaries already present: React owns DOM overlays; `CharacterMotor` encapsulates Rapier; `DialogueState` is independent of rendering; event listeners use an abort signal; resize, blur and hidden-tab behavior have explicit handling.

The main architectural weakness is that `GameEngine` owns rendering, game modes, raw input, hard-coded world travel and content dispatch together. The next modest split should be:

| Owner | Responsibility |
| --- | --- |
| Game session | Serializable player/location/progression state; explicit loading, starting, playing, reading, dialogue, paused and error modes |
| Input adapter | Physical key/mouse mapping to move, interact, run, confirm, cancel and pause actions; mode gating |
| Location definitions | Shared placement transforms, named spawn/door anchors, collider and interaction data |
| Physics adapter | Fixed simulation steps, collider placement, movement and immediate teleport |
| Render/world owner | Three.js objects, camera presentation, loading and resource disposal |
| UI bridge | Stable snapshots/events only when visible state changes |

Choose one interaction-dispatch path: typed content actions handled by the session, or registered handlers. Currently `InteractionSystem.trigger()` calls mostly empty callbacks and then the engine independently switches on the target ID, requiring each new object to be wired in multiple places.

Save data, an asset manifest and diagnostics are not implemented yet. Establish their boundaries before quests and imported content: versioned plain-data saves; stable asset keys; optional collider/trigger visualization plus frame/draw-call/memory counters. Procedural placeholder geometry is acceptable now. Define GLB/glTF conventions when imported 3D assets arrive.

## Suggested repair batches and acceptance criteria

1. **Spatial correctness and travel:** shared placement transforms, immediate teleport, one café location definition, floor/walls/triggers. Pass translated/rotated-collider tests and a complete café round trip.
2. **Game modes and lifecycle:** reliable pointer lock/retry, reading/dialogue/pause transitions, cancelled startup cleanup, terminal errors and resource disposal. Pass lock rejection, Escape/blur, modal dismissal and early-unmount cases.
3. **Interaction correctness and timing:** occlusion/active-location rules, highlight restoration, UI change notifications and fixed simulation stepping. Pass hidden-target and material restoration checks, verify comparable movement at multiple frame rates, and inspect React update counts.
4. **Growth contracts and validation:** action dispatch, serializable session data, asset ownership, debug overlays and a repeatable validation command. Clear the four lint failures. Add focused regression tests for the defects above, then browser-playtest the player journey before larger gameplay work.

A visual playtest after the first two batches remains necessary to check actual pointer capture, popup focus, room lighting, doorway alignment and menu orientation. Current build/type checks cannot establish those behaviors.
