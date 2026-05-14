#!/usr/bin/env node

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function getDefaultOpenCodeConfigPath() {
  return path.join(getDefaultOpenCodeConfigDir(), "opencode.json");
}

function getDefaultOpenCodeTuiConfigPath() {
  return path.join(getDefaultOpenCodeConfigDir(), "tui.json");
}

function getDefaultOpenCodeConfigDir() {
  const configDir =
    process.env.OPENCODE_CONFIG_DIR ||
    (process.platform === "win32"
      ? path.join(os.homedir(), ".config", "opencode")
      : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "opencode"));
  return configDir;
}

function buildLocalPluginEntries(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || path.join(__dirname, ".."));
  return [pathToFileURL(path.join(repoRoot, "packages", "opencode-agent-pets")).href];
}

async function installLocalOpenCodePlugin(options = {}) {
  const configPath = path.resolve(options.configPath || getDefaultOpenCodeConfigPath());
  const tuiConfigPath = path.resolve(options.tuiConfigPath || getDefaultOpenCodeTuiConfigPath());
  const config = await readConfig(configPath);
  const tuiConfig = await readConfig(tuiConfigPath);
  const nextEntries = buildLocalPluginEntries(options);
  const plugin = removeAgentPetsEntries(config.plugin);
  const tuiPlugin = removeAgentPetsEntries(tuiConfig.plugin);
  plugin.push(...nextEntries);
  if (options.includeTui !== false) tuiPlugin.push(...nextEntries);
  config.$schema = config.$schema || "https://opencode.ai/config.json";
  config.plugin = plugin;
  tuiConfig.plugin = tuiPlugin;
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  if (options.includeTui !== false) {
    await fs.mkdir(path.dirname(tuiConfigPath), { recursive: true });
    await fs.writeFile(tuiConfigPath, `${JSON.stringify(tuiConfig, null, 2)}\n`, "utf8");
  }
  return {
    configPath,
    tuiConfigPath: options.includeTui === false ? null : tuiConfigPath,
    pluginCount: plugin.length,
    tuiPluginCount: options.includeTui === false ? 0 : tuiPlugin.length,
    entries: nextEntries,
  };
}

async function readConfig(configPath) {
  try {
    return JSON.parse(await fs.readFile(configPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function isAgentPetsEntry(entry) {
  const spec = Array.isArray(entry) ? entry[0] : entry;
  return typeof spec === "string" && (spec.includes("opencode-agent-pets") || spec.includes("agent-pets"));
}

function removeAgentPetsEntries(plugin) {
  return Array.isArray(plugin) ? plugin.filter((entry) => !isAgentPetsEntry(entry)) : [];
}

async function main() {
  const result = await installLocalOpenCodePlugin({
    includeTui: !process.argv.includes("--server-only"),
  });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildLocalPluginEntries,
  getDefaultOpenCodeConfigPath,
  getDefaultOpenCodeTuiConfigPath,
  installLocalOpenCodePlugin,
};
