const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { readAiderActivity } = require("../build/src/main/providers/aider.js");

describe("aider provider", () => {
  test("reads privacy-safe aider notification status", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-aider-"));
    const statusFile = path.join(dir, "aider.json");
    await fs.writeFile(
      statusFile,
      JSON.stringify({
        state: "waiting",
        title: "Aider",
        detail: "Ready for input",
        updatedAt: "2026-05-17T10:00:00.000Z",
      }),
    );

    const activity = await readAiderActivity({
      bridgeFile: statusFile,
      now: new Date("2026-05-17T10:01:00.000Z"),
    });

    expect(activity.source).toBe("aider");
    expect(activity.statusFile).toBe(statusFile);
    expect(activity.active.title).toBe("Aider");
    expect(activity.active.state).toBe("waiting");
  });

  test("falls back to chat history mtime without reading transcript text", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-aider-"));
    const historyPath = path.join(dir, ".aider.chat.history.md");
    await fs.writeFile(historyPath, "private prompt\nprivate response\n");

    const activity = await readAiderActivity({
      bridgeFile: path.join(dir, "missing-status.json"),
      cwd: dir,
      now: new Date(Date.now() + 60_000),
    });

    expect(activity.source).toBe("aider");
    expect(activity.active.title).toBe(path.basename(dir));
    expect(activity.active.latestEvent).toBe("history updated");
    expect(JSON.stringify(activity)).not.toContain("private prompt");
    expect(JSON.stringify(activity)).not.toContain("private response");
  });
});
