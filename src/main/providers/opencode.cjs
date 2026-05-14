const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { aggregateActivity, cleanString, execJson, normalizeCommandSessions, normalizeState, timestampString } = require("./shared.cjs");
const { mapActivityToPetState } = require("./codex.cjs");

async function readOpenCodeActivity(options = {}) {
  const now = options.now || new Date();
  const runner = options.runner || runOpenCodeSessionList;
  const bridgeSessions = await readOpenCodeBridgeSessions(options, now);
  try {
    const sessions = mergeOpenCodeSessions(bridgeSessions, normalizeSessions(await runner(options), now));
    return aggregateActivity("opencode", sessions, now);
  } catch (error) {
    if (bridgeSessions.length > 0) return aggregateActivity("opencode", bridgeSessions, now);
    return aggregateActivity("opencode", [], now, { error: error.message });
  }
}

async function runOpenCodeSessionList(options = {}) {
  const maxCount = Number.isFinite(options.maxCount) ? String(options.maxCount) : "8";
  try {
    return await runOpenCodeDbSessionList(maxCount, options);
  } catch {
    return execJson("opencode", ["session", "list", "--format", "json", "--max-count", maxCount], options);
  }
}

function runOpenCodeDbSessionList(maxCount, options = {}) {
  const limit = Math.max(1, Math.min(50, Number(maxCount) || 8));
  const query = `
select
  s.id,
  s.title,
  s.directory,
  s.project_id,
  s.time_created,
  s.time_updated,
  s.time_archived,
  m.data as message_data,
  p.data as part_data
from session s
left join message m on m.id = (
  select id from message where session_id = s.id order by time_updated desc limit 1
)
left join part p on p.id = (
  select id from part where session_id = s.id order by time_updated desc limit 1
)
where s.time_archived is null
order by s.time_updated desc
limit ${limit}`;
  return execJson("opencode", ["db", "--format", "json", query], options);
}

function normalizeSessions(output, now = new Date()) {
  const rows = Array.isArray(output) ? output : Array.isArray(output?.sessions) ? output.sessions : [];
  if (rows.some((item) => item && ("time_updated" in item || "message_data" in item || "part_data" in item))) {
    return rows
      .map((item, index) => normalizeDbSession(item, index, now))
      .filter(Boolean)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 8);
  }
  return normalizeCommandSessions(output, "opencode", now);
}

async function readOpenCodeBridgeSessions(options = {}, now = new Date()) {
  const bridgeFile = cleanString(options.bridgeFile) || cleanString(process.env.AGENT_PETS_OPENCODE_STATUS_FILE) || getDefaultOpenCodeBridgeFile();
  try {
    const parsed = JSON.parse(await fs.readFile(bridgeFile, "utf8"));
    return normalizeOpenCodeBridgeSessions(parsed, now);
  } catch {
    return [];
  }
}

function getDefaultOpenCodeBridgeFile() {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "opencode.json");
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "opencode.json");
}

function normalizeOpenCodeBridgeSessions(payload, now = new Date()) {
  if (!payload || typeof payload !== "object") return [];
  const rows = Array.isArray(payload.sessions) ? payload.sessions : Array.isArray(payload.items) ? payload.items : [];
  return rows
    .map((item, index) => normalizeOpenCodeBridgeSession(item, index, now))
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
}

function normalizeOpenCodeBridgeSession(item, index, now) {
  if (!item || typeof item !== "object") return null;
  const updatedAt = cleanString(item.updatedAt) || now.toISOString();
  const state = normalizeBridgeState(item.state, updatedAt, now);
  const detail = cleanString(item.detail) || cleanString(item.latestEvent) || "OpenCode plugin activity";
  return {
    id: cleanString(item.id) || cleanString(item.sessionID) || cleanString(item.sessionId) || `opencode-plugin-${index}`,
    title: cleanString(item.title) || cleanString(item.cwd) || `OpenCode session ${index + 1}`,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: detail,
    directory: cleanString(item.cwd) || cleanString(item.directory),
    projectId: cleanString(item.projectId) || cleanString(item.project_id),
    source: "opencode-plugin",
  };
}

function normalizeBridgeState(value, updatedAt, now) {
  const state = cleanString(value)?.toLowerCase() || "";
  if (state === "running" || state === "waiting") {
    const ageMs = now.getTime() - new Date(updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs > 30 * 60 * 1000) return "idle";
    if (Number.isFinite(ageMs) && ageMs > 5 * 60 * 1000) return "review";
    return state;
  }
  return normalizeState(state, updatedAt, now);
}

function mergeOpenCodeSessions(preferredSessions, fallbackSessions) {
  const merged = [];
  const seen = new Set();
  for (const session of [...preferredSessions, ...fallbackSessions]) {
    if (!session || seen.has(session.id)) continue;
    seen.add(session.id);
    merged.push(session);
  }
  return merged
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
}

function normalizeDbSession(item, index, now) {
  if (!item || typeof item !== "object") return null;
  const message = parseJson(item.message_data);
  const part = parseJson(item.part_data);
  const updatedAt = timestampString(item.time_updated) || timestampString(item.updated) || now.toISOString();
  const title = cleanString(item.title) || cleanString(item.directory) || `OpenCode session ${index + 1}`;
  const detail = summarizeOpenCodeEvent(message, part);
  const state = classifyOpenCodeState(message, part, updatedAt, now);
  return {
    id: cleanString(item.id) || `opencode-${index}`,
    title,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: detail,
    directory: cleanString(item.directory),
    projectId: cleanString(item.project_id),
  };
}

function classifyOpenCodeState(message, part, updatedAt, now) {
  if (message?.error || part?.error) return "failed";
  if (part?.type === "step-finish") {
    if (part.reason === "error" || part.reason === "failed") return "failed";
    if (part.reason === "stop") return "review";
    return normalizeState("running", updatedAt, now);
  }
  if (message?.time?.completed || message?.finish === "stop") return "review";
  if (message?.role === "assistant" && !message?.time?.completed) return normalizeState("running", updatedAt, now);
  if (message?.role === "user") return normalizeState("running", updatedAt, now);
  return normalizeState(null, updatedAt, now);
}

function summarizeOpenCodeEvent(message, part) {
  if (message?.error || part?.error) return "error";
  if (part?.type === "step-finish") return part.reason ? `finished: ${part.reason}` : "finished";
  if (part?.type === "tool") return "tool";
  if (part?.type === "text") return "response text";
  if (part?.type) return part.type;
  if (message?.role === "assistant") return message?.time?.completed ? "assistant response" : "assistant running";
  if (message?.role === "user") return "user message";
  return "OpenCode session activity";
}

function parseJson(value) {
  if (!cleanString(value)) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

module.exports = {
  classifyOpenCodeState,
  getDefaultOpenCodeBridgeFile,
  mergeOpenCodeSessions,
  normalizeDbSession,
  normalizeOpenCodeBridgeSessions,
  normalizeSessions,
  readOpenCodeActivity,
  readOpenCodeBridgeSessions,
  runOpenCodeDbSessionList,
  runOpenCodeSessionList,
};
