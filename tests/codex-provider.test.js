const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { classifySession, mapActivityToPetState, readCodexActivity } = require("../build/src/main/providers/codex.js");

describe("codex activity provider", () => {
  test("maps fresh session writes to running pet state", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const session = classifySession(
      { id: "s1", thread_name: "Build app", updated_at: "2026-05-13T09:59:50.000Z" },
      "session.jsonl",
      { mtimeMs: now.getTime() - 10_000, records: [] },
      now,
    );

    expect(session.state).toBe("running");
    expect(session.petState).toBe("running");
  });

  test("detects pending tool calls as running", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const session = classifySession(
      { id: "s2", thread_name: "Tool work", updated_at: "2026-05-13T09:00:00.000Z" },
      "session.jsonl",
      {
        mtimeMs: now.getTime() - 10 * 60 * 1000,
        records: [{ payload: { type: "function_call", call_id: "call_1", name: "shell_command" } }],
      },
      now,
    );

    expect(session.state).toBe("running");
  });

  test("uses review for recent completed activity", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const session = classifySession(
      { id: "s3", thread_name: "Done", updated_at: "2026-05-13T09:50:00.000Z" },
      "session.jsonl",
      {
        mtimeMs: now.getTime() - 10 * 60 * 1000,
        records: [{ payload: { type: "function_call_output", call_id: "call_1", output: "ok" } }],
      },
      now,
    );

    expect(session.state).toBe("review");
    expect(mapActivityToPetState(session.state)).toBe("review");
  });

  test("treats fresh tool output as active work until completion is written", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const session = classifySession(
      { id: "s-tool-output", thread_name: "Tool output", updated_at: "2026-05-13T09:59:59.000Z" },
      "session.jsonl",
      {
        mtimeMs: now.getTime() - 1_000,
        records: [{ payload: { type: "function_call_output", call_id: "call_1", output: "ok" } }],
      },
      now,
    );

    expect(session.state).toBe("running");
  });

  test("treats fresh reasoning as active work until completion is written", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const session = classifySession(
      { id: "s-reasoning", thread_name: "Reasoning", updated_at: "2026-05-13T09:59:59.000Z" },
      "session.jsonl",
      {
        mtimeMs: now.getTime() - 1_000,
        records: [{ payload: { type: "reasoning" } }],
      },
      now,
    );

    expect(session.state).toBe("running");
  });

  test("treats fresh commentary messages as active work until completion is written", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const session = classifySession(
      { id: "s-commentary", thread_name: "Commentary", updated_at: "2026-05-13T09:59:59.000Z" },
      "session.jsonl",
      {
        mtimeMs: now.getTime() - 1_000,
        records: [{ payload: { type: "message", role: "assistant", phase: "commentary" } }],
      },
      now,
    );

    expect(session.state).toBe("running");
  });

  test("uses review immediately after a completed assistant message", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const session = classifySession(
      { id: "s4", thread_name: "Fresh done", updated_at: "2026-05-13T09:59:58.000Z" },
      "session.jsonl",
      {
        mtimeMs: now.getTime() - 2_000,
        records: [{ payload: { type: "message", role: "assistant" } }],
      },
      now,
    );

    expect(session.state).toBe("review");
  });

  test("keeps completed sessions in review when late custom tool output is appended", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const session = classifySession(
      { id: "s-late-output", thread_name: "Late output", updated_at: "2026-05-13T09:59:59.000Z" },
      "session.jsonl",
      {
        mtimeMs: now.getTime() - 1_000,
        records: [
          { payload: { type: "task_complete" } },
          { payload: { type: "custom_tool_call_output", call_id: "call_done", output: "post-completion metadata" } },
        ],
      },
      now,
    );

    expect(session.state).toBe("review");
    expect(session.latestEvent).toBe("tool output");
  });

  test("allows a new turn after completion to become running", () => {
    const now = new Date("2026-05-13T10:00:00.000Z");
    const session = classifySession(
      { id: "s-new-turn", thread_name: "New turn", updated_at: "2026-05-13T09:59:59.000Z" },
      "session.jsonl",
      {
        mtimeMs: now.getTime() - 1_000,
        records: [
          { payload: { type: "task_complete" } },
          { payload: { type: "message", role: "user", content: "continue" } },
          { payload: { type: "function_call", call_id: "call_next", name: "shell_command" } },
        ],
      },
      now,
    );

    expect(session.state).toBe("running");
  });

  test("does not mark real completed Codex threads as running when their files are touched", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-real-codex-"));
    const codexHome = path.join(root, ".codex");
    const sessionDir = path.join(codexHome, "sessions", "2026", "05", "13");
    const now = new Date("2026-05-14T05:45:00.000Z");
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(
      path.join(codexHome, "session_index.jsonl"),
      [
        JSON.stringify({
          id: "019e2025-df4e-7231-9aa5-0117a9177135",
          thread_name: "Document Crash game plan",
          updated_at: "2026-05-14T05:44:50.000Z",
        }),
        JSON.stringify({
          id: "019e24e4-ed03-7a60-860c-f78e6c319dd8",
          thread_name: "Plan interaction UI refactor",
          updated_at: "2026-05-14T05:44:40.000Z",
        }),
        JSON.stringify({
          id: "019e20ab-fc12-71a3-8209-3ccb59aaef09",
          thread_name: "Look Into Codex S Pets Use",
          updated_at: "2026-05-14T05:44:55.000Z",
        }),
      ].join("\n") + "\n",
      "utf8",
    );

    const crashPath = path.join(sessionDir, "rollout-2026-05-13T00-03-33-019e2025-df4e-7231-9aa5-0117a9177135.jsonl");
    const planPath = path.join(sessionDir, "rollout-2026-05-13T22-10-43-019e24e4-ed03-7a60-860c-f78e6c319dd8.jsonl");
    const activePath = path.join(sessionDir, "rollout-2026-05-13T02-30-02-019e20ab-fc12-71a3-8209-3ccb59aaef09.jsonl");
    await writeCodexFixture(crashPath, "019e2025-df4e-7231-9aa5-0117a9177135", [
      { timestamp: "2026-05-14T05:44:50.000Z", type: "event_msg", payload: { type: "task_complete" } },
      { timestamp: "2026-05-14T05:44:55.000Z", type: "event_msg", payload: { type: "token_count" } },
      { timestamp: "2026-05-14T05:44:56.000Z", type: "response_item", payload: { type: "custom_tool_call_output", call_id: "call_late", output: "late output" } },
    ]);
    await writeCodexFixture(planPath, "019e24e4-ed03-7a60-860c-f78e6c319dd8", [
      { timestamp: "2026-05-14T05:44:40.000Z", type: "event_msg", payload: { type: "task_complete" } },
    ]);
    await writeCodexFixture(activePath, "019e20ab-fc12-71a3-8209-3ccb59aaef09", [
      { timestamp: "2026-05-14T05:44:55.000Z", type: "response_item", payload: { type: "function_call", call_id: "call_active", name: "shell_command" } },
    ]);
    await fs.utimes(crashPath, now, now);
    await fs.utimes(planPath, now, now);
    await fs.utimes(activePath, now, now);

    const activity = await readCodexActivity(codexHome, { now });
    const byId = new Map(activity.sessions.map((session) => [session.id, session]));

    expect(activity.active.id).toBe("019e20ab-fc12-71a3-8209-3ccb59aaef09");
    expect(byId.get("019e20ab-fc12-71a3-8209-3ccb59aaef09").state).toBe("running");
    expect(byId.get("019e2025-df4e-7231-9aa5-0117a9177135").state).toBe("review");
    expect(byId.get("019e24e4-ed03-7a60-860c-f78e6c319dd8").state).toBe("review");
  });

  test("discovers fresher rollout files when session index is stale", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-codex-"));
    const codexHome = path.join(root, ".codex");
    const sessionDir = path.join(codexHome, "sessions", "2026", "05", "13");
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(
      path.join(codexHome, "session_index.jsonl"),
      `${JSON.stringify({ id: "old-session", thread_name: "Old indexed", updated_at: "2026-05-13T09:00:00.000Z" })}\n`,
      "utf8",
    );

    const freshPath = path.join(sessionDir, "rollout-2026-05-13T10-00-00-019e20ab-fc12-71a3-8209-3ccb59aaef09.jsonl");
    await fs.writeFile(
      freshPath,
      [
        JSON.stringify({
          timestamp: "2026-05-13T10:00:00.000Z",
          type: "session_meta",
          payload: {
            id: "019e20ab-fc12-71a3-8209-3ccb59aaef09",
            timestamp: "2026-05-13T10:00:00.000Z",
            cwd: "C:\\Users\\ghost\\Documents\\Codex\\2026-05-13\\look-into-codex-s-pets-use",
          },
        }),
        JSON.stringify({ timestamp: "2026-05-13T10:00:01.000Z", type: "response_item", payload: { type: "message", role: "assistant" } }),
      ].join("\n"),
      "utf8",
    );
    await fs.utimes(freshPath, new Date("2026-05-13T10:00:01.000Z"), new Date("2026-05-13T10:00:01.000Z"));

    const activity = await readCodexActivity(codexHome, { now: new Date("2026-05-13T10:00:02.000Z") });

    expect(activity.sessions[0].id).toBe("019e20ab-fc12-71a3-8209-3ccb59aaef09");
    expect(activity.sessions[0].title).toBe("Look Into Codex S Pets Use");
    expect(activity.sessions[0].sessionPath).toBe(freshPath);
    expect(activity.sessions[0].state).toBe("review");
    expect(activity.sessions.some((session) => session.id === "old-session")).toBe(true);
  });

  test("uses generated index title before cwd fallback", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-codex-title-"));
    const codexHome = path.join(root, ".codex");
    const sessionDir = path.join(codexHome, "sessions", "2026", "05", "13");
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(
      path.join(codexHome, "session_index.jsonl"),
      `${JSON.stringify({
        id: "019e24e4-ed03-7a60-860c-f78e6c319dd8",
        thread_name: "Plan interaction UI refactor",
        updated_at: "2026-05-13T09:00:00.000Z",
      })}\n`,
      "utf8",
    );

    const sessionPath = path.join(sessionDir, "rollout-2026-05-13T22-10-43-019e24e4-ed03-7a60-860c-f78e6c319dd8.jsonl");
    await fs.writeFile(
      sessionPath,
      JSON.stringify({
        timestamp: "2026-05-13T10:00:00.000Z",
        type: "session_meta",
        payload: {
          id: "019e24e4-ed03-7a60-860c-f78e6c319dd8",
          cwd: "C:\\Users\\ghost\\Documents\\Codex\\2026-05-13\\look-into-codex-s-pets-use",
        },
      }),
      "utf8",
    );

    const activity = await readCodexActivity(codexHome, { now: new Date("2026-05-13T10:00:02.000Z") });

    expect(activity.sessions[0].title).toBe("Plan interaction UI refactor");
  });
});

async function writeCodexFixture(filePath, id, records) {
  await fs.writeFile(
    filePath,
    [
      JSON.stringify({
        timestamp: "2026-05-14T05:40:00.000Z",
        type: "session_meta",
        payload: {
          id,
          cwd: "C:\\Users\\ghost\\Documents\\Codex\\2026-05-13\\look-into-codex-s-pets-use",
        },
      }),
      ...records.map((record) => JSON.stringify(record)),
    ].join("\n"),
    "utf8",
  );
}
