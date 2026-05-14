# Agent Pets

<p align="center">
  <a href="https://www.npmjs.com/package/@ifbars/agent-pets"><img src="https://img.shields.io/npm/v/%40ifbars%2Fagent-pets?label=npm" alt="npm package" /></a>
  <a href="https://www.npmjs.com/package/@ifbars/agent-pets"><img src="https://img.shields.io/npm/dm/%40ifbars%2Fagent-pets?label=downloads" alt="npm downloads" /></a>
  <a href="https://github.com/ifBars/agent-pets/releases"><img src="https://img.shields.io/github/v/release/ifBars/agent-pets?label=release" alt="GitHub release" /></a>
  <a href="https://github.com/ifBars/agent-pets/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ifBars/agent-pets/ci.yml?branch=main&label=ci" alt="CI status" /></a>
  <a href="https://github.com/ifBars/agent-pets/actions/workflows/release.yml"><img src="https://img.shields.io/github/actions/workflow/status/ifBars/agent-pets/release.yml?branch=main&label=release%20workflow" alt="Release workflow status" /></a>
  <a href="https://www.npmjs.com/package/opencode-agent-pets"><img src="https://img.shields.io/npm/v/opencode-agent-pets?label=opencode%20plugin" alt="OpenCode plugin package" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/ifBars/agent-pets" alt="License" /></a>
</p>

<p align="center">
  <img src="media/agent-pets-preview.gif" width="292" alt="Agent Pets preview" />
</p>

Bring your Codex pet anywhere.

Agent Pets puts a tiny Codex-compatible pet on your desktop. It can show coding-agent status, run as a manual desktop companion, or follow a simple local status file.

## Quick Start

```bash
bun install
bun run agent-pets
```

Run a specific pet:

```bash
bun run agent-pets -- --pet pingu
```

Use it without an agent:

```bash
bun run agent-pets -- --provider desktop --pet pingu
```

After it is published to npm:

```bash
bunx @ifbars/agent-pets
```

## Agent Modes

Agent Pets supports:

- Codex
- OpenCode
- Claude Code
- T3Code
- Desktop-only pets
- JSON status files for custom integrations

OpenCode realtime status and `/pet` support are available through the companion plugin:

```bash
bun run opencode:install-local
```

Then run Agent Pets with OpenCode:

```bash
bun run agent-pets -- --provider opencode
```

## Custom Pets

Pets use the Codex pet package shape: a `pet.json` manifest plus a transparent spritesheet.

Start here: [Make a Custom Pet](PET_CREATION.md)

## Development

```bash
bun install
bun run typecheck
bun run test
```

Package a local desktop build:

```bash
bun run pack
```

Release checklist: [RELEASE.md](RELEASE.md)

## Privacy

Agent Pets is local-first. It does not patch Codex, inject into other apps, upload prompts, upload source code, or execute scripts from pet packages.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).
