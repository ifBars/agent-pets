const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildHookConfig, buildPetSkill, installCopilotIntegration } = require("../bin/agent-pets-copilot-install.cjs");
const { notifyCopilotStatus } = require("../bin/agent-pets-copilot-hook.cjs");

describe("copilot integration", () => {
  test("installs MCP config, hooks, and /pet skill", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-copilot-install-"));
    const mcpPath = path.join(dir, "mcp-config.json");
    const hookPath = path.join(dir, "hooks", "agent-pets.json");
    const skillPath = path.join(dir, "skills", "pet", "SKILL.md");

    const result = await installCopilotIntegration({ mcpPath, hookPath, skillPath });
    const mcp = JSON.parse(await fs.readFile(mcpPath, "utf8"));
    const hooks = JSON.parse(await fs.readFile(hookPath, "utf8"));
    const skill = await fs.readFile(skillPath, "utf8");

    expect(result.server.command).toBe("bunx");
    expect(mcp.mcpServers["agent-pets"].args).toEqual(["@ifbars/agent-pets", "--mcp"]);
    expect(hooks.hooks.sessionStart[0].bash).toContain("--copilot-hook");
    expect(hooks.hooks.agentStop[0].powershell).toContain("Ready for input");
    expect(skill).toContain("name: pet");
    expect(skill).toContain("launch_agent_pets");
  });

  test("hook helper writes the copilot status file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-copilot-hook-"));
    const file = path.join(dir, "copilot-cli.json");
    await notifyCopilotStatus({ file, state: "waiting", detail: "Ready for input" });
    const payload = JSON.parse(await fs.readFile(file, "utf8"));

    expect(payload.state).toBe("waiting");
    expect(payload.title).toBe("GitHub Copilot CLI");
    expect(payload.detail).toBe("Ready for input");
  });

  test("templates include documented Copilot CLI surfaces", () => {
    expect(buildHookConfig().hooks.sessionStart[0].type).toBe("command");
    expect(buildPetSkill()).toContain("user-invocable: true");
  });
});
