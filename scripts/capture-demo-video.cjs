const { spawn } = require("node:child_process");
const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { readPets } = require("../src/main/pet-store.cjs");
const { readActivity } = require("../src/main/activity.cjs");
const { readSettings, updateSettings } = require("../src/main/settings.cjs");

const STEPS = [
  { state: "idle", title: "Agent Pets", detail: "Ready on desktop", seconds: 2 },
  { state: "running", title: "Codex", detail: "Editing provider files", seconds: 3 },
  { state: "waiting", title: "Codex", detail: "Waiting for approval", seconds: 3 },
  { state: "review", title: "Codex", detail: "Patch ready for review", seconds: 3 },
  { state: "failed", title: "Codex", detail: "Build failed in demo", seconds: 2 },
  { state: "idle", title: "Agent Pets", detail: "Back to idle", seconds: 2 },
];

async function main() {
  const root = path.resolve(__dirname, "..");
  const codexHome = process.env.CODEX_HOME || path.join(app.getPath("home"), ".codex");
  const demoDir = path.join(root, "docs", "demo");
  const tempDir = path.join(root, ".demo");
  const framesDir = path.join(tempDir, "frames");
  const statusFile = path.join(tempDir, "video-status.json");
  const settingsPath = path.join(tempDir, "video-settings.json");
  const videoPath = path.join(demoDir, "agent-pets-demo.mp4");

  await fs.rm(framesDir, { recursive: true, force: true });
  await fs.mkdir(framesDir, { recursive: true });
  await fs.mkdir(demoDir, { recursive: true });

  ipcMain.handle("pets:list", async () => readPets(codexHome));
  ipcMain.handle("activity:read", async (_event, options = {}) =>
    readActivity({ ...options, codexHome, statusFile: options.statusFile || statusFile }),
  );
  ipcMain.handle("settings:get", async () => readSettings(settingsPath));
  ipcMain.handle("settings:update", async (_event, patch) => updateSettings(settingsPath, patch));

  const win = new BrowserWindow({
    width: 920,
    height: 720,
    show: false,
    transparent: false,
    frame: false,
    backgroundColor: "#050606",
    webPreferences: {
      preload: path.join(root, "src", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadFile(path.join(root, "src", "renderer.html"), {
    query: {
      codexHome,
      statusFile,
      provider: "json-status",
      state: "idle",
    },
  });
  await sleep(800);

  let frameIndex = 0;
  const fps = 6;
  for (const step of STEPS) {
    await writeStatus(statusFile, step);
    await sleep(500);
    const totalFrames = step.seconds * fps;
    for (let frame = 0; frame < totalFrames; frame += 1) {
      const image = await win.capturePage();
      const framePath = path.join(framesDir, `frame-${String(frameIndex).padStart(4, "0")}.png`);
      await fs.writeFile(framePath, image.toPNG());
      frameIndex += 1;
      await sleep(Math.floor(1000 / fps));
    }
  }

  await encodeVideo(framesDir, videoPath, fps);
  await fs.rm(statusFile, { force: true });
  await fs.rm(framesDir, { recursive: true, force: true });
  console.log(videoPath);
  app.quit();
}

async function writeStatus(filePath, step) {
  await fs.writeFile(
    filePath,
    `${JSON.stringify({ state: step.state, title: step.title, detail: step.detail, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

function encodeVideo(framesDir, videoPath, fps) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        path.join(framesDir, "frame-%04d.png"),
        "-vf",
        "format=yuv420p",
        "-movflags",
        "+faststart",
        videoPath,
      ],
      { stdio: "inherit" },
    );
    ffmpeg.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.whenReady().then(() => {
  main().catch((error) => {
    console.error(error);
    app.exit(1);
  });
});
