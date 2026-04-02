'use strict';

/**
 * Preload script — runs in the renderer context but has access to Node/IPC.
 * Exposes a minimal, typed API to the WhatsApp Web page via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

// ── Public API exposed to WhatsApp Web ────────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {
  // Version info
  getVersion:    () => ipcRenderer.invoke('app:version'),
  getPlatform:   () => ipcRenderer.invoke('app:platform'),

  // Settings
  getSettings:   ()           => ipcRenderer.invoke('settings:get'),
  setSetting:    (key, value) => ipcRenderer.invoke('settings:set', key, value),
  requestRestart:()           => ipcRenderer.invoke('settings:restart-needed'),

  // Find in page
  findInPage:     (text, forward) => ipcRenderer.send('find-in-page', text, forward),
  stopFindInPage: ()              => ipcRenderer.send('stop-find-in-page'),
  onFindResult:   (cb)            => {
    ipcRenderer.on('find-result', (_e, r) => cb(r));
  },

  // Zoom
  zoomIn:    () => ipcRenderer.send('zoom-in'),
  zoomOut:   () => ipcRenderer.send('zoom-out'),
  zoomReset: () => ipcRenderer.send('zoom-reset'),

  // Protocol URL
  onProtocolUrl: (cb) => {
    ipcRenderer.on('protocol-url', (_e, url) => cb(url));
  },

  // Open external link safely
  openExternal: (url) => ipcRenderer.send('open-external', url)
});

// ── Intercept Web Notifications → native notifications ────────────────────
(function patchNotifications () {
  const Native = Notification;

  function DesktopNotification (title, options = {}) {
    ipcRenderer.send('show-notification', { title, options });

    // Return a duck-typed object so WhatsApp Web doesn't throw
    return Object.assign(Object.create(null), {
      title,
      body:  options.body  ?? '',
      icon:  options.icon  ?? '',
      tag:   options.tag   ?? '',
      silent: options.silent ?? false,
      onclick:  null,
      onclose:  null,
      onerror:  null,
      onshow:   null,
      close:            () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent:    () => true
    });
  }

  DesktopNotification.requestPermission = () =>
    Native.requestPermission();

  Object.defineProperty(DesktopNotification, 'permission', {
    get: () => Native.permission
  });

  // Replace global Notification
  Object.defineProperty(window, 'Notification', {
    value:    DesktopNotification,
    writable: false
  });
})();

// ── Unread count (from document title) ───────────────────────────────────
(function watchUnreadCount () {
  let lastCount = 0;

  function sendCount () {
    const m = document.title.match(/^\((\d+)\)/);
    const n = m ? parseInt(m[1], 10) : 0;
    if (n !== lastCount) {
      lastCount = n;
      ipcRenderer.send('unread-count', n);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.querySelector('title');
    if (titleEl) {
      new MutationObserver(sendCount).observe(titleEl, { childList: true });
    }
    sendCount();
  });
})();

// ── Keyboard shortcut passthrough ─────────────────────────────────────────
(function registerKeys () {
  window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'f') {
      e.preventDefault();
      ipcRenderer.send('find-in-page', '', true);
      // Let WindowManager handle the UI
    }
    if (ctrl && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      ipcRenderer.send('zoom-in');
    }
    if (ctrl && e.key === '-') {
      e.preventDefault();
      ipcRenderer.send('zoom-out');
    }
    if (ctrl && e.key === '0') {
      e.preventDefault();
      ipcRenderer.send('zoom-reset');
    }
  });
});
