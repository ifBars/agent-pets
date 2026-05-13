# Product Spec

## Product Name

Working name: Agent Pets.

Tagline: Bring your agent status to life.

## Product Promise

Agent Pets turns Codex-compatible pets into a desktop status layer for AI coding agents. Users can keep working while a small pet shows whether their agent is running, waiting, failed, ready for review, or idle.

## MVP Scope

### Desktop app

- Transparent always-on-top pet window.
- Pet selector for local Codex-compatible pets.
- Automatic Codex activity mode.
- Manual state override for testing and demos.
- Persistent selected pet, state mode, status-file path, and window bounds.
- Minimal pet-first UI with an active-thread badge.
- Top-opening thread popover with recent agent sessions.
- Compact settings menu for provider, pet, state, status file, and pet size.
- Read-only provider for local Codex session files.
- Read-only provider for local Claude Code session metadata.
- CLI-backed providers for OpenCode and T3Code session summaries.
- Generic JSON status-file provider for other agents.
- Defensive parsing so malformed logs do not crash the app.

### Pet support

- Load packages from `.codex/pets/<id>/pet.json`.
- Also load old `.codex/avatars/<id>/avatar.json` packages.
- Validate atlas dimensions and prevent `spritesheetPath` traversal.
- Preserve Codex row timing and non-idle state behavior.

### Creator support

- Publish a creator skill that tells agents how to make compatible pets.
- Ship a package validator CLI so agents can check a pet folder before installing or sharing.
- Ship an emitter CLI so non-Codex agents can update Agent Pets through the generic status-file provider.
- Reuse hatch-pet's atlas contract and row generation workflow.
- Include PromisePals-inspired warnings for chroma-key cleanup, matte halos, identity drift, detached effects, and renderer-contract mismatches.

## Non-goals For MVP

- No Codex app patching.
- No prompt or repository upload.
- No executable community pet packages.
- No marketplace.
- No AI chat client inside the overlay.
- No automatic control of Codex sessions.

## Status Model

| Agent state | Pet state | Meaning |
| --- | --- | --- |
| Active write/tool activity | `running` | The agent appears to be working. |
| Waiting for user/input | `waiting` | The user likely needs to respond. |
| Failed/cancelled | `failed` | The latest known activity looks unsuccessful. |
| Recently completed | `review` | Work likely needs review. |
| No recent activity | `idle` | Nothing needs attention. |

## Provider Roadmap

1. Codex local provider.
2. Generic file provider: watch a JSON file shaped like `{ "state": "running", "title": "..." }`.
3. OpenCode CLI provider.
4. Claude Code local session provider.
5. T3Code CLI provider.
6. Aider/Gemini/Copilot provider research.
7. Optional MCP status provider for tools that expose agent activity.

## Trust And Safety

- Local-only by default.
- Read-only access to configured agent directories.
- No hidden network calls.
- No arbitrary scripts in pet packages.
- Marketplace or community packages, if added later, must be static data with hash verification.

## Demo Requirements

The X demo should fit in 20-35 seconds:

1. Show Codex pet package already installed.
2. Launch `bun run pets`.
3. Start or continue a Codex task.
4. Pet switches to running.
5. Trigger a user-waiting or completed review state.
6. End with the package contract and OSS repo callout.
