#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function getDefaultGooseConfigPath() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Block", "goose", "config", "config.yaml");
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "goose", "config.yaml");
}

function getRecipePath(repoRoot = path.resolve(__dirname, "..")) {
  return path.join(repoRoot, "packages", "goose-agent-pets", "recipes", "pet.yaml");
}

async function installGooseIntegration(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || path.join(__dirname, ".."));
  const configPath = path.resolve(options.configPath || getDefaultGooseConfigPath());
  const recipePath = path.resolve(options.recipePath || getRecipePath(repoRoot));
  let text = "";
  try {
    text = await fs.readFile(configPath, "utf8");
  } catch {
    text = "";
  }

  const withoutManaged = removeManagedBlock(text);
  const block = buildManagedBlock({
    command: options.command || "bunx",
    args: options.args || ["@ifbars/agent-pets", "--mcp"],
    recipePath,
  });
  const next = `${withoutManaged.trimEnd()}${withoutManaged.trimEnd() ? "\n\n" : ""}${block}\n`;
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, next, "utf8");
  return { configPath, recipePath };
}

function buildManagedBlock({ command, args, recipePath }) {
  return [
    "# BEGIN agent-pets managed block",
    "extensions:",
    "  agent-pets:",
    "    bundled: false",
    '    display_name: "Agent Pets"',
    "    enabled: true",
    "    name: agent-pets",
    "    timeout: 300",
    "    type: stdio",
    `    cmd: "${escapeYamlDoubleQuoted(command)}"`,
    "    args:",
    ...args.map((arg) => `      - "${escapeYamlDoubleQuoted(arg)}"`),
    '    description: "Launch and update Agent Pets from Goose"',
    "slash_commands:",
    '  - command: "pet"',
    `    recipe_path: "${escapeYamlDoubleQuoted(recipePath)}"`,
    "# END agent-pets managed block",
  ].join("\n");
}

function removeManagedBlock(text) {
  return String(text || "").replace(/# BEGIN agent-pets managed block[\s\S]*?# END agent-pets managed block\s*/g, "");
}

function escapeYamlDoubleQuoted(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function main() {
  const result = await installGooseIntegration();
  console.log(`Installed Goose Agent Pets integration at ${result.configPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  buildManagedBlock,
  getDefaultGooseConfigPath,
  getRecipePath,
  installGooseIntegration,
  removeManagedBlock,
};
