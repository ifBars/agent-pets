import { readClaudeCodeActivity } from "./claude-code";
import { readCodexActivity } from "./codex";
import { readDesktopActivity } from "./desktop";
import { readJsonStatusActivity } from "./json-status";
import { readOpenCodeActivity } from "./opencode";
import { readT3CodeActivity } from "./t3code";
import type { ActivityPayload, ProviderDefinition, ProviderId, ProviderReadOptions } from "../types";

export const PROVIDERS: ProviderDefinition[] = [
  { id: "codex", label: "Codex", read: (options) => readCodexActivity(options.codexHome || "", options) },
  { id: "opencode", label: "OpenCode", read: readOpenCodeActivity },
  { id: "claude-code", label: "Claude Code", read: readClaudeCodeActivity },
  { id: "t3code", label: "T3Code", read: readT3CodeActivity },
  { id: "json-status", label: "Status file", read: (options) => readJsonStatusActivity(options.statusFile, options) },
  { id: "desktop", label: "Desktop", read: readDesktopActivity },
];

const PROVIDER_BY_ID = new Map<ProviderId, ProviderDefinition>(PROVIDERS.map((provider) => [provider.id, provider]));

export async function readProviderActivity(options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const provider = PROVIDER_BY_ID.get(options.provider as ProviderId) || PROVIDER_BY_ID.get(options.statusFile ? "json-status" : "codex");
  if (!provider) throw new Error("Provider registry is empty");
  return provider.read(options);
}

export function listProviders(): Array<Pick<ProviderDefinition, "id" | "label">> {
  return PROVIDERS.map(({ id, label }) => ({ id, label }));
}

export function normalizeProvider(value: unknown): ProviderId {
  return PROVIDER_BY_ID.has(value as ProviderId) ? (value as ProviderId) : "codex";
}
