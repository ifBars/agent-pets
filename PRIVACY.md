# Privacy

Agent Pets is designed to work locally.

## What It Reads

- Codex-compatible pet packages under `${CODEX_HOME:-$HOME/.codex}/pets`.
- Legacy custom avatar packages under `${CODEX_HOME:-$HOME/.codex}/avatars`.
- Local Codex session index and recent rollout JSONL records for status inference.
- Optional user-provided status JSON files for non-Codex agents.
- Local app settings in Electron `userData`.

## What It Stores

Agent Pets stores local settings:

- selected pet id
- selected state mode
- status-file path
- window bounds

It does not store prompt text for its own features.

## What It Sends

Agent Pets does not send prompts, source code, session logs, pet files, or status files to a remote service.

Network activity may still occur during development or packaging when Bun, Electron, or electron-builder downloads dependencies or build assets.

## Status Inference

The Codex provider is best-effort because Codex session files are not a public API. It samples recent local records to infer broad states such as running, waiting, failed, review, and idle.
