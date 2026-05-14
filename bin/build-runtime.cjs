#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

async function main() {
  const root = path.resolve(__dirname, "..");
  const tscName = process.platform === "win32" ? "tsc.exe" : "tsc";
  const result = spawnSync(path.join(root, "node_modules", ".bin", tscName), ["-p", "tsconfig.json"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);

  await copyRuntimeAsset(root, "src/renderer.html");
  await copyRuntimeAsset(root, "src/renderer.css");
  await copyRuntimeAsset(root, "src/renderer.js");
  await copyDirectory(path.join(root, "src", "assets"), path.join(root, "build", "src", "assets"));
}

async function copyRuntimeAsset(root, relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(root, "build", relativePath);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

async function copyDirectory(from, to) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDirectory(source, target);
    else if (entry.isFile()) await fs.copyFile(source, target);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
