#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");

function notificationCommand() {
  return "bunx @ifbars/agent-pets --aider-notify";
}

async function installAiderConfig(options = {}) {
  const configPath = path.resolve(options.configPath || path.join(process.cwd(), ".aider.conf.yml"));
  let text = "";
  try {
    text = await fs.readFile(configPath, "utf8");
  } catch {
    text = "";
  }

  const command = options.command || notificationCommand();
  const lines = text.trimEnd() ? [text.trimEnd(), ""] : [];
  if (!/^\s*notifications\s*:/m.test(text)) lines.push("notifications: true");
  if (/^\s*notifications-command\s*:/m.test(text) || /^\s*notifications_command\s*:/m.test(text)) {
    return { configPath, changed: false, command };
  }
  lines.push(`notifications-command: "${escapeYamlDoubleQuoted(command)}"`);
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${lines.join("\n")}\n`, "utf8");
  return { configPath, changed: true, command };
}

async function main() {
  const result = await installAiderConfig();
  console.log(`Installed Aider Agent Pets notification command at ${result.configPath}`);
}

function escapeYamlDoubleQuoted(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  installAiderConfig,
  notificationCommand,
};
