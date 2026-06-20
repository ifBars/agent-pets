import type { ProviderMetadata, ProviderId } from "../types";

export const PROVIDER_METADATA: ProviderMetadata[] = [
  {
    id: "codex",
    label: "Codex",
    modes: ["jsonl"],
    defaultRefreshMs: 8000,
    setupHint: "Reads local Codex session metadata from CODEX_HOME.",
  },
  {
    id: "opencode",
    label: "OpenCode",
    modes: ["bridge-file", "command"],
    defaultRefreshMs: 8000,
    setupHint: "Install the OpenCode plugin for realtime status, with CLI fallback for recent sessions.",
  },
  {
    id: "claude-code",
    label: "Claude Code",
    modes: ["bridge-file", "jsonl"],
    defaultRefreshMs: 8000,
    setupHint: "Reads privacy-safe Claude Code hook status, with local JSONL metadata fallback only.",
  },
  {
    id: "gemini-cli",
    label: "Gemini CLI",
    modes: ["jsonl"],
    defaultRefreshMs: 8000,
    setupHint: "Reads local Gemini CLI session history from GEMINI_DIR or ~/.gemini without exposing prompt or response text.",
  },
  {
    id: "aider",
    label: "Aider",
    modes: ["bridge-file", "jsonl"],
    defaultRefreshMs: 8000,
    setupHint: "Reads a privacy-safe Aider notification status file, with chat-history mtime fallback only.",
  },
  {
    id: "copilot-cli",
    label: "GitHub Copilot CLI",
    modes: ["bridge-file", "jsonl"],
    defaultRefreshMs: 8000,
    setupHint: "Reads privacy-safe Copilot CLI hook status, with session-state mtime fallback only.",
  },
  {
    id: "t3code",
    label: "T3Code",
    modes: ["http", "command", "jsonl"],
    defaultRefreshMs: 8000,
    setupHint: "Reads a T3Code orchestration snapshot when configured, with CLI and local read-only app-data fallback.",
  },
  {
    id: "json-status",
    label: "Status file",
    modes: ["bridge-file"],
    requiresStatusFile: true,
    defaultRefreshMs: 8000,
    setupHint: "Reads a privacy-safe JSON status snapshot written by a hook, wrapper, or script.",
  },
  {
    id: "desktop",
    label: "Desktop",
    modes: ["manual"],
    defaultRefreshMs: 30000,
    setupHint: "Manual idle companion mode.",
  },
];

const PROVIDER_BY_ID = new Map<ProviderId, ProviderMetadata>(PROVIDER_METADATA.map((provider) => [provider.id, provider]));

export function listProviderMetadata(): ProviderMetadata[] {
  return PROVIDER_METADATA.map((provider) => ({ ...provider, modes: [...provider.modes] }));
}

export function getProviderMetadata(id: ProviderId): ProviderMetadata | undefined {
  const provider = PROVIDER_BY_ID.get(id);
  return provider ? { ...provider, modes: [...provider.modes] } : undefined;
}

export function normalizeProvider(value: unknown): ProviderId {
  return PROVIDER_BY_ID.has(value as ProviderId) ? (value as ProviderId) : "codex";
}
