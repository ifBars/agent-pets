# copilot-agent-pets

GitHub Copilot CLI integration for [Agent Pets](https://github.com/ifBars/agent-pets).

## Install

```bash
agent-pets-copilot-install
```

The installer writes:

- `~/.copilot/mcp-config.json` with an `agent-pets` MCP server.
- `~/.copilot/hooks/agent-pets.json` so Copilot CLI can write high-level local status updates.
- `~/.copilot/skills/pet/SKILL.md` so `/pet` can launch and update Agent Pets through MCP tools.

If `COPILOT_HOME` is set, the installer writes under that directory instead of `~/.copilot`.

## Usage

Open GitHub Copilot CLI, then run:

```text
/pet
```

The integration only writes state labels such as `running`, `waiting`, `failed`, and `review`. It does not read prompt text, source code, diffs, or Copilot CLI transcript contents.
