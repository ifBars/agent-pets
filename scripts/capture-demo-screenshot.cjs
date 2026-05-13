const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { readPets } = require("../src/main/pet-store.cjs");
const { readActivity } = require("../src/main/activity.cjs");

async function main() {
  const root = path.resolve(__dirname, "..");
  const codexHome = process.env.CODEX_HOME || path.join(app.getPath("home"), ".codex");
  const demoDir = path.join(root, "docs", "demo");
  const tempDir = path.join(root, ".demo");
  const statusFile = path.join(tempDir, "screenshot-status.json");
  const screenshotPath = path.join(demoDir, "agent-pets-demo.png");

  await fs.mkdir(demoDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(
    statusFile,
    `${JSON.stringify(
      {
        state: "review",
        title: "Codex",
        detail: "Patch ready for review",
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  ipcMain.handle("pets:list", async () => readPets(codexHome));
  ipcMain.handle("activity:read", async () => readActivity({ codexHome, statusFile }));

  const win = new BrowserWindow({
    width: 920,
    height: 720,
    show: false,
    transparent: true,
    frame: false,
    backgroundColor: "#00000000",
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
      state: "review",
    },
  });
  await sleep(1500);
  const image = await win.capturePage();
  await fs.writeFile(screenshotPath, image.toPNG());
  await fs.rm(statusFile, { force: true });
  console.log(screenshotPath);
  app.quit();
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
