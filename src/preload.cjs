const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codexPets", {
  listPets: (codexHome) => ipcRenderer.invoke("pets:list", codexHome),
  readActivity: (options) => ipcRenderer.invoke("activity:read", options),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch) => ipcRenderer.invoke("settings:update", patch),
});
