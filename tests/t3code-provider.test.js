const { describe, expect, test } = require("bun:test");
const { extractLocalStorageJson, normalizeDraftStore, normalizeT3CodeSessions, readT3CodeActivity } = require("../build/src/main/providers/t3code.js");

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

  test("extracts t3code local-storage draft sessions without exposing prompt text", () => {
    const store = {
      state: {
        draftsByThreadKey: {
          "env:project": { prompt: "private draft prompt" },
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
    expect(sessions[0].title).toBe("ifbars/s1dedicatedservers");
    expect(JSON.stringify(sessions)).not.toContain("private draft prompt");
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
