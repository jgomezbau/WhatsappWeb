'use strict';

const { Tray, Menu, nativeImage, app } = require('electron');
const { APP_NAME, resolveRuntimeIconPath } = require('./assets');

class TrayManager {
  /**
   * @param {import('./windows').WindowManager} windowManager
   * @param {import('./store').Store} store
   */
  constructor (windowManager, store) {
    this.wm    = windowManager;
    this.store = store;
    this.tray  = null;
    this._unread = 0;
  }

  create () {
    if (this.tray) return;

    this.tray = new Tray(this._icon(false));
    this.tray.setToolTip(APP_NAME);
    this._rebuildMenu();

    // Single-click → toggle window (works on most DE)
    this.tray.on('click', () => {
      if (this.wm.isVisible()) {
        this.wm.win?.hide();
      } else {
        this.wm.show();
      }
    });

    // Double-click always shows (KDE / Windows fallback)
    this.tray.on('double-click', () => this.wm.show());
  }

  /** Update unread badge count. */
  setUnreadCount (count) {
    if (this._unread === count) return;
    this._unread = count;
    this._applyBadge(count);
    if (this.tray) this.tray.setImage(this._icon(count > 0));
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  _rebuildMenu () {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Mostrar WhatsApp',
        click: () => this.wm.show()
      },
      {
        label: 'Recargar',
        click: () => this.wm.reload()
      },
      { type: 'separator' },
      {
        label: 'Minimizar al inicio',
        type:  'checkbox',
        checked: this.store.get('startMinimized'),
        click: (item) => this.store.set('startMinimized', item.checked)
      },
      {
        label: 'Cerrar al tray',
        type:  'checkbox',
        checked: this.store.get('closeToTray'),
        click: (item) => this.store.set('closeToTray', item.checked)
      },
      { type: 'separator' },
      {
        label: 'Salir',
        accelerator: 'Ctrl+Q',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);

    this.tray?.setContextMenu(menu);
  }

  _applyBadge (count) {
    const de = this._desktopEnv();

    // GNOME / Unity / most Wayland compositors
    if (['gnome', 'unity', 'pantheon', 'budgie', 'other'].includes(de)) {
      try { app.setBadgeCount(count); } catch {}
    }

    // macOS dock badge (for the future)
    if (process.platform === 'darwin') {
      app.dock?.setBadge(count > 0 ? String(count) : '');
    }
  }

  _desktopEnv () {
    const raw = (
      process.env.XDG_CURRENT_DESKTOP ||
      process.env.DESKTOP_SESSION      ||
      ''
    ).toLowerCase();
    if (raw.includes('gnome'))   return 'gnome';
    if (raw.includes('kde'))     return 'kde';
    if (raw.includes('unity'))   return 'unity';
    if (raw.includes('xfce'))    return 'xfce';
    if (raw.includes('pantheon'))return 'pantheon';
    return 'other';
  }

  _iconPath (hasUnread) {
    const filename = hasUnread ? 'icon-unread.png' : 'icon.png';
    return resolveRuntimeIconPath(filename);
  }

  _icon (hasUnread) {
    const p = this._iconPath(hasUnread);
    if (p) {
      return nativeImage.createFromPath(p).resize({ width: 22, height: 22 });
    }
    return this._buildFallbackIcon(hasUnread);
  }

  _buildFallbackIcon (hasUnread) {
    // Simple SVG → nativeImage  (works without disk icon files during dev)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="10" fill="${hasUnread ? '#f0b429' : '#25d366'}"/>
    </svg>`;
    return nativeImage.createFromDataURL(
      'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
    );
  }
}

module.exports = { TrayManager };
