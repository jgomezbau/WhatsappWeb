'use strict';

/**
 * All IPC channel handlers in one place.
 * Keep this file thin — delegate real work to WindowManager / TrayManager.
 */

const { ipcMain, Notification, app, dialog, shell } = require('electron');
const path = require('path');

/**
 * @param {import('./windows').WindowManager} wm
 * @param {import('../tray').TrayManager}      tm
 * @param {import('../store').Store}           store
 */
function setupIPC (wm, tm, store) {

  // ── Notifications ─────────────────────────────────────────────────────────
  ipcMain.on('show-notification', (_e, { title, options = {} }) => {
    if (!store.get('notifications')) return;
    if (!Notification.isSupported())   return;

    const iconPath = path.join(
      process.resourcesPath ?? path.join(__dirname, '../../'),
      'resources/icons/icon.png'
    );

    const n = new Notification({
      title,
      body:   options.body   || '',
      silent: options.silent || false,
      icon:   iconPath
    });

    n.on('click', () => wm.show());
    n.on('failed', (err) => console.error('[IPC] Notification failed:', err));
    n.show();
  });

  // ── Unread badge ──────────────────────────────────────────────────────────
  ipcMain.on('unread-count', (_e, count) => {
    tm.setUnreadCount(count);
  });

  // ── Find in page ──────────────────────────────────────────────────────────
  ipcMain.on('find-in-page', (_e, text, forward = true) => {
    if (!wm.win || !text) return;
    wm.win.webContents.findInPage(text, { forward, findNext: true });
  });

  ipcMain.on('stop-find-in-page', () => {
    wm.win?.webContents.stopFindInPage('clearSelection');
  });

  ipcMain.on('find-in-page-result', (_e, result) => {
    // Forward result back to renderer so find bar can show "2 / 14" etc.
    if (wm.win) {
      wm.win.webContents.send('find-result', result);
    }
  });

  // ── Zoom ─────────────────────────────────────────────────────────────────
  ipcMain.on('zoom-in',    () => wm.adjustZoom(+0.1));
  ipcMain.on('zoom-out',   () => wm.adjustZoom(-0.1));
  ipcMain.on('zoom-reset', () => wm.resetZoom());

  // ── Settings (get/set) ───────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => store.getAll());

  ipcMain.handle('settings:set', (_e, key, value) => {
    store.set(key, value);

    // Live-apply some settings without restart
    if (key === 'spellCheck') {
      wm.win?.webContents.session.setSpellCheckerEnabled(value);
    }
    if (key === 'notifications') {
      // nothing extra needed
    }
    return true;
  });

  ipcMain.handle('settings:restart-needed', () => {
    return dialog.showMessageBox(wm.win, {
      type:    'question',
      title:   'Reinicio necesario',
      message: 'Algunos cambios requieren reiniciar la aplicación.',
      buttons: ['Reiniciar ahora', 'Más tarde'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) { app.relaunch(); app.exit(); }
    });
  });

  // ── App info ─────────────────────────────────────────────────────────────
  ipcMain.handle('app:version',  () => app.getVersion());
  ipcMain.handle('app:platform', () => process.platform);

  // ── Open external ────────────────────────────────────────────────────────
  ipcMain.on('open-external', (_e, url) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
  });

  // ── find-in-page result from webContents ─────────────────────────────────
  // Wire up the webContents event once window is ready
  const wireFoundResult = () => {
    wm.win?.webContents.on('found-in-page', (_e, result) => {
      wm.win?.webContents.send('find-result', result);
    });
  };
  // wm.win is already created when setupIPC is called
  wireFoundResult();
}

module.exports = { setupIPC };
