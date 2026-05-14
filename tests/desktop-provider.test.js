const { describe, expect, test } = require("bun:test");
const { readDesktopActivity } = require("../build/src/main/providers/desktop.js");

describe("desktop provider", () => {
  test("returns stable idle desktop pet activity without sessions", () => {
    const activity = readDesktopActivity({ now: new Date("2026-05-13T10:01:00.000Z") });

    expect(activity.source).toBe("desktop");
    expect(activity.state).toBe("idle");
    expect(activity.petState).toBe("idle");
    expect(activity.active.title).toBe("Desktop Pet");
    expect(activity.sessions).toEqual([]);
    expect(activity.updatedAt).toBe("2026-05-13T10:01:00.000Z");
  });
});
