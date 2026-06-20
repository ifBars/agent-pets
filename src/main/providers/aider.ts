import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { mapActivityToPetState } from "./codex";
import { aggregateActivity, cleanString, normalizeState } from "./shared";
import { readJsonStatusActivity } from "./json-status";
import type { ActivityPayload, ActivitySession, ProviderReadOptions } from "../types";

export async function readAiderActivity(options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const now = options.now || new Date();
  const statusFile = cleanString(options.bridgeFile) || cleanString(process.env.AGENT_PETS_AIDER_STATUS_FILE) || defaultAiderStatusFile();
  const bridge = await readJsonStatusActivity(statusFile, options);
  if (!bridge.error && bridge.active) {
    return { ...bridge, source: "aider", statusFile };
  }

  const historySession = await readAiderHistoryMtime(options, now);
  return aggregateActivity("aider", historySession ? [historySession] : [], now, {
    statusFile,
    error: bridge.error === "Status file not found" ? undefined : bridge.error,
  });
}

export function defaultAiderStatusFile(): string {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "aider.json");
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "aider.json");
}

async function readAiderHistoryMtime(options: ProviderReadOptions, now: Date): Promise<ActivitySession | null> {
  const cwd = cleanString(options.cwd) || process.cwd();
  const historyPath = path.resolve(cwd, cleanString(process.env.AIDER_CHAT_HISTORY_FILE) || ".aider.chat.history.md");
  try {
    const stat = await fs.stat(historyPath);
    const updatedAt = new Date(stat.mtimeMs).toISOString();
    const state = normalizeState("completed", updatedAt, now);
    return {
      id: historyPath,
      title: path.basename(cwd) || "Aider session",
      detail: "Aider chat history updated",
      state,
      petState: mapActivityToPetState(state),
      updatedAt,
      sessionPath: historyPath,
      latestEvent: "history updated",
    };
  } catch {
    return null;
  }
}
