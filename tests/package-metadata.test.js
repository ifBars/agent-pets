const { describe, expect, test } = require("bun:test");
const fs = require("node:fs");
const path = require("node:path");

describe("package metadata", () => {
  test("publishes agent-pets as the only desktop launcher command", () => {
    const manifest = readJson("package.json");

    expect(manifest.name).toBe("@ifbars/agent-pets");
    expect(manifest.private).toBe(false);
    expect(manifest.bin["agent-pets"]).toBe("bin/agent-pets.cjs");
    expect(manifest.bin.pets).toBeUndefined();
    expect(manifest.build.deb.packageName).toBe("agent-pets");
    expect(manifest.build.deb.artifactName).not.toContain("/");
    expect(manifest.scripts["agent-pets"]).toContain("electron .");
    expect(manifest.scripts.pets).toBeUndefined();
  });

  test("includes README assets and custom pet guide in the npm package", () => {
    const manifest = readJson("package.json");

    expect(manifest.files).toContain("README.md");
    expect(manifest.files).toContain("PET_CREATION.md");
    expect(manifest.files).toContain("RELEASE.md");
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
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
}
