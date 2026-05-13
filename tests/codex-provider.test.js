const { describe, expect, test } = require("bun:test");
const { classifySession, mapActivityToPetState } = require("../src/main/providers/codex.cjs");

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
});
