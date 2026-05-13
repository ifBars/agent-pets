const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { normalizeSettings, readSettings, updateSettings } = require("../src/main/settings.cjs");
const { parseArgs } = require("../src/main.cjs");

describe("settings", () => {
  test("normalizes invalid values to defaults", () => {
    const settings = normalizeSettings({
      selectedPetId: " pingu ",
      selectedState: "thinking",
      statusFile: " status.json ",
      windowBounds: { width: 100, height: 100 },
    });

    expect(settings.selectedPetId).toBe("pingu");
    expect(settings.selectedState).toBe("auto");
    expect(settings.statusFile).toBe("status.json");
    expect(settings.windowBounds.width).toBe(320);
    expect(settings.windowBounds.height).toBe(300);
  });

  test("reads and updates settings file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-settings-"));
    const settingsPath = path.join(dir, "settings.json");

    const initial = await readSettings(settingsPath);
    expect(initial.selectedState).toBe("auto");

    const updated = await updateSettings(settingsPath, { selectedState: "review", selectedPetId: "pingu" });
    expect(updated.selectedState).toBe("review");
    expect(updated.selectedPetId).toBe("pingu");

    const reread = await readSettings(settingsPath);
    expect(reread.selectedState).toBe("review");
  });

  test("parses isolated user data dir", () => {
    const args = parseArgs(["--user-data-dir", ".demo/user-data", "--status-file=status.json"]);
    expect(args.userDataDir).toBe(".demo/user-data");
    expect(args.statusFile).toBe("status.json");
  });
});
