#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const VALID_STATES = new Set(["idle", "running", "waiting", "failed", "review"]);

function defaultCopilotStatusFile() {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "copilot-cli.json");
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "copilot-cli.json");
}

function normalizeState(value) {
  const state = typeof value === "string" ? value.toLowerCase() : "";
  if (VALID_STATES.has(state)) return state;
  if (["error", "errored", "fail", "failed"].includes(state)) return "failed";
  if (["busy", "active", "working", "running"].includes(state)) return "running";
  if (["blocked", "needs-input", "waiting", "paused"].includes(state)) return "waiting";
  if (["complete", "completed", "done", "finished", "success", "succeeded"].includes(state)) return "review";
  return "idle";
}

async function notifyCopilotStatus(options = {}) {
  const file = path.resolve(options.file || process.env.AGENT_PETS_COPILOT_STATUS_FILE || defaultCopilotStatusFile());
  const payload = {
    state: normalizeState(options.state || "running"),
    title: options.title || "GitHub Copilot CLI",
    detail: options.detail || "Copilot CLI activity",
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { file, payload };
}

async function main() {
  const [, , state, title, detail] = process.argv;
  const result = await notifyCopilotStatus({ state, title, detail });
  console.log(`Updated GitHub Copilot CLI Agent Pets status at ${result.file}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  defaultCopilotStatusFile,
  normalizeState,
  notifyCopilotStatus,
};
