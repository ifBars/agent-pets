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

  const command = cleanString(options.command) || "bun";
  const args = Array.isArray(options.args) ? options.args.map(String) : ["run", "pets", "--", "--provider", "opencode"];
  const cwd = cleanString(options.cwd) || defaultRepoRoot();
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  await fs.mkdir(path.dirname(pidFile), { recursive: true });
  await fs.writeFile(pidFile, `${child.pid}\n`, "utf8");
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

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}
