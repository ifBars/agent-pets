const { app, BrowserWindow } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { validatePetPackage } = require("../../../build/src/main/validate-pet.js");

const ROWS = [
  { row: 0, state: "idle", frames: 6 },
  { row: 1, state: "running-right", frames: 8 },
  { row: 2, state: "running-left", frames: 8 },
  { row: 3, state: "waving", frames: 4 },
  { row: 4, state: "jumping", frames: 5 },
  { row: 5, state: "failed", frames: 8 },
  { row: 6, state: "waiting", frames: 6 },
  { row: 7, state: "running", frames: 6 },
  { row: 8, state: "review", frames: 6 },
];

const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;
const SCALE = 0.28;

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args.petDir) {
    console.error("Usage: electron skills/agent-pet-maker/scripts/generate-pet-qa.cjs --pet-dir <path> [--out <qa-output>]");
    app.exit(2);
    return;
  }

  const petDir = path.resolve(args.petDir);
  const outDir = path.resolve(args.out || path.join(petDir, "qa"));
  await fs.mkdir(outDir, { recursive: true });

  const validation = await validatePetPackage(petDir);
  const review = buildReview(validation);
  const reviewPath = path.join(outDir, "review.json");
  const contactSheetPath = path.join(outDir, "contact-sheet.png");
  await fs.writeFile(reviewPath, `${JSON.stringify(review, null, 2)}\n`, "utf8");

  if (validation.ok) {
    await renderContactSheet(validation.spritesheet.path, contactSheetPath);
  }

  console.log(JSON.stringify({ ok: validation.ok, reviewPath, contactSheetPath: validation.ok ? contactSheetPath : null }, null, 2));
  app.quit();
}

function parseArgs(argv) {
  const args = { petDir: null, out: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--pet-dir") args.petDir = argv[++index] || null;
    else if (arg.startsWith("--pet-dir=")) args.petDir = arg.slice("--pet-dir=".length);
    else if (arg === "--out") args.out = argv[++index] || null;
    else if (arg.startsWith("--out=")) args.out = arg.slice("--out=".length);
  }
  return args;
}

function buildReview(validation) {
  return {
    ok: validation.ok,
    packageDir: validation.packageDir,
    structuralChecks: validation.checks,
    spritesheet: validation.spritesheet || null,
    rows: ROWS,
    manualReviewRequired: [
      "Confirm unused cells are transparent.",
      "Inspect edges on the contact sheet for matte halos and chroma-key fringing.",
      "Confirm every row preserves the same pet identity.",
      "Confirm state-specific effects are attached to the sprite and not detached particles, shadows, UI, or text.",
      "Confirm poses are complete, unclipped, and stay inside their cells.",
    ],
  };
}

async function renderContactSheet(spritesheetPath, contactSheetPath) {
  const width = 1100;
  const height = 900;
  const html = makeContactSheetHtml(pathToFileURL(spritesheetPath).href, width, height);
  const htmlPath = path.join(path.dirname(contactSheetPath), "contact-sheet.html");
  await fs.writeFile(htmlPath, html, "utf8");
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  await win.loadFile(htmlPath);
  await Promise.race([
    win.webContents.executeJavaScript("window.__ready", true),
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error("contact sheet render timed out")), 15000)),
  ]);
  const image = await win.capturePage();
  await fs.writeFile(contactSheetPath, image.toPNG());
  await fs.rm(htmlPath, { force: true });
  win.destroy();
}

function makeContactSheetHtml(imageUrl, width, height) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html, body { width: ${width}px; height: ${height}px; margin: 0; overflow: hidden; background: #111315; font-family: system-ui, sans-serif; }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <canvas id="sheet" width="${width}" height="${height}"></canvas>
    <script>
      window.__ready = new Promise((resolve, reject) => {
        const rows = ${JSON.stringify(ROWS)};
        const cellWidth = ${CELL_WIDTH};
        const cellHeight = ${CELL_HEIGHT};
        const scale = ${SCALE};
        const canvas = document.getElementById("sheet");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = "#111315";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#e8eee9";
          ctx.font = "700 24px system-ui, sans-serif";
          ctx.fillText("Agent Pets contact sheet", 24, 34);
          ctx.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
          ctx.fillStyle = "#aeb8b3";
          ctx.fillText("Review identity consistency, clipped poses, edge halos, detached effects, and unused-cell transparency.", 24, 58);
          const frameW = cellWidth * scale;
          const frameH = cellHeight * scale;
          const startX = 178;
          let y = 86;
          for (const row of rows) {
            ctx.fillStyle = "#dce7e0";
            ctx.font = "700 14px system-ui, sans-serif";
            ctx.fillText(row.state, 24, y + 58);
            ctx.fillStyle = "#7f8a86";
            ctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
            ctx.fillText("row " + row.row + " / " + row.frames + " frames", 24, y + 78);
            for (let column = 0; column < 8; column += 1) {
              const x = startX + column * (frameW + 14);
              drawChecker(ctx, x, y, frameW, frameH, column < row.frames);
              ctx.drawImage(img, column * cellWidth, row.row * cellHeight, cellWidth, cellHeight, x, y, frameW, frameH);
              ctx.strokeStyle = column < row.frames ? "rgba(255,255,255,0.3)" : "rgba(255,107,107,0.5)";
              ctx.strokeRect(x + 0.5, y + 0.5, frameW - 1, frameH - 1);
            }
            y += frameH + 18;
          }
          resolve(true);
        };
        img.onerror = reject;
        img.src = ${JSON.stringify(imageUrl)};

        function drawChecker(ctx, x, y, w, h, used) {
          ctx.fillStyle = used ? "#202427" : "#2b1719";
          ctx.fillRect(x, y, w, h);
          const size = 8;
          for (let yy = y; yy < y + h; yy += size) {
            for (let xx = x; xx < x + w; xx += size) {
              const even = ((xx - x) / size + (yy - y) / size) % 2 === 0;
              ctx.fillStyle = even ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)";
              ctx.fillRect(xx, yy, size, size);
            }
          }
        }
      });
    </script>
  </body>
</html>`;
}

if (process.versions.electron && process.type === "browser") {
  app.whenReady().then(() => {
    main().catch((error) => {
      console.error(error);
      app.exit(1);
    });
  });
}

module.exports = {
  ROWS,
  buildReview,
  parseArgs,
};
