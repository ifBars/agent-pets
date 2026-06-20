#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function getDefaultCursorMcpPath() {
  return path.join(os.homedir(), ".cursor", "mcp.json");
}

async function installCursorMcp(options = {}) {
  const configPath = path.resolve(options.configPath || getDefaultCursorMcpPath());
  const config = await readJson(configPath);
  const mcpServers = config.mcpServers && typeof config.mcpServers === "object" ? config.mcpServers : {};
  mcpServers["agent-pets"] = {
    command: options.command || "bunx",
    args: options.args || ["@ifbars/agent-pets", "--mcp"],
  };
  const next = { ...config, mcpServers };
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return { configPath, server: mcpServers["agent-pets"] };
}

async function main() {
  const result = await installCursorMcp();
  console.log(`Installed Cursor MCP server "agent-pets" at ${result.configPath}`);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  getDefaultCursorMcpPath,
  installCursorMcp,
};
