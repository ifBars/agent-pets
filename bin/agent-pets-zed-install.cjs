#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function getDefaultZedSettingsPath() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Zed", "settings.json");
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "zed", "settings.json");
}

async function installZedIntegration(options = {}) {
  const settingsPath = path.resolve(options.settingsPath || getDefaultZedSettingsPath());
  const settings = await readJson(settingsPath);
  const contextServers = settings.context_servers && typeof settings.context_servers === "object" ? settings.context_servers : {};
  contextServers["agent-pets"] = {
    command: options.command || "bunx",
    args: options.args || ["@ifbars/agent-pets", "--mcp"],
    env: options.env || {},
  };
  await writeJson(settingsPath, { ...settings, context_servers: contextServers });
  return { settingsPath, server: contextServers["agent-pets"] };
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
  const result = await installZedIntegration();
  console.log(`Installed Zed Agent Pets context server at ${result.settingsPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  getDefaultZedSettingsPath,
  installZedIntegration,
};
