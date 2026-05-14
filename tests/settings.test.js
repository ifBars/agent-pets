const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { normalizeSettings, readSettings, updateSettings } = require("../build/src/main/settings.js");
const { parseArgs } = require("../build/src/main.js");

describe("settings", () => {
  test("normalizes invalid values to defaults", () => {
    const settings = normalizeSettings({
      selectedPetId: " pingu ",
      selectedState: "thinking",
      provider: "unknown",
      petSize: 999,
      statusFile: " status.json ",
      windowBounds: { width: 100, height: 100 },
    });

    expect(settings.selectedPetId).toBe("pingu");
    expect(settings.selectedState).toBe("auto");
    expect(settings.provider).toBe("codex");
    expect(settings.petSize).toBe(160);
    expect(settings.statusFile).toBe("status.json");
    expect(settings.windowBounds.width).toBe(220);
    expect(settings.windowBounds.height).toBe(220);
  });

  test("reads and updates settings file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-settings-"));
    const settingsPath = path.join(dir, "settings.json");

    const initial = await readSettings(settingsPath);
    expect(initial.selectedState).toBe("auto");

    const updated = await updateSettings(settingsPath, { selectedState: "review", selectedPetId: "pingu", provider: "desktop", petSize: 88 });
    expect(updated.selectedState).toBe("review");
    expect(updated.selectedPetId).toBe("pingu");
    expect(updated.provider).toBe("desktop");
    expect(updated.petSize).toBe(88);

    const reread = await readSettings(settingsPath);
    expect(reread.selectedState).toBe("review");
  });

  test("parses isolated user data dir", () => {
    const args = parseArgs(["--user-data-dir", ".demo/user-data", "--status-file=status.json", "--provider", "desktop", "--pet-size=120"]);
    expect(args.userDataDir).toBe(".demo/user-data");
    expect(args.statusFile).toBe("status.json");
    expect(args.provider).toBe("desktop");
    expect(args.petSize).toBe("120");
  });
});
