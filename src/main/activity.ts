import { readProviderActivity } from "./providers/index";
import type { ActivityPayload, ProviderReadOptions } from "./types";

export async function readActivity(options: ProviderReadOptions): Promise<ActivityPayload> {
  return readProviderActivity(options);
}
