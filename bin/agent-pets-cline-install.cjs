#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function getDefaultClineDataDir() {
  return process.env.CLINE_DATA_DIR || path.join(os.homedir(), ".cline", "data");
}

function getDefaultClineMcpPath() {
  return path.join(getDefaultClineDataDir(), "settings", "cline_mcp_settings.json");
}

function getDefaultClineSkillPath() {
  return path.join(os.homedir(), ".cline", "skills", "pet", "SKILL.md");
}

async function installClineIntegration(options = {}) {
  const mcpPath = path.resolve(options.mcpPath || getDefaultClineMcpPath());
  const skillPath = path.resolve(options.skillPath || getDefaultClineSkillPath());
  const config = await readJson(mcpPath);
  const mcpServers = config.mcpServers && typeof config.mcpServers === "object" ? config.mcpServers : {};
  mcpServers["agent-pets"] = {
    command: options.command || "bunx",
    args: options.args || ["@ifbars/agent-pets", "--mcp"],
    disabled: false,
  };
  await writeJson(mcpPath, { ...config, mcpServers });
  await writeText(skillPath, buildClinePetSkill());
  return { mcpPath, skillPath, server: mcpServers["agent-pets"] };
}

function buildClinePetSkill() {
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

async function main() {
  const result = await installClineIntegration();
  console.log(`Installed Cline Agent Pets MCP server at ${result.mcpPath}`);
  console.log(`Installed Cline /pet skill at ${result.skillPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  buildClinePetSkill,
  getDefaultClineDataDir,
  getDefaultClineMcpPath,
  getDefaultClineSkillPath,
  installClineIntegration,
};
