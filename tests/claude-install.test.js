const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildClaudePetSkill, installClaudeIntegration, installHookSettings } = require("../bin/agent-pets-claude-install.cjs");
const { notifyClaudeStatus } = require("../bin/agent-pets-claude-hook.cjs");

describe("claude code integration", () => {
  test("installs MCP config, hooks, and /pet skill", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-claude-install-"));
    const mcpPath = path.join(dir, ".mcp.json");
    const settingsPath = path.join(dir, ".claude", "settings.local.json");
    const skillPath = path.join(dir, ".claude", "skills", "pet", "SKILL.md");

    const result = await installClaudeIntegration({ mcpPath, settingsPath, skillPath });
    const mcp = JSON.parse(await fs.readFile(mcpPath, "utf8"));
    const settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    const skill = await fs.readFile(skillPath, "utf8");

    expect(result.server.command).toBe("bunx");
    expect(mcp.mcpServers["agent-pets"].args).toEqual(["@ifbars/agent-pets", "--mcp"]);
    expect(settings.hooks.UserPromptSubmit[0].hooks[0].command).toContain("--claude-hook");
    expect(settings.hooks.Stop[0].hooks[0].command).toContain("Ready for review");
    expect(skill).toContain("name: pet");
    expect(skill).toContain("launch_agent_pets");
  });

  test("replaces previous managed hook commands without removing other hooks", () => {
    const settings = installHookSettings({
      hooks: {
        Stop: [
          { hooks: [{ type: "command", command: "echo keep" }, { type: "command", command: "bunx @ifbars/agent-pets --claude-hook old" }] },
        ],
      },
    });

    expect(settings.hooks.Stop).toHaveLength(2);
    expect(settings.hooks.Stop[0].hooks).toEqual([{ type: "command", command: "echo keep" }]);
    expect(settings.hooks.Stop[1].hooks[0].command).toContain("--claude-hook");
  });

  test("hook helper writes the claude status file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-claude-hook-"));
    const file = path.join(dir, "claude-code.json");
    await notifyClaudeStatus({ file, state: "review", detail: "Ready for review" });
    const payload = JSON.parse(await fs.readFile(file, "utf8"));

    expect(payload.state).toBe("review");
    expect(payload.title).toBe("Claude Code");
    expect(payload.detail).toBe("Ready for review");
  });

  test("skill template keeps status privacy-safe", () => {
    expect(buildClaudePetSkill()).toContain("Do not include prompt text");
  });
});
