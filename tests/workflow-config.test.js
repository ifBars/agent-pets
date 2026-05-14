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

    expect(workflow).toContain("name: Prepare release");
    expect(workflow).toContain("branches:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain("paths:");
    expect(workflow).toContain("- package.json");
    expect(workflow).toContain('elif [ "${{ github.event_name }}" = "workflow_dispatch" ]; then');
    expect(workflow).toContain("git show HEAD^:package.json > /tmp/previous-package.json");
    expect(workflow).toContain('if [ "${version}" != "${previous_version}" ]; then');
    expect(workflow).toContain('tag="v${version}"');
    expect(workflow).toContain('gh release view "${tag}"');
    expect(workflow).toContain('bun pm view "agent-pets@${version}" version');
    expect(workflow).toContain('bun pm view "opencode-agent-pets@${version}" version');
    expect(workflow).toContain("release_exists: ${{ steps.release.outputs.release_exists }}");
    expect(workflow).toContain("gh release create");
    expect(workflow).toContain("find release-artifacts -type f -print0");
    expect(workflow).toContain('"${release_files[@]}"');
    expect(workflow).toContain("dist/*.exe");
    expect(workflow).not.toContain("dist/**/*.exe");
    expect(workflow).toContain('--target "${GITHUB_SHA}"');
    expect(workflow).toContain("name: Publish npm packages from GitHub release");
    expect(workflow).toContain("if: needs.prepare.outputs.should_release == 'true' && github.event_name == 'release'");
    expect(workflow).toContain("name: Publish npm packages from generated release");
    expect(workflow).toContain("needs.prepare.outputs.release_exists == 'true' || needs.github-release.result == 'success'");
    expect(workflow).toContain("bun publish --access public");
    expect(workflow).toContain("working-directory: packages/opencode-agent-pets");
    expect(workflow).toContain("NPM_CONFIG_TOKEN: ${{ secrets.NPM_TOKEN }}");
  });
});

function readWorkflow(name) {
  return fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", name), "utf8");
}
