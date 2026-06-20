#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");

function getDefaultContinueMcpPath(cwd = process.cwd()) {
  return path.join(cwd, ".continue", "mcpServers", "agent-pets.yaml");
}

async function installContinueIntegration(options = {}) {
  const configPath = path.resolve(options.configPath || getDefaultContinueMcpPath(options.cwd || process.cwd()));
  const command = options.command || "bunx";
  const args = options.args || ["@ifbars/agent-pets", "--mcp"];
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, buildContinueMcpBlock({ command, args }), "utf8");
  return { configPath, command, args };
}

function buildContinueMcpBlock({ command, args }) {
  return [
    "name: Agent Pets MCP",
    "version: 0.0.1",
    "schema: v1",
    "mcpServers:",
    "  - name: Agent Pets",
    "    type: stdio",
    `    command: ${quoteYaml(command)}`,
    "    args:",
    ...args.map((arg) => `      - ${quoteYaml(arg)}`),
    "",
  ].join("\n");
}

function quoteYaml(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function main() {
  const result = await installContinueIntegration();
  console.log(`Installed Continue Agent Pets MCP block at ${result.configPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  buildContinueMcpBlock,
  getDefaultContinueMcpPath,
  installContinueIntegration,
};
