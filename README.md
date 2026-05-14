# Agent Pets

![Agent Pets preview](media/agent-pets-preview.gif)

Bring your Codex pet anywhere.

Agent Pets turns Codex-compatible pets into a tiny local desktop companion for coding agents, status files, or manual desktop-only use.

- Local-first: reads local files and local agent state.
- Provider-aware: Codex, OpenCode, Claude Code, T3Code, and generic status files.
- Desktop-only mode: run any custom pet without connecting to an agent.
- Codex-compatible: uses the same `pet.json` plus `spritesheet.webp` package shape.

## Quick Start

Run from source:

```bash
bun install
bun run pets
```

Run a specific pet:

```bash
bun run pets -- --pet pingu
```

Run a custom pet as a desktop-only companion:

```bash
bun run pets -- --provider desktop --pet my-writing-buddy
bun run pets -- --provider desktop --pet my-writing-buddy --state waving
```

## Agent Modes

Codex is the default provider:

```bash
bun run pets
```

OpenCode:

```bash
bun run pets -- --provider opencode
```

Install the OpenCode plugin if you want realtime OpenCode session status and `/pet` support:

```bash
opencode plugin opencode-agent-pets --global
```

Claude Code and T3Code:

```bash
bun run pets -- --provider claude-code
bun run pets -- --provider t3code
```

Generic status file:

```bash
bun run pets -- --status-file ./agent-status.json
bun run emit -- --file ./agent-status.json --state running --title "Agent" --detail "Working"
```

Status file shape:

```json
{
  "state": "running",
  "title": "Agent",
  "detail": "Working",
  "updatedAt": "2026-05-13T10:00:00.000Z"
}
```

Valid states are `idle`, `running`, `waiting`, `failed`, and `review`.

## Make A Desktop Pet

Desktop mode is for custom pets that are not tied to an agent. It is useful for writing, presenting, studying, streaming, or gaming.

Create a Codex-compatible pet with the `agent-pet-maker` or `hatch-pet` skill workflow, then install it under:

```text
~/.codex/pets/<pet-id>/
  pet.json
  spritesheet.webp
```

Validate and QA the package:

```bash
bun run validate:pet -- ~/.codex/pets/my-writing-buddy
bun run qa:pet -- --pet-dir ~/.codex/pets/my-writing-buddy --out ./my-writing-buddy-qa
```

Clean green or purple cutout halos before the final QA pass:

```bash
bun run clean:pet-edges -- --pet-dir ~/.codex/pets/my-writing-buddy --in-place
bun run clean:pet-edges -- --pet-dir ~/.codex/pets/my-writing-buddy --fringe "#7a45ff" --in-place
bun run clean:pet-edges -- --pet-dir ~/.codex/pets/my-writing-buddy --diagnostic-out ./my-writing-buddy-edges.png
```

Launch it:

```bash
bun run pets -- --provider desktop --pet my-writing-buddy
```

Desktop mode is manual in v1. It does not inspect active windows, browser tabs, document titles, or game process state.

## Pet Package

Manifest:

```json
{
  "id": "pet-id",
  "displayName": "Pet Name",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

Spritesheet contract:

- PNG or WebP
- `1536x1872`
- `8x9` grid
- `192x208` cells
- transparent background
- unused cells fully transparent

## Development

```bash
bun test
bun run pets
```

Package locally:

```bash
bun run pack
```

Build release artifacts:

```bash
bun run dist:win
bun run dist:mac
bun run dist:linux
```

## Privacy

Agent Pets is intentionally local-first. It does not patch Codex, inject into other apps, upload prompts, upload source code, or execute scripts from pet packages.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).
