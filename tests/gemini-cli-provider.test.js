const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { readGeminiCliActivity } = require("../build/src/main/providers/gemini-cli.js");

describe("gemini cli provider", () => {
  test("normalizes recent gemini jsonl sessions without exposing message text", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-gemini-"));
    const chatsDir = path.join(root, "tmp", "project-hash", "chats");
    await fs.mkdir(chatsDir, { recursive: true });
    const sessionPath = path.join(chatsDir, "session-2026-05-17T10-00-abc12345.jsonl");
    await fs.writeFile(
      sessionPath,
      [
        JSON.stringify({
          sessionId: "session-1",
          projectHash: "project-hash",
          startTime: "2026-05-17T10:00:00.000Z",
          lastUpdated: "2026-05-17T10:01:00.000Z",
          directories: ["C:\\repo\\gemini-project"],
        }),
        JSON.stringify({
          id: "message-1",
          type: "user",
          timestamp: "2026-05-17T10:00:30.000Z",
          content: "private prompt",
        }),
        JSON.stringify({
          id: "message-2",
          type: "gemini",
          timestamp: "2026-05-17T10:01:00.000Z",
          content: "private response",
          model: "gemini-2.5-pro",
        }),
      ].join("\n"),
    );

    const activity = await readGeminiCliActivity({
      geminiHome: root,
      now: new Date("2026-05-17T10:02:00.000Z"),
    });

    expect(activity.source).toBe("gemini-cli");
    expect(activity.sessions).toHaveLength(1);
    expect(activity.active.id).toBe("session-1");
    expect(activity.active.title).toBe("gemini-project");
    expect(activity.active.state).toBe("review");
    expect(activity.active.latestEvent).toBe("assistant response");
    expect(JSON.stringify(activity)).not.toContain("private prompt");
    expect(JSON.stringify(activity)).not.toContain("private response");
  });

  test("reads legacy gemini json session files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-gemini-"));
    const chatsDir = path.join(root, "tmp", "project-hash", "chats");
    await fs.mkdir(chatsDir, { recursive: true });
    await fs.writeFile(
      path.join(chatsDir, "session-2026-05-17T10-00-def67890.json"),
      JSON.stringify({
        sessionId: "legacy-session",
        projectHash: "project-hash",
        lastUpdated: "2026-05-17T10:00:00.000Z",
        directories: ["C:\\repo\\legacy-project"],
        messages: [{ id: "message-1", type: "user", timestamp: "2026-05-17T10:00:00.000Z", content: "private prompt" }],
      }),
    );

    const activity = await readGeminiCliActivity({
      geminiHome: root,
      now: new Date("2026-05-17T10:01:00.000Z"),
    });

    expect(activity.active.id).toBe("legacy-session");
    expect(activity.active.title).toBe("legacy-project");
    expect(activity.active.state).toBe("running");
    expect(JSON.stringify(activity)).not.toContain("private prompt");
  });
});
