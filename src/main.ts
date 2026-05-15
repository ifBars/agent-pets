import { app, BrowserWindow, ipcMain, Menu, screen, Tray, type IpcMainInvokeEvent } from "electron";
import * as path from "node:path";
import { readActivity } from "./main/activity";
import { readPets } from "./main/pet-store";
import { listProviders } from "./main/providers";
import { readSettings, updateSettings } from "./main/settings";
import { validatePetPackage } from "./main/validate-pet";
import type { ProviderId, WindowBounds } from "./main/types";

let appTray: Tray | null = null;

export interface StartupArgs {
  pet: string | null;
  state: string | null;
  list: boolean;
  codexHome: string | null;
  statusFile: string | null;
  provider: ProviderId | string | null;
  petSize: string | null;
  validatePet: string | null;
  userDataDir: string | null;
}

export function parseArgs(argv: string[]): StartupArgs {
  const args: StartupArgs = {
    pet: null,
    state: null,
    list: false,
    codexHome: null,
    statusFile: null,
    provider: null,
    petSize: null,
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
    else if (arg === "--pet-size") args.petSize = argv[++index] ?? null;
    else if (arg.startsWith("--pet-size=")) args.petSize = arg.slice("--pet-size=".length);
    else if (arg === "--user-data-dir") args.userDataDir = argv[++index] ?? null;
    else if (arg.startsWith("--user-data-dir=")) args.userDataDir = arg.slice("--user-data-dir=".length);
  }
  return args;
}

export function getCodexHome(args: StartupArgs): string {
  return path.resolve(args.codexHome || process.env.CODEX_HOME || path.join(app.getPath("home"), ".codex"));
}

export async function createWindow(args: StartupArgs): Promise<void> {
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
    selectedState: (args.state || settings.selectedState || "auto") as any,
    provider: (args.provider || settings.provider || (args.statusFile ? "json-status" : "codex")) as any,
    petSize: args.petSize ? Number(args.petSize) : settings.petSize,
    statusFile: args.statusFile || settings.statusFile || "",
  });
  const bounds: Partial<WindowBounds> = settings.windowBounds || {};
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width || 360,
    height: bounds.height || 520,
    minWidth: 220,
    minHeight: 460,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
      petSize: String(effectiveSettings.petSize),
      state: effectiveSettings.selectedState,
      pet: selected?.id || "",
    },
  });
}

function wireWindowPersistence(win: BrowserWindow, settingsPath: string): void {
  let saveTimer: NodeJS.Timeout | null = null;
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

function wireTray(win: BrowserWindow): void {
  destroyTray();
  try {
    appTray = new Tray(path.join(__dirname, "assets", "tray.png"));
  } catch {
    return;
  }
  appTray.setToolTip("Agent Pets");
  appTray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Agent Pets", click: () => win.show() },
      { label: "Hide", click: () => win.hide() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]),
  );
  win.once("closed", destroyTray);
  app.once("before-quit", destroyTray);
}

export function destroyTray(): void {
  if (!appTray) return;
  appTray.destroy();
  appTray = null;
}

export function registerIpcHandlers(): void {
  ipcMain.handle("pets:list", async (_event: IpcMainInvokeEvent, codexHome: string) => readPets(codexHome));
  ipcMain.handle("providers:list", async () => listProviders());
  ipcMain.handle("activity:read", async (_event: IpcMainInvokeEvent, options) => readActivity(options));
  ipcMain.handle("settings:get", async () => readSettings(path.join(app.getPath("userData"), "settings.json")));
  ipcMain.handle("settings:update", async (_event: IpcMainInvokeEvent, patch) => updateSettings(path.join(app.getPath("userData"), "settings.json"), patch));
  ipcMain.on("window:set-ignore-mouse-events", (event, ignore: boolean, options?: { forward?: boolean }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    win.setIgnoreMouseEvents(Boolean(ignore), ignore ? options : undefined);
  });
  ipcMain.on("window:move-by", (event, deltaX: number, deltaY: number, options?: { clampToWorkArea?: boolean }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    const bounds = win.getBounds();
    let nextX = Math.round(bounds.x + Number(deltaX || 0));
    let nextY = Math.round(bounds.y + Number(deltaY || 0));
    if (options?.clampToWorkArea) {
      const display = screen.getDisplayMatching(bounds);
      const workArea = display.workArea;
      nextX = clamp(nextX, workArea.x, workArea.x + workArea.width - bounds.width);
      nextY = clamp(nextY, workArea.y, workArea.y + workArea.height - bounds.height);
    }
    win.setPosition(nextX, nextY, false);
  });
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

if (process.versions.electron && (process as any).type === "browser") {
  const startupArgs = parseArgs(process.argv.slice(2));
  if (startupArgs.userDataDir) app.setPath("userData", path.resolve(startupArgs.userDataDir));

  registerIpcHandlers();
  app.whenReady().then(() => createWindow(startupArgs));
  app.on("window-all-closed", () => app.quit());
}
