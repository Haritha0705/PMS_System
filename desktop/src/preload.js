// Only the setup screen uses this. The app itself needs nothing from the desktop shell.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pmsDesktop', {
  saveConnection: (url) => ipcRenderer.invoke('save-connection', url),
});
