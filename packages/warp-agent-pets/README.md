# Warp Agent Pets

Warp Agent Pets connects Warp Agent Mode to the Agent Pets desktop companion through MCP.

Install from the workspace where you use Warp:

```bash
agent-pets-warp-install
```

The installer writes a project MCP config at `.warp/.mcp.json`:

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

Warp can then call the `launch_agent_pets` and `update_agent_pets_status` MCP tools from Agent Mode.

For a `/pet` entry point, create a saved prompt in Warp Drive named `pet` with instructions like:

```text
Launch Agent Pets with the launch_agent_pets MCP tool, then update status with high-level state only.
Do not read, summarize, or print prompt or response history.
```

Warp currently documents MCP through `.warp/.mcp.json`, but it does not document a local file format for installing saved prompt slash commands. This package does not write undocumented Warp Drive files.

Agent Pets stays local-first. It does not upload prompts, source code, or terminal output.
