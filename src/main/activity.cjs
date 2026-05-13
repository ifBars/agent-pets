const { readCodexActivity } = require("./providers/codex.cjs");
const { readJsonStatusActivity } = require("./providers/json-status.cjs");
const { readOpenCodeActivity } = require("./providers/opencode.cjs");

async function readActivity(options) {
  if (options.provider === "opencode") return readOpenCodeActivity(options);
  if (options.provider === "json-status" || options.statusFile) return readJsonStatusActivity(options.statusFile);
  return readCodexActivity(options.codexHome);
}

module.exports = {
  readActivity,
};
