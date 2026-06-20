# cursor-agent-pets

Cursor integration notes for [Agent Pets](https://github.com/ifBars/agent-pets).

Agent Pets exposes a local stdio MCP server with tools for launching the desktop pet and updating privacy-safe status.

## Install

Install the MCP server in Cursor:

```bash
agent-pets-cursor-install
```

This writes an `agent-pets` server entry to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agent-pets": {
      "command": "bunx",
      "args": ["@ifbars/agent-pets", "--mcp"]
    }
  }
}
```

Restart Cursor or reload MCP servers, then ask Agent to use the `agent-pets` MCP tools.

## Tools

- `launch_agent_pets`: starts Agent Pets in JSON status mode.
- `update_agent_pets_status`: writes high-level status such as `running`, `waiting`, `failed`, or `review`.

Do not send prompt text, source code, secrets, or long transcript content as status details.
