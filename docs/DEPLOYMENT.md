# Deployment and the judging freeze

## Original Bolt project

The existing public URL is https://mikanra-japanese-lea-d6bu.bolt.host/. During preparation it served the earlier “Click to explore” prototype, rather than the current seven-morning cafe release. The source repository and original Bolt project must be synchronized before treating that URL as the current submission build.

1. Open the original project through the founder-supplied Bolt access link. It is stored in the ignored local file `output/submission/private-links.md`.
2. Bring the reviewed `flaune/mikanra-game` source into that project using Bolt's GitHub integration or upload the prepared source archive. Preserve the original Bolt project history. See [Bolt's GitHub guide](https://support.bolt.new/integrations/git).
3. Use Node 24, install with `npm ci`, and run `npm run build`. The ordinary build uses the root path suitable for the existing Bolt host. Check the game in Bolt's preview and republish through that project's hosting controls.
4. In a fresh signed-out browser, verify the train title, 50 local Japanese clips, preparation recipes, notebook/save restoration, local Rive feedback and static fallback. Run `npm run test:smoke -- https://mikanra-japanese-lea-d6bu.bolt.host/` against the public build.
5. Copy the actual editor URL from the open project into the contest form. An anonymous request-access link is not verified as that editor URL.

An authenticated Bolt session is needed for this workflow. The available computer/browser-control service failed to initialize during this preparation; no credentials were extracted and the older Bolt deployment was not represented as updated. Publishing source back to Bolt does not change the historical development disclosure or confirm eligibility.

## Current-build backup on GitHub Pages

The repository includes a manually triggered Pages workflow that builds an explicit release tag at `/mikanra-game/`. Its expected URL is https://flaune.github.io/mikanra-game/. Check RELEASE_STATUS.md for the actual deployment outcome before using that URL. This is an additional playable build, not a replacement for the required Bolt editor link or organizer eligibility decision.

The `Publish selected release` workflow defaults to `submission-2026` and does not deploy automatically on pushes. The release checks run on pushes and pull requests. Audio and Rive asset paths support the Pages subdirectory.

## Prepared handoff archives

The GitHub release includes a source ZIP and root-hosted static build ZIP. Extract the source ZIP into a project workspace and run `npm ci`; Python, FFmpeg and Rive CLI are not needed for an ordinary build. The static ZIP contains `index.html`, hashed assets, audio, Rive and license notices and can be served directly by a static host. Never use a local `file://` URL to play it.

## Through October 31

Keep the submitted build freely accessible during judging. Treat `submission-2026` as the immutable baseline. After the submission deadline, make only maintenance changes required to keep the submitted project accessible and functional, explain them in release notes, and use a new maintenance tag. Do not move the original tag or automatically deploy unrelated main-branch work. This setup creates no recurring monitoring task; availability must be checked by the founder or on explicit request.

Full contest conditions: https://bolt.new/builders-week/terms.
