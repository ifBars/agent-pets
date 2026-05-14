import * as path from "node:path";
import { mapActivityToPetState } from "./codex";
import { aggregateActivity, cleanString, findRecentFiles, normalizeState, readJsonlTail } from "./shared";
import type { ActivityPayload, ActivitySession, FileWithStat, ProviderReadOptions } from "../types";

export async function readClaudeCodeActivity(options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const now = options.now || new Date();
  const claudeHome = options.claudeHome || path.join(process.env.USERPROFILE || process.env.HOME || "", ".claude");
  const projectsRoot = options.projectsRoot || path.join(claudeHome, "projects");
  try {
    const files = await findRecentFiles(projectsRoot, (_fullPath, name) => name.endsWith(".jsonl"), 8);
    const sessions: ActivitySession[] = [];
    for (const file of files) {
      const records = await readJsonlTail(file.filePath);
      sessions.push(normalizeClaudeSession(file, records, now));
    }
    return aggregateActivity("claude-code", sessions, now, { claudeHome });
  } catch (error) {
    return aggregateActivity("claude-code", [], now, { claudeHome, error: error instanceof Error ? error.message : String(error) });
  }
}

export function normalizeClaudeSession(file: FileWithStat, records: any[], now: Date): ActivitySession {
  const latest = findLatestRecord(records);
  const sessionId = cleanString(latest?.sessionId) || path.basename(file.filePath, ".jsonl");
  const cwd = cleanString(latest?.cwd);
  const title = cwd ? path.basename(cwd) || cwd : path.basename(path.dirname(file.filePath));
  const updatedAt = cleanString(latest?.timestamp) || new Date(file.stat.mtimeMs).toISOString();
  const recentRecords = records.slice(-12);
  const error = recentRecords.some((record) => record.error || record.isApiErrorMessage);
  const state = error ? "failed" : normalizeClaudeState(latest, updatedAt, now);
  const latestEvent = summarizeClaudeRecord(latest);
  return {
    id: sessionId,
    title: title || "Claude Code session",
    detail: latestEvent,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    sessionPath: file.filePath,
    latestEvent,
  };
}

function findLatestRecord(records: any[]): any | null {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (records[index] && typeof records[index] === "object") return records[index];
  }
  return null;
}

function summarizeClaudeRecord(record: any): string {
  if (!record) return "Claude Code session activity";
  if (record.error || record.isApiErrorMessage) return "error";
  if (record.type === "user") return "user message";
  if (record.type === "assistant") return "assistant response";
  if (record.type === "system") return "system event";
  if (record.type) return record.type;
  return "Claude Code session activity";
}

export function normalizeClaudeState(record: any, updatedAt: string, now: Date) {
  if (record?.type === "assistant") return normalizeState("completed", updatedAt, now);
  if (record?.type === "user") return normalizeState("running", updatedAt, now);
  return normalizeState(record?.status || record?.type, updatedAt, now);
}
