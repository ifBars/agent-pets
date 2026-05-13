const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mapActivityToPetState } = require("./codex.cjs");

const execFileAsync = promisify(execFile);
const VALID_STATES = new Set(["idle", "running", "waiting", "failed", "review"]);

async function readOpenCodeActivity(options = {}) {
  const now = options.now || new Date();
  const runner = options.runner || runOpenCodeSessionList;
  try {
    const sessions = normalizeSessions(await runner(options), now);
    const active = sessions[0] || null;
    return {
      source: "opencode",
      state: active?.state || "idle",
      petState: mapActivityToPetState(active?.state || "idle"),
      active,
      sessions,
      updatedAt: now.toISOString(),
    };
  } catch (error) {
    return emptyActivity(now, error.message);
  }
}

async function runOpenCodeSessionList(options = {}) {
  const maxCount = Number.isFinite(options.maxCount) ? String(options.maxCount) : "8";
  const { stdout } = await execFileAsync("opencode", ["session", "list", "--format", "json", "--max-count", maxCount], {
    windowsHide: true,
    timeout: 10_000,
  });
  return stdout.trim() ? JSON.parse(stdout) : [];
}

function normalizeSessions(output, now = new Date()) {
  const rows = Array.isArray(output) ? output : Array.isArray(output?.sessions) ? output.sessions : [];
  return rows
    .map((item, index) => normalizeSession(item, index, now))
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
}

function normalizeSession(item, index, now) {
  if (!item || typeof item !== "object") return null;
  const updatedAt =
    cleanString(item.updatedAt) ||
    cleanString(item.updated_at) ||
    cleanString(item.time?.updated) ||
    cleanString(item.time?.created) ||
    now.toISOString();
  const title =
    cleanString(item.title) ||
    cleanString(item.name) ||
    cleanString(item.path) ||
    cleanString(item.project) ||
    `OpenCode session ${index + 1}`;
  const detail =
    cleanString(item.detail) ||
    cleanString(item.message) ||
    cleanString(item.summary) ||
    cleanString(item.model) ||
    "OpenCode session activity";
  const state = normalizeState(item.state || item.status, updatedAt, now);
  return {
    id: cleanString(item.id) || cleanString(item.sessionID) || cleanString(item.sessionId) || `opencode-${index}`,
    title,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: detail,
  };
}

function normalizeState(value, updatedAt, now) {
  const state = typeof value === "string" ? value.toLowerCase() : "";
  if (VALID_STATES.has(state)) return state;
  if (["error", "errored", "failed"].includes(state)) return "failed";
  if (["busy", "active", "working", "running"].includes(state)) return "running";
  const ageMs = now.getTime() - new Date(updatedAt).getTime();
  if (Number.isFinite(ageMs) && ageMs < 3 * 60 * 1000) return "running";
  if (Number.isFinite(ageMs) && ageMs < 30 * 60 * 1000) return "review";
  return "idle";
}

function emptyActivity(now, error) {
  return {
    source: "opencode",
    state: "idle",
    petState: "idle",
    active: {
      id: "opencode",
      title: "OpenCode not available",
      detail: error,
      state: "idle",
      petState: "idle",
      updatedAt: now.toISOString(),
      latestEvent: error,
    },
    sessions: [],
    updatedAt: now.toISOString(),
    error,
  };
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

module.exports = {
  normalizeSessions,
  readOpenCodeActivity,
  runOpenCodeSessionList,
};
