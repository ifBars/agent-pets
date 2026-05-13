const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");

const REQUIRED_FILES = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "PRIVACY.md",
  "SECURITY.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/pet_package.yml",
  ".github/ISSUE_TEMPLATE/provider_request.yml",
  "docs/market-research.md",
  "docs/product-spec.md",
  "docs/architecture.md",
  "docs/package-and-creator-spec.md",
  "docs/demo-script.md",
  "docs/release-checklist.md",
  "docs/x-launch-post.md",
  "docs/completion-audit.md",
  "docs/demo/agent-pets-demo.png",
  "docs/demo/agent-pets-demo.mp4",
  "docs/demo/pingu-qa/contact-sheet.png",
  "docs/demo/pingu-qa/review.json",
  "docs/launch-kit/README.md",
  "docs/launch-kit/REVIEW.md",
  "docs/launch-kit/manifest.json",
  "docs/launch-kit/agent-pets-demo.mp4",
  "docs/launch-kit/agent-pets-thumbnail.png",
  "docs/launch-kit/x-launch-post.md",
  "dist/Agent Pets Setup 0.1.0.exe",
  "dist/Agent Pets 0.1.0.exe",
  "dist/Agent Pets Setup 0.1.0.exe.blockmap",
  "dist/Agent Pets-0.1.0.AppImage",
  "dist/agent-pets_0.1.0_amd64.deb",
  "dist/latest-linux.yml",
  "dist/win-unpacked/Agent Pets.exe",
];

async function verifyRelease(rootDir = process.cwd()) {
  const checks = [];
  for (const relativePath of REQUIRED_FILES) {
    const fullPath = path.join(rootDir, relativePath);
    const stat = await statFile(fullPath);
    checks.push({
      name: relativePath,
      ok: Boolean(stat && stat.size > 0),
      size: stat?.size || 0,
    });
  }

  const packageJson = await readJson(path.join(rootDir, "package.json"));
  checks.push({
    name: "package.json:name",
    ok: packageJson?.name === "agent-pets",
    value: packageJson?.name,
  });
  checks.push({
    name: "package.json:bin",
    ok: Boolean(packageJson?.bin?.["agent-pets"] && packageJson?.bin?.["agent-pets-emit"] && packageJson?.bin?.["agent-pets-validate"]),
    value: packageJson?.bin || null,
  });

  const qaReview = await readJson(path.join(rootDir, "docs/demo/pingu-qa/review.json"));
  checks.push({
    name: "qa-review:ok",
    ok: qaReview?.ok === true && Array.isArray(qaReview?.manualReviewRequired),
    value: qaReview?.ok,
  });

  checks.push(...(await verifyLaunchManifest(rootDir)));

  const ok = checks.every((check) => check.ok);
  return { ok, checks };
}

async function statFile(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function verifyLaunchManifest(rootDir) {
  const manifestPath = path.join(rootDir, "docs/launch-kit/manifest.json");
  const manifest = await readJson(manifestPath);
  const checks = [
    {
      name: "launch-manifest:project",
      ok: manifest?.project === "agent-pets" && manifest?.version === "0.1.0",
      value: manifest ? `${manifest.project}@${manifest.version}` : null,
    },
    {
      name: "launch-manifest:files",
      ok:
        manifest?.launchKit?.video === "agent-pets-demo.mp4" &&
        manifest?.launchKit?.thumbnail === "agent-pets-thumbnail.png" &&
        manifest?.launchKit?.copy === "x-launch-post.md",
      value: manifest?.launchKit || null,
    },
    {
      name: "launch-manifest:artifacts",
      ok: Array.isArray(manifest?.artifacts) && manifest.artifacts.length > 0,
      value: manifest?.artifacts?.length || 0,
    },
  ];

  if (!Array.isArray(manifest?.artifacts)) return checks;

  for (const artifact of manifest.artifacts) {
    const relativePath = typeof artifact.path === "string" ? artifact.path : "";
    const fullPath = path.join(rootDir, relativePath);
    const stat = await statFile(fullPath);
    let actualSha = null;
    if (stat) actualSha = await sha256File(fullPath);
    checks.push({
      name: `launch-manifest:${relativePath}`,
      ok:
        Boolean(stat) &&
        artifact.size === stat.size &&
        typeof artifact.sha256 === "string" &&
        /^[a-f0-9]{64}$/.test(artifact.sha256) &&
        artifact.sha256 === actualSha,
      value: stat ? `${stat.size}:${actualSha}` : null,
    });
  }

  return checks;
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(await fs.readFile(filePath));
  return hash.digest("hex");
}

async function main() {
  const result = await verifyRelease(process.cwd());
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  REQUIRED_FILES,
  verifyRelease,
  verifyLaunchManifest,
};
