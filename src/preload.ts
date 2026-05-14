import { contextBridge, ipcRenderer } from "electron";
import type { ProviderReadOptions } from "./main/types";

contextBridge.exposeInMainWorld("codexPets", {
  listPets: (codexHome: string) => ipcRenderer.invoke("pets:list", codexHome),
  readActivity: (options: ProviderReadOptions) => ipcRenderer.invoke("activity:read", options),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: Record<string, unknown>) => ipcRenderer.invoke("settings:update", patch),
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => ipcRenderer.send("window:set-ignore-mouse-events", ignore, options),
});
