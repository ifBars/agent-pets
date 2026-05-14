import * as fs from "node:fs/promises";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mapActivityToPetState } from "./codex";
import type { ActivityPayload, ActivitySession, ActivityState, FileWithStat, ProviderReadOptions } from "../types";

const execFileAsync = promisify(execFile);
export const VALID_STATES = new Set<ActivityState>(["idle", "running", "waiting", "failed", "review"]);

export async function execJson(command: string, args: string[], options: ProviderReadOptions = {}): Promise<unknown> {
  const { stdout } = await execFileAsync(command, args, {
    windowsHide: true,
    timeout: options.timeout || 10_000,
    cwd: options.cwd,
  });
  return stdout.trim() ? JSON.parse(stdout) : [];
}

export function aggregateActivity(source: string, sessions: ActivitySession[], now = new Date(), extra: Record<string, unknown> = {}): ActivityPayload {
  const active = sessions.find((item) => item.state === "running" || item.state === "waiting") || sessions[0] || null;
  const state = active?.state || "idle";
  return {
    source,
    state,
    petState: mapActivityToPetState(state),
    active,
    sessions,
    updatedAt: now.toISOString(),
    ...extra,
  };
}

export function normalizeState(value: unknown, updatedAt?: string, now = new Date()): ActivityState {
  const state = typeof value === "string" ? value.toLowerCase() : "";
  if (VALID_STATES.has(state as ActivityState)) return state as ActivityState;
  if (["error", "errored", "fail", "failed", "crashed"].includes(state)) return "failed";
  if (["busy", "active", "working", "running", "streaming"].includes(state)) return "running";
  if (["blocked", "needs-input", "waiting", "paused"].includes(state)) return "waiting";
  if (["complete", "completed", "done", "finished", "success", "succeeded", "review"].includes(state)) return "review";
  const ageMs = now.getTime() - new Date(updatedAt || 0).getTime();
  if (Number.isFinite(ageMs) && ageMs < 3 * 60 * 1000) return "running";
  if (Number.isFinite(ageMs) && ageMs < 30 * 60 * 1000) return "review";
  return "idle";
}

export function normalizeCommandSessions(output: any, source: string, now = new Date()): ActivitySession[] {
  const rows = Array.isArray(output) ? output : Array.isArray(output?.sessions) ? output.sessions : [];
  return rows
    .map((item, index) => normalizeCommandSession(item, index, source, now))
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
}

function normalizeCommandSession(item: any, index: number, source: string, now: Date): ActivitySession | null {
  if (!item || typeof item !== "object") return null;
  const updatedAt =
    cleanString(item.updatedAt) ||
    cleanString(item.updated_at) ||
    cleanString(item.modifiedAt) ||
    timestampString(item.updated) ||
    timestampString(item.created) ||
    timestampString(item.time_updated) ||
    timestampString(item.time_created) ||
    cleanString(item.time?.updated) ||
    cleanString(item.time?.created) ||
    now.toISOString();
  const title =
    cleanString(item.title) ||
    cleanString(item.name) ||
    cleanString(item.path) ||
    cleanString(item.project) ||
    `${source} session ${index + 1}`;
  const detail =
    cleanString(item.detail) ||
    cleanString(item.message) ||
    cleanString(item.summary) ||
    cleanString(item.model) ||
    `${source} session activity`;
  const state = normalizeState(item.state || item.status, updatedAt, now);
  return {
    id: cleanString(item.id) || cleanString(item.sessionID) || cleanString(item.sessionId) || `${source}-${index}`,
    title,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: detail,
  };
}

export async function findRecentFiles(rootDir: string, predicate: (fullPath: string, name: string) => boolean, limit = 8): Promise<FileWithStat[]> {
  const files: FileWithStat[] = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (!dir) continue;
    let entries: any[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile() && predicate(fullPath, entry.name)) {
        try {
          const stat = await fs.stat(fullPath);
          files.push({ filePath: fullPath, stat });
        } catch {
          // Ignore races from active session writers.
        }
      }
    }
  }
  return files.sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs).slice(0, limit);
}

export async function readJsonlTail(filePath: string, limit = 120): Promise<any[]> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return text
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .map((line) => parseJsonLine(line))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseJsonLine(line: string): unknown | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function timestampString(value: unknown): string | null {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
