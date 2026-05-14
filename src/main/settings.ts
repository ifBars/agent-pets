import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { PetAnimationState, ProviderId, Settings, WindowBounds } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  selectedPetId: "",
  selectedState: "auto",
  provider: "codex",
  petSize: 112,
  statusFile: "",
  windowBounds: null,
};

export async function readSettings(settingsPath: string): Promise<Settings> {
  try {
    const parsed = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(settingsPath: string, settings: Partial<Settings>): Promise<Settings> {
  const normalized = normalizeSettings(settings);
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export async function updateSettings(settingsPath: string, patch: Partial<Settings>): Promise<Settings> {
  const current = await readSettings(settingsPath);
  return writeSettings(settingsPath, { ...current, ...patch });
}

export function normalizeSettings(value: unknown): Settings {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    selectedPetId: cleanString(input.selectedPetId),
    selectedState: normalizeState(input.selectedState),
    provider: normalizeProvider(input.provider),
    petSize: normalizePetSize(input.petSize),
    statusFile: cleanString(input.statusFile),
    windowBounds: normalizeBounds(input.windowBounds),
  };
}

export function normalizeProvider(value: unknown): ProviderId {
  const valid = new Set(["codex", "opencode", "claude-code", "t3code", "json-status", "desktop"]);
  return valid.has(value as string) ? (value as ProviderId) : "codex";
}

export function normalizePetSize(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.petSize;
  return Math.min(160, Math.max(72, Math.round(parsed)));
}

function normalizeState(value: unknown): PetAnimationState {
  const valid = new Set(["auto", "idle", "running", "running-right", "running-left", "waving", "jumping", "waiting", "review", "failed"]);
  return valid.has(value as string) ? (value as PetAnimationState) : "auto";
}

function normalizeBounds(value: unknown): WindowBounds | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const width = finiteNumber(input.width);
  const height = finiteNumber(input.height);
  if (!width || !height) return null;
  return {
    x: finiteNumber(input.x),
    y: finiteNumber(input.y),
    width: Math.max(220, width),
    height: Math.max(220, height),
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
