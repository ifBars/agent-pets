import * as fs from "node:fs/promises";
import * as path from "node:path";
import { mapActivityToPetState } from "./codex";
import { aggregateActivity, cleanString, execJson, findRecentFiles, normalizeCommandSessions } from "./shared";
import type { ActivityPayload, ActivitySession, ProviderReadOptions } from "../types";

export async function readT3CodeActivity(options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const now = options.now || new Date();
  const runner = options.runner || runT3CodeSessionList;
  try {
    const sessions = normalizeT3CodeSessions(await runner(options), now);
    return aggregateActivity("t3code", sessions, now);
  } catch (error) {
    const sessions = await readT3CodeLocalSessions(options, now);
    if (sessions.length > 0) return aggregateActivity("t3code", sessions, now, { mode: "local-storage" });
    return aggregateActivity("t3code", [], now, { error: error instanceof Error ? error.message : String(error) });
  }
}

export async function runT3CodeSessionList(options: ProviderReadOptions = {}): Promise<unknown> {
  const maxCount = Number.isFinite(options.maxCount) ? String(options.maxCount) : "8";
  const commands = options.commands || ["t3code", "t3"];
  let lastError: unknown = null;
  for (const command of commands) {
    try {
      return await execJson(command, ["session", "list", "--format", "json", "--max-count", maxCount], options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("T3Code CLI not available");
}

export function normalizeT3CodeSessions(output: any, now = new Date()): ActivitySession[] {
  return normalizeCommandSessions(output, "t3code", now).map((session) => {
    if (session.state === "running" && isCompletedText(session.latestEvent)) {
      return { ...session, state: "review", petState: "review" };
    }
    return session;
  });
}

export async function readT3CodeLocalSessions(options: ProviderReadOptions = {}, now = new Date()): Promise<ActivitySession[]> {
  const roots = options.roots || defaultT3CodeRoots();
  const sessions: ActivitySession[] = [];
  for (const root of roots) {
    const leveldbRoot = path.join(root, "Local Storage", "leveldb");
    const files = await findRecentFiles(leveldbRoot, (_fullPath, name) => /\.(log|ldb)$/.test(name), 8);
    for (const file of files) {
      const text = await fs.readFile(file.filePath, "latin1").catch(() => "");
      for (const draftStore of extractLocalStorageJson(text, "t3code:composer-drafts:v1")) {
        sessions.push(...normalizeDraftStore(draftStore, { root, file, now }));
      }
    }
  }
  return dedupeSessions(sessions)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
}

function defaultT3CodeRoots(): string[] {
  const appData = process.env.APPDATA;
  return appData ? [path.join(appData, "t3code"), path.join(appData, "t3code-dev")] : [];
}

export function normalizeDraftStore(store: any, context: any): ActivitySession[] {
  const state = store?.state && typeof store.state === "object" ? store.state : {};
  const drafts = state.draftsByThreadKey || state.draftsByThreadId || {};
  const draftThreads = state.draftThreadsByThreadKey || state.draftThreadsByThreadId || {};
  const sessions: ActivitySession[] = [];

  for (const [key, thread] of Object.entries(draftThreads)) {
    if (!thread || typeof thread !== "object") continue;
    const draft = drafts[key] || {};
    sessions.push(normalizeDraftThread(key, thread, draft, context));
  }

  for (const [key, draft] of Object.entries(drafts)) {
    if (draftThreads[key]) continue;
    sessions.push(normalizeDraftThread(key, {}, draft, context));
  }

  return sessions.filter(Boolean);
}

function normalizeDraftThread(key: string, thread: any, draft: any, context: any): ActivitySession {
  const updatedAt = cleanString(thread.updatedAt) || cleanString(thread.createdAt) || new Date(context.file.stat.mtimeMs).toISOString();
  const prompt = cleanString(draft.prompt);
  const project = cleanString(thread.logicalProjectKey) || cleanString(thread.projectId) || cleanString(thread.environmentId);
  const branch = cleanString(thread.branch);
  const title = project ? labelProject(project) : `T3Code thread ${String(key).slice(0, 8)}`;
  const state = prompt && isRecent(updatedAt, context.now, 30 * 60 * 1000) ? "waiting" : "idle";
  return {
    id: cleanString(thread.threadId) || String(key),
    title,
    detail: prompt ? "draft waiting to send" : branch ? `branch: ${branch}` : "draft thread",
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: prompt ? "draft waiting to send" : "draft thread",
    directory: cleanString(thread.worktreePath),
    projectId: cleanString(thread.projectId),
    sourcePath: context.file.filePath,
  };
}

function isRecent(value: unknown, now: Date, windowMs: number): boolean {
  const ageMs = now.getTime() - new Date(String(value)).getTime();
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= windowMs;
}

export function extractLocalStorageJson(text: string, key: string): any[] {
  const results: any[] = [];
  let offset = 0;
  while (offset < text.length) {
    const keyIndex = text.indexOf(key, offset);
    if (keyIndex === -1) break;
    const jsonStart = text.indexOf("{", keyIndex + key.length);
    if (jsonStart === -1) break;
    const jsonText = extractBalancedObject(text, jsonStart);
    if (jsonText) {
      try {
        results.push(JSON.parse(jsonText));
      } catch {
        // Ignore stale or compressed LevelDB fragments.
      }
      offset = jsonStart + jsonText.length;
    } else {
      offset = jsonStart + 1;
    }
  }
  return results;
}

function extractBalancedObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }
    if (char === "\"") inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

function dedupeSessions(sessions: ActivitySession[]): ActivitySession[] {
  const byId = new Map<string, ActivitySession>();
  for (const session of sessions) {
    const current = byId.get(session.id);
    if (!current || new Date(session.updatedAt).getTime() >= new Date(current.updatedAt).getTime()) byId.set(session.id, session);
  }
  return [...byId.values()];
}

function labelProject(value: unknown): string {
  const text = String(value);
  if (text.includes("\\")) return path.basename(text);
  if (text.includes("/")) return text.split("/").filter(Boolean).slice(-2).join("/");
  if (text.includes(":")) return text.split(":").pop() || text;
  return text;
}

function isCompletedText(value: unknown): boolean {
  return ["complete", "completed", "done", "finished", "success", "succeeded", "review"].includes(String(value || "").toLowerCase());
}
