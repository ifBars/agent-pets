const fs = require("node:fs/promises");
const path = require("node:path");
const { getImageInfo } = require("./image-info.cjs");

const ATLAS_WIDTH = 1536;
const ATLAS_HEIGHT = 1872;
const ATLAS_COLUMNS = 8;
const ATLAS_ROWS = 9;
const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;

async function safeReadJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function readPetFolder(root, folderName, manifestName) {
  const folder = path.join(root, folderName);
  const manifest = await safeReadJson(path.join(folder, manifestName));
  if (!manifest || typeof manifest !== "object") return null;

  const spritesheetPath = typeof manifest.spritesheetPath === "string" ? manifest.spritesheetPath : "spritesheet.webp";
  const resolvedSpritesheet = path.resolve(folder, spritesheetPath);
  if (!isInside(folder, resolvedSpritesheet)) return null;

  try {
    const image = await getImageInfo(resolvedSpritesheet);
    if (!image || image.width !== ATLAS_WIDTH || image.height !== ATLAS_HEIGHT) return null;
    return {
      id: folderName,
      displayName: manifest.displayName || manifest.id || folderName,
      description: manifest.description || null,
      folder,
      source: manifestName === "avatar.json" ? "avatar" : "pet",
      spritesheetPath: resolvedSpritesheet,
      spritesheetDataUrl: `data:${image.mimeType};base64,${image.buffer.toString("base64")}`,
    };
  } catch {
    return null;
  }
}

async function readPets(codexHome) {
  const byId = new Map();
  for (const [root, manifest] of [
    [path.join(codexHome, "avatars"), "avatar.json"],
    [path.join(codexHome, "pets"), "pet.json"],
  ]) {
    let entries = [];
    try {
      entries = await fs.readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pet = await readPetFolder(root, entry.name, manifest);
      if (pet) byId.set(pet.id, pet);
    }
  }
  return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

module.exports = {
  ATLAS_WIDTH,
  ATLAS_HEIGHT,
  ATLAS_COLUMNS,
  ATLAS_ROWS,
  CELL_WIDTH,
  CELL_HEIGHT,
  readPetFolder,
  readPets,
  safeReadJson,
};
