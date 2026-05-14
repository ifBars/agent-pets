import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const VALID_STATES = new Set(["idle", "running", "waiting", "failed", "review"]);

export const AgentPetsOpenCodePlugin = async (ctx = {}, options = {}) => {
  const sessions = new Map();
  const statusFile = cleanString(options.statusFile) || cleanString(process.env.AGENT_PETS_OPENCODE_STATUS_FILE) || defaultStatusFile();
  const directory = cleanString(ctx.directory) || cleanString(ctx.worktree) || "";
  const projectId = cleanString(ctx.project?.id) || cleanString(ctx.project?.name) || "";

  async function record(event) {
    const update = normalizeEvent(event, { directory, projectId });
    if (!update) return;
    const previous = sessions.get(update.id) || {};
    const next = {
      ...previous,
      ...update,
      updatedAt: update.updatedAt || new Date().toISOString(),
    };
    sessions.set(next.id, next);
    await writeSnapshot(statusFile, Array.from(sessions.values()));
  }

  return {
    event: async ({ event }) => record(event),
  };
};

export const server = AgentPetsOpenCodePlugin;
export default AgentPetsOpenCodePlugin;

export function normalizeEvent(event, context = {}) {
  if (!event || typeof event !== "object") return null;
  const properties = event.properties && typeof event.properties === "object" ? event.properties : {};
  const sessionId = cleanString(properties.sessionID) || cleanString(properties.sessionId) || cleanString(properties.session_id) || cleanString(properties.id);
  if (!sessionId) return null;

  const now = new Date().toISOString();
  const base = {
    id: sessionId,
    title: cleanString(properties.title) || cleanString(properties.session?.title) || "OpenCode session",
    cwd: cleanString(properties.directory) || cleanString(properties.cwd) || cleanString(context.directory),
    projectId: cleanString(properties.projectID) || cleanString(properties.projectId) || cleanString(context.projectId),
    updatedAt: timestampString(properties.time) || timestampString(properties.updatedAt) || now,
  };

  if (event.type === "permission.asked") {
    return { ...base, state: "waiting", detail: "permission requested" };
  }
  if (event.type === "session.error") {
    return { ...base, state: "failed", detail: "session error" };
  }
  if (event.type === "session.idle") {
    return { ...base, state: "review", detail: "session idle" };
  }
  if (event.type === "session.status") {
    const status = cleanString(properties.status?.type) || cleanString(properties.status);
    return { ...base, state: mapStatus(status), detail: status ? `session ${status}` : "session status" };
  }
  if (event.type === "message.updated" || event.type === "message.part.updated") {
    return { ...base, state: "running", detail: event.type === "message.updated" ? "message updated" : "message part updated" };
  }
  return null;
}

export async function writeSnapshot(statusFile, sessions) {
  const sorted = sessions
    .map((session) => sanitizeSession(session))
    .filter(Boolean)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 8);
  const snapshot = {
    version: 1,
    provider: "opencode",
    updatedAt: new Date().toISOString(),
    sessions: sorted,
  };
  const dir = path.dirname(statusFile);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(statusFile)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tmp, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await fs.rename(tmp, statusFile);
}

export function defaultStatusFile() {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Agent Pets", "providers", "opencode.json");
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "agent-pets", "providers", "opencode.json");
}

function sanitizeSession(session) {
  if (!session || typeof session !== "object") return null;
  const id = cleanString(session.id);
  if (!id) return null;
  const state = mapStatus(session.state);
  return {
    id,
    title: cleanString(session.title) || "OpenCode session",
    cwd: cleanString(session.cwd),
    projectId: cleanString(session.projectId),
    state,
    detail: cleanString(session.detail) || "OpenCode activity",
    updatedAt: cleanString(session.updatedAt) || new Date().toISOString(),
  };
}

function mapStatus(status) {
  const value = cleanString(status)?.toLowerCase() || "";
  if (VALID_STATES.has(value)) return value;
  if (["error", "errored", "failed", "failure"].includes(value)) return "failed";
  if (["blocked", "needs-input", "permission", "paused"].includes(value)) return "waiting";
  if (["idle", "complete", "completed", "done", "finished", "success"].includes(value)) return "review";
  if (["busy", "active", "streaming", "working"].includes(value)) return "running";
  return "running";
}

function cleanString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function timestampString(value) {
  if (typeof value === "string" && value.trim()) return value;
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
