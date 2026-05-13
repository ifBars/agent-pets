const fs = require("node:fs/promises");
const path = require("node:path");

const ACTIVE_WINDOW_MS = 90 * 1000;
const REVIEW_WINDOW_MS = 20 * 60 * 1000;

async function readCodexActivity(codexHome, options = {}) {
  const now = options.now || new Date();
  const sessionIndexPath = path.join(codexHome, "session_index.jsonl");
  const entries = await readSessionIndex(sessionIndexPath);
  const recent = entries.slice(-8).reverse();
  const sessions = [];
  for (const entry of recent) {
    const sessionPath = await findSessionPath(codexHome, entry.id);
    const sample = sessionPath ? await readSessionSample(sessionPath) : null;
    sessions.push(classifySession(entry, sessionPath, sample, now));
  }

  const active = sessions.find((item) => item.state === "running" || item.state === "waiting") || sessions[0] || null;
  const aggregateState = active?.state || "idle";
  return {
    source: "codex",
    codexHome,
    state: aggregateState,
    petState: mapActivityToPetState(aggregateState),
    active,
    sessions,
    updatedAt: now.toISOString(),
  };
}

async function readSessionIndex(filePath) {
  let text = "";
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return [];
  }
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseJsonLine(line))
    .filter((entry) => entry && entry.id && entry.updated_at);
}

async function findSessionPath(codexHome, sessionId) {
  const sessionsRoot = path.join(codexHome, "sessions");
  const stack = [sessionsRoot];
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
      else if (entry.isFile() && entry.name.endsWith(".jsonl") && entry.name.includes(sessionId)) return fullPath;
    }
  }
  return null;
}

async function readSessionSample(filePath) {
  let stat = null;
  let text = "";
  try {
    stat = await fs.stat(filePath);
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  const lines = text.split(/\r?\n/).filter(Boolean).slice(-120);
  const records = lines.map((line) => parseJsonLine(line)).filter(Boolean);
  return {
    filePath,
    mtimeMs: stat.mtimeMs,
    records,
  };
}

function classifySession(entry, sessionPath, sample, now) {
  const updatedAt = new Date(entry.updated_at);
  const lastWriteAgeMs = sample ? now.getTime() - sample.mtimeMs : now.getTime() - updatedAt.getTime();
  const latestPayload = findLatestPayload(sample?.records || []);
  const pendingToolCall = hasPendingToolCall(sample?.records || []);
  const requestedInput = latestPayload?.name === "request_user_input" || JSON.stringify(latestPayload || {}).includes("request_user_input");
  const failed = JSON.stringify(latestPayload || {}).toLowerCase().includes("failed");

  let state = "idle";
  if (failed) state = "failed";
  else if (requestedInput) state = "waiting";
  else if (pendingToolCall || lastWriteAgeMs <= ACTIVE_WINDOW_MS) state = "running";
  else if (lastWriteAgeMs <= REVIEW_WINDOW_MS) state = "review";

  return {
    id: entry.id,
    title: entry.thread_name || "Untitled Codex thread",
    updatedAt: updatedAt.toISOString(),
    state,
    petState: mapActivityToPetState(state),
    sessionPath,
    lastWriteAgeMs,
    latestEvent: summarizePayload(latestPayload),
  };
}

function hasPendingToolCall(records) {
  const calls = new Map();
  for (const record of records) {
    const payload = record.payload;
    if (!payload || payload.type !== "function_call") continue;
    calls.set(payload.call_id, true);
  }
  for (const record of records) {
    const payload = record.payload;
    if (!payload || payload.type !== "function_call_output") continue;
    calls.delete(payload.call_id);
  }
  return calls.size > 0;
}

function findLatestPayload(records) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const payload = records[index]?.payload;
    if (payload && typeof payload === "object") return payload;
  }
  return null;
}

function summarizePayload(payload) {
  if (!payload) return null;
  if (payload.type === "function_call") return `tool: ${payload.name || "unknown"}`;
  if (payload.type === "function_call_output") return "tool output";
  if (payload.type === "message") return "message";
  if (payload.type) return payload.type;
  return null;
}

function mapActivityToPetState(state) {
  if (state === "running") return "running";
  if (state === "waiting") return "waiting";
  if (state === "failed") return "failed";
  if (state === "review") return "review";
  return "idle";
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

module.exports = {
  readCodexActivity,
  readSessionIndex,
  findSessionPath,
  classifySession,
  mapActivityToPetState,
};
