# Launch Kit Review

Review date: 2026-05-13

## Included Assets

- `agent-pets-demo.mp4`: renderer-generated 15 second demo clip for X.
- `agent-pets-thumbnail.png`: thumbnail frame extracted from the demo clip.
- `x-launch-post.md`: launch post and short thread copy.
- `manifest.json`: release artifact and demo media checksums.

## Acceptance Notes

- Demo media is generated from the real Electron renderer, not a mock.
- The demo uses the generic status-file provider so non-Codex agent support is visible.
- The launch copy positions Agent Pets as a local-first desktop status monitor, not a generic novelty pet.
- The generated still was inspected locally and shows the pet, status card, pet selector, and state selector in frame.
- The pet QA contact sheet was inspected locally and exposes all expected rows plus unused cells for transparency review.
- Checksums in `manifest.json` are verified by `bun run release:verify`.

## Remaining Human Review

- Watch the MP4 before posting and confirm the crop fits X's current composer preview.
- Confirm the chosen pet has no visible matte halos, clipped frames, or missing transparent cells.
- If the release is published outside Windows first, label unverified macOS/Linux runtime support clearly in the post or release notes.
