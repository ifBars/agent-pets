const { describe, expect, test } = require("bun:test");
const {
  extractLocalStorageJson,
  normalizeDraftStore,
  normalizeT3CodeOrchestrationSnapshot,
  normalizeT3CodeSessions,
  readT3CodeActivity,
} = require("../build/src/main/providers/t3code.js");

describe("t3code provider", () => {
  test("normalizes t3code command sessions through injectable runner", async () => {
    const activity = await readT3CodeActivity({
      now: new Date("2026-05-13T10:10:00.000Z"),
      runner: async () => [
        {
          id: "t3-1",
          title: "Mobile cockpit",
          status: "waiting",
          updatedAt: "2026-05-13T10:09:00.000Z",
          summary: "Needs input",
        },
      ],
    });

    expect(activity.source).toBe("t3code");
    expect(activity.state).toBe("waiting");
    expect(activity.active.title).toBe("Mobile cockpit");
    expect(activity.active.petState).toBe("waiting");
  });

  test("maps completed t3code command rows to review", () => {
    const sessions = normalizeT3CodeSessions(
      [
        {
          id: "t3-2",
          title: "Done thread",
          status: "completed",
          updated: new Date("2026-05-13T10:09:00.000Z").getTime(),
        },
      ],
      new Date("2026-05-13T10:10:00.000Z"),
    );

    expect(sessions[0].state).toBe("review");
    expect(sessions[0].updatedAt).toBe("2026-05-13T10:09:00.000Z");
  });

  test("normalizes t3code orchestration snapshot threads and sessions", async () => {
    const snapshot = {
      snapshotSequence: 12,
      updatedAt: "2026-05-13T10:10:00.000Z",
      projects: [
        {
          id: "project-1",
          title: "agent-pets",
          workspaceRoot: "C:\\Users\\ghost\\Desktop\\Coding\\agent-pets",
        },
      ],
      threads: [
        {
          id: "thread-running",
          environmentId: "local",
          projectId: "project-1",
          title: "Improve T3 support",
          branch: "fix/t3-chat",
          worktreePath: "C:\\Users\\ghost\\Desktop\\Coding\\agent-pets",
          updatedAt: "2026-05-13T10:09:00.000Z",
          latestTurn: {
            turnId: "turn-1",
            state: "running",
            requestedAt: "2026-05-13T10:08:30.000Z",
            startedAt: "2026-05-13T10:08:40.000Z",
            completedAt: null,
            assistantMessageId: null,
          },
          session: {
            providerName: "codex",
            orchestrationStatus: "running",
            activeTurnId: "turn-1",
            updatedAt: "2026-05-13T10:09:00.000Z",
          },
          activities: [{ summary: "Running shell command" }],
          hasPendingApprovals: false,
          hasPendingUserInput: false,
          hasActionableProposedPlan: false,
        },
        {
          id: "thread-waiting",
          environmentId: "local",
          projectId: "project-1",
          title: "Review prompt",
          updatedAt: "2026-05-13T10:07:00.000Z",
          session: { orchestrationStatus: "ready", updatedAt: "2026-05-13T10:07:00.000Z" },
          latestTurn: null,
          activities: [],
          hasPendingApprovals: false,
          hasPendingUserInput: true,
          hasActionableProposedPlan: false,
        },
      ],
    };

    const activity = await readT3CodeActivity({
      now: new Date("2026-05-13T10:10:00.000Z"),
      runner: async () => snapshot,
    });

    expect(activity.mode).toBe("http");
    expect(activity.state).toBe("running");
    expect(activity.active.title).toBe("Improve T3 support");
    expect(activity.active.detail).toBe("Codex - agent-pets - running");
    expect(activity.sessions[1].state).toBe("waiting");
    expect(activity.sessions[1].detail).toBe("agent-pets - waiting for user input");
  });

  test("maps completed t3code latest turns to review without leaking messages", () => {
    const sessions = normalizeT3CodeOrchestrationSnapshot(
      {
        snapshotSequence: 1,
        projects: [{ id: "project-1", title: "private-project" }],
        threads: [
          {
            id: "thread-done",
            projectId: "project-1",
            title: "",
            updatedAt: "2026-05-13T10:09:00.000Z",
            latestTurn: {
              turnId: "turn-1",
              state: "completed",
              requestedAt: "2026-05-13T10:07:00.000Z",
              startedAt: "2026-05-13T10:07:10.000Z",
              completedAt: "2026-05-13T10:08:00.000Z",
              assistantMessageId: "msg-private",
            },
            session: { providerName: "claudeAgent", orchestrationStatus: "ready", updatedAt: "2026-05-13T10:08:00.000Z" },
            messages: [{ content: "private chat text" }],
            activities: [{ summary: "Assistant message completed" }],
            hasPendingApprovals: false,
            hasPendingUserInput: false,
            hasActionableProposedPlan: false,
          },
        ],
      },
      new Date("2026-05-13T10:10:00.000Z"),
    );

    expect(sessions[0].state).toBe("review");
    expect(sessions[0].title).toBe("Claude Code thread");
    expect(sessions[0].detail).toBe("Claude Code - private-project - completed turn ready to review");
    expect(JSON.stringify(sessions)).not.toContain("private chat text");
  });

  test("extracts t3code local-storage draft sessions without exposing prompt text", () => {
    const store = {
      state: {
        draftsByThreadKey: {
          "env:project": { prompt: "private draft prompt", activeProvider: "codex" },
        },
        draftThreadsByThreadKey: {
          "env:project": {
            threadId: "thread-1",
            logicalProjectKey: "github.com/ifbars/s1dedicatedservers",
            createdAt: "2026-05-13T10:05:36.946Z",
            branch: "master",
          },
        },
      },
      version: 5,
    };
    const sessions = normalizeDraftStore(store, {
      now: new Date("2026-05-13T10:10:00.000Z"),
      root: "C:\\Users\\ghost\\AppData\\Roaming\\t3code",
      file: { filePath: "leveldb.log", stat: { mtimeMs: new Date("2026-05-13T10:09:00.000Z").getTime() } },
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0].state).toBe("waiting");
    expect(sessions[0].title).toBe("Codex draft");
    expect(sessions[0].detail).toBe("ifbars/s1dedicatedservers - draft waiting to send");
    expect(JSON.stringify(sessions)).not.toContain("private draft prompt");
  });

  test("uses logical project mapping for draft-only t3code rows", () => {
    const store = {
      state: {
        draftsByThreadKey: {
          "env-1:draft-1": { prompt: "" },
        },
        stickyActiveProvider: "codex",
        draftThreadsByThreadKey: {
          "project-draft": {
            threadId: "thread-1",
            environmentId: "env-1",
            projectId: "project-1",
            createdAt: "2026-05-13T10:05:36.946Z",
            branch: "main",
          },
        },
        logicalProjectDraftThreadKeyByLogicalProjectKey: {
          "github.com/ifbars/agent-pets": "project-draft",
        },
      },
      version: 5,
    };
    const sessions = normalizeDraftStore(store, {
      now: new Date("2026-05-13T10:10:00.000Z"),
      root: "C:\\Users\\ghost\\AppData\\Roaming\\t3code",
      file: { filePath: "leveldb.log", stat: { mtimeMs: new Date("2026-05-13T10:09:00.000Z").getTime() } },
    });

    const draftOnlySession = sessions.find((session) => session.id === "thread-1");
    expect(draftOnlySession).toBeDefined();
    expect(draftOnlySession.title).toBe("Codex draft");
    expect(draftOnlySession.detail).toBe("ifbars/agent-pets - branch: main");
  });

  test("does not treat stale t3code drafts as active waiting sessions", () => {
    const store = {
      state: {
        draftsByThreadKey: {
          "env:old-project": { prompt: "old private prompt" },
        },
        draftThreadsByThreadKey: {
          "env:old-project": {
            threadId: "thread-old",
            logicalProjectKey: "old/project",
            createdAt: "2026-04-11T08:21:36.946Z",
          },
        },
      },
    };
    const sessions = normalizeDraftStore(store, {
      now: new Date("2026-05-13T10:10:00.000Z"),
      root: "C:\\Users\\ghost\\AppData\\Roaming\\t3code",
      file: { filePath: "leveldb.log", stat: { mtimeMs: new Date("2026-05-13T10:09:00.000Z").getTime() } },
    });

    expect(sessions[0].state).toBe("idle");
  });

  test("parses t3code composer draft JSON from leveldb text", () => {
    const text = `prefix t3code:composer-drafts:v1\u0001${JSON.stringify({ state: { draftsByThreadKey: {} }, version: 5 })} suffix`;
    const stores = extractLocalStorageJson(text, "t3code:composer-drafts:v1");
    expect(stores).toHaveLength(1);
    expect(stores[0].version).toBe(5);
  });
});
