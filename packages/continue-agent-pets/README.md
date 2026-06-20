# continue-agent-pets

Continue integration for [Agent Pets](https://github.com/ifBars/agent-pets).

## Install

```bash
agent-pets-continue-install
```

The installer writes `.continue/mcpServers/agent-pets.yaml` in the current workspace.

Continue currently exposes this as an MCP tool surface in agent mode rather than a dedicated `/pet` slash command. Ask Continue to launch Agent Pets or update the pet status, and it can call the `agent-pets` MCP tools.

The MCP instructions are privacy-safe: send only high-level state, not prompt text, source code, diffs, or private conversation content.
