#!/usr/bin/env node
const { writeStatusFile } = require("../build/src/main/status-writer.js");

function defaultAiderStatusFile() {
  if (process.platform === "win32") {
    const path = require("node:path");
    const os = require("node:os");
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "aider.json");
  }
  const path = require("node:path");
  const os = require("node:os");
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "aider.json");
}

async function notifyAiderReady(options = {}) {
  const file = options.file || process.env.AGENT_PETS_AIDER_STATUS_FILE || defaultAiderStatusFile();
  return writeStatusFile(file, {
    state: options.state || "waiting",
    title: options.title || "Aider",
    detail: options.detail || "Ready for input",
  });
}

async function main() {
  const result = await notifyAiderReady();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  defaultAiderStatusFile,
  notifyAiderReady,
};
