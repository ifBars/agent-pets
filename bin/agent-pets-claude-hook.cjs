#!/usr/bin/env node
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const VALID_STATES = new Set(["idle", "running", "waiting", "failed", "review"]);

function defaultClaudeStatusFile() {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "claude-code.json");
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "claude-code.json");
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

async function notifyClaudeStatus(options = {}) {
  const file = path.resolve(options.file || process.env.AGENT_PETS_CLAUDE_STATUS_FILE || defaultClaudeStatusFile());
  const payload = {
    state: normalizeState(options.state || "running"),
    title: options.title || "Claude Code",
    detail: options.detail || "Claude Code activity",
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { file, payload };
}

async function main() {
  const [, , state, title, detail] = process.argv;
  const result = await notifyClaudeStatus({ state, title, detail });
  console.log(`Updated Claude Code Agent Pets status at ${result.file}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  defaultClaudeStatusFile,
  normalizeState,
  notifyClaudeStatus,
};
