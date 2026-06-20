# windsurf-agent-pets

Windsurf Cascade integration for [Agent Pets](https://github.com/ifBars/agent-pets).

## Install

```bash
agent-pets-windsurf-install
```

The installer writes:

- `~/.codeium/windsurf/mcp_config.json` with an `agent-pets` MCP server.
- `.windsurf/workflows/pet.md` in the current workspace so Cascade can invoke `/pet`.

## Usage

Open Windsurf Cascade in the workspace where you ran the installer, then run:

```text
/pet
```

The workflow asks Cascade to call the local MCP tools and keep status updates privacy-safe.
