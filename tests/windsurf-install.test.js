const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildWindsurfPetWorkflow, installWindsurfIntegration } = require("../bin/agent-pets-windsurf-install.cjs");

describe("windsurf integration", () => {
  test("installs MCP config and /pet workflow", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-windsurf-"));
    const mcpPath = path.join(dir, "mcp_config.json");
    const workflowPath = path.join(dir, ".windsurf", "workflows", "pet.md");

    const result = await installWindsurfIntegration({ mcpPath, workflowPath });
    const mcp = JSON.parse(await fs.readFile(mcpPath, "utf8"));
    const workflow = await fs.readFile(workflowPath, "utf8");

    expect(result.server.command).toBe("bunx");
    expect(mcp.mcpServers["agent-pets"].args).toEqual(["@ifbars/agent-pets", "--mcp"]);
    expect(workflow).toContain("title: pet");
    expect(workflow).toContain("launch_agent_pets");
  });

  test("workflow template keeps status privacy-safe", () => {
    expect(buildWindsurfPetWorkflow()).toContain("Do not include prompt text");
  });
});
