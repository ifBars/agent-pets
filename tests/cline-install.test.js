const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildClinePetSkill, installClineIntegration } = require("../bin/agent-pets-cline-install.cjs");

describe("cline integration", () => {
  test("installs MCP config and /pet skill", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-cline-"));
    const mcpPath = path.join(dir, "cline_mcp_settings.json");
    const skillPath = path.join(dir, "skills", "pet", "SKILL.md");

    const result = await installClineIntegration({ mcpPath, skillPath });
    const mcp = JSON.parse(await fs.readFile(mcpPath, "utf8"));
    const skill = await fs.readFile(skillPath, "utf8");

    expect(result.server.command).toBe("bunx");
    expect(mcp.mcpServers["agent-pets"].args).toEqual(["@ifbars/agent-pets", "--mcp"]);
    expect(mcp.mcpServers["agent-pets"].disabled).toBe(false);
    expect(skill).toContain("name: pet");
    expect(skill).toContain("launch_agent_pets");
  });

  test("skill template keeps status privacy-safe", () => {
    expect(buildClinePetSkill()).toContain("Do not include prompt text");
  });
});
