#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");

function getProjectMcpPath(cwd = process.cwd()) {
  return path.join(cwd, ".mcp.json");
}

function getProjectSettingsPath(cwd = process.cwd()) {
  return path.join(cwd, ".claude", "settings.local.json");
}

function getProjectSkillPath(cwd = process.cwd()) {
  return path.join(cwd, ".claude", "skills", "pet", "SKILL.md");
}

async function installClaudeIntegration(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const mcpPath = path.resolve(options.mcpPath || getProjectMcpPath(cwd));
  const settingsPath = path.resolve(options.settingsPath || getProjectSettingsPath(cwd));
  const skillPath = path.resolve(options.skillPath || getProjectSkillPath(cwd));
  const command = options.command || "bunx";
  const args = options.args || ["@ifbars/agent-pets", "--mcp"];

  const mcp = await readJson(mcpPath);
  const mcpServers = mcp.mcpServers && typeof mcp.mcpServers === "object" ? mcp.mcpServers : {};
  mcpServers["agent-pets"] = { command, args };
  await writeJson(mcpPath, { ...mcp, mcpServers });

  const settings = await readJson(settingsPath);
  const nextSettings = installHookSettings(settings);
  await writeJson(settingsPath, nextSettings);
  await writeText(skillPath, buildClaudePetSkill());

  return { mcpPath, settingsPath, skillPath, server: mcpServers["agent-pets"] };
}

function installHookSettings(settings = {}) {
  const next = { ...settings, hooks: { ...(settings.hooks && typeof settings.hooks === "object" ? settings.hooks : {}) } };
  addHook(next.hooks, "UserPromptSubmit", null, hookCommand("running", "Prompt submitted"));
  addHook(next.hooks, "PreToolUse", ".*", hookCommand("running", "Using a tool"));
  addHook(next.hooks, "PostToolUse", ".*", hookCommand("running", "Tool finished"));
  addHook(next.hooks, "Stop", null, hookCommand("review", "Ready for review"));
  addHook(next.hooks, "StopFailure", null, hookCommand("failed", "Claude Code error"));
  addHook(next.hooks, "SessionEnd", null, hookCommand("idle", "Session ended"));
  return next;
}

function addHook(hooks, event, matcher, hook) {
  const entries = Array.isArray(hooks[event]) ? hooks[event] : [];
  const cleaned = entries
    .map((entry) => ({
      ...entry,
      hooks: Array.isArray(entry?.hooks)
        ? entry.hooks.filter((item) => !(item?.type === "command" && String(item?.command || "").includes("--claude-hook")))
        : [],
    }))
    .filter((entry) => entry.hooks.length > 0);
  const group = matcher ? { matcher, hooks: [hook] } : { hooks: [hook] };
  hooks[event] = [...cleaned, group];
}

function hookCommand(state, detail) {
  return {
    type: "command",
    command: `bunx @ifbars/agent-pets --claude-hook ${shellQuote(state)} ${shellQuote("Claude Code")} ${shellQuote(detail)}`,
    timeout: 10,
  };
}

function buildClaudePetSkill() {
  return `---
name: pet
description: Launch and update the local Agent Pets desktop companion. Use when the user invokes /pet or asks for their desktop pet.
---

Use the agent-pets MCP tools.

1. Call \`launch_agent_pets\` first.
2. Call \`update_agent_pets_status\` with a high-level state such as \`running\`, \`waiting\`, \`failed\`, or \`review\`.
3. Keep status text privacy-safe. Do not include prompt text, source code, secrets, diffs, or private conversation content.
`;
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

function shellQuote(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function main() {
  const result = await installClaudeIntegration();
  console.log(`Installed Claude Code Agent Pets MCP server at ${result.mcpPath}`);
  console.log(`Installed Claude Code Agent Pets hooks at ${result.settingsPath}`);
  console.log(`Installed Claude Code /pet skill at ${result.skillPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  buildClaudePetSkill,
  getProjectMcpPath,
  getProjectSettingsPath,
  getProjectSkillPath,
  installClaudeIntegration,
  installHookSettings,
};
