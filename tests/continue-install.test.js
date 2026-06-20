const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildContinueMcpBlock, installContinueIntegration } = require("../bin/agent-pets-continue-install.cjs");

describe("continue integration", () => {
  test("installs workspace MCP block", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-continue-"));
    const configPath = path.join(dir, ".continue", "mcpServers", "agent-pets.yaml");

    const result = await installContinueIntegration({ configPath });
    const yaml = await fs.readFile(configPath, "utf8");

    expect(result.command).toBe("bunx");
    expect(yaml).toContain("schema: v1");
    expect(yaml).toContain("mcpServers:");
    expect(yaml).toContain('command: "bunx"');
    expect(yaml).toContain('- "@ifbars/agent-pets"');
    expect(yaml).toContain('- "--mcp"');
  });

  test("mcp block template is a standalone Continue block", () => {
    const yaml = buildContinueMcpBlock({ command: "bunx", args: ["@ifbars/agent-pets", "--mcp"] });
    expect(yaml).toContain("name: Agent Pets MCP");
    expect(yaml).toContain("type: stdio");
  });
});
