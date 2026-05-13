const { describe, expect, test } = require("bun:test");
const { listProviders, normalizeProvider } = require("../src/main/providers/index.cjs");

describe("provider registry", () => {
  test("lists built-in providers", () => {
    const ids = listProviders().map((provider) => provider.id);
    expect(ids).toContain("codex");
    expect(ids).toContain("opencode");
    expect(ids).toContain("claude-code");
    expect(ids).toContain("t3code");
    expect(ids).toContain("json-status");
  });

  test("normalizes unknown providers to codex", () => {
    expect(normalizeProvider("unknown")).toBe("codex");
    expect(normalizeProvider("opencode")).toBe("opencode");
  });
});
