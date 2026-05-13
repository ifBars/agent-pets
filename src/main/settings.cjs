const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_SETTINGS = {
  selectedPetId: "",
  selectedState: "auto",
  provider: "codex",
  petSize: 112,
  statusFile: "",
  windowBounds: null,
};

async function readSettings(settingsPath) {
  try {
    const parsed = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function writeSettings(settingsPath, settings) {
  const normalized = normalizeSettings(settings);
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

async function updateSettings(settingsPath, patch) {
  const current = await readSettings(settingsPath);
  return writeSettings(settingsPath, { ...current, ...patch });
}

function normalizeSettings(value) {
  const input = value && typeof value === "object" ? value : {};
  return {
    selectedPetId: cleanString(input.selectedPetId),
    selectedState: normalizeState(input.selectedState),
    provider: normalizeProvider(input.provider),
    petSize: normalizePetSize(input.petSize),
    statusFile: cleanString(input.statusFile),
    windowBounds: normalizeBounds(input.windowBounds),
  };
}

function normalizeProvider(value) {
  const valid = new Set(["codex", "opencode", "claude-code", "t3code", "json-status"]);
  return valid.has(value) ? value : "codex";
}

function normalizePetSize(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.petSize;
  return Math.min(160, Math.max(72, Math.round(parsed)));
}

function normalizeState(value) {
  const valid = new Set(["auto", "idle", "running", "running-right", "running-left", "waving", "jumping", "waiting", "review", "failed"]);
  return valid.has(value) ? value : "auto";
}

function normalizeBounds(value) {
  if (!value || typeof value !== "object") return null;
  const width = finiteNumber(value.width);
  const height = finiteNumber(value.height);
  if (!width || !height) return null;
  return {
    x: finiteNumber(value.x),
    y: finiteNumber(value.y),
    width: Math.max(220, width),
    height: Math.max(220, height),
  };
}

function finiteNumber(value) {
  return Number.isFinite(value) ? value : undefined;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = {
  DEFAULT_SETTINGS,
  normalizeSettings,
  normalizeProvider,
  normalizePetSize,
  readSettings,
  updateSettings,
  writeSettings,
};
