const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  startServer: (data) => ipcRenderer.send('start-server', data),
  switchPort: () => ipcRenderer.send('switch-port'),
  getAppVersion: () => ipcRenderer.invoke('get-version')
});

