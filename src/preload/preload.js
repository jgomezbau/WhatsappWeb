'use strict';
const { ipcRenderer } = require('electron');

// ── API para la página (sin contextBridge) ────────────────────────────────
window.electronAPI = {
  getVersion:     () => ipcRenderer.invoke('app:version'),
  getPlatform:    () => ipcRenderer.invoke('app:platform'),
  getSettings:    () => ipcRenderer.invoke('settings:get'),
  setSetting:     (k, v) => ipcRenderer.invoke('settings:set', k, v),
  requestRestart: () => ipcRenderer.invoke('settings:restart-needed'),
  findInPage:     (text, fwd) => ipcRenderer.send('find-in-page', text, fwd),
  stopFindInPage: () => ipcRenderer.send('stop-find-in-page'),
  onFindResult:   (cb) => ipcRenderer.on('find-result', (_e, r) => cb(r)),
  zoomIn:         () => ipcRenderer.send('zoom-in'),
  zoomOut:        () => ipcRenderer.send('zoom-out'),
  zoomReset:      () => ipcRenderer.send('zoom-reset'),
  onProtocolUrl:  (cb) => ipcRenderer.on('protocol-url', (_e, url) => cb(url)),
  openExternal:   (url) => ipcRenderer.send('open-external', url)
};

// ── Notificaciones ────────────────────────────────────────────────────────
const NativeNotification = window.Notification;

function DesktopNotification (title, options = {}) {
  ipcRenderer.send('show-notification', { title, options });
  return Object.assign(Object.create(null), {
    title, body: options.body ?? '', icon: options.icon ?? '',
    tag: options.tag ?? '', silent: options.silent ?? false,
    onclick: null, onclose: null, onerror: null, onshow: null,
    close: () => {}, addEventListener: () => {},
    removeEventListener: () => {}, dispatchEvent: () => true
  });
}
DesktopNotification.requestPermission = () => NativeNotification.requestPermission();
Object.defineProperty(DesktopNotification, 'permission', {
  get: () => NativeNotification.permission
});
window.Notification = DesktopNotification;

// ── Unread count ──────────────────────────────────────────────────────────
let lastCount = 0;
function sendCount () {
  const m = document.title.match(/^\((\d+)\)/);
  const n = m ? parseInt(m[1], 10) : 0;
  if (n !== lastCount) { lastCount = n; ipcRenderer.send('unread-count', n); }
}
window.addEventListener('DOMContentLoaded', () => {
  const titleEl = document.querySelector('title');
  if (titleEl) new MutationObserver(sendCount).observe(titleEl, { childList: true });
  sendCount();
});

// ── Atajos de teclado ─────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 'f') { e.preventDefault(); ipcRenderer.send('find-in-page', '', true); }
  if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); ipcRenderer.send('zoom-in'); }
  if (ctrl && e.key === '-') { e.preventDefault(); ipcRenderer.send('zoom-out'); }
  if (ctrl && e.key === '0') { e.preventDefault(); ipcRenderer.send('zoom-reset'); }
});