const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { installGeminiCommand } = require("../bin/agent-pets-gemini-install.cjs");

describe("gemini cli command installer", () => {
  test("installs the global /pet command template", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-gemini-install-"));
    const commandsDir = path.join(root, ".gemini", "commands");

    const result = await installGeminiCommand({
      repoRoot: path.join(__dirname, ".."),
      commandsDir,
    });

    expect(result.commandPath).toBe(path.join(commandsDir, "pet.toml"));
    const installed = await fs.readFile(result.commandPath, "utf8");
    expect(installed).toContain('description = "Launch Agent Pets in Gemini CLI mode."');
    expect(installed).toContain("/pet");
    expect(installed).toContain("@ifbars/agent-pets");
    expect(installed).toContain("--provider','gemini-cli");
  });
});
