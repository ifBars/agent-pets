const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { handleMessage, writeStatusFile } = require("../bin/agent-pets-mcp.cjs");

describe("agent pets mcp server", () => {
  test("lists launch and status tools", async () => {
    const response = await handleMessage({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const names = response.result.tools.map((tool) => tool.name);
    expect(names).toContain("launch_agent_pets");
    expect(names).toContain("update_agent_pets_status");
  });

  test("handles status tool calls without exposing transcript content", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-mcp-"));
    const statusFile = path.join(dir, "mcp.json");
    const response = await handleMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "update_agent_pets_status",
        arguments: {
          statusFile,
          state: "waiting",
          title: "Cursor Agent",
          detail: "Needs approval",
        },
      },
    });

    expect(response.result.content[0].text).toContain("waiting");
    const payload = JSON.parse(await fs.readFile(statusFile, "utf8"));
    expect(payload.state).toBe("waiting");
    expect(payload.title).toBe("Cursor Agent");
    expect(payload.detail).toBe("Needs approval");
  });

  test("normalizes status file writes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-mcp-"));
    const result = await writeStatusFile(path.join(dir, "status.json"), {
      state: "streaming",
      title: "MCP Agent",
      detail: "Working",
    });
    expect(result.payload.state).toBe("running");
  });
});
