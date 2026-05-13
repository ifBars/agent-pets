const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { writeStatus } = require("../scripts/demo-status.cjs");

describe("demo status driver", () => {
  test("writes a valid status payload", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-demo-"));
    const filePath = path.join(dir, "status.json");
    await writeStatus(filePath, { state: "running", title: "Demo", detail: "Working" });

    const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
    expect(payload.state).toBe("running");
    expect(payload.title).toBe("Demo");
    expect(typeof payload.updatedAt).toBe("string");
  });
});
