import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { mapActivityToPetState } from "./codex";
import { aggregateActivity, cleanString, execJson, normalizeCommandSessions, normalizeState, timestampString } from "./shared";
import type { ActivityPayload, ActivitySession, ProviderReadOptions } from "../types";

export async function readOpenCodeActivity(options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const now = options.now || new Date();
  const runner = options.runner || runOpenCodeSessionList;
  const bridgeSessions = await readOpenCodeBridgeSessions(options, now);
  try {
    const sessions = displayableOpenCodeSessions(mergeOpenCodeSessions(bridgeSessions, normalizeSessions(await runner(options), now)));
    return aggregateActivity("opencode", sessions, now);
  } catch (error) {
    const sessions = displayableOpenCodeSessions(bridgeSessions);
    if (sessions.length > 0) return aggregateActivity("opencode", sessions, now);
    return aggregateActivity("opencode", [], now, { error: error instanceof Error ? error.message : String(error) });
  }
}

export async function runOpenCodeSessionList(options: ProviderReadOptions = {}): Promise<unknown> {
  const maxCount = Number.isFinite(options.maxCount) ? String(options.maxCount) : "8";
  try {
    return await runOpenCodeDbSessionList(maxCount, options);
  } catch {
    return execJson("opencode", ["session", "list", "--format", "json", "--max-count", maxCount], options);
  }
}

export function runOpenCodeDbSessionList(maxCount: string, options: ProviderReadOptions = {}): Promise<unknown> {
  const limit = Math.max(1, Math.min(50, Number(maxCount) || 8));
  const query = `
select
  s.id,
  s.title,
  s.directory,
  s.project_id,
  s.time_created,
  s.time_updated,
  s.time_archived,
  m.data as message_data,
  p.data as part_data
from session s
left join message m on m.id = (
  select id from message where session_id = s.id order by time_updated desc limit 1
)
left join part p on p.id = (
  select id from part where session_id = s.id order by time_updated desc limit 1
)
where s.time_archived is null
order by s.time_updated desc
limit ${limit}`;
  return execJson("opencode", ["db", "--format", "json", query], options);
}

export function normalizeSessions(output: any, now = new Date()): ActivitySession[] {
  const rows = Array.isArray(output) ? output : Array.isArray(output?.sessions) ? output.sessions : [];
  if (rows.some((item) => item && ("time_updated" in item || "message_data" in item || "part_data" in item))) {
    return rows
      .map((item, index) => normalizeDbSession(item, index, now))
      .filter(Boolean)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 8);
  }
  return normalizeCommandSessions(output, "opencode", now);
}

export async function readOpenCodeBridgeSessions(options: ProviderReadOptions = {}, now = new Date()): Promise<ActivitySession[]> {
  const bridgeFile = cleanString(options.bridgeFile) || cleanString(process.env.AGENT_PETS_OPENCODE_STATUS_FILE) || getDefaultOpenCodeBridgeFile();
  try {
    const parsed = JSON.parse(await fs.readFile(bridgeFile, "utf8"));
    return normalizeOpenCodeBridgeSessions(parsed, now);
  } catch {
    return [];
  }
}

export function getDefaultOpenCodeBridgeFile(): string {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "opencode.json");
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "opencode.json");
}

export function normalizeOpenCodeBridgeSessions(payload: any, now = new Date()): ActivitySession[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = Array.isArray(payload.sessions) ? payload.sessions : Array.isArray(payload.items) ? payload.items : [];
  return rows
    .map((item, index) => normalizeOpenCodeBridgeSession(item, index, now))
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
}

function normalizeOpenCodeBridgeSession(item: any, index: number, now: Date): ActivitySession | null {
  if (!item || typeof item !== "object") return null;
  const updatedAt = cleanString(item.updatedAt) || now.toISOString();
  const state = normalizeBridgeState(item.state, updatedAt, now);
  const detail = cleanString(item.detail) || cleanString(item.latestEvent) || "OpenCode plugin activity";
  return {
    id: cleanString(item.id) || cleanString(item.sessionID) || cleanString(item.sessionId) || `opencode-plugin-${index}`,
    title: cleanString(item.title) || cleanString(item.cwd) || `OpenCode session ${index + 1}`,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: detail,
    directory: cleanString(item.cwd) || cleanString(item.directory),
    projectId: cleanString(item.projectId) || cleanString(item.project_id),
    source: "opencode-plugin",
  };
}

function normalizeBridgeState(value: unknown, updatedAt: string, now: Date) {
  const state = cleanString(value)?.toLowerCase() || "";
  if (state === "running" || state === "waiting") {
    const ageMs = now.getTime() - new Date(updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs > 30 * 60 * 1000) return "idle";
    if (Number.isFinite(ageMs) && ageMs > 5 * 60 * 1000) return "review";
    return state;
  }
  return normalizeState(state, updatedAt, now);
}

export function mergeOpenCodeSessions(preferredSessions: ActivitySession[], fallbackSessions: ActivitySession[]): ActivitySession[] {
  const merged: ActivitySession[] = [];
  const seen = new Set<string>();
  const fallbackById = new Map(fallbackSessions.map((session) => [session.id, session]));
  for (const session of preferredSessions) {
    if (!session || seen.has(session.id)) continue;
    seen.add(session.id);
    merged.push(mergePreferredSession(session, fallbackById.get(session.id)));
  }
  for (const session of fallbackSessions) {
    if (!session || seen.has(session.id)) continue;
    seen.add(session.id);
    merged.push(session);
  }
  return merged
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
}

function mergePreferredSession(session: ActivitySession, fallback?: ActivitySession): ActivitySession {
  if (!fallback) return session;
  const next = isGenericBridgeRunning(session) && isTerminalOpenCodeState(fallback.state)
    ? {
        ...session,
        state: fallback.state,
        petState: fallback.petState,
        detail: fallback.detail,
        latestEvent: fallback.latestEvent,
        updatedAt: fallback.updatedAt,
      }
    : session;

  if (!isOpenCodePlaceholderTitle(next.title) || isOpenCodePlaceholderTitle(fallback.title)) {
    return {
      ...next,
      directory: next.directory || fallback.directory,
      projectId: next.projectId || fallback.projectId,
    };
  }

  return {
    ...next,
    title: fallback.title,
    directory: next.directory || fallback.directory,
    projectId: next.projectId || fallback.projectId,
  };
}

function isGenericBridgeRunning(session: ActivitySession): boolean {
  const detail = cleanString(session.latestEvent) || cleanString(session.detail) || "";
  return (
    session.source === "opencode-plugin" &&
    session.state === "running" &&
    ["message updated", "message part updated", "session running", "session busy", "session active", "session streaming"].includes(detail.toLowerCase())
  );
}

function isTerminalOpenCodeState(state: unknown): boolean {
  return state === "review" || state === "failed";
}

function displayableOpenCodeSessions(sessions: ActivitySession[]): ActivitySession[] {
  return sessions.filter((session) => session.state !== "idle");
}

function isOpenCodePlaceholderTitle(value: unknown): boolean {
  const title = cleanString(value)?.toLowerCase() || "";
  return title === "opencode session" || /^opencode session \d+$/.test(title);
}

export function normalizeDbSession(item: any, index: number, now: Date): ActivitySession | null {
  if (!item || typeof item !== "object") return null;
  const message = parseJson(item.message_data);
  const part = parseJson(item.part_data);
  const updatedAt = timestampString(item.time_updated) || timestampString(item.updated) || now.toISOString();
  const title = cleanString(item.title) || cleanString(item.directory) || `OpenCode session ${index + 1}`;
  const detail = summarizeOpenCodeEvent(message, part);
  const state = classifyOpenCodeState(message, part, updatedAt, now);
  return {
    id: cleanString(item.id) || `opencode-${index}`,
    title,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: detail,
    directory: cleanString(item.directory),
    projectId: cleanString(item.project_id),
  };
}

export function classifyOpenCodeState(message: any, part: any, updatedAt: string, now: Date) {
  if (message?.error || part?.error) return recentTerminalState("failed", updatedAt, now);
  if (part?.type === "step-finish") {
    if (part.reason === "error" || part.reason === "failed") return recentTerminalState("failed", updatedAt, now);
    if (part.reason === "stop") return recentTerminalState("review", updatedAt, now);
    return normalizeState("running", updatedAt, now);
  }
  if (message?.time?.completed || message?.finish === "stop") return recentTerminalState("review", updatedAt, now);
  if (message?.role === "assistant" && !message?.time?.completed) return normalizeState("running", updatedAt, now);
  if (message?.role === "user") return normalizeState("running", updatedAt, now);
  return normalizeState(null, updatedAt, now);
}

function recentTerminalState(state: "failed" | "review", updatedAt: string, now: Date) {
  const ageMs = now.getTime() - new Date(updatedAt).getTime();
  return Number.isFinite(ageMs) && ageMs > 30 * 60 * 1000 ? "idle" : state;
}

function summarizeOpenCodeEvent(message: any, part: any): string {
  if (message?.error || part?.error) return "error";
  if (part?.type === "step-finish") return part.reason ? `finished: ${part.reason}` : "finished";
  if (part?.type === "tool") return "tool";
  if (part?.type === "text") return "response text";
  if (part?.type) return part.type;
  if (message?.role === "assistant") return message?.time?.completed ? "assistant response" : "assistant running";
  if (message?.role === "user") return "user message";
  return "OpenCode session activity";
}

function parseJson(value: unknown): any | null {
  const text = cleanString(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
