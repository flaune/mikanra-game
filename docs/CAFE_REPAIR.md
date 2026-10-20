# Café usability repair

Prepared on `fix/cafe-flow`; the published `v0.1.0` and `submission-2026` tags are preserved.

The café now has three work areas with supported tools, an explicit counter transform, a clear staff passage and furniture-safe customer routes. Haru waits by the reading corner with idle facial movement. Repeated recipe snapshots no longer restart customer movement, and the next customer waits for a clear service slot.

Press E near a tool from the staff side to enter a steady workbench view. The focused action card supports keyboard and pointer input; Escape steps away. Grouped preparation keeps the existing vessel, ingredient and recipe state. Finished cups move automatically to the tray. Batch washing cleans returned dirty cups in one three-second hold; refilling is one action. Existing v1 saves and unfinished work remain readable. Wrong or excess cups on a legacy tray expose a direct return action so preparation can recover without losing vessels.

Verification: 83 tests, type checking, lint and production build passed. Browser suites passed at 1440×900 and a supported 1000×700 logical viewport, including three recipes, two-cup tea, Rive/fallback, later-day management, closing, finale results and day-eight continuation. The new normal-control journey uses WASD and arrow look from the entrance through preparation, service, payment and washing, without teleporting the player or camera. It checks movement locking and pause/notebook interruption during a partial pour.

Generated evidence remains under ignored `output/repair-desktop-evidence/` and `output/playwright/`. The compact suite uses half-density software rendering; it is a functionality check, not a GPU performance benchmark. The existing large-bundle warning remains. No public release or judging tag is changed by this branch.
