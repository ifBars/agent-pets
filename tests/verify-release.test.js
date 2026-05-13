const { describe, expect, test } = require("bun:test");
const { mkdtemp, mkdir, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { REQUIRED_FILES, verifyLaunchManifest } = require("../scripts/verify-release.cjs");

describe("release verifier", () => {
  test("tracks market, demo, qa, and windows release artifacts", () => {
    expect(REQUIRED_FILES).toContain("docs/market-research.md");
    expect(REQUIRED_FILES).toContain("docs/demo/agent-pets-demo.mp4");
    expect(REQUIRED_FILES).toContain("docs/demo/pingu-qa/contact-sheet.png");
    expect(REQUIRED_FILES).toContain("docs/launch-kit/REVIEW.md");
    expect(REQUIRED_FILES).toContain("dist/Agent Pets Setup 0.1.0.exe");
  });

  test("validates launch kit manifest checksums when artifacts exist", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "agent-pets-release-"));
    const demoDir = path.join(rootDir, "docs", "demo");
    const launchKitDir = path.join(rootDir, "docs", "launch-kit");
    await mkdir(demoDir, { recursive: true });
    await mkdir(launchKitDir, { recursive: true });
    const artifactPath = path.join(demoDir, "agent-pets-demo.mp4");
    const artifactBytes = Buffer.from("demo video fixture");
    await writeFile(artifactPath, artifactBytes);
    await writeFile(
      path.join(launchKitDir, "manifest.json"),
      JSON.stringify(
        {
          project: "agent-pets",
          version: "0.1.0",
          artifacts: [
            {
              path: "docs/demo/agent-pets-demo.mp4",
              size: artifactBytes.length,
              sha256: createHash("sha256").update(artifactBytes).digest("hex"),
            },
          ],
          launchKit: {
            video: "agent-pets-demo.mp4",
            thumbnail: "agent-pets-thumbnail.png",
            copy: "x-launch-post.md",
          },
        },
        null,
        2,
      ),
    );

    const checks = await verifyLaunchManifest(rootDir);
    expect(checks.every((check) => check.ok)).toBe(true);
    expect(checks.some((check) => check.name === "launch-manifest:docs/demo/agent-pets-demo.mp4")).toBe(true);
  });
});
