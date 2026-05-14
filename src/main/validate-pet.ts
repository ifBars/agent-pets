import * as path from "node:path";
import { getImageInfo } from "./image-info";
import { ATLAS_COLUMNS, ATLAS_HEIGHT, ATLAS_ROWS, ATLAS_WIDTH, CELL_HEIGHT, CELL_WIDTH, safeReadJson } from "./pet-store";
import type { ImageInfo, PetManifest, ValidationResult } from "./types";

export async function validatePetPackage(packageDir: string): Promise<ValidationResult> {
  const folder = path.resolve(packageDir);
  const manifestPath = path.join(folder, "pet.json");
  const result: ValidationResult = {
    ok: false,
    packageDir: folder,
    manifestPath,
    checks: [],
  };

  const manifest = (await safeReadJson(manifestPath)) as PetManifest | null;
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

  let image: ImageInfo | null = null;
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

function addCheck(result: ValidationResult, name: string, ok: boolean, message: string): void {
  result.checks.push({ name, ok, message });
}
