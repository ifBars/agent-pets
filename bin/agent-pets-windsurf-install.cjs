#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function getDefaultWindsurfMcpPath() {
  return path.join(os.homedir(), ".codeium", "windsurf", "mcp_config.json");
}

function getDefaultWindsurfWorkflowPath(cwd = process.cwd()) {
  return path.join(cwd, ".windsurf", "workflows", "pet.md");
}

async function installWindsurfIntegration(options = {}) {
  const mcpPath = path.resolve(options.mcpPath || getDefaultWindsurfMcpPath());
  const workflowPath = path.resolve(options.workflowPath || getDefaultWindsurfWorkflowPath(options.cwd || process.cwd()));
  const config = await readJson(mcpPath);
  const mcpServers = config.mcpServers && typeof config.mcpServers === "object" ? config.mcpServers : {};
  mcpServers["agent-pets"] = {
    command: options.command || "bunx",
    args: options.args || ["@ifbars/agent-pets", "--mcp"],
  };
  await writeJson(mcpPath, { ...config, mcpServers });
  await writeText(workflowPath, buildWindsurfPetWorkflow());
  return { mcpPath, workflowPath, server: mcpServers["agent-pets"] };
}

function buildWindsurfPetWorkflow() {
  return `---
title: pet
description: Launch and update the local Agent Pets desktop companion.
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
  const result = await installWindsurfIntegration();
  console.log(`Installed Windsurf Agent Pets MCP server at ${result.mcpPath}`);
  console.log(`Installed Windsurf /pet workflow at ${result.workflowPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  buildWindsurfPetWorkflow,
  getDefaultWindsurfMcpPath,
  getDefaultWindsurfWorkflowPath,
  installWindsurfIntegration,
};
