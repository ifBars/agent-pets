#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");

function getDefaultWarpMcpPath(cwd = process.cwd()) {
  return path.join(cwd, ".warp", ".mcp.json");
}

async function installWarpIntegration(options = {}) {
  const configPath = path.resolve(options.configPath || getDefaultWarpMcpPath(options.cwd));
  const config = await readJson(configPath);
  const mcpServers = config.mcpServers && typeof config.mcpServers === "object" ? config.mcpServers : {};
  mcpServers["agent-pets"] = {
    command: options.command || "bunx",
    args: options.args || ["@ifbars/agent-pets", "--mcp"],
  };
  await writeJson(configPath, { ...config, mcpServers });
  return { configPath, server: mcpServers["agent-pets"] };
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

async function main() {
  const result = await installWarpIntegration();
  console.log(`Installed Warp Agent Pets MCP server at ${result.configPath}`);
  console.log("In Warp Drive, save a /pet prompt that calls launch_agent_pets and update_agent_pets_status.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  getDefaultWarpMcpPath,
  installWarpIntegration,
};
