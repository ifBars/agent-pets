const { aggregateActivity, cleanString, execJson, normalizeCommandSessions, normalizeState, timestampString } = require("./shared.cjs");
const { mapActivityToPetState } = require("./codex.cjs");

async function readOpenCodeActivity(options = {}) {
  const now = options.now || new Date();
  const runner = options.runner || runOpenCodeSessionList;
  try {
    const sessions = normalizeSessions(await runner(options), now);
    return aggregateActivity("opencode", sessions, now);
  } catch (error) {
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
  normalizeDbSession,
  normalizeSessions,
  readOpenCodeActivity,
  runOpenCodeDbSessionList,
  runOpenCodeSessionList,
};
