// preload.js
const { contextBridge } = require('electron');

// Exponer solo lo necesario al renderer
contextBridge.exposeInMainWorld('whatsappDesktop', {
  getVersion: () => process.versions.electron
});