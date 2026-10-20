# Café Rive feedback

The local Rive CLI 1.5.0 authors the script-free CafeFeedback artboard in scene.rml. Its Service state machine binds CafeFeedback.progress (0–1) to a cup fill, progress bar and readiness star.

From project:

- npm run rive:verify — compile checks
- npm run rive:inspect — inspect the built structure
- npm run rive:preview — native authoring preview
- npm run rive:build — build and copy the .riv plus Canvas Lite WASM into public/rive

The app lazily loads @rive-app/canvas-lite. Japanese text, controls and accessible progress remain HTML. The Rive graphic is cosmetic; failed asset or WASM loading leaves working static feedback. No scripts, text, layout-dependent graphics, remote hosting or signing are used in the shipped artboard.

Follow AGENTS.md and the installed CLI docs/schema when editing RML. Verify and inspect after each change, capture native preview frames, and check the production app integration. CLI version and generated asset are separate from the pinned npm runtime version.
