const { describe, expect, test } = require("bun:test");
const { listProviders, normalizeProvider } = require("../build/src/main/providers/index.js");

describe("provider registry", () => {
  test("lists built-in providers", () => {
    const providers = listProviders();
    const ids = providers.map((provider) => provider.id);
    expect(ids).toContain("codex");
    expect(ids).toContain("opencode");
    expect(ids).toContain("claude-code");
    expect(ids).toContain("gemini-cli");
    expect(ids).toContain("aider");
    expect(ids).toContain("copilot-cli");
    expect(ids).toContain("t3code");
    expect(ids).toContain("json-status");
    expect(ids).toContain("desktop");
    expect(providers.find((provider) => provider.id === "json-status").requiresStatusFile).toBe(true);
    expect(providers.find((provider) => provider.id === "desktop").defaultRefreshMs).toBe(30000);
    expect(providers.find((provider) => provider.id === "opencode").modes).toContain("bridge-file");
    expect(providers.find((provider) => provider.id === "claude-code").modes).toContain("bridge-file");
    expect(providers.find((provider) => provider.id === "aider").modes).toContain("bridge-file");
    expect(providers.find((provider) => provider.id === "copilot-cli").modes).toContain("bridge-file");
    expect(providers.find((provider) => provider.id === "t3code").modes).toContain("http");
  });

  test("normalizes unknown providers to codex", () => {
    expect(normalizeProvider("unknown")).toBe("codex");
    expect(normalizeProvider("opencode")).toBe("opencode");
    expect(normalizeProvider("gemini-cli")).toBe("gemini-cli");
    expect(normalizeProvider("aider")).toBe("aider");
    expect(normalizeProvider("copilot-cli")).toBe("copilot-cli");
    expect(normalizeProvider("desktop")).toBe("desktop");
  });
});
