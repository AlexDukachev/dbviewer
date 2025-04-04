const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveConnection: (conn) => ipcRenderer.invoke('save-connection', conn),
    loadConnections: () => ipcRenderer.invoke('load-connections'),
    connectAndListDatabases: (conn) => ipcRenderer.invoke('connect-and-list-databases', conn),
});

contextBridge.exposeInMainWorld('api', {
    saveConnection: (conn) => ipcRenderer.invoke('save-connection', conn),
    loadConnections: () => ipcRenderer.invoke('load-connections'),
});