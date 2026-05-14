const { describe, expect, test } = require("bun:test");
const fs = require("node:fs");
const path = require("node:path");

describe("workflow config", () => {
  test("ci runs the package validation scripts", () => {
    const workflow = readWorkflow("ci.yml");

    expect(workflow).toContain("run: bun run typecheck");
    expect(workflow).toContain("run: bun run test");
    expect(workflow).toContain("run: bun run pack");
  });

  test("release builds desktop artifacts and publishes npm packages from releases", () => {
    const workflow = readWorkflow("release.yml");

    expect(workflow).toContain("gh release create");
    expect(workflow).toContain("name: Publish npm packages");
    expect(workflow).toContain("if: github.event_name == 'release'");
    expect(workflow).toContain("run: bun publish --access public");
    expect(workflow).toContain("working-directory: packages/opencode-agent-pets");
    expect(workflow).toContain("NPM_CONFIG_TOKEN: ${{ secrets.NPM_TOKEN }}");
  });
});

function readWorkflow(name) {
  return fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", name), "utf8");
}
