const { readCodexActivity } = require("./codex.cjs");
const { readJsonStatusActivity } = require("./json-status.cjs");
const { readOpenCodeActivity } = require("./opencode.cjs");
const { readClaudeCodeActivity } = require("./claude-code.cjs");
const { readT3CodeActivity } = require("./t3code.cjs");

const PROVIDERS = [
  { id: "codex", label: "Codex", read: (options) => readCodexActivity(options.codexHome, options) },
  { id: "opencode", label: "OpenCode", read: readOpenCodeActivity },
  { id: "claude-code", label: "Claude Code", read: readClaudeCodeActivity },
  { id: "t3code", label: "T3Code", read: readT3CodeActivity },
  { id: "json-status", label: "Status file", read: (options) => readJsonStatusActivity(options.statusFile, options) },
];

const PROVIDER_BY_ID = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

async function readProviderActivity(options = {}) {
  const provider = PROVIDER_BY_ID.get(options.provider) || PROVIDER_BY_ID.get(options.statusFile ? "json-status" : "codex");
  return provider.read(options);
}

function listProviders() {
  return PROVIDERS.map(({ id, label }) => ({ id, label }));
}

function normalizeProvider(value) {
  return PROVIDER_BY_ID.has(value) ? value : "codex";
}

module.exports = {
  PROVIDERS,
  listProviders,
  normalizeProvider,
  readProviderActivity,
};
