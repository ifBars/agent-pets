const { aggregateActivity, execJson, normalizeCommandSessions } = require("./shared.cjs");

async function readOpenCodeActivity(options = {}) {
  const now = options.now || new Date();
  const runner = options.runner || runOpenCodeSessionList;
  try {
    const sessions = normalizeCommandSessions(await runner(options), "opencode", now);
    return aggregateActivity("opencode", sessions, now);
  } catch (error) {
    return aggregateActivity("opencode", [], now, { error: error.message });
  }
}

function runOpenCodeSessionList(options = {}) {
  const maxCount = Number.isFinite(options.maxCount) ? String(options.maxCount) : "8";
  return execJson("opencode", ["session", "list", "--format", "json", "--max-count", maxCount], options);
}

module.exports = {
  normalizeSessions: (output, now) => normalizeCommandSessions(output, "opencode", now),
  readOpenCodeActivity,
  runOpenCodeSessionList,
};
