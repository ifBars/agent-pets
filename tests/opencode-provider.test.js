const { describe, expect, test } = require("bun:test");
const { mergeOpenCodeSessions, normalizeSessions, readOpenCodeActivity } = require("../build/src/main/providers/opencode.js");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

describe("opencode activity provider", () => {
  async function isolatedBridgeFile() {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-opencode-empty-"));
    return path.join(dir, "missing-opencode.json");
  }

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
      bridgeFile: await isolatedBridgeFile(),
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

  test("normalizes opencode db sessions across projects and completed steps as review", async () => {
    const activity = await readOpenCodeActivity({
      now: new Date("2026-05-13T10:20:00.000Z"),
      bridgeFile: await isolatedBridgeFile(),
      runner: async () => [
        {
          id: "oc-db-1",
          title: "Global session",
          directory: "C:\\Users\\ghost\\Documents\\Codex",
          project_id: "global",
          time_updated: new Date("2026-05-13T10:19:30.000Z").getTime(),
          message_data: JSON.stringify({ role: "assistant", time: { completed: new Date("2026-05-13T10:19:29.000Z").getTime() }, finish: "stop" }),
          part_data: JSON.stringify({ type: "step-finish", reason: "stop" }),
        },
      ],
    });

    expect(activity.state).toBe("review");
    expect(activity.active.directory).toBe("C:\\Users\\ghost\\Documents\\Codex");
    expect(activity.active.latestEvent).toBe("finished: stop");
  });

  test("uses numeric opencode timestamps instead of treating rows as always fresh", () => {
    const sessions = normalizeSessions(
      [
        {
          id: "oc-old",
          title: "Old project session",
          updated: new Date("2026-05-13T09:00:00.000Z").getTime(),
          created: new Date("2026-05-13T08:00:00.000Z").getTime(),
        },
      ],
      new Date("2026-05-13T10:20:00.000Z"),
    );

    expect(sessions[0].state).toBe("idle");
    expect(sessions[0].updatedAt).toBe("2026-05-13T09:00:00.000Z");
  });

  test("handles no opencode sessions as idle", async () => {
    const activity = await readOpenCodeActivity({
      now: new Date("2026-05-13T10:20:00.000Z"),
      bridgeFile: await isolatedBridgeFile(),
      runner: async () => [],
    });

    expect(activity.state).toBe("idle");
    expect(activity.sessions).toHaveLength(0);
    expect(activity.active).toBeNull();
  });

  test("prefers realtime plugin bridge sessions over stale database state", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-opencode-"));
    const bridgeFile = path.join(dir, "opencode.json");
    await fs.writeFile(
      bridgeFile,
      JSON.stringify({
        provider: "opencode",
        updatedAt: "2026-05-13T10:19:59.000Z",
        sessions: [
          {
            id: "oc-live",
            title: "Live OpenCode run",
            cwd: "C:\\Users\\ghost\\project",
            state: "review",
            detail: "session idle",
            updatedAt: "2026-05-13T10:19:59.000Z",
          },
        ],
      }),
    );

    const activity = await readOpenCodeActivity({
      now: new Date("2026-05-13T10:20:00.000Z"),
      bridgeFile,
      runner: async () => [
        {
          id: "oc-live",
          title: "Live OpenCode run",
          time_updated: new Date("2026-05-13T10:19:30.000Z").getTime(),
          message_data: JSON.stringify({ role: "assistant" }),
          part_data: JSON.stringify({ type: "text" }),
        },
      ],
    });

    expect(activity.state).toBe("review");
    expect(activity.active.latestEvent).toBe("session idle");
    expect(activity.active.source).toBe("opencode-plugin");
    expect(activity.sessions).toHaveLength(1);
  });

  test("lets opencode database completion correct a generic running bridge row", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-opencode-complete-"));
    const bridgeFile = path.join(dir, "opencode.json");
    await fs.writeFile(
      bridgeFile,
      JSON.stringify({
        provider: "opencode",
        sessions: [
          {
            id: "oc-complete",
            title: "OpenCode session",
            cwd: "C:\\Users\\ghost",
            state: "running",
            detail: "message updated",
            updatedAt: "2026-05-13T10:20:00.010Z",
          },
        ],
      }),
    );

    const activity = await readOpenCodeActivity({
      now: new Date("2026-05-13T10:20:01.000Z"),
      bridgeFile,
      runner: async () => [
        {
          id: "oc-complete",
          title: "What is OpenCode",
          directory: "C:\\Users\\ghost",
          project_id: "global",
          time_updated: new Date("2026-05-13T10:20:00.000Z").getTime(),
          message_data: JSON.stringify({ role: "user", time: { created: new Date("2026-05-13T10:19:50.000Z").getTime() } }),
          part_data: JSON.stringify({ type: "step-finish", reason: "stop" }),
        },
      ],
    });

    expect(activity.state).toBe("review");
    expect(activity.active.title).toBe("What is OpenCode");
    expect(activity.active.latestEvent).toBe("finished: stop");
  });

  test("hides stale opencode database sessions instead of showing gray idle chats", async () => {
    const activity = await readOpenCodeActivity({
      now: new Date("2026-05-13T11:00:00.000Z"),
      bridgeFile: await isolatedBridgeFile(),
      runner: async () => [
        {
          id: "oc-stale",
          title: "Old OpenCode chat",
          time_updated: new Date("2026-05-13T10:00:00.000Z").getTime(),
          message_data: JSON.stringify({ role: "user", time: { created: new Date("2026-05-13T09:59:50.000Z").getTime() } }),
          part_data: JSON.stringify({ type: "step-finish", reason: "stop" }),
        },
      ],
    });

    expect(activity.state).toBe("idle");
    expect(activity.active).toBeNull();
    expect(activity.sessions).toHaveLength(0);
  });

  test("uses generated database title when bridge still has placeholder title", () => {
    const merged = mergeOpenCodeSessions(
      [
        {
          id: "oc-title",
          title: "OpenCode session",
          state: "running",
          petState: "running",
          updatedAt: "2026-05-13T10:20:00.000Z",
        },
      ],
      [
        {
          id: "oc-title",
          title: "Options trading basics",
          state: "review",
          petState: "review",
          updatedAt: "2026-05-13T10:19:30.000Z",
        },
      ],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("Options trading basics");
    expect(merged[0].state).toBe("running");
  });
});
