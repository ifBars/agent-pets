#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

function getDefaultGeminiCommandsDir() {
  const geminiHome = process.env.GEMINI_DIR || path.join(os.homedir(), ".gemini");
  return path.join(geminiHome, "commands");
}

function getTemplatePath(repoRoot = path.resolve(__dirname, "..")) {
  return path.join(repoRoot, "packages", "gemini-agent-pets", "commands", "pet.toml");
}

async function installGeminiCommand(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || path.join(__dirname, ".."));
  const commandsDir = path.resolve(options.commandsDir || getDefaultGeminiCommandsDir());
  const commandPath = path.join(commandsDir, "pet.toml");
  const template = await fs.readFile(options.templatePath || getTemplatePath(repoRoot), "utf8");
  await fs.mkdir(commandsDir, { recursive: true });
  await fs.writeFile(commandPath, template, "utf8");
  return { commandPath };
}

async function main() {
  const result = await installGeminiCommand();
  console.log(`Installed Gemini CLI /pet command at ${result.commandPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  getDefaultGeminiCommandsDir,
  getTemplatePath,
  installGeminiCommand,
};
