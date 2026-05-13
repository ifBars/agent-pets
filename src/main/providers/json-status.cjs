const fs = require("node:fs/promises");
const path = require("node:path");
const { mapActivityToPetState } = require("./codex.cjs");

const VALID_STATES = new Set(["idle", "running", "waiting", "failed", "review"]);

async function readJsonStatusActivity(statusFile, options = {}) {
  const now = options.now || new Date();
  const resolved = path.resolve(statusFile);
  let parsed = null;
  let stat = null;
  try {
    stat = await fs.stat(resolved);
    parsed = JSON.parse(await fs.readFile(resolved, "utf8"));
  } catch (error) {
    return emptyActivity(resolved, now, error.message);
  }

  const state = normalizeState(parsed?.state);
  const title = cleanString(parsed?.title) || "External agent";
  const detail = cleanString(parsed?.detail) || cleanString(parsed?.message) || "Status file activity";
  const updatedAt = cleanString(parsed?.updatedAt) || new Date(stat.mtimeMs).toISOString();
  const sessions = normalizeItems(parsed?.items, { title, detail, state, updatedAt });
  const active = sessions[0] || {
    id: "json-status",
    title,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: detail,
  };

  return {
    source: "json-status",
    statusFile: resolved,
    state: active.state,
    petState: mapActivityToPetState(active.state),
    active,
    sessions,
    updatedAt: now.toISOString(),
  };
}

function emptyActivity(statusFile, now, error) {
  return {
    source: "json-status",
    statusFile,
    state: "idle",
    petState: "idle",
    active: {
      id: "json-status",
      title: "Waiting for status file",
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

function normalizeItems(items, fallback) {
  const source = Array.isArray(items) && items.length > 0 ? items : [fallback];
  return source.slice(0, 8).map((item, index) => {
    const state = normalizeState(item?.state);
    const detail = cleanString(item?.detail) || cleanString(item?.message) || fallback.detail;
    return {
      id: cleanString(item?.id) || `json-status-${index}`,
      title: cleanString(item?.title) || fallback.title,
      detail,
      state,
      petState: mapActivityToPetState(state),
      updatedAt: cleanString(item?.updatedAt) || fallback.updatedAt,
      latestEvent: detail,
    };
  });
}

function normalizeState(value) {
  const state = typeof value === "string" ? value.toLowerCase() : "idle";
  return VALID_STATES.has(state) ? state : "idle";
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

module.exports = {
  VALID_STATES,
  readJsonStatusActivity,
  normalizeState,
};
