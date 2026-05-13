const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { readJsonStatusActivity } = require("../src/main/providers/json-status.cjs");

describe("json status provider", () => {
  test("maps external agent status file into activity payload", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-status-"));
    const statusFile = path.join(dir, "status.json");
    await fs.writeFile(
      statusFile,
      JSON.stringify({
        state: "waiting",
        title: "Claude Code",
        detail: "Needs approval",
        updatedAt: "2026-05-13T10:00:00.000Z",
      }),
    );

    const activity = await readJsonStatusActivity(statusFile, { now: new Date("2026-05-13T10:01:00.000Z") });
    expect(activity.source).toBe("json-status");
    expect(activity.state).toBe("waiting");
    expect(activity.petState).toBe("waiting");
    expect(activity.active.title).toBe("Claude Code");
  });

  test("unknown states fall back to idle", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-status-"));
    const statusFile = path.join(dir, "status.json");
    await fs.writeFile(statusFile, JSON.stringify({ state: "thinking", title: "Agent" }));

    const activity = await readJsonStatusActivity(statusFile);
    expect(activity.state).toBe("idle");
  });

  test("empty status file path returns idle configuration guidance", async () => {
    const activity = await readJsonStatusActivity("", { now: new Date("2026-05-13T10:01:00.000Z") });
    expect(activity.state).toBe("idle");
    expect(activity.error).toBe("No status file configured");
    expect(activity.statusFile).toBe("");
  });
});
