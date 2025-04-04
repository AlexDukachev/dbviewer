const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadConnections: () => ipcRenderer.invoke('load-connections'),
    saveConnection: (conn) => ipcRenderer.invoke('save-connection', conn),
    connectAndListDatabases: (conn) => ipcRenderer.invoke('connect-and-list-databases', conn),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args), // ✅ Добавляем универсальный invoke
});

contextBridge.exposeInMainWorld('api', {
    saveConnection: (conn) => ipcRenderer.invoke('save-connection', conn),
    loadConnections: () => ipcRenderer.invoke('load-connections'),
});