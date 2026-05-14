const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { buildLocalPluginEntries, installLocalOpenCodePlugin } = require("../bin/agent-pets-opencode-install.cjs");

describe("local opencode plugin installer", () => {
  test("builds a package plugin entry for OpenCode target detection", () => {
    const entries = buildLocalPluginEntries({
      repoRoot: "C:\\repo\\agent-pets",
      command: "bun",
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toStartWith("file:///");
    expect(entries[0]).toContain("packages/opencode-agent-pets");
  });

  test("uses the same package entry for server-only installs", () => {
    const entries = buildLocalPluginEntries({
      repoRoot: "C:\\repo\\agent-pets",
      command: "bun",
      includeTui: false,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toContain("packages/opencode-agent-pets");
  });

  test("adds local plugin entries to server and tui configs", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-opencode-install-"));
    const configPath = path.join(dir, "opencode.json");
    const tuiConfigPath = path.join(dir, "tui.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        $schema: "https://opencode.ai/config.json",
        plugin: [
          "opencode-antigravity-auth@latest",
          "file:///C:/repo/agent-pets/packages/opencode-agent-pets/src/opencode-server.mjs",
        ],
      }),
    );
    await fs.writeFile(
      tuiConfigPath,
      JSON.stringify({
        plugin: [["file:///C:/repo/agent-pets/packages/opencode-agent-pets/src/opencode-tui.mjs", { command: "bun" }]],
      }),
    );

    const result = await installLocalOpenCodePlugin({
      configPath,
      tuiConfigPath,
      repoRoot: "C:\\repo\\agent-pets",
      command: "bun",
    });

    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    const tuiConfig = JSON.parse(await fs.readFile(tuiConfigPath, "utf8"));
    expect(result.pluginCount).toBe(2);
    expect(result.tuiPluginCount).toBe(1);
    expect(config.plugin[0]).toBe("opencode-antigravity-auth@latest");
    expect(config.plugin[1]).toContain("packages/opencode-agent-pets");
    expect(tuiConfig.plugin[0]).toContain("packages/opencode-agent-pets");
  });
});
