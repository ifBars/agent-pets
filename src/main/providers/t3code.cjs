const { aggregateActivity, execJson, normalizeCommandSessions } = require("./shared.cjs");

async function readT3CodeActivity(options = {}) {
  const now = options.now || new Date();
  const runner = options.runner || runT3CodeSessionList;
  try {
    const sessions = normalizeCommandSessions(await runner(options), "t3code", now);
    return aggregateActivity("t3code", sessions, now);
  } catch (error) {
    return aggregateActivity("t3code", [], now, { error: error.message });
  }
}

async function runT3CodeSessionList(options = {}) {
  const maxCount = Number.isFinite(options.maxCount) ? String(options.maxCount) : "8";
  const commands = options.commands || ["t3code", "t3"];
  let lastError = null;
  for (const command of commands) {
    try {
      return await execJson(command, ["session", "list", "--format", "json", "--max-count", maxCount], options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("T3Code CLI not available");
}

module.exports = {
  readT3CodeActivity,
  runT3CodeSessionList,
};
