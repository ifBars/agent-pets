const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { readCopilotCliActivity } = require("../build/src/main/providers/copilot-cli.js");

describe("copilot-cli provider", () => {
  test("reads privacy-safe copilot hook status", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-copilot-"));
    const statusFile = path.join(dir, "copilot-cli.json");
    await fs.writeFile(
      statusFile,
      JSON.stringify({
        state: "waiting",
        title: "GitHub Copilot CLI",
        detail: "Ready for input",
        updatedAt: "2026-05-18T10:00:00.000Z",
      }),
    );

    const activity = await readCopilotCliActivity({
      bridgeFile: statusFile,
      now: new Date("2026-05-18T10:01:00.000Z"),
    });

    expect(activity.source).toBe("copilot-cli");
    expect(activity.statusFile).toBe(statusFile);
    expect(activity.active.title).toBe("GitHub Copilot CLI");
    expect(activity.active.state).toBe("waiting");
  });

  test("falls back to session-state mtime without reading event contents", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-copilot-"));
    const sessionDir = path.join(dir, "session-state", "session-1");
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(path.join(sessionDir, "events.jsonl"), "private prompt\nprivate response\n");

    const activity = await readCopilotCliActivity({
      bridgeFile: path.join(dir, "missing-status.json"),
      projectsRoot: dir,
      now: new Date(Date.now() + 60_000),
    });

    expect(activity.source).toBe("copilot-cli");
    expect(activity.active.title).toBe("GitHub Copilot CLI");
    expect(activity.active.latestEvent).toBe("session updated");
    expect(JSON.stringify(activity)).not.toContain("private prompt");
    expect(JSON.stringify(activity)).not.toContain("private response");
  });
});
