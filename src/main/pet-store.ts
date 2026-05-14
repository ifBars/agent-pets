import * as fs from "node:fs/promises";
import * as path from "node:path";
import { getImageInfo } from "./image-info";
import type { PetManifest, PetPackage } from "./types";

export const ATLAS_WIDTH = 1536;
export const ATLAS_HEIGHT = 1872;
export const ATLAS_COLUMNS = 8;
export const ATLAS_ROWS = 9;
export const CELL_WIDTH = 192;
export const CELL_HEIGHT = 208;

export async function safeReadJson(filePath: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function readPetFolder(root: string, folderName: string, manifestName: string): Promise<PetPackage | null> {
  const folder = path.join(root, folderName);
  const manifest = (await safeReadJson(path.join(folder, manifestName))) as PetManifest | null;
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

export async function readPets(codexHome: string): Promise<PetPackage[]> {
  const byId = new Map<string, PetPackage>();
  for (const [root, manifest] of [
    [path.join(codexHome, "avatars"), "avatar.json"],
    [path.join(codexHome, "pets"), "pet.json"],
  ]) {
    let entries: any[] = [];
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
