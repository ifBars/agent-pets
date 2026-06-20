# cline-agent-pets

Cline integration for [Agent Pets](https://github.com/ifBars/agent-pets).

## Install

```bash
agent-pets-cline-install
```

The installer writes:

- `~/.cline/data/settings/cline_mcp_settings.json` with an `agent-pets` MCP server.
- `~/.cline/skills/pet/SKILL.md` so Cline can invoke `/pet`.

If `CLINE_DATA_DIR` is set, the MCP config writes under that data directory.

## Usage

Open Cline, then run:

```text
/pet
```

The skill asks Cline to call the local MCP tools and keep status updates privacy-safe.
