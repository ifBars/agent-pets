const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { getDefaultWarpMcpPath, installWarpIntegration } = require("../bin/agent-pets-warp-install.cjs");

describe("warp integration", () => {
  test("resolves the project MCP config path", () => {
    expect(getDefaultWarpMcpPath(path.join("tmp", "project"))).toBe(path.join("tmp", "project", ".warp", ".mcp.json"));
  });

  test("installs agent-pets as a Warp MCP server", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-warp-"));
    const configPath = path.join(dir, ".warp", ".mcp.json");
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify({ mcpServers: { existing: { command: "node", args: ["server.js"] } } }));

    const result = await installWarpIntegration({ cwd: dir });
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));

    expect(result.configPath).toBe(configPath);
    expect(result.server.command).toBe("bunx");
    expect(config.mcpServers.existing.command).toBe("node");
    expect(config.mcpServers["agent-pets"]).toEqual({
      command: "bunx",
      args: ["@ifbars/agent-pets", "--mcp"],
    });
  });
});
