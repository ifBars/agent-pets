const { createHash } = require("node:crypto");
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const LAUNCH_FILES = [
  "dist/Agent Pets Setup 0.1.0.exe",
  "dist/Agent Pets 0.1.0.exe",
  "dist/Agent Pets-0.1.0.AppImage",
  "dist/agent-pets_0.1.0_amd64.deb",
  "docs/demo/agent-pets-demo.mp4",
  "docs/demo/agent-pets-demo.png",
];

async function prepareLaunchKit(rootDir = process.cwd()) {
  const outDir = path.join(rootDir, "docs", "launch-kit");
  await fs.mkdir(outDir, { recursive: true });

  const videoSource = path.join(rootDir, "docs/demo/agent-pets-demo.mp4");
  const imageSource = path.join(rootDir, "docs/demo/agent-pets-demo.png");
  const videoOut = path.join(outDir, "agent-pets-demo.mp4");
  const thumbOut = path.join(outDir, "agent-pets-thumbnail.png");
  const copyOut = path.join(outDir, "x-launch-post.md");
  const manifestOut = path.join(outDir, "manifest.json");
  const readmeOut = path.join(outDir, "README.md");

  await fs.copyFile(videoSource, videoOut);
  await fs.copyFile(path.join(rootDir, "docs/x-launch-post.md"), copyOut);
  const thumbnailGenerated = await extractThumbnail(videoSource, thumbOut);
  if (!thumbnailGenerated) await fs.copyFile(imageSource, thumbOut);

  const manifest = await buildManifest(rootDir);
  manifest.launchKit = {
    video: "agent-pets-demo.mp4",
    thumbnail: "agent-pets-thumbnail.png",
    copy: "x-launch-post.md",
  };
  await fs.writeFile(manifestOut, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.writeFile(readmeOut, makeReadme(manifest), "utf8");
  return { outDir, manifest };
}

async function buildManifest(rootDir) {
  const artifacts = [];
  for (const relativePath of LAUNCH_FILES) {
    const fullPath = path.join(rootDir, relativePath);
    const stat = await fs.stat(fullPath);
    artifacts.push({
      path: relativePath.replaceAll("\\", "/"),
      size: stat.size,
      sha256: await sha256File(fullPath),
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    project: "agent-pets",
    version: "0.1.0",
    artifacts,
  };
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(await fs.readFile(filePath));
  return hash.digest("hex");
}

function extractThumbnail(videoPath, thumbnailPath) {
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-y", "-ss", "00:00:04", "-i", videoPath, "-frames:v", "1", thumbnailPath], {
      stdio: "ignore",
    });
    ffmpeg.on("exit", (code) => resolve(code === 0));
    ffmpeg.on("error", () => resolve(false));
  });
}

function makeReadme(manifest) {
  return `# Agent Pets Launch Kit

Files:

- \`agent-pets-demo.mp4\`: short demo video for X.
- \`agent-pets-thumbnail.png\`: thumbnail frame.
- \`x-launch-post.md\`: post and thread copy.
- \`manifest.json\`: artifact checksums.

Project: ${manifest.project}
Version: ${manifest.version}
Generated: ${manifest.generatedAt}
`;
}

async function main() {
  const result = await prepareLaunchKit(process.cwd());
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  LAUNCH_FILES,
  buildManifest,
  prepareLaunchKit,
  sha256File,
};
