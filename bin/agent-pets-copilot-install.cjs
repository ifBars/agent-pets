#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function getDefaultCopilotHome() {
  return process.env.COPILOT_HOME || path.join(os.homedir(), ".copilot");
}

function getDefaultCopilotMcpPath() {
  return path.join(getDefaultCopilotHome(), "mcp-config.json");
}

function getDefaultCopilotHookPath() {
  return path.join(getDefaultCopilotHome(), "hooks", "agent-pets.json");
}

function getDefaultCopilotSkillPath() {
  return path.join(getDefaultCopilotHome(), "skills", "pet", "SKILL.md");
}

async function installCopilotIntegration(options = {}) {
  const command = options.command || "bunx";
  const args = options.args || ["@ifbars/agent-pets", "--mcp"];
  const mcpPath = path.resolve(options.mcpPath || getDefaultCopilotMcpPath());
  const hookPath = path.resolve(options.hookPath || getDefaultCopilotHookPath());
  const skillPath = path.resolve(options.skillPath || getDefaultCopilotSkillPath());

  const config = await readJson(mcpPath);
  const mcpServers = config.mcpServers && typeof config.mcpServers === "object" ? config.mcpServers : {};
  mcpServers["agent-pets"] = { command, args };
  await writeJson(mcpPath, { ...config, mcpServers });
  await writeJson(hookPath, buildHookConfig());
  await writeText(skillPath, buildPetSkill());

  return { mcpPath, hookPath, skillPath, server: mcpServers["agent-pets"] };
}

function buildHookConfig() {
  return {
    version: 1,
    hooks: {
      sessionStart: [hookCommand("running", "Session started")],
      userPromptSubmitted: [hookCommand("running", "Prompt submitted")],
      preToolUse: [hookCommand("running", "Using a tool")],
      postToolUse: [hookCommand("running", "Tool finished")],
      agentStop: [hookCommand("waiting", "Ready for input")],
      sessionEnd: [hookCommand("idle", "Session ended")],
      errorOccurred: [hookCommand("failed", "Error reported")],
    },
  };
}

function hookCommand(state, detail) {
  const bashDetail = shellQuote(detail);
  const psDetail = powershellQuote(detail);
  return {
    type: "command",
    bash: `bunx @ifbars/agent-pets --copilot-hook ${shellQuote(state)} ${shellQuote("GitHub Copilot CLI")} ${bashDetail}`,
    powershell: `bunx @ifbars/agent-pets --copilot-hook ${powershellQuote(state)} ${powershellQuote("GitHub Copilot CLI")} ${psDetail}`,
    timeoutSec: 10,
  };
}

function buildPetSkill() {
  return `---
name: pet
description: Launch and update the local Agent Pets desktop companion.
user-invocable: true
---

When the user invokes this skill, use the agent-pets MCP tools.

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
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function powershellQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const result = await installCopilotIntegration();
  console.log(`Installed GitHub Copilot CLI Agent Pets MCP server at ${result.mcpPath}`);
  console.log(`Installed GitHub Copilot CLI Agent Pets hooks at ${result.hookPath}`);
  console.log(`Installed GitHub Copilot CLI /pet skill at ${result.skillPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  buildHookConfig,
  buildPetSkill,
  getDefaultCopilotHome,
  getDefaultCopilotHookPath,
  getDefaultCopilotMcpPath,
  getDefaultCopilotSkillPath,
  installCopilotIntegration,
};
