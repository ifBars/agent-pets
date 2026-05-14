const { describe, expect, test } = require("bun:test");
const { listProviders, normalizeProvider } = require("../build/src/main/providers/index.js");

describe("provider registry", () => {
  test("lists built-in providers", () => {
    const ids = listProviders().map((provider) => provider.id);
    expect(ids).toContain("codex");
    expect(ids).toContain("opencode");
    expect(ids).toContain("claude-code");
    expect(ids).toContain("t3code");
    expect(ids).toContain("json-status");
    expect(ids).toContain("desktop");
  });

  test("normalizes unknown providers to codex", () => {
    expect(normalizeProvider("unknown")).toBe("codex");
    expect(normalizeProvider("opencode")).toBe("opencode");
    expect(normalizeProvider("desktop")).toBe("desktop");
  });
});
