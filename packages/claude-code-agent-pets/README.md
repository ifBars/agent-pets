# claude-code-agent-pets

Claude Code integration for [Agent Pets](https://github.com/ifBars/agent-pets).

## Install

Run this from the project where you use Claude Code:

```bash
agent-pets-claude-install
```

The installer writes:

- `.mcp.json` with an `agent-pets` MCP server.
- `.claude/settings.local.json` hooks that write high-level local status updates.
- `.claude/skills/pet/SKILL.md` so Claude Code can invoke `/pet`.

## Usage

Open Claude Code in the project, then run:

```text
/pet
```

The provider reads the hook status file first and falls back to local Claude Code JSONL metadata. It does not expose prompt text, source code, diffs, or private conversation content.
