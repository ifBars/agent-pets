import * as fs from "node:fs/promises";
import * as path from "node:path";
import { mapActivityToPetState } from "./codex";
import { aggregateActivity, cleanString, findRecentFiles, normalizeState, readJsonlTail } from "./shared";
import type { ActivityPayload, ActivitySession, FileWithStat, ProviderReadOptions } from "../types";

export async function readGeminiCliActivity(options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const now = options.now || new Date();
  const geminiHome =
    options.geminiHome || process.env.GEMINI_DIR || path.join(process.env.USERPROFILE || process.env.HOME || "", ".gemini");
  const tmpRoot = options.projectsRoot || path.join(geminiHome, "tmp");
  try {
    const files = await findRecentFiles(tmpRoot, isGeminiSessionFile, 8);
    const sessions = await Promise.all(files.map((file) => normalizeGeminiSession(file, now)));
    return aggregateActivity("gemini-cli", sessions.filter(Boolean) as ActivitySession[], now, { geminiHome });
  } catch (error) {
    return aggregateActivity("gemini-cli", [], now, { geminiHome, error: error instanceof Error ? error.message : String(error) });
  }
}

function isGeminiSessionFile(fullPath: string, name: string): boolean {
  if (!/\.jsonl?$/i.test(name)) return false;
  const parts = fullPath.split(/[\\/]+/);
  return parts.includes("chats");
}

export async function normalizeGeminiSession(file: FileWithStat, now: Date): Promise<ActivitySession | null> {
  const record = file.filePath.endsWith(".jsonl") ? await readGeminiJsonlRecord(file.filePath) : await readGeminiJsonRecord(file.filePath);
  if (!record) return null;
  const updatedAt = cleanString(record.lastUpdated) || cleanString(record.latestMessage?.timestamp) || new Date(file.stat.mtimeMs).toISOString();
  const state = normalizeGeminiState(record.latestMessage, updatedAt, now);
  const latestEvent = summarizeGeminiRecord(record.latestMessage);
  return {
    id: cleanString(record.sessionId) || path.basename(file.filePath).replace(/\.jsonl?$/i, ""),
    title: titleFromDirectories(record.directories) || "Gemini CLI session",
    detail: latestEvent,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    sessionPath: file.filePath,
    latestEvent,
  };
}

async function readGeminiJsonlRecord(filePath: string): Promise<any | null> {
  const lines = await readJsonlTail(filePath, 200);
  return normalizeGeminiRecords(lines);
}

async function readGeminiJsonRecord(filePath: string): Promise<any | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
    return {
      ...parsed,
      latestMessage: latestMessage(messages),
    };
  } catch {
    return null;
  }
}

function normalizeGeminiRecords(records: any[]): any | null {
  let metadata: any = {};
  const messages: any[] = [];
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    if (record.$set && typeof record.$set === "object") {
      metadata = { ...metadata, ...record.$set };
    } else if (record.sessionId || record.projectHash) {
      metadata = { ...metadata, ...record };
    } else if (record.id && record.type) {
      messages.push(record);
    }
  }
  if (!metadata.sessionId && messages.length === 0) return null;
  return {
    ...metadata,
    latestMessage: latestMessage(messages),
  };
}

function latestMessage(messages: any[]): any | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message && typeof message === "object") return message;
  }
  return null;
}

function normalizeGeminiState(message: any, updatedAt: string, now: Date) {
  if (message?.error) return "failed";
  if (message?.type === "user") return normalizeState("running", updatedAt, now);
  if (message?.type === "gemini" && Array.isArray(message.toolCalls) && message.toolCalls.length > 0) return normalizeState("running", updatedAt, now);
  if (message?.type === "gemini") return normalizeState("completed", updatedAt, now);
  return normalizeState(message?.type, updatedAt, now);
}

function summarizeGeminiRecord(message: any): string {
  if (!message) return "Gemini CLI session activity";
  if (message.error) return "error";
  if (message.type === "user") return "user message";
  if (message.type === "gemini" && Array.isArray(message.toolCalls) && message.toolCalls.length > 0) return "tool call";
  if (message.type === "gemini") return "assistant response";
  if (message.type) return String(message.type);
  return "Gemini CLI session activity";
}

function titleFromDirectories(directories: unknown): string | null {
  if (!Array.isArray(directories)) return null;
  for (const item of directories) {
    const directory = cleanString(item);
    if (!directory) continue;
    return path.basename(directory) || directory;
  }
  return null;
}
