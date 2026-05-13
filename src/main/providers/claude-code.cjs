const path = require("node:path");
const { aggregateActivity, cleanString, findRecentFiles, normalizeState, readJsonlTail } = require("./shared.cjs");
const { mapActivityToPetState } = require("./codex.cjs");

async function readClaudeCodeActivity(options = {}) {
  const now = options.now || new Date();
  const claudeHome = options.claudeHome || path.join(process.env.USERPROFILE || process.env.HOME || "", ".claude");
  const projectsRoot = options.projectsRoot || path.join(claudeHome, "projects");
  try {
    const files = await findRecentFiles(projectsRoot, (_fullPath, name) => name.endsWith(".jsonl"), 8);
    const sessions = [];
    for (const file of files) {
      const records = await readJsonlTail(file.filePath);
      sessions.push(normalizeClaudeSession(file, records, now));
    }
    return aggregateActivity("claude-code", sessions, now, { claudeHome });
  } catch (error) {
    return aggregateActivity("claude-code", [], now, { claudeHome, error: error.message });
  }
}

function normalizeClaudeSession(file, records, now) {
  const latest = findLatestRecord(records);
  const sessionId = cleanString(latest?.sessionId) || path.basename(file.filePath, ".jsonl");
  const cwd = cleanString(latest?.cwd);
  const title = cwd ? path.basename(cwd) || cwd : path.basename(path.dirname(file.filePath));
  const updatedAt = cleanString(latest?.timestamp) || new Date(file.stat.mtimeMs).toISOString();
  const recentRecords = records.slice(-12);
  const error = recentRecords.some((record) => record.error || record.isApiErrorMessage);
  const state = error ? "failed" : normalizeClaudeState(latest, updatedAt, now);
  const latestEvent = summarizeClaudeRecord(latest);
  return {
    id: sessionId,
    title: title || "Claude Code session",
    detail: latestEvent,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    sessionPath: file.filePath,
    latestEvent,
  };
}

function findLatestRecord(records) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index] && typeof records[index] === "object") return records[index];
  }
  return null;
}

function summarizeClaudeRecord(record) {
  if (!record) return "Claude Code session activity";
  if (record.error || record.isApiErrorMessage) return "error";
  if (record.type === "user") return "user message";
  if (record.type === "assistant") return "assistant response";
  if (record.type === "system") return "system event";
  if (record.type) return record.type;
  return "Claude Code session activity";
}

function normalizeClaudeState(record, updatedAt, now) {
  if (record?.type === "assistant") return normalizeState("completed", updatedAt, now);
  if (record?.type === "user") return normalizeState("running", updatedAt, now);
  return normalizeState(record?.status || record?.type, updatedAt, now);
}

module.exports = {
  normalizeClaudeState,
  normalizeClaudeSession,
  readClaudeCodeActivity,
};
