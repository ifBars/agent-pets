const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mapActivityToPetState } = require("./codex.cjs");

const execFileAsync = promisify(execFile);
const VALID_STATES = new Set(["idle", "running", "waiting", "failed", "review"]);

async function execJson(command, args, options = {}) {
  const { stdout } = await execFileAsync(command, args, {
    windowsHide: true,
    timeout: options.timeout || 10_000,
    cwd: options.cwd,
  });
  return stdout.trim() ? JSON.parse(stdout) : [];
}

function aggregateActivity(source, sessions, now = new Date(), extra = {}) {
  const active = sessions.find((item) => item.state === "running" || item.state === "waiting") || sessions[0] || null;
  const state = active?.state || "idle";
  return {
    source,
    state,
    petState: mapActivityToPetState(state),
    active,
    sessions,
    updatedAt: now.toISOString(),
    ...extra,
  };
}

function normalizeState(value, updatedAt, now = new Date()) {
  const state = typeof value === "string" ? value.toLowerCase() : "";
  if (VALID_STATES.has(state)) return state;
  if (["error", "errored", "fail", "failed", "crashed"].includes(state)) return "failed";
  if (["busy", "active", "working", "running", "streaming"].includes(state)) return "running";
  if (["blocked", "needs-input", "waiting", "paused"].includes(state)) return "waiting";
  if (["complete", "completed", "done", "finished", "success", "succeeded", "review"].includes(state)) return "review";
  const ageMs = now.getTime() - new Date(updatedAt).getTime();
  if (Number.isFinite(ageMs) && ageMs < 3 * 60 * 1000) return "running";
  if (Number.isFinite(ageMs) && ageMs < 30 * 60 * 1000) return "review";
  return "idle";
}

function normalizeCommandSessions(output, source, now = new Date()) {
  const rows = Array.isArray(output) ? output : Array.isArray(output?.sessions) ? output.sessions : [];
  return rows
    .map((item, index) => normalizeCommandSession(item, index, source, now))
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
}

function normalizeCommandSession(item, index, source, now) {
  if (!item || typeof item !== "object") return null;
  const updatedAt =
    cleanString(item.updatedAt) ||
    cleanString(item.updated_at) ||
    cleanString(item.modifiedAt) ||
    timestampString(item.updated) ||
    timestampString(item.created) ||
    timestampString(item.time_updated) ||
    timestampString(item.time_created) ||
    cleanString(item.time?.updated) ||
    cleanString(item.time?.created) ||
    now.toISOString();
  const title =
    cleanString(item.title) ||
    cleanString(item.name) ||
    cleanString(item.path) ||
    cleanString(item.project) ||
    `${source} session ${index + 1}`;
  const detail =
    cleanString(item.detail) ||
    cleanString(item.message) ||
    cleanString(item.summary) ||
    cleanString(item.model) ||
    `${source} session activity`;
  const state = normalizeState(item.state || item.status, updatedAt, now);
  return {
    id: cleanString(item.id) || cleanString(item.sessionID) || cleanString(item.sessionId) || `${source}-${index}`,
    title,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: detail,
  };
}

async function findRecentFiles(rootDir, predicate, limit = 8) {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile() && predicate(fullPath, entry.name)) {
        try {
          const stat = await fs.stat(fullPath);
          files.push({ filePath: fullPath, stat });
        } catch {
          // Ignore races from active session writers.
        }
      }
    }
  }
  return files.sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs).slice(0, limit);
}

async function readJsonlTail(filePath, limit = 120) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return text
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .map((line) => parseJsonLine(line))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function timestampString(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

module.exports = {
  VALID_STATES,
  aggregateActivity,
  cleanString,
  execJson,
  findRecentFiles,
  normalizeCommandSessions,
  normalizeState,
  readJsonlTail,
  timestampString,
};
