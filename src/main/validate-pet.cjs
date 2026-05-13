const fs = require("node:fs/promises");
const path = require("node:path");
const { getImageInfo } = require("./image-info.cjs");
const { ATLAS_WIDTH, ATLAS_HEIGHT, ATLAS_COLUMNS, ATLAS_ROWS, CELL_WIDTH, CELL_HEIGHT, safeReadJson } = require("./pet-store.cjs");

async function validatePetPackage(packageDir) {
  const folder = path.resolve(packageDir);
  const manifestPath = path.join(folder, "pet.json");
  const result = {
    ok: false,
    packageDir: folder,
    manifestPath,
    checks: [],
  };

  const manifest = await safeReadJson(manifestPath);
  addCheck(result, "manifest", Boolean(manifest), manifest ? "pet.json parsed" : "pet.json missing or invalid JSON");
  if (!manifest) return result;

  addCheck(result, "id", typeof manifest.id === "string" && manifest.id.trim().length > 0, "id must be a non-empty string");
  addCheck(
    result,
    "displayName",
    typeof manifest.displayName === "string" && manifest.displayName.trim().length > 0,
    "displayName must be a non-empty string",
  );
  addCheck(
    result,
    "description",
    !("description" in manifest) || typeof manifest.description === "string",
    "description must be a string when present",
  );

  const spritesheetPath = typeof manifest.spritesheetPath === "string" ? manifest.spritesheetPath : "spritesheet.webp";
  const resolvedSpritesheet = path.resolve(folder, spritesheetPath);
  const relative = path.relative(folder, resolvedSpritesheet);
  const inside = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  addCheck(result, "spritesheetPath", inside, "spritesheetPath must resolve inside the pet folder");
  if (!inside) return result;

  let image = null;
  try {
    image = await getImageInfo(resolvedSpritesheet);
  } catch {
    image = null;
  }
  addCheck(result, "spritesheet", Boolean(image), "spritesheet must be PNG or WebP");
  if (image) {
    result.spritesheet = {
      path: resolvedSpritesheet,
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      columns: ATLAS_COLUMNS,
      rows: ATLAS_ROWS,
      cellWidth: CELL_WIDTH,
      cellHeight: CELL_HEIGHT,
    };
    addCheck(result, "dimensions", image.width === ATLAS_WIDTH && image.height === ATLAS_HEIGHT, `spritesheet must be ${ATLAS_WIDTH}x${ATLAS_HEIGHT}`);
  }

  result.ok = result.checks.every((check) => check.ok);
  return result;
}

function addCheck(result, name, ok, message) {
  result.checks.push({ name, ok, message });
}

module.exports = {
  validatePetPackage,
};
