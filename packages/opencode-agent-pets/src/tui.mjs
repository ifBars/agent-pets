import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const AgentPetsOpenCodeTuiPlugin = async (api, options = {}) => {
  const toggle = typeof options.toggle === "function" ? options.toggle : () => toggleAgentPets(options);
  const run = () => runToggle(api, toggle);
  if (api.keymap?.registerLayer) {
    api.keymap.registerLayer({
      commands: [
        {
          name: "agent-pets.toggle",
          title: "Toggle Agent Pets",
          category: "Agent Pets",
          namespace: "palette",
          slashName: "pet",
          run,
        },
      ],
      bindings: [],
    });
    return;
  }
  api.command?.register(() => [
    {
      title: "Toggle Agent Pets",
      value: "agent-pets.toggle",
      description: "Open or close the Agent Pets desktop monitor",
      category: "Agent Pets",
      slash: { name: "pet" },
      onSelect: run,
    },
  ]);
};

export const tui = AgentPetsOpenCodeTuiPlugin;
export default AgentPetsOpenCodeTuiPlugin;

async function runToggle(api, toggle) {
  try {
    const result = await toggle();
    api.ui.toast?.({
      variant: result.state === "stopped" ? "info" : "success",
      message: result.message,
    });
  } catch (error) {
    api.ui.toast?.({
      variant: "error",
      message: error instanceof Error ? error.message : "Agent Pets toggle failed",
    });
  }
}

export async function toggleAgentPets(options = {}) {
  const pidFile = cleanString(options.pidFile) || defaultPidFile();
  const existingPid = await readPid(pidFile);
  if (existingPid && isProcessAlive(existingPid)) {
    await stopProcess(existingPid);
    await fs.rm(pidFile, { force: true });
    return { state: "stopped", message: "Agent Pets closed" };
  }

  const launch = await resolveLaunchOptions(options);
  const child = spawn(launch.command, launch.args, {
    cwd: launch.cwd,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  await waitForLaunch(child);
  await fs.mkdir(path.dirname(pidFile), { recursive: true });
  await fs.writeFile(pidFile, `${child.pid}\n`, "utf8");
  child.unref();
  return { state: "started", message: "Agent Pets opened" };
}

export function defaultPidFile() {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "opencode-pet.pid");
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "opencode-pet.pid");
}

async function readPid(pidFile) {
  try {
    const pid = Number((await fs.readFile(pidFile, "utf8")).trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopProcess(pid) {
  if (process.platform === "win32") {
    return new Promise((resolve, reject) => {
      const child = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      child.on("exit", () => resolve());
      child.on("error", reject);
    });
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    process.kill(pid, "SIGTERM");
  }
  return Promise.resolve();
}

export async function resolveLaunchOptions(options = {}) {
  const command = cleanString(options.command);
  const args = Array.isArray(options.args) ? options.args.map(String) : null;
  const cwd = cleanString(options.cwd);
  if (command || args || cwd) {
    return {
      command: command || "bun",
      args: args || ["x", "@ifbars/agent-pets", "--provider", "opencode"],
      cwd: cwd || os.homedir(),
    };
  }

  const repoRoot = await findPackageRoot("@ifbars/agent-pets", cleanString(options.packageRootStartDir) || undefined);
  if (repoRoot) {
    return {
      command: "bun",
      args: ["run", "agent-pets", "--", "--provider", "opencode"],
      cwd: repoRoot,
    };
  }

  return {
    command: "bun",
    args: ["x", "@ifbars/agent-pets", "--provider", "opencode"],
    cwd: os.homedir(),
  };
}

async function waitForLaunch(child) {
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("error", onError);
      child.off("exit", onExit);
      callback(value);
    };
    const onError = (error) => finish(reject, error);
    const onExit = (code, signal) => {
      const detail = signal ? `signal ${signal}` : `code ${code}`;
      finish(reject, new Error(`Agent Pets exited before opening (${detail})`));
    };
    const timer = setTimeout(() => finish(resolve), 750);
    child.once("error", onError);
    child.once("exit", onExit);
  });
}

async function findPackageRoot(packageName, startDir = path.dirname(fileURLToPath(import.meta.url))) {
  let current = path.resolve(startDir);
  while (true) {
    const packageJson = path.join(current, "package.json");
    try {
      const manifest = JSON.parse(await fs.readFile(packageJson, "utf8"));
      if (manifest?.name === packageName) return current;
    } catch {
      // Keep walking up until we find the app package or hit the filesystem root.
    }
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
