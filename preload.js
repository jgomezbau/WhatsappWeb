// preload.js
const { contextBridge, ipcRenderer } = require('electron'); // Añadir ipcRenderer

// Exponer solo lo necesario al renderer
contextBridge.exposeInMainWorld('whatsappDesktop', {
  getVersion: () => process.versions.electron
});

// Guardar referencia a la API original
const OriginalNotification = Notification;

// Sobrescribir el constructor de Notification
global.Notification = function(title, options) {
  console.log(`[Preload] Notification intercepted: ${title}`); // Log para depuración

  // Enviar los detalles al proceso principal para que la maneje
  ipcRenderer.send('show-notification', { title, options });

  // Devolver un objeto simulado para evitar errores en el script de WhatsApp Web.
  // Este objeto debe tener los métodos/propiedades que WhatsApp Web pueda usar.
  // Es posible que necesites añadir más métodos/propiedades si WhatsApp Web los usa.
  return {
      close: () => {},
      addEventListener: (eventName, listener) => {
          // Podrías querer manejar 'click', 'close', 'show', 'error' aquí si es necesario
          // console.log(`[Preload] Dummy Notification: addEventListener for ${eventName}`);
      },
      removeEventListener: (eventName, listener) => {},
      dispatchEvent: (event) => { return true; },
      onclick: null,
      onclose: null,
      onerror: null,
      onshow: null,
      // Propiedades básicas que podría esperar
      title: title,
      body: options?.body || '',
      icon: options?.icon || '',
      tag: options?.tag || '',
      // ...otras propiedades si son necesarias
  };
};

// Asegurar que las propiedades estáticas como 'permission' sigan funcionando
global.Notification.requestPermission = OriginalNotification.requestPermission.bind(OriginalNotification);
Object.defineProperty(global.Notification, 'permission', {
  get: () => OriginalNotification.permission
});

console.log('[Preload] Notification API overridden.');

// --- NUEVO: Detectar mensajes no leídos y enviar el contador al main ---
function getUnreadCount() {
  // WhatsApp Web suele poner el contador en el título, ej: "(2) WhatsApp"
  const match = document.title.match(/^\((\d+)\)/);
  return match ? parseInt(match[1], 10) : 0;
}

const observer = new MutationObserver(() => {
  const count = getUnreadCount();
  ipcRenderer.send('unread-count', count);
});

window.addEventListener('DOMContentLoaded', () => {
  observer.observe(document.querySelector('title'), { childList: true });
  // Enviar el contador inicial
  ipcRenderer.send('unread-count', getUnreadCount());
});