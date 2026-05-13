const { describe, expect, test } = require("bun:test");
const { normalizeSessions, readOpenCodeActivity } = require("../src/main/providers/opencode.cjs");

describe("opencode activity provider", () => {
  test("normalizes opencode session list json into pet activity", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const sessions = normalizeSessions(
      [
        {
          id: "oc-1",
          title: "Refactor provider",
          updatedAt: "2026-05-13T09:59:00.000Z",
          model: "anthropic/claude",
        },
      ],
      now,
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe("Refactor provider");
    expect(sessions[0].state).toBe("running");
    expect(sessions[0].petState).toBe("running");
  });

  test("reads activity through injectable opencode runner", async () => {
    const activity = await readOpenCodeActivity({
      now: new Date("2026-05-13T10:20:00.000Z"),
      runner: async () => [
        {
          id: "oc-2",
          title: "Patch UI",
          status: "review",
          updated_at: "2026-05-13T10:10:00.000Z",
          summary: "Ready to inspect",
        },
      ],
    });

    expect(activity.source).toBe("opencode");
    expect(activity.state).toBe("review");
    expect(activity.active.latestEvent).toBe("Ready to inspect");
  });

  test("handles no opencode sessions as idle", async () => {
    const activity = await readOpenCodeActivity({
      now: new Date("2026-05-13T10:20:00.000Z"),
      runner: async () => [],
    });

    expect(activity.state).toBe("idle");
    expect(activity.sessions).toHaveLength(0);
    expect(activity.active).toBeNull();
  });
});
