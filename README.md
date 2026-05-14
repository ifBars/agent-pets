# Agent Pets

Agent Pets brings Codex-compatible pets outside of Codex and turns them into a small local desktop monitor for AI coding work.

The first target is Codex Desktop: the app reads local Codex pet packages and local session files, then maps agent activity into the same pet states Codex uses: `running`, `waiting`, `failed`, `review`, and `idle`. The product direction is not "another chatbot" and not a pure nostalgia desktop toy. It is an ambient status layer for long-running agent work.

## Quick Start

Download packaged builds from [GitHub Releases](https://github.com/ifBars/agent-pets/releases), or run from source:

```bash
bun install
bun run pets
```

List locally installed Codex pets:

```bash
bun run list
```

Validate a pet package before installing or sharing it:

```bash
bun run validate:pet -- C:\Users\ghost\.codex\pets\pingu
```

Generate a contact sheet and QA report:

```bash
bun run qa:pet -- --pet-dir C:\Users\ghost\.codex\pets\pingu --out .demo\pingu-qa
```

Use a generic status file for another agent:

```bash
bun run pets -- --status-file C:\path\to\agent-status.json
```

Monitor OpenCode through the native Agent Pets OpenCode plugin when installed, with CLI session data as a fallback:

```bash
bun run pets -- --provider opencode
```

Install the OpenCode bridge plugin:

```bash
opencode plugin opencode-agent-pets --global
```

Monitor Claude Code local sessions:

```bash
bun run pets -- --provider claude-code
```

Monitor T3Code when its CLI is available:

```bash
bun run pets -- --provider t3code
```

Emit a status update from another agent or task wrapper:

```bash
bun run emit -- --file C:\path\to\agent-status.json --state running --title "Claude Code" --detail "Editing files"
```

The package also exposes command bins for future publishing:

```bash
agent-pets
pets
```

## Current Features

- Loads custom Codex pets from `${CODEX_HOME:-$HOME/.codex}/pets` and legacy custom avatars from `${CODEX_HOME:-$HOME/.codex}/avatars`.
- Validates the Codex pet atlas contract before loading a pet: WebP or PNG, `1536x1872`, `8x9`, `192x208` cells.
- Runs as a transparent, frameless, always-on-top Electron desktop pet.
- Reads local Codex session metadata and recent rollout JSONL records.
- Reads realtime OpenCode session state from the `opencode-agent-pets` plugin, then falls back to OpenCode CLI/database summaries.
- Reads Claude Code local session JSONL metadata without exposing prompt text.
- Reads T3Code command-session summaries when a compatible CLI is installed.
- Reads a generic JSON status file for non-Codex agents.
- Maps active Codex work into pet animation states.
- Persists selected pet, state mode, status-file path, and window bounds.
- Persists provider choice and pet size.
- Generates pet contact sheets and review JSON for asset QA.
- Shows a compact local activity panel with recent sessions.
- Keeps all session access local and read-only.

## Why It Exists

Desktop pets are memorable but usually impractical. AI desktop companions are practical but usually become full chat clients. Agent Pets takes a narrower wedge: make coding-agent state visible at the edge of your workspace with the pet assets people already make for Codex.

## Pet Contract

Codex-compatible pet packages live at:

```text
${CODEX_HOME:-$HOME/.codex}/pets/<pet-id>/
  pet.json
  spritesheet.webp
```

Manifest:

```json
{
  "id": "pet-id",
  "displayName": "Pet Name",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

Atlas:

- Format: PNG or WebP.
- Dimensions: `1536x1872`.
- Grid: `8` columns by `9` rows.
- Cell: `192x208`.
- Background: transparent.
- Unused cells: fully transparent.

## Generic Agent Status File

Other agents can drive Agent Pets without a custom provider by writing JSON:

```json
{
  "state": "running",
  "title": "Claude Code",
  "detail": "Editing renderer files",
  "updatedAt": "2026-05-13T10:00:00.000Z"
}
```

Valid states are `idle`, `running`, `waiting`, `failed`, and `review`.

## Development

```bash
bun test
bun run pets
```

Create an unpacked local Windows build:

```bash
bun run pack
```

Release packaging scripts are present for Windows, macOS, and Linux:

```bash
bun run dist:win
bun run dist:mac
bun run dist:linux
```

CI runs tests and an unpacked packaging smoke on Windows. The release workflow builds Windows, macOS, and Linux artifacts from tags or manual dispatch.

The current implementation is intentionally local-first. It does not patch Codex, inject into Codex, upload prompts, upload source code, or execute scripts from pet packages.

## Demo Angle

The demo should show a Codex pet leaving Codex, landing on the desktop, and reacting while Codex works in the background. The payoff is practical: "I can see when my agent is running, waiting on me, failed, or ready for review without opening the app."

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).
