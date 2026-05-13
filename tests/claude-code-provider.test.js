const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { readClaudeCodeActivity } = require("../src/main/providers/claude-code.cjs");

describe("claude code provider", () => {
  test("normalizes recent claude jsonl sessions without exposing message text", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-claude-"));
    const projectDir = path.join(root, "projects", "C--repo");
    await fs.mkdir(projectDir, { recursive: true });
    const sessionPath = path.join(projectDir, "session-1.jsonl");
    await fs.writeFile(
      sessionPath,
      [
        JSON.stringify({
          type: "user",
          sessionId: "session-1",
          cwd: "C:\\repo",
          timestamp: "2026-05-13T10:00:00.000Z",
          message: { content: "private prompt" },
        }),
        JSON.stringify({
          type: "assistant",
          sessionId: "session-1",
          cwd: "C:\\repo",
          timestamp: "2026-05-13T10:01:00.000Z",
          message: { content: "private response" },
        }),
      ].join("\n"),
    );

    const activity = await readClaudeCodeActivity({
      projectsRoot: path.join(root, "projects"),
      now: new Date("2026-05-13T10:02:00.000Z"),
    });

    expect(activity.source).toBe("claude-code");
    expect(activity.sessions).toHaveLength(1);
    expect(activity.active.id).toBe("session-1");
    expect(activity.active.state).toBe("review");
    expect(activity.active.latestEvent).toBe("assistant response");
    expect(JSON.stringify(activity)).not.toContain("private prompt");
    expect(JSON.stringify(activity)).not.toContain("private response");
  });
});
