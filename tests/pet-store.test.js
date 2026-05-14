const { describe, expect, test } = require("bun:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { readPets } = require("../build/src/main/pet-store.js");

describe("pet store", () => {
  test("loads valid Codex pet package and ignores invalid paths", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-pets-"));
    const validDir = path.join(root, "pets", "valid");
    const invalidDir = path.join(root, "pets", "invalid");
    await fs.mkdir(validDir, { recursive: true });
    await fs.mkdir(invalidDir, { recursive: true });

    await fs.writeFile(path.join(validDir, "spritesheet.png"), makePngHeader(1536, 1872));
    await fs.writeFile(
      path.join(validDir, "pet.json"),
      JSON.stringify({ id: "valid", displayName: "Valid", spritesheetPath: "spritesheet.png" }),
    );
    await fs.writeFile(path.join(invalidDir, "pet.json"), JSON.stringify({ spritesheetPath: "..\\outside.png" }));

    const pets = await readPets(root);
    expect(pets.map((pet) => pet.id)).toEqual(["valid"]);
    expect(pets[0].spritesheetDataUrl.startsWith("data:image/png;base64,")).toBe(true);
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
