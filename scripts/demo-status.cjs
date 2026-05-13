#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_STEPS = [
  { state: "idle", title: "Agent Pets demo", detail: "Ready on desktop" },
  { state: "running", title: "Codex", detail: "Editing provider files" },
  { state: "waiting", title: "Codex", detail: "Waiting for approval" },
  { state: "review", title: "Codex", detail: "Patch ready for review" },
  { state: "failed", title: "Codex", detail: "Build failed in demo" },
  { state: "idle", title: "Agent Pets demo", detail: "Back to idle" },
];

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const filePath = path.resolve(args.file || path.join(".demo", "agent-status.json"));
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  if (args.once) {
    await writeStatus(filePath, {
      state: args.state || "running",
      title: args.title || "External agent",
      detail: args.detail || "Demo status",
    });
    console.log(filePath);
    return;
  }

  console.log(`Writing demo status to ${filePath}`);
  console.log(`Launch Agent Pets with: bun run pets -- --status-file "${filePath}"`);
  let index = 0;
  while (true) {
    await writeStatus(filePath, DEFAULT_STEPS[index % DEFAULT_STEPS.length]);
    index += 1;
    await sleep(args.intervalMs);
  }
}

function parseArgs(argv) {
  const args = { file: null, once: false, state: null, title: null, detail: null, intervalMs: 3500 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") args.file = argv[++index] || null;
    else if (arg.startsWith("--file=")) args.file = arg.slice("--file=".length);
    else if (arg === "--once") args.once = true;
    else if (arg === "--state") args.state = argv[++index] || null;
    else if (arg.startsWith("--state=")) args.state = arg.slice("--state=".length);
    else if (arg === "--title") args.title = argv[++index] || null;
    else if (arg.startsWith("--title=")) args.title = arg.slice("--title=".length);
    else if (arg === "--detail") args.detail = argv[++index] || null;
    else if (arg.startsWith("--detail=")) args.detail = arg.slice("--detail=".length);
    else if (arg === "--interval-ms") args.intervalMs = Number(argv[++index]) || args.intervalMs;
    else if (arg.startsWith("--interval-ms=")) args.intervalMs = Number(arg.slice("--interval-ms=".length)) || args.intervalMs;
  }
  return args;
}

async function writeStatus(filePath, step) {
  await fs.writeFile(
    filePath,
    `${JSON.stringify({ ...step, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_STEPS,
  parseArgs,
  writeStatus,
};
