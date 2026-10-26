const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('axiomDesktop', {
  isDesktop: true,
  platform: process.platform,
  arch: process.arch,
  getSystemInfo: () => ipcRenderer.invoke('axiom:get-system-info'),
});
