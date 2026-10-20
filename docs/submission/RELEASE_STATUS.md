# Release status — October 20, 2026

## Prepared release

Mikanra 0.1.0, public-source publication target: https://github.com/flaune/mikanra-game. Original code and artwork retain all rights reserved. Third-party notices ship with the game.

## Current café release on Vercel

[PR #1](https://github.com/flaune/mikanra-game/pull/1) is merged into `main` at **`4fe8a279e771b37c5bd9908ab7265c0983e455a4`**. Its [release workflow passed](https://github.com/flaune/mikanra-game/actions/runs/39494757898): clean `npm ci`, types, lint, all **83 unit/runtime/audio tests**, audit, production build and the complete browser suite. Browser checks include 1440×900 and 1000×700 layouts, ordinary walking through preparation/service/cleanup, later-day management, finale and continuation into day eight. See [repair details](../CAFE_REPAIR.md).

The current free desktop demo is **https://mikanra-game.vercel.app/**, in the new `mikanra-game` Vercel project. Production deployment **`dpl_D8YgJiesxVgube5P7BNecjSiD5tx`** was built directly from that exact GitHub SHA, staged, checked anonymously, and promoted without rebuilding. Its immutable URL is https://mikanra-game-7gol3y8vo-frans-projects-08724d0a.vercel.app/.

Public checks cover startup, local audio/Rive/license/social assets, arrival skipping, mobile notice, absence of QA globals/controls, Japanese audio decoding and playback, ordinary walking to the work area, guided tea preparation, service to Aoi, and save restoration after reload. Vercel uses Node 24.x, Vite, root installation, `npm ci`, `npm run build`, and `dist`. It has no application secrets, automatic Git deployment connection or Vercel login requirement. Later production promotions remain manual through October 31; see [deployment instructions](../DEPLOYMENT.md).

The [new teaser](TEASER.md) follows one tea order using isolated GSAP tooling, full-screen portrait scene captures, original music/effects and the attributed Mei order recording. Only the opening and closing titles are added. The master is 30 seconds, 1080×1920, 30 fps, H.264/AAC; full decode and encoded audio peak checks pass. Tooling and documentation are on `improve/teaser-launch`; deploying the game does not depend on merging those media-only changes.

The older `mikanra_test` Vercel site, GitHub Pages deployment, private `flaune/mikanra` repository and frozen tags remain unchanged. `v0.1.0` and `submission-2026` still resolve to `77e53be918a758c5f43de49ae4ea56c8699be933`.

## Original tagged-release verification

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
- Frozen original-release backup: https://flaune.github.io/mikanra-game/ — anonymously verified for production boot, local assets, decoded arrival/Japanese audio playback, credits, arrival skip, saved-shift resume, mobile notice and absence of QA controls. [Successful deployment](https://github.com/flaune/mikanra-game/actions/runs/39456146705).
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
