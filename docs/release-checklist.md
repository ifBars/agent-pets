# Release Checklist

Use this before tagging a public release.

## Local Checks

```bash
bun install --frozen-lockfile
bun test
bun run list
bun run validate:pet -- C:\Users\ghost\.codex\pets\pingu
bun run demo:screenshot
bun run demo:video
bun run dist:win
bun run launch:kit
bun run release:verify
```

Expected Windows artifacts:

```text
dist/Agent Pets Setup 0.1.0.exe
dist/Agent Pets 0.1.0.exe
dist/Agent Pets Setup 0.1.0.exe.blockmap
```

## Manual Windows Smoke

1. Launch `dist\win-unpacked\Agent Pets.exe`.
2. Confirm the pet renders with a local Codex pet.
3. Launch with a status file:

```bash
bun run demo:status
bun run pets -- --status-file .demo\agent-status.json
```

4. Confirm the pet cycles through `idle`, `running`, `waiting`, `review`, and `failed`.
5. Launch the portable EXE and confirm it opens.
6. Run the NSIS installer in a clean VM or disposable profile.
7. Confirm uninstall removes the app but does not touch `.codex`.

## CI Checks

The release workflow should build:

- Windows NSIS installer and portable EXE.
- macOS DMG.
- Linux AppImage and deb.

Linux can be probed locally from WSL with:

```bash
bun test
node node_modules/electron-builder/cli.js --linux deb
dpkg-deb -I dist/agent-pets_0.1.0_amd64.deb
```

AppImage runtime smoke may require Electron desktop libraries that are not present in a minimal WSL image, including `libnspr4` and related NSS/GTK dependencies. Treat a missing-library failure in WSL as an environment gap, not a successful runtime validation.

Do not mark a GitHub release stable until all three platform jobs complete or the release notes clearly label platform limitations.

## Release Notes Template

```md
# Agent Pets v0.1.0

Agent Pets brings Codex-compatible pets onto your desktop as a local-first status monitor for AI coding agents.

## Highlights

- Loads local Codex pet packages.
- Mirrors Codex activity into pet states.
- Supports generic status files for other agents.
- Includes `agent-pets-emit` and `agent-pets-validate` CLIs.
- Ships demo media and pet-maker skill guidance.

## Privacy

Agent Pets reads local status files and pet packages. It does not upload prompts, source code, session logs, or pet files.

## Known Limitations

- Codex status inference is best-effort because Codex session files are not a public API.
- Visual pet QA still requires human review for transparency/matte issues.
- Platform signing/notarization depends on maintainer release infrastructure.
```
