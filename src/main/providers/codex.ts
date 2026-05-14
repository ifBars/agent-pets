import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ActivityPayload, ActivitySession, ActivityState, ProviderReadOptions } from "../types";

const ACTIVE_WINDOW_MS = 90 * 1000;
const REVIEW_WINDOW_MS = 20 * 60 * 1000;

export async function readCodexActivity(codexHome: string, options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const now = options.now || new Date();
  const sessionIndexPath = path.join(codexHome, "session_index.jsonl");
  const entries = await readSessionIndex(sessionIndexPath);
  const recent = await resolveRecentCodexSessions(codexHome, entries);
  const sessions: ActivitySession[] = [];
  for (const entry of recent) {
    const sessionPath = entry.sessionPath || (await findSessionPath(codexHome, entry.id));
    const sample = sessionPath ? await readSessionSample(sessionPath) : null;
    sessions.push(classifySession(entry, sessionPath, sample, now));
  }

  const active = sessions.find((item) => item.state === "running" || item.state === "waiting") || sessions[0] || null;
  const aggregateState = active?.state || "idle";
  return {
    source: "codex",
    codexHome,
    state: aggregateState,
    petState: mapActivityToPetState(aggregateState),
    active,
    sessions,
    updatedAt: now.toISOString(),
  };
}

export async function resolveRecentCodexSessions(codexHome: string, indexEntries: any[], limit = 8): Promise<any[]> {
  const byId = new Map<string, any>();
  for (const entry of indexEntries) {
    if (!entry?.id) continue;
    byId.set(entry.id, {
      id: entry.id,
      thread_name: entry.thread_name,
      updated_at: entry.updated_at,
      sessionPath: null,
      sortTime: new Date(entry.updated_at).getTime(),
    });
  }

  for (const file of await findRecentSessionFiles(codexHome, Math.max(limit * 2, 16))) {
    const meta = await readSessionFileMeta(file.filePath);
    const id = meta?.id || extractSessionIdFromPath(file.filePath);
    if (!id) continue;
    const previous = byId.get(id) || {};
    const fileUpdatedAt = new Date(file.stat.mtimeMs).toISOString();
    byId.set(id, {
      ...previous,
      id,
      thread_name: previous.thread_name || meta?.thread_name || meta?.title || titleFromCwd(meta?.cwd) || titleFromSessionPath(file.filePath),
      updated_at: fileUpdatedAt,
      sessionPath: file.filePath,
      sortTime: file.stat.mtimeMs,
    });
  }

  return [...byId.values()]
    .sort((left, right) => (right.sortTime || 0) - (left.sortTime || 0))
    .slice(0, limit);
}

export async function readSessionIndex(filePath: string): Promise<any[]> {
  let text = "";
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return [];
  }
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseJsonLine(line))
    .filter((entry: any) => entry && entry.id && entry.updated_at);
}

async function findRecentSessionFiles(codexHome: string, limit: number): Promise<Array<{ filePath: string; stat: { mtimeMs: number } }>> {
  const root = path.join(codexHome, "sessions");
  const files: Array<{ filePath: string; stat: { mtimeMs: number } }> = [];
  const stack = [root];
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
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        try {
          files.push({ filePath: fullPath, stat: await fs.stat(fullPath) });
        } catch {
          // Ignore races from active session writers.
        }
      }
    }
  }
  return files.sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs).slice(0, limit);
}

export async function findSessionPath(codexHome: string, sessionId: string): Promise<string | null> {
  const sessionsRoot = path.join(codexHome, "sessions");
  const stack = [sessionsRoot];
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
      else if (entry.isFile() && entry.name.endsWith(".jsonl") && entry.name.includes(sessionId)) return fullPath;
    }
  }
  return null;
}

async function readSessionSample(filePath: string): Promise<any | null> {
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  let text = "";
  try {
    stat = await fs.stat(filePath);
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  const lines = text.split(/\r?\n/).filter(Boolean).slice(-120);
  const records = lines.map((line) => parseJsonLine(line)).filter(Boolean);
  return {
    filePath,
    mtimeMs: stat.mtimeMs,
    records,
  };
}

async function readSessionFileMeta(filePath: string): Promise<any | null> {
  try {
    const handle = await fs.open(filePath, "r");
    try {
      const buffer = Buffer.alloc(64 * 1024);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      const firstLine = buffer.subarray(0, bytesRead).toString("utf8").split(/\r?\n/, 1)[0];
      const record = parseJsonLine(firstLine);
      return record?.type === "session_meta" && record.payload ? record.payload : null;
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

export function classifySession(entry: any, sessionPath: string | null, sample: any, now: Date): ActivitySession {
  const updatedAt = new Date(entry.updated_at);
  const lastWriteAgeMs = sample ? now.getTime() - sample.mtimeMs : now.getTime() - updatedAt.getTime();
  const records = sample?.records || [];
  const latestPayload = findLatestPayload(records);
  const stickyCompleted = hasStickyCompletion(records);
  const pendingToolCall = !stickyCompleted && hasPendingToolCall(records);
  const recentlyActive = !stickyCompleted && lastWriteAgeMs <= ACTIVE_WINDOW_MS && hasRecentActivePayload(records);
  const requestedInput = latestPayload?.name === "request_user_input" || JSON.stringify(latestPayload || {}).includes("request_user_input");
  const failed = isFailurePayload(latestPayload);
  const completed = isCompletionPayload(latestPayload);

  let state = "idle";
  if (stickyCompleted) state = "review";
  else if (requestedInput) state = "waiting";
  else if (pendingToolCall || recentlyActive) state = "running";
  else if (failed) state = "failed";
  else if (completed) state = "review";
  else if (isActiveWorkPayload(latestPayload) && lastWriteAgeMs <= ACTIVE_WINDOW_MS) state = "running";
  else if (isReviewPayload(latestPayload) && lastWriteAgeMs <= REVIEW_WINDOW_MS) state = "review";
  else if (!latestPayload && lastWriteAgeMs <= ACTIVE_WINDOW_MS) state = "running";
  else if (lastWriteAgeMs <= REVIEW_WINDOW_MS) state = "review";

  return {
    id: entry.id,
    title: entry.thread_name || "Untitled Codex thread",
    updatedAt: updatedAt.toISOString(),
    state: state as ActivityState,
    petState: mapActivityToPetState(state),
    sessionPath,
    lastWriteAgeMs,
    latestEvent: summarizePayload(latestPayload),
  };
}

function hasPendingToolCall(records: any[]): boolean {
  const calls = new Map();
  for (const record of records) {
    const payload = record.payload;
    if (!payload || payload.type !== "function_call") continue;
    calls.set(payload.call_id, true);
  }
  for (const record of records) {
    const payload = record.payload;
    if (!payload || payload.type !== "function_call_output") continue;
    calls.delete(payload.call_id);
  }
  return calls.size > 0;
}

function hasStickyCompletion(records: any[]): boolean {
  const completionIndex = findLatestCompletionIndex(records);
  if (completionIndex < 0) return false;
  for (let index = completionIndex + 1; index < records.length; index += 1) {
    if (isWorkStartRecord(records[index])) return false;
  }
  return true;
}

function findLatestCompletionIndex(records: any[]): number {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (isCompletionPayload(records[index]?.payload)) return index;
  }
  return -1;
}

function isWorkStartRecord(record: any): boolean {
  const payload = record?.payload;
  if (!payload || typeof payload !== "object") return false;
  if (payload.type === "function_call" || payload.type === "custom_tool_call") return true;
  if (payload.type === "reasoning") return true;
  if (payload.type === "agent_message" && payload.phase === "commentary") return true;
  if (payload.type === "message" && payload.role === "user") return true;
  if (payload.type === "message" && payload.phase === "commentary") return true;
  if (payload.type === "user_message") return true;
  return false;
}

function hasRecentActivePayload(records: any[]): boolean {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const payload = records[index]?.payload;
    if (isPassivePayload(payload)) continue;
    if (isCompletionPayload(payload)) return false;
    if (isActiveWorkPayload(payload)) return true;
  }
  return false;
}

function findLatestPayload(records: any[]): any | null {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const payload = records[index]?.payload;
    if (isPassivePayload(payload)) continue;
    if (payload && typeof payload === "object") return payload;
  }
  return null;
}

function isPassivePayload(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  return payload.type === "token_count";
}

function summarizePayload(payload: any): string | null {
  if (!payload) return null;
  if (payload.type === "function_call") return `tool: ${payload.name || "unknown"}`;
  if (payload.type === "function_call_output") return "tool output";
  if (payload.type === "custom_tool_call_output") return "tool output";
  if (payload.type === "message") return "message";
  if (payload.type) return payload.type;
  return null;
}

function extractSessionIdFromPath(filePath: string): string | null {
  const match = path.basename(filePath).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
  return match?.[1] || null;
}

function titleFromSessionPath(filePath: string): string {
  const name = path.basename(filePath, ".jsonl");
  const title = name.replace(/^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-/, "");
  return extractSessionIdFromPath(filePath) === title ? "Codex thread" : title || "Codex thread";
}

function titleFromCwd(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const name = trimmed.includes("\\") ? path.win32.basename(trimmed) : path.basename(trimmed);
  if (!name) return null;
  const title = name
    .replace(/^\d{4}-\d{2}-\d{2}-/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return null;
  return title.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isReviewPayload(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  if (payload.type === "message") return true;
  if (payload.type === "function_call_output") return true;
  if (payload.type === "reasoning") return true;
  return false;
}

function isActiveWorkPayload(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  if (payload.type === "function_call") return true;
  if (payload.type === "custom_tool_call") return true;
  if (payload.type === "function_call_output") return true;
  if (payload.type === "custom_tool_call_output") return true;
  if (payload.type === "reasoning") return true;
  if (payload.type === "agent_message" && payload.phase === "commentary") return true;
  if (payload.type === "message" && payload.phase === "commentary") return true;
  return false;
}

function isFailurePayload(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  const type = typeof payload.type === "string" ? payload.type.toLowerCase() : "";
  const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
  if (["failed", "failure", "error"].includes(type)) return true;
  if (["failed", "failure", "error"].includes(status)) return true;
  return false;
}

function isCompletionPayload(payload: any): boolean {
  if (!payload || typeof payload !== "object") return false;
  const type = typeof payload.type === "string" ? payload.type.toLowerCase() : "";
  const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
  if (["task_complete", "complete", "completed"].includes(type)) return true;
  if (["complete", "completed", "done"].includes(status)) return true;
  return false;
}

export function mapActivityToPetState(state: unknown): ActivityState {
  if (state === "running") return "running";
  if (state === "waiting") return "waiting";
  if (state === "failed") return "failed";
  if (state === "review") return "review";
  return "idle";
}

function parseJsonLine(line: string): any | null {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}
