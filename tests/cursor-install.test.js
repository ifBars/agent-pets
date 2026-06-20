const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { installCursorMcp } = require("../bin/agent-pets-cursor-install.cjs");

describe("cursor mcp installer", () => {
  test("merges agent-pets into cursor mcp config", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-cursor-"));
    const configPath = path.join(root, ".cursor", "mcp.json");
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify({ mcpServers: { existing: { command: "node", args: ["server.js"] } } }));

    const result = await installCursorMcp({ configPath });
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));

    expect(config.mcpServers.existing.command).toBe("node");
    expect(config.mcpServers["agent-pets"]).toEqual({
      command: "bunx",
      args: ["@ifbars/agent-pets", "--mcp"],
    });
    expect(result.server.command).toBe("bunx");
  });
});
