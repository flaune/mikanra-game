> Historical development record. Findings and local QA paths may be superseded. Use the root README and current release status for supported behavior.

# Café preparation and learning verification — October 13, 2026

Chapter One now has distinct physical recipes, reusable vessels, ingredient stocks, cleanup and adaptive Japanese support. Verification exercises actual keyboard/DOM controls and the real engine; the development page positions the camera for repeatable interaction checks.

## Findings resolved

- Generic one-button preparation became separate kettle, tea, grinder, machine, cup, pitcher and tray actions.
- Large station blocks hid tools; replaced with small counter labels and tool-sized pick volumes. Turned the espresso machine toward the staff aisle and moved Haru clear of preparation.
- A second permanent task card overlapped the objective; preparation now uses one compact work panel alongside the order ticket.
- Between-customer cleanup was initially gated by order acceptance. Housekeeping now works in briefing/order/payment/report; new recipes still require a confirmed order.
- Timer-completed washing initially waited for the snapshot throttle. Equipment, vessel and job-completion transitions now save immediately; only fractional timer updates are throttled.
- Invalid service saves, stale cached trays and interrupted jobs could strand vessels. Readers repair equipment and reconstruct trays from their authoritative vessels.
- A moving key release could finish a saved pour. Completion now requires a held key, correct aim and a stationary player.
- Visible English, dictionary references and gesture clues could incorrectly earn independent language evidence. Assistance is per word and persists. Physical and payment errors do not erase Japanese comprehension.
- The existing online speech generator returned HTTP 403. Six new Japanese clips were generated locally with the licensed OpenJTalk Mei voice; existing audio was preserved and attribution bundled.

## Verified

- **71 automated tests pass**: recipes, two-cup batches, ingredient consumption, four-vessel conservation, wrong trays, tips, legacy/corrupt saves, adaptive help, learning evidence, audio coverage, controls, pause/hidden-tab/viewport suspension, resource disposal and all 11 station targets with wall blocking.
- State simulation runs all seven story mornings and six free-play mornings, restoring saves after every recipe action/tick and checking reward settlement and closing tasks.
- Browser: complete day-one coffee, two teas and water through Japanese order confirmation, physical equipment, tray service, Japanese hospitality choices and checkout. Sales total ¥1,150.
- Browser: local Rive feedback loads; pausing freezes brewing. Day-five waiting neighbor, between-customer washing, pantry refill and closing cleanup work. Failed Rive loading leaves usable static feedback under reduced motion.
- Browser: day-seven finale, pending translation help across reload, all three comprehension answers, independent/assisted results across another reload, and continuation into day eight with chapter completion preserved. The fixture scored two independently and one with help.
- TypeScript, ESLint, Rive verify/inspect and production build pass. Rive's native capture was inspected at both partial and full progress. The existing Three.js/Rapier large-bundle advisory remains.

## Evidence and reproduction

Run npm run dev, then node output/playwright/preparation-playtest.cjs and node output/playwright/chapter-check-playtest.cjs. These scripts use the installed bundled Playwright/Chromium paths and an isolated browser context. They do not change the player's normal browser saves.

Results: output/playwright/preparation-results.json and chapter-check-results.json. Screenshots include first-day-coffee.png, first-day-tea.png, first-day-water.png, tea-steeping.png, later-day-queue.png, later-day-clean-closing.png, rive-fallback.png and chapter-one-learning-results.png.

The final evening and later-day closing use prepared fixtures; seven complete mornings are covered by state simulations. This establishes behavior and visual usability in Chromium, not long-term Japanese retention, an unaided human timing study or cross-device performance.
