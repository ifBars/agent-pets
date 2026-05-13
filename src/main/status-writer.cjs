const fs = require("node:fs/promises");
const path = require("node:path");
const { VALID_STATES, normalizeState } = require("./providers/json-status.cjs");

async function writeStatusFile(filePath, input) {
  const resolved = path.resolve(filePath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  const payload = {
    state: normalizeState(input.state),
    title: cleanString(input.title) || "External agent",
    detail: cleanString(input.detail) || cleanString(input.message) || "Status updated",
    updatedAt: cleanString(input.updatedAt) || new Date().toISOString(),
  };
  if (Array.isArray(input.items)) {
    payload.items = input.items.map((item, index) => ({
      id: cleanString(item.id) || `item-${index}`,
      state: normalizeState(item.state),
      title: cleanString(item.title) || payload.title,
      detail: cleanString(item.detail) || cleanString(item.message) || payload.detail,
      updatedAt: cleanString(item.updatedAt) || payload.updatedAt,
    }));
  }
  await fs.writeFile(resolved, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { filePath: resolved, payload };
}

function parseEmitArgs(argv) {
  const args = { file: null, state: "idle", title: null, detail: null, message: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") args.file = argv[++index] || null;
    else if (arg.startsWith("--file=")) args.file = arg.slice("--file=".length);
    else if (arg === "--state") args.state = argv[++index] || args.state;
    else if (arg.startsWith("--state=")) args.state = arg.slice("--state=".length);
    else if (arg === "--title") args.title = argv[++index] || null;
    else if (arg.startsWith("--title=")) args.title = arg.slice("--title=".length);
    else if (arg === "--detail") args.detail = argv[++index] || null;
    else if (arg.startsWith("--detail=")) args.detail = arg.slice("--detail=".length);
    else if (arg === "--message") args.message = argv[++index] || null;
    else if (arg.startsWith("--message=")) args.message = arg.slice("--message=".length);
  }
  return args;
}

function emitUsage() {
  return `Usage: agent-pets-emit --file <status.json> --state <${[...VALID_STATES].join("|")}> --title <agent> --detail <message>`;
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

module.exports = {
  emitUsage,
  parseEmitArgs,
  writeStatusFile,
};
