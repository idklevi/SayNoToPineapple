const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ghostWindowControls', {
  minimize: () => ipcRenderer.send('minimize-hud'),
  close: () => ipcRenderer.send('close-hud'),
});
