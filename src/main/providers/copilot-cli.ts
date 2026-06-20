import * as os from "node:os";
import * as path from "node:path";
import { mapActivityToPetState } from "./codex";
import { aggregateActivity, cleanString, findRecentFiles, normalizeState } from "./shared";
import { readJsonStatusActivity } from "./json-status";
import type { ActivityPayload, ActivitySession, ProviderReadOptions } from "../types";

export async function readCopilotCliActivity(options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const now = options.now || new Date();
  const statusFile = cleanString(options.bridgeFile) || cleanString(process.env.AGENT_PETS_COPILOT_STATUS_FILE) || defaultCopilotStatusFile();
  const bridge = await readJsonStatusActivity(statusFile, options);
  if (!bridge.error && bridge.active) {
    return { ...bridge, source: "copilot-cli", statusFile };
  }

  const session = await readSessionStateMtime(options, now);
  return aggregateActivity("copilot-cli", session ? [session] : [], now, {
    statusFile,
    error: bridge.error === "Status file not found" ? undefined : bridge.error,
  });
}

export function defaultCopilotStatusFile(): string {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "copilot-cli.json");
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "copilot-cli.json");
}

async function readSessionStateMtime(options: ProviderReadOptions, now: Date): Promise<ActivitySession | null> {
  const copilotHome = cleanString(options.projectsRoot) || cleanString(process.env.COPILOT_HOME) || path.join(os.homedir(), ".copilot");
  const sessionState = path.join(copilotHome, "session-state");
  let newest: { filePath: string; mtimeMs: number } | null = null;
  try {
    const files = await findRecentFiles(sessionState, () => true, 1);
    const file = files[0];
    if (file) newest = { filePath: file.filePath, mtimeMs: file.stat.mtimeMs };
  } catch {
    return null;
  }
  if (!newest) return null;

  const updatedAt = new Date(newest.mtimeMs).toISOString();
  const state = normalizeState("completed", updatedAt, now);
  return {
    id: newest.filePath,
    title: "GitHub Copilot CLI",
    detail: "Copilot CLI session state updated",
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    sessionPath: newest.filePath,
    latestEvent: "session updated",
  };
}
