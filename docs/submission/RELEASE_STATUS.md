# Release status — October 20, 2026

## Prepared release

Mikanra 0.1.0, public-source publication target: https://github.com/flaune/mikanra-game. Original code and artwork retain all rights reserved. Third-party notices ship with the game.

## Local verification completed

- Node 24: app/config type checking, ESLint, all 72 unit/runtime/audio tests and production build pass.
- Cafe browser preparation: three recipes, two-cup tea, local Rive, pause freezes brewing, cup washing, pantry, closing cleanup, waiting neighbor, finale and Rive fallback pass.
- Finale persistence: assisted and independent check results survive reload; continuing reaches day eight.
- Production browser: title/readiness, credits, audio/Rive/license/social assets, arrival skip, saved-shift resume, mobile notice and no QA controls pass.
- All 51 MP3 files decode with bounded nonzero duration (50 Japanese clips and original arrival).
- npm audit: zero vulnerabilities across all severity categories after the locked dependency update.
- Common credential/key patterns and the private Bolt access URL were checked against publication candidates. No matches were found. The access link and retired audio are ignored locally and are not published.

Evidence is generated under ignored `output/` paths. These checks use isolated automated browsers, deterministic camera positioning and late-day test saves. Human usability, learning efficacy, cross-browser GPU performance and native-speaker pronunciation quality remain unvalidated. A large-bundle warning remains for the 3D/physics runtime.

## Publishing status

- Public source: https://github.com/flaune/mikanra-game.
- Current playable backup: https://flaune.github.io/mikanra-game/ — anonymously verified for production boot, local assets, decoded arrival/Japanese audio playback, credits, arrival skip, saved-shift resume, mobile notice and absence of QA controls. [Successful deployment](https://github.com/flaune/mikanra-game/actions/runs/39456146705).
- Clean checkout: fresh `npm ci`, all 72 tests, lint/types and production build passed.
- Independent Linux workflow: [all release checks passed](https://github.com/flaune/mikanra-game/actions/runs/39455454543), including the full browser suite. Verified application commit: `616c19986791a5e4ea07312eb5672a986b7b0064`; subsequent release edits only record documentation/results.
- The browser suite includes a stalled-timer dialogue regression. Cafe interaction tests wait for actual manual-work completion and run at a supported 1000×700 logical viewport with reduced motion and half-density software rendering in CI. The production smoke check uses 1440×900 at normal density.
- The original Bolt URL, https://mikanra-japanese-lea-d6bu.bolt.host/, was observed serving the older “Click to explore” prototype. Signed-in Bolt synchronization and editor-link verification remain founder handoff steps.

## Founder handoff before submitting

1. Open the original Bolt project through the access link retained in `output/submission/private-links.md`, synchronize this release, and republish. See [deployment instructions](../DEPLOYMENT.md).
2. Confirm the correct current live link anonymously and obtain the actual editor URL from the open Bolt project.
3. Review [form copy](FORM_COPY.md), enter your personal details, and complete the eligibility/age/rules affirmation only if accurate. The organizer has not confirmed how the Bolt foundation plus substantial Codex development satisfies its rules.
4. Submit before October 20 at 11:59 p.m. Pacific / October 21 at 2:59 a.m. Eastern. Keep the judging build freely available through October 31; after the deadline, limit changes to required accessibility/functionality maintenance.

An optional demo script and sponsorship brief are included. No contest entry, partner outreach, recurring monitor or payment system has been created.
