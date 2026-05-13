const { app, BrowserWindow, ipcMain, Menu, Tray } = require("electron");
const path = require("node:path");
const { readPets } = require("./main/pet-store.cjs");
const { readActivity } = require("./main/activity.cjs");
const { validatePetPackage } = require("./main/validate-pet.cjs");
const { readSettings, updateSettings } = require("./main/settings.cjs");

function parseArgs(argv) {
  const args = {
    pet: null,
    state: null,
    list: false,
    codexHome: null,
    statusFile: null,
    provider: null,
    validatePet: null,
    userDataDir: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--list") args.list = true;
    else if (arg === "--validate-pet") args.validatePet = argv[++index] ?? null;
    else if (arg.startsWith("--validate-pet=")) args.validatePet = arg.slice("--validate-pet=".length);
    else if (arg === "--pet") args.pet = argv[++index] ?? null;
    else if (arg.startsWith("--pet=")) args.pet = arg.slice("--pet=".length);
    else if (arg === "--state") args.state = argv[++index] ?? "idle";
    else if (arg.startsWith("--state=")) args.state = arg.slice("--state=".length);
    else if (arg === "--codex-home") args.codexHome = argv[++index] ?? null;
    else if (arg.startsWith("--codex-home=")) args.codexHome = arg.slice("--codex-home=".length);
    else if (arg === "--status-file") args.statusFile = argv[++index] ?? null;
    else if (arg.startsWith("--status-file=")) args.statusFile = arg.slice("--status-file=".length);
    else if (arg === "--provider") args.provider = argv[++index] ?? null;
    else if (arg.startsWith("--provider=")) args.provider = arg.slice("--provider=".length);
    else if (arg === "--user-data-dir") args.userDataDir = argv[++index] ?? null;
    else if (arg.startsWith("--user-data-dir=")) args.userDataDir = arg.slice("--user-data-dir=".length);
  }
  return args;
}

function getCodexHome(args) {
  return path.resolve(args.codexHome || process.env.CODEX_HOME || path.join(app.getPath("home"), ".codex"));
}

async function createWindow(args) {
  const codexHome = getCodexHome(args);
  const settingsPath = path.join(app.getPath("userData"), "settings.json");
  const settings = await readSettings(settingsPath);
  const pets = await readPets(codexHome);
  if (args.validatePet) {
    const result = await validatePetPackage(args.validatePet);
    console.log(JSON.stringify(result, null, 2));
    app.exit(result.ok ? 0 : 1);
    return;
  }
  if (args.list) {
    for (const pet of pets) console.log(`${pet.id}\t${pet.displayName}\t${pet.spritesheetPath}`);
    app.quit();
    return;
  }

  const selectedPetId = args.pet || settings.selectedPetId;
  const selected = pets.find((pet) => pet.id === selectedPetId) || pets[0] || null;
  const effectiveSettings = await updateSettings(settingsPath, {
    selectedPetId: selected?.id || settings.selectedPetId,
    selectedState: args.state || settings.selectedState || "auto",
    provider: args.provider || settings.provider || (args.statusFile ? "json-status" : "codex"),
    statusFile: args.statusFile || settings.statusFile || "",
  });
  const bounds = settings.windowBounds || {};
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width || 360,
    height: bounds.height || 320,
    minWidth: 220,
    minHeight: 220,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  wireWindowPersistence(win, settingsPath);
  wireTray(win);
  win.loadFile(path.join(__dirname, "renderer.html"), {
    query: {
      codexHome,
      statusFile: effectiveSettings.statusFile,
      provider: effectiveSettings.provider,
      state: effectiveSettings.selectedState,
      pet: selected?.id || "",
    },
  });
}

function wireWindowPersistence(win, settingsPath) {
  let saveTimer = null;
  const queueSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      updateSettings(settingsPath, { windowBounds: win.getBounds() }).catch(() => {});
    }, 300);
  };
  win.on("moved", queueSave);
  win.on("resized", queueSave);
  win.on("close", () => {
    if (saveTimer) clearTimeout(saveTimer);
    updateSettings(settingsPath, { windowBounds: win.getBounds() }).catch(() => {});
  });
}

function wireTray(win) {
  let tray = null;
  try {
    tray = new Tray(path.join(__dirname, "assets", "tray.png"));
  } catch {
    return;
  }
  tray.setToolTip("Agent Pets");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Agent Pets", click: () => win.show() },
      { label: "Hide", click: () => win.hide() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]),
  );
}

function registerIpcHandlers() {
  ipcMain.handle("pets:list", async (_event, codexHome) => readPets(codexHome));
  ipcMain.handle("activity:read", async (_event, options) => readActivity(options));
  ipcMain.handle("settings:get", async () => readSettings(path.join(app.getPath("userData"), "settings.json")));
  ipcMain.handle("settings:update", async (_event, patch) => updateSettings(path.join(app.getPath("userData"), "settings.json"), patch));
}

if (process.versions.electron && process.type === "browser") {
  const startupArgs = parseArgs(process.argv.slice(2));
  if (startupArgs.userDataDir) app.setPath("userData", path.resolve(startupArgs.userDataDir));

  registerIpcHandlers();
  app.whenReady().then(() => createWindow(startupArgs));
  app.on("window-all-closed", () => app.quit());
}

module.exports = {
  createWindow,
  parseArgs,
  getCodexHome,
  registerIpcHandlers,
};
