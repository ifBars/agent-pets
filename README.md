# Agent Pets

<p align="center">
  <a href="https://www.npmjs.com/package/@ifbars/agent-pets"><img src="https://img.shields.io/npm/v/%40ifbars%2Fagent-pets?label=npm" alt="@ifbars/agent-pets npm package version" /></a>
  <a href="https://www.npmjs.com/package/opencode-agent-pets"><img src="https://img.shields.io/npm/v/opencode-agent-pets?label=opencode%20plugin" alt="opencode-agent-pets npm package version" /></a>
  <a href="https://github.com/ifBars/agent-pets/releases"><img src="https://img.shields.io/github/v/release/ifBars/agent-pets?label=release" alt="GitHub release" /></a>
  <a href="https://github.com/ifBars/agent-pets/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ifBars/agent-pets/ci.yml?branch=main&label=ci" alt="CI status" /></a>
  <a href="https://github.com/ifBars/agent-pets/actions/workflows/release.yml"><img src="https://img.shields.io/github/actions/workflow/status/ifBars/agent-pets/release.yml?branch=main&label=release%20workflow" alt="Release workflow status" /></a>
  
  <a href="LICENSE"><img src="https://img.shields.io/github/license/ifBars/agent-pets" alt="License" /></a>
</p>

<p align="center">
  <img src="media/agent-pets-preview.gif" width="360" alt="Agent Pets preview" />
</p>

Bring your Codex pet anywhere.

Agent Pets puts a tiny Codex-compatible pet on your desktop. It can show coding-agent status, run as a manual desktop companion, or follow a simple local status file.

## Quick Start

Run it with Bun:

```bash
bunx @ifbars/agent-pets
```

Or install it on your PATH:

```bash
bun install -g @ifbars/agent-pets
agent-pets
```

Run a specific pet:

```bash
agent-pets --pet pingu
```

Use it without an agent:

```bash
agent-pets --provider desktop --pet pingu
```

Prefer an app binary? Download the latest Windows, macOS, or Linux build from [GitHub Releases](https://github.com/ifBars/agent-pets/releases).

## Package Names

- `@ifbars/agent-pets` is the main desktop app and CLI package.
- `opencode-agent-pets` is the companion OpenCode plugin package.
- `claude-code-agent-pets` is the companion Claude Code MCP, hooks, and `/pet` skill package.
- `gemini-agent-pets` is the companion Gemini CLI custom-command package.
- `cursor-agent-pets` is the companion Cursor MCP integration package.
- `aider-agent-pets` is the companion Aider notification integration package.
- `goose-agent-pets` is the companion Goose MCP and slash-command integration package.
- `copilot-agent-pets` is the companion GitHub Copilot CLI hooks, MCP, and `/pet` skill package.
- `windsurf-agent-pets` is the companion Windsurf Cascade MCP and `/pet` workflow package.
- `cline-agent-pets` is the companion Cline MCP and `/pet` skill package.
- `continue-agent-pets` is the companion Continue MCP integration package.
- `zed-agent-pets` is the companion Zed Agent Panel MCP integration package.
- `warp-agent-pets` is the companion Warp Agent Mode MCP integration package.

## OpenCode

Install the companion plugin:

```bash
opencode plugin opencode-agent-pets --global
```

Open OpenCode, then toggle the desktop pet:

```text
/pet
```

## Gemini CLI

Install the custom slash command:

```bash
agent-pets-gemini-install
```

Open Gemini CLI, then launch the desktop pet:

```text
/pet
```

## Claude Code

Install the MCP server, hooks, and `/pet` skill from the repo where you run Claude Code:

```bash
agent-pets-claude-install
```

Open Claude Code in that project, then run:

```text
/pet
```

## Cursor

Install the MCP bridge:

```bash
agent-pets-cursor-install
```

This registers `agent-pets` in `~/.cursor/mcp.json`. Cursor Agent can then call the local MCP tools to launch Agent Pets and update high-level status.

## Aider

Install the notification bridge from the repo where you run Aider:

```bash
agent-pets-aider-install
```

Then run Agent Pets in Aider mode:

```bash
agent-pets --provider aider
```

## Goose

Install the MCP extension and `/pet` recipe command:

```bash
agent-pets-goose-install
```

Open Goose, then run:

```text
/pet
```

## GitHub Copilot CLI

Install the hooks, MCP server, and `/pet` skill:

```bash
agent-pets-copilot-install
```

Open GitHub Copilot CLI, then run:

```text
/pet
```

## Windsurf

Install the MCP server and workspace `/pet` workflow:

```bash
agent-pets-windsurf-install
```

Open Windsurf Cascade in that workspace, then run:

```text
/pet
```

## Cline

Install the MCP server and global `/pet` skill:

```bash
agent-pets-cline-install
```

Open Cline, then run:

```text
/pet
```

## Continue

Install the workspace MCP block:

```bash
agent-pets-continue-install
```

Continue exposes this as an MCP tool surface in agent mode. Ask Continue to launch Agent Pets or update the pet status.

## Zed

Install the Agent Panel MCP context server:

```bash
agent-pets-zed-install
```

Open Zed's Agent Panel, then ask it to launch Agent Pets or update the pet status. Zed exposes custom integrations as MCP context servers rather than documented custom slash-command files.

## Warp

Install the workspace MCP server:

```bash
agent-pets-warp-install
```

Open Warp Agent Mode, then ask it to launch Agent Pets or update the pet status. For a `/pet` entry point, create a Warp Drive saved prompt named `pet` that calls the Agent Pets MCP tools; Warp documents project MCP config files but not a local saved-prompt file format.

## Agent Modes

Agent Pets supports:

- Codex
- OpenCode
- Claude Code
- Gemini CLI
- Cursor MCP
- Aider
- Goose MCP
- GitHub Copilot CLI
- Windsurf MCP
- Cline MCP
- Continue MCP
- Zed MCP
- Warp MCP
- T3Code
- Desktop-only pets
- JSON status files for custom integrations

The OpenCode plugin keeps Agent Pets updated with realtime session status. You can also run OpenCode mode directly:

```bash
agent-pets --provider opencode
```

Claude Code mode reads the privacy-safe status file written by the installed Claude hooks, then falls back to local JSONL metadata without exposing prompt or response text:

```bash
agent-pets --provider claude-code
```

T3Code mode can read the live orchestration snapshot from a running T3Code server when you provide an owner bearer session:

```bash
AGENT_PETS_T3CODE_URL=http://127.0.0.1:3773 AGENT_PETS_T3CODE_BEARER_TOKEN=... agent-pets --provider t3code
```

Without those values it falls back to the T3Code CLI session list, then local read-only app data for composer draft activity.

Gemini CLI mode reads recent local session history from `GEMINI_DIR` or `~/.gemini/tmp/<project_hash>/chats/`:

```bash
agent-pets --provider gemini-cli
```

MCP mode is available for Cursor and other MCP-capable agents:

```bash
agent-pets --mcp
```

Aider mode reads the privacy-safe status file written by `agent-pets-aider-notify`. It may use `.aider.chat.history.md` modification time as a fallback, but it does not read transcript contents.

GitHub Copilot CLI mode reads the privacy-safe status file written by the installed Copilot hooks. It may use `~/.copilot/session-state/` modification time as a fallback, but it does not read event-log contents.

## Custom Pets

Pets use the Codex pet package shape: a `pet.json` manifest plus a transparent spritesheet.

Start here: [Make a Custom Pet](PET_CREATION.md)

## Development

```bash
bun install
bun run agent-pets
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
