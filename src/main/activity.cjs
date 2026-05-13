const { readCodexActivity } = require("./providers/codex.cjs");
const { readJsonStatusActivity } = require("./providers/json-status.cjs");

async function readActivity(options) {
  if (options.statusFile) return readJsonStatusActivity(options.statusFile);
  return readCodexActivity(options.codexHome);
}

module.exports = {
  readActivity,
};
