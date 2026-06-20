#!/usr/bin/env node

if (process.argv.includes("--mcp")) {
  require("./agent-pets-mcp.cjs").main();
} else if (process.argv.includes("--aider-notify")) {
  require("./agent-pets-aider-notify.cjs")
    .notifyAiderReady()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else if (process.argv.includes("--claude-hook")) {
  const index = process.argv.indexOf("--claude-hook");
  const [state, title, detail] = process.argv.slice(index + 1);
  require("./agent-pets-claude-hook.cjs")
    .notifyClaudeStatus({ state, title, detail })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else if (process.argv.includes("--copilot-hook")) {
  const index = process.argv.indexOf("--copilot-hook");
  const [state, title, detail] = process.argv.slice(index + 1);
  require("./agent-pets-copilot-hook.cjs")
    .notifyCopilotStatus({ state, title, detail })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else {
  const { spawn } = require("node:child_process");
  const path = require("node:path");

  const electronBin = require("electron");
  const appRoot = path.resolve(__dirname, "..");
  const child = spawn(electronBin, [appRoot, ...process.argv.slice(2)], {
    stdio: "inherit",
    windowsHide: false,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}
