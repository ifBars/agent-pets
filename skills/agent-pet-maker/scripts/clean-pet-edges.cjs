#!/usr/bin/env node
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const DEFAULT_TOLERANCE = 70;
const DEFAULT_RADIUS = 1;
const DEFAULT_TRANSPARENT_ALPHA = 8;
const DEFAULT_MIN_ALPHA = 24;
const DEFAULT_MAX_AUTO_COLORS = 3;

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    petDir: "",
    input: "",
    output: "",
    inPlace: false,
    backup: true,
    fringe: [],
    tolerance: DEFAULT_TOLERANCE,
    radius: DEFAULT_RADIUS,
    transparentAlpha: DEFAULT_TRANSPARENT_ALPHA,
    minAlpha: DEFAULT_MIN_ALPHA,
    maxAutoColors: DEFAULT_MAX_AUTO_COLORS,
    auto: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    const [flag, inlineValue] = raw.split("=", 2);
    const nextValue = () => inlineValue ?? argv[++index];
    switch (flag) {
      case "--pet-dir":
        args.petDir = nextValue();
        break;
      case "--input":
        args.input = nextValue();
        break;
      case "--output":
        args.output = nextValue();
        break;
      case "--fringe":
        args.fringe.push(parseHexColor(nextValue()));
        args.auto = false;
        break;
      case "--tolerance":
        args.tolerance = Number(nextValue());
        break;
      case "--radius":
        args.radius = Number(nextValue());
        break;
      case "--transparent-alpha":
        args.transparentAlpha = Number(nextValue());
        break;
      case "--min-alpha":
        args.minAlpha = Number(nextValue());
        break;
      case "--max-auto-colors":
        args.maxAutoColors = Number(nextValue());
        break;
      case "--auto":
        args.auto = true;
        break;
      case "--in-place":
        args.inPlace = true;
        break;
      case "--no-backup":
        args.backup = false;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${raw}`);
    }
  }

  args.tolerance = clampNumber(args.tolerance, 1, 255, DEFAULT_TOLERANCE);
  args.radius = clampNumber(args.radius, 1, 3, DEFAULT_RADIUS);
  args.transparentAlpha = clampNumber(args.transparentAlpha, 0, 254, DEFAULT_TRANSPARENT_ALPHA);
  args.minAlpha = clampNumber(args.minAlpha, 1, 255, DEFAULT_MIN_ALPHA);
  args.maxAutoColors = clampNumber(args.maxAutoColors, 1, 8, DEFAULT_MAX_AUTO_COLORS);
  return args;
}

function usage() {
  return [
    "Usage: electron skills/agent-pet-maker/scripts/clean-pet-edges.cjs --pet-dir <path> [options]",
    "",
    "Options:",
    "  --pet-dir <path>            Pet package folder containing pet.json.",
    "  --input <path>              Input spritesheet. Defaults to pet.json spritesheetPath.",
    "  --output <path>             Output image. Defaults to <input>.cleaned.webp.",
    "  --in-place                  Replace the input file after writing a backup.",
    "  --no-backup                 Do not create <input>.bak when using --in-place.",
    "  --fringe <#rrggbb>          Target fringe color. May be repeated.",
    "  --auto                      Auto-detect green/purple chroma fringe colors. Default.",
    "  --tolerance <1-255>         Color distance tolerance. Default: 70.",
    "  --radius <1-3>              Transparent-neighbor search radius. Default: 1.",
  ].join("\n");
}

function clampNumber(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

function parseHexColor(value) {
  if (typeof value !== "string") throw new Error("Color must be a hex string");
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) throw new Error(`Invalid color: ${value}`);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function colorToHex(color) {
  return `#${[color.r, color.g, color.b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function processPixels(input, width, height, options = {}) {
  const data = new Uint8ClampedArray(input);
  const transparentAlpha = options.transparentAlpha ?? DEFAULT_TRANSPARENT_ALPHA;
  const minAlpha = options.minAlpha ?? DEFAULT_MIN_ALPHA;
  const radius = options.radius ?? DEFAULT_RADIUS;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const targets = options.targets?.length
    ? options.targets
    : detectFringeColors(data, width, height, {
        transparentAlpha,
        minAlpha,
        radius,
        maxColors: options.maxAutoColors ?? DEFAULT_MAX_AUTO_COLORS,
      });

  let changedPixels = 0;
  if (targets.length === 0) return { data, changedPixels, targets };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = pixelOffset(width, x, y);
      const alpha = data[offset + 3];
      if (alpha < minAlpha) continue;
      if (!hasTransparentNeighbor(data, width, height, x, y, radius, transparentAlpha)) continue;
      const color = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
      if (!isTargetFringe(color, targets, tolerance)) continue;

      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      changedPixels += 1;
    }
  }

  return { data, changedPixels, targets };
}

function detectFringeColors(data, width, height, options = {}) {
  const transparentAlpha = options.transparentAlpha ?? DEFAULT_TRANSPARENT_ALPHA;
  const minAlpha = options.minAlpha ?? DEFAULT_MIN_ALPHA;
  const radius = options.radius ?? DEFAULT_RADIUS;
  const maxColors = options.maxColors ?? DEFAULT_MAX_AUTO_COLORS;
  const buckets = new Map();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = pixelOffset(width, x, y);
      const alpha = data[offset + 3];
      if (alpha < minAlpha) continue;
      if (!hasTransparentNeighbor(data, width, height, x, y, radius, transparentAlpha)) continue;

      const color = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
      const hsv = rgbToHsv(color);
      if (hsv.s < 0.28 || hsv.v < 0.2) continue;
      if (!isCommonCutoutHue(hsv.h)) continue;

      const key = `${Math.round(color.r / 16)},${Math.round(color.g / 16)},${Math.round(color.b / 16)}`;
      const existing = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0, score: 0 };
      existing.count += 1;
      existing.r += color.r;
      existing.g += color.g;
      existing.b += color.b;
      existing.score += hsv.s * hsv.v;
      buckets.set(key, existing);
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxColors)
    .map((bucket) => ({
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
    }));
}

function isCommonCutoutHue(hue) {
  return (hue >= 80 && hue <= 175) || (hue >= 245 && hue <= 325);
}

function isTargetFringe(color, targets, tolerance) {
  return targets.some((target) => colorDistance(color, target) <= tolerance);
}

function colorDistance(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function hasTransparentNeighbor(data, width, height, x, y, radius, transparentAlpha) {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
      if (data[pixelOffset(width, nx, ny) + 3] <= transparentAlpha) return true;
    }
  }
  return false;
}

function pixelOffset(width, x, y) {
  return (y * width + x) * 4;
}

function rgbToHsv(color) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

async function resolveInput(args) {
  if (args.input) return path.resolve(args.input);
  if (!args.petDir) throw new Error("--pet-dir is required unless --input is provided");
  const petDir = path.resolve(args.petDir);
  const manifest = JSON.parse(await fs.readFile(path.join(petDir, "pet.json"), "utf8"));
  const spritesheetPath = typeof manifest.spritesheetPath === "string" ? manifest.spritesheetPath : "spritesheet.webp";
  const input = path.resolve(petDir, spritesheetPath);
  if (!path.relative(petDir, input) || path.relative(petDir, input).startsWith("..")) {
    throw new Error("spritesheetPath must resolve inside the pet folder");
  }
  return input;
}

function resolveOutput(input, args) {
  if (args.inPlace) return input;
  if (args.output) return path.resolve(args.output);
  const parsed = path.parse(input);
  return path.join(parsed.dir, `${parsed.name}.cleaned.webp`);
}

async function runElectronCleanup(args) {
  const pythonScript = path.join(__dirname, "clean_pet_edges.py");
  const result = spawnSync("python", [pythonScript, ...process.argv.slice(2)], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
  return;

  const { app, BrowserWindow } = require("electron");
  await app.whenReady();
  const input = await resolveInput(args);
  const output = resolveOutput(input, args);
  const targets = args.fringe.map(colorToHex);
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true, contextIsolation: false, nodeIntegration: false } });
  try {
    await win.loadURL("data:text/html,<meta charset=utf-8><title>Agent Pets Edge Cleaner</title>");
    const result = await win.webContents.executeJavaScript(makeBrowserScript({
      inputUrl: pathToFileURL(input).href,
      targets,
      tolerance: args.tolerance,
      radius: args.radius,
      transparentAlpha: args.transparentAlpha,
      minAlpha: args.minAlpha,
      maxAutoColors: args.maxAutoColors,
      outputType: output.toLowerCase().endsWith(".png") ? "image/png" : "image/webp",
    }));
    const buffer = Buffer.from(result.dataUrl.split(",", 2)[1], "base64");
    if (args.inPlace && args.backup) {
      await fs.copyFile(input, `${input}.bak`);
    }
    await fs.writeFile(output, buffer);
    console.log(JSON.stringify({
      input,
      output,
      changedPixels: result.changedPixels,
      targets: result.targets,
      backup: args.inPlace && args.backup ? `${input}.bak` : null,
    }, null, 2));
  } finally {
    win.destroy();
    app.quit();
  }
}

function makeBrowserScript(config) {
  return `new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const processor = ${processPixels.toString()};
        const detector = ${detectFringeColors.toString()};
        const hasNeighbor = ${hasTransparentNeighbor.toString()};
        const offset = ${pixelOffset.toString()};
        const dist = ${colorDistance.toString()};
        const targetCheck = ${isTargetFringe.toString()};
        const hsv = ${rgbToHsv.toString()};
        const hueCheck = ${isCommonCutoutHue.toString()};
        window.detectFringeColors = detector;
        window.hasTransparentNeighbor = hasNeighbor;
        window.pixelOffset = offset;
        window.colorDistance = dist;
        window.isTargetFringe = targetCheck;
        window.rgbToHsv = hsv;
        window.isCommonCutoutHue = hueCheck;
        const result = processor(imageData.data, canvas.width, canvas.height, {
          targets: ${JSON.stringify(config.targets)}.map((value) => ({
            r: Number.parseInt(value.slice(1, 3), 16),
            g: Number.parseInt(value.slice(3, 5), 16),
            b: Number.parseInt(value.slice(5, 7), 16),
          })),
          tolerance: ${JSON.stringify(config.tolerance)},
          radius: ${JSON.stringify(config.radius)},
          transparentAlpha: ${JSON.stringify(config.transparentAlpha)},
          minAlpha: ${JSON.stringify(config.minAlpha)},
          maxAutoColors: ${JSON.stringify(config.maxAutoColors)},
        });
        imageData.data.set(result.data);
        ctx.putImageData(imageData, 0, 0);
        resolve({
          changedPixels: result.changedPixels,
          targets: result.targets.map((color) => "#" + [color.r, color.g, color.b].map((part) => part.toString(16).padStart(2, "0")).join("")),
          dataUrl: canvas.toDataURL(${JSON.stringify(config.outputType)}),
        });
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = ${JSON.stringify(config.inputUrl)};
  })`;
}

if (require.main === module) {
  let args;
  try {
    args = parseArgs();
    if (args.help) {
      console.log(usage());
      process.exit(0);
    }
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exit(1);
  }
  runElectronCleanup(args).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  colorDistance,
  detectFringeColors,
  parseArgs,
  parseHexColor,
  processPixels,
};
