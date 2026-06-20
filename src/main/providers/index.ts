import { readAiderActivity } from "./aider";
import { readClaudeCodeActivity } from "./claude-code";
import { readCodexActivity } from "./codex";
import { readCopilotCliActivity } from "./copilot-cli";
import { readDesktopActivity } from "./desktop";
import { readGeminiCliActivity } from "./gemini-cli";
import { readJsonStatusActivity } from "./json-status";
import { readOpenCodeActivity } from "./opencode";
import { listProviderMetadata, normalizeProvider } from "./registry";
import { readT3CodeActivity } from "./t3code";
import type { ActivityPayload, ProviderDefinition, ProviderId, ProviderReadOptions } from "../types";

const PROVIDER_READERS: Record<ProviderId, ProviderDefinition["read"]> = {
  codex: (options) => readCodexActivity(options.codexHome || "", options),
  opencode: readOpenCodeActivity,
  "claude-code": readClaudeCodeActivity,
  "gemini-cli": readGeminiCliActivity,
  aider: readAiderActivity,
  "copilot-cli": readCopilotCliActivity,
  t3code: readT3CodeActivity,
  "json-status": (options) => readJsonStatusActivity(options.statusFile, options),
  desktop: readDesktopActivity,
};

export const PROVIDERS: ProviderDefinition[] = [
  ...listProviderMetadata().map((provider) => ({ ...provider, read: PROVIDER_READERS[provider.id] })),
];

const PROVIDER_BY_ID = new Map<ProviderId, ProviderDefinition>(PROVIDERS.map((provider) => [provider.id, provider]));

export async function readProviderActivity(options: ProviderReadOptions = {}): Promise<ActivityPayload> {
  const provider = PROVIDER_BY_ID.get(options.provider as ProviderId) || PROVIDER_BY_ID.get(options.statusFile ? "json-status" : "codex");
  if (!provider) throw new Error("Provider registry is empty");
  return provider.read(options);
}

export function listProviders(): ReturnType<typeof listProviderMetadata> {
  return listProviderMetadata();
}

export { normalizeProvider };
