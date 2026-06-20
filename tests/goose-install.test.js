const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { installGooseIntegration, removeManagedBlock } = require("../bin/agent-pets-goose-install.cjs");

describe("goose integration installer", () => {
  test("adds agent-pets extension and slash command to goose config", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-goose-"));
    const configPath = path.join(dir, "config.yaml");
    const recipePath = path.join(dir, "pet.yaml");
    await fs.writeFile(configPath, 'GOOSE_PROVIDER: "anthropic"\n');

    const result = await installGooseIntegration({ configPath, recipePath });
    const text = await fs.readFile(configPath, "utf8");

    expect(result.configPath).toBe(configPath);
    expect(result.recipePath).toBe(recipePath);
    expect(text).toContain('GOOSE_PROVIDER: "anthropic"');
    expect(text).toContain("# BEGIN agent-pets managed block");
    expect(text).toContain("agent-pets:");
    expect(text).toContain("type: stdio");
    expect(text).toContain('cmd: "bunx"');
    expect(text).toContain('- "@ifbars/agent-pets"');
    expect(text).toContain('- "--mcp"');
    expect(text).toContain('command: "pet"');
    expect(text).toContain(`recipe_path: "${recipePath.replace(/\\/g, "\\\\")}"`);
  });

  test("replaces an existing managed block", async () => {
    const text = [
      "before: true",
      "# BEGIN agent-pets managed block",
      "old: true",
      "# END agent-pets managed block",
      "after: true",
      "",
    ].join("\n");

    expect(removeManagedBlock(text)).toBe("before: true\nafter: true\n");
  });
});
