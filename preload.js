const { contextBridge, ipcRenderer } = require('electron');
const io = require('socket.io-client');

contextBridge.exposeInMainWorld('electronAPI', {
  connectSocket: (url) => {
    return io(url, {
      transports: ['websocket', 'polling']
    });
  },
  openExternal: async (url) => ipcRenderer.invoke('open-external', url)
});
