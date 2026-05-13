const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { parseEmitArgs, writeStatusFile } = require("../src/main/status-writer.cjs");

describe("status writer", () => {
  test("parses emit args", () => {
    const args = parseEmitArgs(["--file", "status.json", "--state=running", "--title", "Claude Code", "--detail", "Editing"]);
    expect(args.file).toBe("status.json");
    expect(args.state).toBe("running");
    expect(args.title).toBe("Claude Code");
    expect(args.detail).toBe("Editing");
  });

  test("writes normalized status JSON", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-emit-"));
    const filePath = path.join(dir, "status.json");
    await writeStatusFile(filePath, { state: "thinking", title: "Claude Code", detail: "Working" });
    const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
    expect(payload.state).toBe("idle");
    expect(payload.title).toBe("Claude Code");
    expect(payload.detail).toBe("Working");
  });
});
