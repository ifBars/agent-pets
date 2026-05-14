import * as fs from "node:fs/promises";
import * as path from "node:path";
import { mapActivityToPetState } from "./codex";
import type { ActivityPayload, ActivitySession, ActivityState, ProviderReadOptions } from "../types";

export const VALID_STATES = new Set<ActivityState>(["idle", "running", "waiting", "failed", "review"]);

export async function readJsonStatusActivity(statusFile: string | null | undefined, options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const now = options.now || new Date();
  if (!cleanString(statusFile)) return emptyActivity("", now, "No status file configured");
  const resolved = path.resolve(cleanString(statusFile) || "");
  let parsed: any = null;
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(resolved);
    parsed = JSON.parse(await fs.readFile(resolved, "utf8"));
  } catch (error) {
    return emptyActivity(resolved, now, error instanceof Error ? error.message : String(error));
  }

  const state = normalizeState(parsed?.state);
  const title = cleanString(parsed?.title) || "External agent";
  const detail = cleanString(parsed?.detail) || cleanString(parsed?.message) || "Status file activity";
  const updatedAt = cleanString(parsed?.updatedAt) || new Date(stat.mtimeMs).toISOString();
  const sessions = normalizeItems(parsed?.items, { title, detail, state, updatedAt });
  const active = sessions[0] || {
    id: "json-status",
    title,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: detail,
  };

  return {
    source: "json-status",
    statusFile: resolved,
    state: active.state,
    petState: mapActivityToPetState(active.state),
    active,
    sessions,
    updatedAt: now.toISOString(),
  };
}

function emptyActivity(statusFile: string, now: Date, error: string): ActivityPayload {
  return {
    source: "json-status",
    statusFile,
    state: "idle",
    petState: "idle",
    active: {
      id: "json-status",
      title: "Waiting for status file",
      detail: error,
      state: "idle",
      petState: "idle",
      updatedAt: now.toISOString(),
      latestEvent: error,
    },
    sessions: [],
    updatedAt: now.toISOString(),
    error,
  };
}

function normalizeItems(items: unknown, fallback: Pick<ActivitySession, "title" | "detail" | "state" | "updatedAt">): ActivitySession[] {
  const source = Array.isArray(items) && items.length > 0 ? items : [fallback];
  return source.slice(0, 8).map((item, index) => {
    const state = normalizeState(item?.state);
    const detail = cleanString(item?.detail) || cleanString(item?.message) || fallback.detail;
    return {
      id: cleanString(item?.id) || `json-status-${index}`,
      title: cleanString(item?.title) || fallback.title,
      detail,
      state,
      petState: mapActivityToPetState(state),
      updatedAt: cleanString(item?.updatedAt) || fallback.updatedAt,
      latestEvent: detail,
    };
  });
}

export function normalizeState(value: unknown): ActivityState {
  const state = typeof value === "string" ? value.toLowerCase() : "idle";
  return VALID_STATES.has(state as ActivityState) ? (state as ActivityState) : "idle";
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
