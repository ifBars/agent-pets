const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { installZedIntegration } = require("../bin/agent-pets-zed-install.cjs");

describe("zed integration", () => {
  test("installs agent-pets as a Zed context server", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-zed-"));
    const settingsPath = path.join(dir, "settings.json");
    await fs.writeFile(settingsPath, JSON.stringify({ context_servers: { existing: { command: "node", args: ["server.js"] } } }));

    const result = await installZedIntegration({ settingsPath });
    const settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));

    expect(result.server.command).toBe("bunx");
    expect(settings.context_servers.existing.command).toBe("node");
    expect(settings.context_servers["agent-pets"]).toEqual({
      command: "bunx",
      args: ["@ifbars/agent-pets", "--mcp"],
      env: {},
    });
  });
});
