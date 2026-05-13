const { describe, expect, test } = require("bun:test");
const { LAUNCH_FILES } = require("../scripts/prepare-launch-kit.cjs");

describe("launch kit", () => {
  test("tracks demo media and release artifacts", () => {
    expect(LAUNCH_FILES).toContain("docs/demo/agent-pets-demo.mp4");
    expect(LAUNCH_FILES).toContain("dist/Agent Pets Setup 0.1.0.exe");
    expect(LAUNCH_FILES).toContain("dist/agent-pets_0.1.0_amd64.deb");
  });
});
