const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { installAiderConfig, notificationCommand } = require("../bin/agent-pets-aider-install.cjs");
const { notifyAiderReady } = require("../bin/agent-pets-aider-notify.cjs");

describe("aider integration", () => {
  test("installs notifications command into aider config", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-aider-install-"));
    const configPath = path.join(dir, ".aider.conf.yml");
    await fs.writeFile(configPath, "model: sonnet\n");

    const result = await installAiderConfig({ configPath });
    const text = await fs.readFile(configPath, "utf8");

    expect(result.changed).toBe(true);
    expect(text).toContain("model: sonnet");
    expect(text).toContain("notifications: true");
    expect(text).toContain(`notifications-command: "${notificationCommand()}"`);
  });

  test("does not overwrite an existing notifications command", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-aider-install-"));
    const configPath = path.join(dir, ".aider.conf.yml");
    await fs.writeFile(configPath, 'notifications-command: "say ready"\n');

    const result = await installAiderConfig({ configPath });
    const text = await fs.readFile(configPath, "utf8");

    expect(result.changed).toBe(false);
    expect(text).toBe('notifications-command: "say ready"\n');
  });

  test("notification helper writes the aider status file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-aider-notify-"));
    const file = path.join(dir, "aider.json");
    await notifyAiderReady({ file });
    const payload = JSON.parse(await fs.readFile(file, "utf8"));

    expect(payload.state).toBe("waiting");
    expect(payload.title).toBe("Aider");
    expect(payload.detail).toBe("Ready for input");
  });
});
