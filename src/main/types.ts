import type { Stats } from "node:fs";

export type ProviderId = "codex" | "opencode" | "claude-code" | "t3code" | "json-status" | "desktop";
export type ProviderIntegrationMode = "bridge-file" | "command" | "jsonl" | "http" | "manual";
export type ActivityState = "idle" | "running" | "waiting" | "failed" | "review";
export type PetAnimationState =
  | "auto"
  | "idle"
  | "running"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "waiting"
  | "review"
  | "failed";

export interface ActivitySession {
  id: string;
  title: string;
  detail?: string | null;
  state: ActivityState;
  petState: ActivityState;
  updatedAt: string;
  latestEvent?: string | null;
  sessionPath?: string | null;
  sourcePath?: string;
  directory?: string | null;
  projectId?: string | null;
  lastWriteAgeMs?: number;
  source?: string;
}

export interface ActivityPayload {
  source: ProviderId | string;
  state: ActivityState;
  petState: ActivityState;
  active: ActivitySession | null;
  sessions: ActivitySession[];
  updatedAt: string;
  error?: string;
  statusFile?: string;
  codexHome?: string;
  claudeHome?: string;
  mode?: string;
}

export interface ProviderReadOptions {
  provider?: ProviderId | string | null;
  codexHome?: string;
  statusFile?: string | null;
  now?: Date;
  cwd?: string;
  timeout?: number;
  maxCount?: number;
  runner?: (options?: ProviderReadOptions) => Promise<unknown>;
  bridgeFile?: string;
  claudeHome?: string;
  projectsRoot?: string;
  commands?: string[];
  roots?: string[];
}

export interface ProviderMetadata {
  id: ProviderId;
  label: string;
  modes: ProviderIntegrationMode[];
  requiresStatusFile?: boolean;
  defaultRefreshMs?: number;
  setupHint?: string;
}

export interface ProviderDefinition extends ProviderMetadata {
  read: (options: ProviderReadOptions) => Promise<ActivityPayload> | ActivityPayload;
}

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface Settings {
  selectedPetId: string;
  selectedState: PetAnimationState;
  provider: ProviderId;
  petSize: number;
  desktopRoamingEnabled: boolean;
  desktopRoamingRadius: number;
  statusFile: string;
  windowBounds: WindowBounds | null;
}

export interface ImageInfo {
  width: number;
  height: number;
  mimeType: "image/png" | "image/webp";
  buffer: Buffer;
}

export interface PetManifest {
  id?: string;
  displayName?: string;
  description?: string;
  spritesheetPath?: string;
}

export interface PetPackage {
  id: string;
  displayName: string;
  description: string | null;
  folder: string;
  source: "avatar" | "pet";
  spritesheetPath: string;
  spritesheetDataUrl: string;
}

export interface FileWithStat {
  filePath: string;
  stat: Stats;
}

export interface ValidationCheck {
  name: string;
  ok: boolean;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  packageDir: string;
  manifestPath: string;
  checks: ValidationCheck[];
  spritesheet?: {
    path: string;
    mimeType: ImageInfo["mimeType"];
    width: number;
    height: number;
    columns: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
  };
}

export type JsonObject = Record<string, any>;
