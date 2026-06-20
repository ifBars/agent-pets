const { describe, expect, test } = require("bun:test");
const fs = require("node:fs");
const path = require("node:path");

describe("package metadata", () => {
  test("publishes agent-pets as the only desktop launcher command", () => {
    const manifest = readJson("package.json");

    expect(manifest.name).toBe("@ifbars/agent-pets");
    expect(manifest.private).toBe(false);
    expect(manifest.bin["agent-pets"]).toBe("bin/agent-pets.cjs");
    expect(manifest.bin["agent-pets-claude-install"]).toBe("bin/agent-pets-claude-install.cjs");
    expect(manifest.bin["agent-pets-claude-hook"]).toBe("bin/agent-pets-claude-hook.cjs");
    expect(manifest.bin["agent-pets-gemini-install"]).toBe("bin/agent-pets-gemini-install.cjs");
    expect(manifest.bin["agent-pets-cursor-install"]).toBe("bin/agent-pets-cursor-install.cjs");
    expect(manifest.bin["agent-pets-mcp"]).toBe("bin/agent-pets-mcp.cjs");
    expect(manifest.bin["agent-pets-aider-install"]).toBe("bin/agent-pets-aider-install.cjs");
    expect(manifest.bin["agent-pets-aider-notify"]).toBe("bin/agent-pets-aider-notify.cjs");
    expect(manifest.bin["agent-pets-goose-install"]).toBe("bin/agent-pets-goose-install.cjs");
    expect(manifest.bin["agent-pets-copilot-install"]).toBe("bin/agent-pets-copilot-install.cjs");
    expect(manifest.bin["agent-pets-copilot-hook"]).toBe("bin/agent-pets-copilot-hook.cjs");
    expect(manifest.bin["agent-pets-windsurf-install"]).toBe("bin/agent-pets-windsurf-install.cjs");
    expect(manifest.bin["agent-pets-cline-install"]).toBe("bin/agent-pets-cline-install.cjs");
    expect(manifest.bin["agent-pets-continue-install"]).toBe("bin/agent-pets-continue-install.cjs");
    expect(manifest.bin["agent-pets-zed-install"]).toBe("bin/agent-pets-zed-install.cjs");
    expect(manifest.bin["agent-pets-warp-install"]).toBe("bin/agent-pets-warp-install.cjs");
    expect(manifest.bin.pets).toBeUndefined();
    expect(manifest.build.deb.packageName).toBe("agent-pets");
    expect(manifest.build.deb.artifactName).not.toContain("/");
    expect(manifest.scripts["agent-pets"]).toContain("electron .");
    expect(manifest.scripts.pets).toBeUndefined();
    expect(manifest.keywords).toContain("gemini-cli");
  });

  test("includes README assets and custom pet guide in the npm package", () => {
    const manifest = readJson("package.json");

    expect(manifest.files).toContain("README.md");
    expect(manifest.files).toContain("PET_CREATION.md");
    expect(manifest.files).toContain("RELEASE.md");
    expect(manifest.files).toContain("packages/claude-code-agent-pets/**/*");
    expect(manifest.files).toContain("packages/gemini-agent-pets/**/*");
    expect(manifest.files).toContain("packages/cursor-agent-pets/**/*");
    expect(manifest.files).toContain("packages/aider-agent-pets/**/*");
    expect(manifest.files).toContain("packages/goose-agent-pets/**/*");
    expect(manifest.files).toContain("packages/copilot-agent-pets/**/*");
    expect(manifest.files).toContain("packages/windsurf-agent-pets/**/*");
    expect(manifest.files).toContain("packages/cline-agent-pets/**/*");
    expect(manifest.files).toContain("packages/continue-agent-pets/**/*");
    expect(manifest.files).toContain("packages/zed-agent-pets/**/*");
    expect(manifest.files).toContain("packages/warp-agent-pets/**/*");
    expect(manifest.files).toContain("media/agent-pets-preview.gif");
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.dependencies?.electron).toBeUndefined();
    expect(manifest.optionalDependencies.electron).toBeDefined();
    expect(manifest.devDependencies.electron).toBeDefined();
  });

  test("README quick start is user-facing", () => {
    const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
    const quickStart = readme.slice(readme.indexOf("## Quick Start"), readme.indexOf("## Agent Modes"));

    expect(quickStart).toContain("bunx @ifbars/agent-pets");
    expect(quickStart).toContain("bun install -g @ifbars/agent-pets");
    expect(quickStart).toContain("GitHub Releases");
    expect(quickStart).toContain("opencode plugin opencode-agent-pets --global");
    expect(quickStart).toContain("agent-pets-claude-install");
    expect(quickStart).toContain("agent-pets-gemini-install");
    expect(quickStart).toContain("agent-pets-cursor-install");
    expect(quickStart).toContain("agent-pets-aider-install");
    expect(quickStart).toContain("agent-pets-goose-install");
    expect(quickStart).toContain("agent-pets-copilot-install");
    expect(quickStart).toContain("agent-pets-windsurf-install");
    expect(quickStart).toContain("agent-pets-cline-install");
    expect(quickStart).toContain("agent-pets-continue-install");
    expect(quickStart).toContain("agent-pets-zed-install");
    expect(quickStart).toContain("agent-pets-warp-install");
    expect(quickStart).toContain("/pet");
    expect(quickStart).not.toContain("bun install\nbun run agent-pets");
  });

  test("opencode plugin package is public-publish ready", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/opencode-agent-pets/package.json");
    const lockfile = fs.readFileSync(path.join(__dirname, "..", "bun.lock"), "utf8");

    expect(manifest.name).toBe("opencode-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(lockfile).toContain(`"version": "${rootManifest.version}"`);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.repository.url).toBe("https://github.com/ifBars/agent-pets.git");
    expect(manifest.repository.directory).toBe("packages/opencode-agent-pets");
    expect(manifest.bugs.url).toBe("https://github.com/ifBars/agent-pets/issues");
    expect(manifest.files).toContain("src");

    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "opencode-agent-pets", "README.md"), "utf8");
    expect(readme).toContain("opencode plugin opencode-agent-pets --global");
    expect(readme).toContain("/pet");
  });

  test("gemini package provides a pet slash command", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/gemini-agent-pets/package.json");
    const extension = readJson("packages/gemini-agent-pets/gemini-extension.json");
    const command = fs.readFileSync(path.join(__dirname, "..", "packages", "gemini-agent-pets", "commands", "pet.toml"), "utf8");

    expect(manifest.name).toBe("gemini-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.files).toContain("commands");
    expect(extension.commands.pet.description).toContain("Agent Pets");
    expect(extension.commands.pet.prompt).toContain("--provider','gemini-cli");
    expect(command).toContain("{{args}}");
    expect(command).toContain("Do not read, summarize, or print prompt or response history.");
  });

  test("claude code package provides MCP, hooks, and /pet skill integration", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/claude-code-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "claude-code-agent-pets", "README.md"), "utf8");
    const skill = fs.readFileSync(path.join(__dirname, "..", "packages", "claude-code-agent-pets", "skills", "pet", "SKILL.md"), "utf8");

    expect(manifest.name).toBe("claude-code-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.files).toContain("skills");
    expect(manifest.keywords).toContain("claude-code");
    expect(readme).toContain("agent-pets-claude-install");
    expect(readme).toContain(".mcp.json");
    expect(readme).toContain(".claude/settings.local.json");
    expect(readme).toContain(".claude/skills/pet/SKILL.md");
    expect(skill).toContain("name: pet");
    expect(skill).toContain("launch_agent_pets");
    expect(skill).toContain("update_agent_pets_status");
  });

  test("cursor package documents the MCP bridge", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/cursor-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "cursor-agent-pets", "README.md"), "utf8");

    expect(manifest.name).toBe("cursor-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.keywords).toContain("mcp");
    expect(readme).toContain("agent-pets-cursor-install");
    expect(readme).toContain("~/.cursor/mcp.json");
    expect(readme).toContain("launch_agent_pets");
    expect(readme).toContain("update_agent_pets_status");
  });

  test("aider package documents the notification bridge", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/aider-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "aider-agent-pets", "README.md"), "utf8");

    expect(manifest.name).toBe("aider-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.keywords).toContain("aider");
    expect(readme).toContain("agent-pets-aider-install");
    expect(readme).toContain("notifications-command");
    expect(readme).toContain("does not read transcript contents");
  });

  test("goose package provides MCP and slash-command integration", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/goose-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "goose-agent-pets", "README.md"), "utf8");
    const recipe = fs.readFileSync(path.join(__dirname, "..", "packages", "goose-agent-pets", "recipes", "pet.yaml"), "utf8");

    expect(manifest.name).toBe("goose-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.files).toContain("recipes");
    expect(manifest.keywords).toContain("goose");
    expect(readme).toContain("agent-pets-goose-install");
    expect(readme).toContain("/pet");
    expect(recipe).toContain("launch_agent_pets");
    expect(recipe).toContain("update_agent_pets_status");
  });

  test("copilot package provides hooks, MCP, and /pet skill integration", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/copilot-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "copilot-agent-pets", "README.md"), "utf8");
    const skill = fs.readFileSync(path.join(__dirname, "..", "packages", "copilot-agent-pets", "skills", "pet", "SKILL.md"), "utf8");

    expect(manifest.name).toBe("copilot-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.files).toContain("skills");
    expect(manifest.keywords).toContain("copilot-cli");
    expect(readme).toContain("agent-pets-copilot-install");
    expect(readme).toContain("~/.copilot/mcp-config.json");
    expect(readme).toContain("~/.copilot/hooks/agent-pets.json");
    expect(readme).toContain("~/.copilot/skills/pet/SKILL.md");
    expect(skill).toContain("name: pet");
    expect(skill).toContain("launch_agent_pets");
    expect(skill).toContain("update_agent_pets_status");
  });

  test("windsurf package provides MCP and /pet workflow integration", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/windsurf-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "windsurf-agent-pets", "README.md"), "utf8");
    const workflow = fs.readFileSync(path.join(__dirname, "..", "packages", "windsurf-agent-pets", "workflows", "pet.md"), "utf8");

    expect(manifest.name).toBe("windsurf-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.files).toContain("workflows");
    expect(manifest.keywords).toContain("windsurf");
    expect(readme).toContain("agent-pets-windsurf-install");
    expect(readme).toContain("~/.codeium/windsurf/mcp_config.json");
    expect(readme).toContain(".windsurf/workflows/pet.md");
    expect(workflow).toContain("title: pet");
    expect(workflow).toContain("launch_agent_pets");
  });

  test("cline package provides MCP and /pet skill integration", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/cline-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "cline-agent-pets", "README.md"), "utf8");
    const skill = fs.readFileSync(path.join(__dirname, "..", "packages", "cline-agent-pets", "skills", "pet", "SKILL.md"), "utf8");

    expect(manifest.name).toBe("cline-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.files).toContain("skills");
    expect(manifest.keywords).toContain("cline");
    expect(readme).toContain("agent-pets-cline-install");
    expect(readme).toContain("~/.cline/data/settings/cline_mcp_settings.json");
    expect(readme).toContain("~/.cline/skills/pet/SKILL.md");
    expect(skill).toContain("name: pet");
    expect(skill).toContain("launch_agent_pets");
  });

  test("continue package provides MCP integration", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/continue-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "continue-agent-pets", "README.md"), "utf8");
    const mcpBlock = fs.readFileSync(path.join(__dirname, "..", "packages", "continue-agent-pets", "mcpServers", "agent-pets.yaml"), "utf8");

    expect(manifest.name).toBe("continue-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.files).toContain("mcpServers");
    expect(manifest.keywords).toContain("continue");
    expect(readme).toContain("agent-pets-continue-install");
    expect(readme).toContain(".continue/mcpServers/agent-pets.yaml");
    expect(mcpBlock).toContain("schema: v1");
    expect(mcpBlock).toContain("mcpServers:");
  });

  test("zed package provides MCP context server integration", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/zed-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "zed-agent-pets", "README.md"), "utf8");

    expect(manifest.name).toBe("zed-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.keywords).toContain("zed");
    expect(readme).toContain("agent-pets-zed-install");
    expect(readme).toContain("context_servers");
    expect(readme).toContain("does not currently provide a documented custom `/pet` slash-command file format");
  });

  test("warp package provides MCP integration", () => {
    const rootManifest = readJson("package.json");
    const manifest = readJson("packages/warp-agent-pets/package.json");
    const readme = fs.readFileSync(path.join(__dirname, "..", "packages", "warp-agent-pets", "README.md"), "utf8");

    expect(manifest.name).toBe("warp-agent-pets");
    expect(manifest.version).toBe(rootManifest.version);
    expect(manifest.private).not.toBe(true);
    expect(manifest.publishConfig).toEqual({ access: "public" });
    expect(manifest.keywords).toContain("warp");
    expect(readme).toContain("agent-pets-warp-install");
    expect(readme).toContain(".warp/.mcp.json");
    expect(readme).toContain("launch_agent_pets");
    expect(readme).toContain("does not document a local file format for installing saved prompt slash commands");
  });
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
}
