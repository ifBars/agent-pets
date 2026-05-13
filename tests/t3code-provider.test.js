const { describe, expect, test } = require("bun:test");
const { readT3CodeActivity } = require("../src/main/providers/t3code.cjs");

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
});
