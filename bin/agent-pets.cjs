#!/usr/bin/env node

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
