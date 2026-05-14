const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { validatePetPackage } = require("../build/src/main/validate-pet.js");

describe("pet package validator", () => {
  test("accepts a valid package shape", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-validate-"));
    await fs.writeFile(path.join(root, "spritesheet.png"), makePngHeader(1536, 1872));
    await fs.writeFile(
      path.join(root, "pet.json"),
      JSON.stringify({
        id: "valid",
        displayName: "Valid",
        description: "A valid pet.",
        spritesheetPath: "spritesheet.png",
      }),
    );

    const result = await validatePetPackage(root);
    expect(result.ok).toBe(true);
  });

  test("rejects traversal spritesheet paths", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-validate-"));
    await fs.writeFile(
      path.join(root, "pet.json"),
      JSON.stringify({
        id: "invalid",
        displayName: "Invalid",
        spritesheetPath: "../outside.png",
      }),
    );

    const result = await validatePetPackage(root);
    expect(result.ok).toBe(false);
    expect(result.checks.some((check) => check.name === "spritesheetPath" && !check.ok)).toBe(true);
  });
});

function makePngHeader(width, height) {
  const buffer = Buffer.alloc(33);
  buffer[0] = 137;
  buffer.write("PNG", 1, "ascii");
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}
