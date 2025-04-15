// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Inyectar características necesarias para que WhatsApp Web funcione correctamente
process.once('loaded', () => {
  // Asegurar que navigator.mediaDevices está disponible para las videollamadas
  if (navigator.mediaDevices) {
    console.log('MediaDevices API está disponible');
  } else {
    console.warn('MediaDevices API no está disponible');
  }

  // Sobreescribir algunas propiedades del navegador para evitar detección
  const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  
  // Modificar User-Agent para evadir detección de Electron
  Object.defineProperty(navigator, 'userAgent', {
    get: function() { return userAgent; }
  });

  // Sobreescribir navigator.platform para simular un sistema Linux/Windows completo
  Object.defineProperty(navigator, 'platform', {
    get: function() { return 'Linux x86_64'; }
  });

  // Eliminar características que puedan identificar a Electron
  delete window.process;
  delete window.require;
  delete window.module;
  delete window.Buffer;
  delete window.setImmediate;
  delete window.clearImmediate;
  delete window.global;
});

// API segura para comunicarse con el proceso principal si es necesario
contextBridge.exposeInMainWorld('whatsappDesktop', {
  getVersion: () => process.versions.electron,
  isElectron: true
});