import * as fs from "node:fs/promises";
import * as path from "node:path";
import { mapActivityToPetState } from "./codex";
import { aggregateActivity, cleanString, execJson, findRecentFiles, normalizeCommandSessions, normalizeState } from "./shared";
import type { ActivityPayload, ActivitySession, ActivityState, ProviderReadOptions } from "../types";

export async function readT3CodeActivity(options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const now = options.now || new Date();
  const runner = options.runner || runT3CodeActivitySnapshot;
  try {
    const output = await runner(options);
    const sessions = normalizeT3CodeActivity(output, now);
    return aggregateActivity("t3code", sessions, now, { mode: isT3CodeOrchestrationSnapshot(output) ? "http" : "command" });
  } catch (error) {
    try {
      const sessions = normalizeT3CodeSessions(await runT3CodeSessionList(options), now);
      return aggregateActivity("t3code", sessions, now, { mode: "command" });
    } catch {
      const sessions = await readT3CodeLocalSessions(options, now);
      if (sessions.length > 0) return aggregateActivity("t3code", sessions, now, { mode: "local-storage" });
      return aggregateActivity("t3code", [], now, { error: error instanceof Error ? error.message : String(error) });
    }
  }
}

export async function runT3CodeActivitySnapshot(options: ProviderReadOptions = {}): Promise<unknown> {
  const baseUrl = cleanString(options.t3codeUrl) || cleanString(process.env.AGENT_PETS_T3CODE_URL) || cleanString(process.env.T3CODE_URL);
  const bearerToken =
    cleanString(options.t3codeBearerToken) ||
    cleanString(options.t3codeToken) ||
    cleanString(process.env.AGENT_PETS_T3CODE_BEARER_TOKEN) ||
    cleanString(process.env.T3CODE_BEARER_TOKEN);
  if (!baseUrl) throw new Error("T3Code server URL not configured");
  if (!bearerToken) throw new Error("T3Code bearer token not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 10_000);
  try {
    const url = new URL("/api/orchestration/snapshot", baseUrl);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`T3Code snapshot request failed with HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
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

export function normalizeT3CodeActivity(output: any, now = new Date()): ActivitySession[] {
  if (isT3CodeOrchestrationSnapshot(output)) return normalizeT3CodeOrchestrationSnapshot(output, now);
  return normalizeT3CodeSessions(output, now);
}

export function normalizeT3CodeSessions(output: any, now = new Date()): ActivitySession[] {
  return normalizeCommandSessions(output, "t3code", now).map((session) => {
    if (session.state === "running" && isCompletedText(session.latestEvent)) {
      return { ...session, state: "review", petState: "review" };
    }
    return session;
  });
}

export function normalizeT3CodeOrchestrationSnapshot(snapshot: any, now = new Date()): ActivitySession[] {
  const projectTitles = new Map<string, string>();
  for (const project of Array.isArray(snapshot?.projects) ? snapshot.projects : []) {
    const id = cleanString(project?.id);
    const title = cleanString(project?.title) || cleanString(project?.workspaceRoot);
    if (id && title) projectTitles.set(id, title);
  }

  return (Array.isArray(snapshot?.threads) ? snapshot.threads : [])
    .filter((thread: any) => !thread?.deletedAt && !thread?.archivedAt)
    .map((thread: any, index: number) => normalizeT3CodeThread(thread, index, projectTitles, now))
    .filter(Boolean)
    .sort((left: ActivitySession, right: ActivitySession) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
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

function normalizeT3CodeThread(thread: any, index: number, projectTitles: Map<string, string>, now: Date): ActivitySession | null {
  if (!thread || typeof thread !== "object") return null;
  const updatedAt = cleanString(thread.updatedAt) || cleanString(thread.latestTurn?.completedAt) || cleanString(thread.latestTurn?.startedAt) || cleanString(thread.createdAt) || now.toISOString();
  const projectId = cleanString(thread.projectId);
  const projectTitle = projectId ? projectTitles.get(projectId) : null;
  const title = deriveT3CodeThreadTitle(thread, projectTitle, index);
  const state = deriveT3CodeThreadState(thread, updatedAt, now);
  const detail = deriveT3CodeThreadDetail(thread, projectTitle);
  return {
    id: cleanString(thread.id) || `t3code-${index}`,
    title,
    detail,
    state,
    petState: mapActivityToPetState(state),
    updatedAt,
    latestEvent: deriveT3CodeLatestEvent(thread, detail),
    directory: cleanString(thread.worktreePath),
    projectId,
    source: cleanString(thread.environmentId) || undefined,
  };
}

function deriveT3CodeThreadTitle(thread: any, projectTitle: string | null | undefined, index: number): string {
  const threadTitle = cleanString(thread?.title);
  if (threadTitle && threadTitle !== projectTitle) return threadTitle;
  const provider = t3CodeProviderLabel(thread);
  if (provider) return `${provider} thread`;
  return `T3Code thread ${index + 1}`;
}

function deriveT3CodeThreadState(thread: any, updatedAt: string, now: Date): ActivityState {
  if (thread?.error || thread?.session?.lastError || thread?.latestTurn?.state === "error" || thread?.session?.orchestrationStatus === "error") {
    return "failed";
  }
  if (thread?.hasPendingUserInput || thread?.hasPendingApprovals) return "waiting";
  const orchestrationStatus = cleanString(thread?.session?.orchestrationStatus);
  if (orchestrationStatus === "running" || orchestrationStatus === "starting" || thread?.latestTurn?.state === "running") return "running";
  if (thread?.latestTurn?.state === "completed" || thread?.hasActionableProposedPlan) return "review";
  return normalizeState(orchestrationStatus || thread?.session?.status, updatedAt, now);
}

function deriveT3CodeThreadDetail(thread: any, projectTitle: string | null | undefined): string {
  const context = [t3CodeProviderLabel(thread), projectTitle ? labelProject(projectTitle) : null].filter(Boolean) as string[];
  if (thread?.hasPendingUserInput) return joinT3CodeDetail(context, "waiting for user input");
  if (thread?.hasPendingApprovals) return joinT3CodeDetail(context, "waiting for approval");
  if (thread?.error) return joinT3CodeDetail(context, "thread error");
  if (thread?.session?.lastError) return joinT3CodeDetail(context, "session error");
  if (thread?.session?.orchestrationStatus === "running") return joinT3CodeDetail(context, "running");
  if (thread?.latestTurn?.state === "completed") return joinT3CodeDetail(context, "completed turn ready to review");
  if (thread?.hasActionableProposedPlan) return joinT3CodeDetail(context, "proposed plan ready to review");
  const branch = cleanString(thread?.branch);
  if (branch) return joinT3CodeDetail(context, `branch: ${branch}`);
  return joinT3CodeDetail(context, "T3Code thread");
}

function joinT3CodeDetail(context: string[], status: string): string {
  return [...context, status].join(" - ");
}

function deriveT3CodeLatestEvent(thread: any, fallback: string): string {
  const latestActivity = Array.isArray(thread?.activities) ? thread.activities.at(-1) : null;
  return cleanString(latestActivity?.summary) || cleanString(thread?.latestTurn?.state) || fallback;
}

function isT3CodeOrchestrationSnapshot(output: any): boolean {
  return Array.isArray(output?.threads) && Array.isArray(output?.projects) && typeof output?.snapshotSequence === "number";
}

export function normalizeDraftStore(store: any, context: any): ActivitySession[] {
  const state = store?.state && typeof store.state === "object" ? store.state : {};
  const drafts = state.draftsByThreadKey || state.draftsByThreadId || {};
  const draftThreads = state.draftThreadsByThreadKey || state.draftThreadsByThreadId || {};
  const logicalProjectDrafts = state.logicalProjectDraftThreadKeyByLogicalProjectKey || {};
  const sessions: ActivitySession[] = [];

  for (const [key, thread] of Object.entries(draftThreads)) {
    if (!thread || typeof thread !== "object") continue;
    const draft = drafts[key] || {};
    sessions.push(normalizeDraftThread(key, thread, draft, context, state));
  }

  for (const [key, draft] of Object.entries(drafts)) {
    if (draftThreads[key]) continue;
    const thread = resolveDraftThreadForDraftKey(key, draftThreads, logicalProjectDrafts);
    sessions.push(normalizeDraftThread(key, thread || {}, draft, context, state));
  }

  return sessions.filter(Boolean);
}

function normalizeDraftThread(key: string, thread: any, draft: any, context: any, state?: any): ActivitySession {
  const updatedAt = cleanString(thread.updatedAt) || cleanString(thread.createdAt) || new Date(context.file.stat.mtimeMs).toISOString();
  const prompt = cleanString(draft.prompt);
  const project = resolveDraftProjectLabel(key, thread, state);
  const branch = cleanString(thread.branch);
  const provider = resolveDraftProviderLabel(draft, state);
  const title = provider ? `${provider} draft` : "T3Code draft";
  const detailContext = project ? [labelProject(project)] : [];
  const activityState = prompt && isRecent(updatedAt, context.now, 30 * 60 * 1000) ? "waiting" : "idle";
  return {
    id: cleanString(thread.threadId) || String(key),
    title,
    detail: joinT3CodeDetail(detailContext, prompt ? "draft waiting to send" : branch ? `branch: ${branch}` : "draft thread"),
    state: activityState,
    petState: mapActivityToPetState(activityState),
    updatedAt,
    latestEvent: prompt ? "draft waiting to send" : "draft thread",
    directory: cleanString(thread.worktreePath),
    projectId: cleanString(thread.projectId),
    sourcePath: context.file.filePath,
  };
}

function resolveDraftProviderLabel(draft: any, state?: any): string | null {
  const provider =
    cleanString(draft?.activeProvider) ||
    cleanString(draft?.provider) ||
    cleanString(state?.activeProvider) ||
    cleanString(state?.stickyActiveProvider) ||
    firstObjectKey(draft?.modelSelectionByProvider) ||
    firstObjectKey(state?.stickyModelSelectionByProvider);
  return formatT3CodeProviderName(provider);
}

function firstObjectKey(value: any): string | null {
  if (!value || typeof value !== "object") return null;
  return cleanString(Object.keys(value)[0]);
}

function resolveDraftThreadForDraftKey(key: string, draftThreads: any, logicalProjectDrafts: any): any | null {
  const exact = draftThreads?.[key];
  if (exact && typeof exact === "object") return exact;
  const scoped = parseScopedKey(key);
  if (!scoped) return null;

  for (const [logicalProjectKey, draftKey] of Object.entries(logicalProjectDrafts || {})) {
    if (typeof logicalProjectKey !== "string" || typeof draftKey !== "string") continue;
    const projectRef = parseScopedKey(logicalProjectKey);
    if (!projectRef || projectRef.environmentId !== scoped.environmentId) continue;
    const thread = draftThreads?.[draftKey];
    if (thread && typeof thread === "object") return thread;
  }

  const sameEnvironment = Object.values(draftThreads || {}).find((thread: any) => {
    return thread && typeof thread === "object" && cleanString(thread.environmentId) === scoped.environmentId;
  });
  return sameEnvironment && typeof sameEnvironment === "object" ? sameEnvironment : null;
}

function resolveDraftProjectLabel(key: string, thread: any, state?: any): string | null {
  const direct =
    cleanString(thread.logicalProjectKey) ||
    cleanString(thread.projectTitle) ||
    cleanString(thread.projectName) ||
    cleanString(thread.workspaceRoot) ||
    cleanString(thread.worktreePath);
  if (direct) return direct;

  const scoped = parseScopedKey(key);
  const draftThreads = state?.draftThreadsByThreadKey || state?.draftThreadsByThreadId || {};
  const logicalProjectDrafts = state?.logicalProjectDraftThreadKeyByLogicalProjectKey || {};

  const mappedProjectKeys: string[] = [];
  for (const [logicalProjectKey, draftKey] of Object.entries(logicalProjectDrafts || {})) {
    if (typeof logicalProjectKey !== "string" || typeof draftKey !== "string") continue;
    if (draftKey === key) mappedProjectKeys.push(logicalProjectKey);

    const mappedThread = draftThreads[draftKey];
    if (mappedThread && mappedThread === thread) mappedProjectKeys.push(logicalProjectKey);

    const projectRef = parseScopedKey(logicalProjectKey);
    if (
      scoped &&
      projectRef &&
      projectRef.environmentId === scoped.environmentId &&
      cleanString(thread.projectId) === projectRef.projectId
    ) {
      mappedProjectKeys.push(logicalProjectKey);
    }
  }
  const mappedProject = chooseBestProjectLabel(mappedProjectKeys);
  if (mappedProject) return mappedProject;

  const projectId = cleanString(thread.projectId);
  const environmentId = cleanString(thread.environmentId) || scoped?.environmentId || null;
  if (environmentId && projectId) return `${environmentId}:${projectId}`;
  return cleanString(thread.projectId) || cleanString(thread.environmentId);
}

function parseScopedKey(value: unknown): { environmentId: string; projectId: string } | null {
  const text = cleanString(value);
  if (!text) return null;
  const separatorIndex = text.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex >= text.length - 1) return null;
  return {
    environmentId: text.slice(0, separatorIndex),
    projectId: text.slice(separatorIndex + 1),
  };
}

function chooseBestProjectLabel(values: string[]): string | null {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return unique.sort((left, right) => projectLabelScore(right) - projectLabelScore(left))[0] || null;
}

function projectLabelScore(value: string): number {
  if (value.includes("/") || value.includes("\\")) return 30;
  const scoped = parseScopedKey(value);
  if (scoped && isUuidLike(scoped.environmentId) && isUuidLike(scoped.projectId)) return 5;
  if (scoped) return 10;
  return 20;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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
  const scoped = parseScopedKey(text);
  if (scoped && isUuidLike(scoped.environmentId) && isUuidLike(scoped.projectId)) return `T3Code project ${scoped.projectId.slice(0, 8)}`;
  if (text.includes(":")) return text.split(":").pop() || text;
  return text;
}

function t3CodeProviderLabel(thread: any): string | null {
  return formatT3CodeProviderName(
    cleanString(thread?.session?.providerName) ||
      cleanString(thread?.session?.provider) ||
      cleanString(thread?.session?.providerInstanceId) ||
      cleanString(thread?.modelSelection?.provider),
  );
}

function formatT3CodeProviderName(value: unknown): string | null {
  const provider = cleanString(value);
  if (!provider) return null;
  const normalized = provider.toLowerCase().replace(/[_\s-]+/g, "");
  if (normalized === "codex" || normalized === "openaicodex") return "Codex";
  if (normalized === "claude" || normalized === "claudeagent" || normalized === "claudecode") return "Claude Code";
  if (normalized === "opencode") return "OpenCode";
  return provider
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isCompletedText(value: unknown): boolean {
  return ["complete", "completed", "done", "finished", "success", "succeeded", "review"].includes(String(value || "").toLowerCase());
}
