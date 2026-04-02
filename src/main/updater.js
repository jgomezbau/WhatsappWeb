'use strict';

/**
 * Auto-updater powered by electron-updater.
 * Only active in packaged builds (app.isPackaged === true).
 */

const { dialog, app } = require('electron');

function setupUpdater (wm) {
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch {
    console.warn('[Updater] electron-updater not available — skipping.');
    return;
  }

  autoUpdater.logger = console;
  autoUpdater.autoDownload    = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(wm.win, {
      type:    'info',
      title:   'Actualización disponible',
      message: `Nueva versión ${info.version} disponible. Descargando en segundo plano…`,
      buttons: ['OK']
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(wm.win, {
      type:    'info',
      title:   'Actualización lista',
      message: `Versión ${info.version} descargada. ¿Instalar y reiniciar ahora?`,
      buttons: ['Instalar', 'Más tarde'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err?.message ?? err);
  });

  // Check 30 s after launch, then every 4 hours
  setTimeout(() => autoUpdater.checkForUpdates(), 30_000);
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
}

module.exports = { setupUpdater };
