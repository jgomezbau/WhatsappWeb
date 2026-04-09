'use strict';

const {
  BrowserWindow, Menu, session, shell, Notification, app, dialog
} = require('electron');
const path = require('path');

const WHATSAPP_URL = 'https://web.whatsapp.com';

// UA dinámico: usa la versión real de Chromium que trae Electron
// y elimina la referencia a Electron para evitar detección
let USER_AGENT = '';

class WindowManager {
  constructor (store) {
    this.store  = store;
    this.win    = null;
    this._findBarVisible = false;
  }

  async create () {
    // Construir UA con la versión real de Chromium
    const chromeVersion = process.versions.chrome ?? '142.0.0.0';
    USER_AGENT =
      `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ` +
      `(KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;

    const bounds = this.store.get('windowBounds');

    this.win = new BrowserWindow({
      width:  bounds.width,
      height: bounds.height,
      x:      bounds.x,
      y:      bounds.y,
      minWidth:  800,
      minHeight: 600,
      icon: this._iconPath('icon.png'),
      show: false,
      title: 'WhatsApp',
      backgroundColor: '#111b21',
      webPreferences: {
        preload:          path.join(__dirname, '../preload/preload.js'),
        nodeIntegration:  false,
        contextIsolation: true,
        sandbox:          false,
        spellcheck:       this.store.get('spellCheck'),
        webSecurity:      true,
        allowRunningInsecureContent: false,
      }
    });

    this._configureSession();
    this._attachListeners();

    await this.win.loadFile(
      path.join(__dirname, '../renderer/loading.html')
    );

    this.win.show();
    if (!this.store.get('startMinimized')) this.win.focus();

    setTimeout(() => {
      if (this.win) this.win.loadURL(WHATSAPP_URL, { userAgent: USER_AGENT });
    }, 600);

    return this.win;
  }

  _configureSession () {
    const ses = session.defaultSession;

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = USER_AGENT;
      callback({ requestHeaders: details.requestHeaders });
    });

    const ALLOWED = new Set([
      'media', 'camera', 'microphone', 'mediaKeySystem', 'geolocation',
      'notifications', 'fullscreen', 'pointerLock',
      'clipboard-sanitized-write',
      'persistent-storage'
    ]);

    const allowPermission = (_wc, permission, requestingOrigin, details) => {
      const allowed = ALLOWED.has(permission);
      console.debug('[PermissionCheck]', permission, requestingOrigin, details?.mediaType, 'allowed=', allowed);
      return allowed;
    };

    const handlePermissionRequest = (_wc, permission, callback, details) => {
      const allowed = ALLOWED.has(permission);
      console.debug('[PermissionRequest]', permission, details?.securityOrigin || details?.requestingOrigin || '', 'allowed=', allowed);
      callback(allowed);
    };

    ses.setPermissionCheckHandler(allowPermission);
    ses.setPermissionRequestHandler(handlePermissionRequest);

    ses.flushStorageData();

    if (this.store.get('spellCheck')) {
      ses.setSpellCheckerLanguages([app.getLocale(), 'en-US'].filter(Boolean));
    }

    ses.on('will-download', (_e, item) => {
      this._handleDownload(item);
    });
  }

  _attachListeners () {
    const win = this.win;

    win.on('resize', () => this._saveBounds());
    win.on('move',   () => this._saveBounds());

    win.on('close', (e) => {
      if (!app.isQuiting && this.store.get('closeToTray')) {
        e.preventDefault();
        win.hide();
      } else {
        this._saveBounds();
      }
    });

    win.on('closed', () => { this.win = null; });

    win.webContents.setWindowOpenHandler(({ url, features }) => {
      if (url.startsWith(WHATSAPP_URL)) {
        if (features.includes('popup') || features.includes('width')) {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              width:  1280,
              height: 800,
              icon: this._iconPath('icon.png'),
              webPreferences: {
                preload:          path.join(__dirname, '../preload/preload.js'),
                nodeIntegration:  false,
                contextIsolation: true,
                sandbox:          false,
                webSecurity:      true,
                allowRunningInsecureContent: false,
              }
            }
          };
        }
        win.loadURL(url, { userAgent: USER_AGENT });
        return { action: 'deny' };
      }
      shell.openExternal(url);
      return { action: 'deny' };
    });

    win.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith(WHATSAPP_URL) && !url.startsWith('file://')) {
        e.preventDefault();
        shell.openExternal(url);
      }
    });

    win.webContents.on('did-finish-load', () => {
      const z = this.store.get('zoom');
      if (z !== 1.0) win.webContents.setZoomFactor(z);
    });

    win.webContents.on('render-process-gone', (_e, details) => {
      console.error('[Window] Renderer crashed:', details.reason);
      dialog.showMessageBox(win, {
        type: 'error',
        title: 'WhatsApp ha fallado',
        message: 'El proceso de WhatsApp ha fallado.',
        buttons: ['Recargar', 'Salir'],
        defaultId: 0
      }).then(({ response }) => {
        if (response === 0) win.loadURL(WHATSAPP_URL, { userAgent: USER_AGENT });
        else app.quit();
      });
    });

    win.webContents.on('unresponsive', () => {
      dialog.showMessageBox(win, {
        type: 'warning',
        title: 'WhatsApp no responde',
        message: '¿Deseas esperar o recargar la página?',
        buttons: ['Esperar', 'Recargar'],
        defaultId: 0
      }).then(({ response }) => {
        if (response === 1) win.loadURL(WHATSAPP_URL, { userAgent: USER_AGENT });
      });
    });

    win.webContents.on('context-menu', (_e, params) => {
      this._buildContextMenu(params).popup();
    });
  }

  _buildContextMenu (params) {
    const win = this.win;
    const items = [];

    if (params.misspelledWord) {
      for (const s of params.dictionarySuggestions.slice(0, 5)) {
        items.push({ label: s, click: () => win.webContents.replaceMisspelling(s) });
      }
      items.push(
        { type: 'separator' },
        {
          label: `Añadir "${params.misspelledWord}" al diccionario`,
          click: () => win.webContents.session.addWordToSpellCheckerDictionary(
            params.misspelledWord
          )
        },
        { type: 'separator' }
      );
    }

    if (params.isEditable) {
      items.push(
        { label: 'Cortar',           role: 'cut',       enabled: params.selectionText !== '' },
        { label: 'Copiar',           role: 'copy',      enabled: params.selectionText !== '' },
        { label: 'Pegar',            role: 'paste' },
        { label: 'Seleccionar todo', role: 'selectAll' },
        { type: 'separator' }
      );
    } else if (params.selectionText) {
      items.push(
        { label: 'Copiar', role: 'copy' },
        { type: 'separator' }
      );
    }

    if (params.linkURL) {
      items.push(
        { label: 'Abrir enlace',  click: () => shell.openExternal(params.linkURL) },
        { label: 'Copiar enlace', click: () => require('electron').clipboard.writeText(params.linkURL) },
        { type: 'separator' }
      );
    }

    if (params.mediaType === 'image' && params.srcURL) {
      items.push(
        { label: 'Guardar imagen...', click: () => this._saveImage(params.srcURL) },
        { type: 'separator' }
      );
    }

    items.push(
      { label: 'Recargar',     click: () => win.loadURL(WHATSAPP_URL, { userAgent: USER_AGENT }) },
      { label: 'Buscar...',    accelerator: 'Ctrl+F', click: () => this.openFindInPage() },
      { label: 'Imprimir',     accelerator: 'Ctrl+P', click: () => win.webContents.print() },
      { type: 'separator' },
      { label: 'Inspeccionar', click: () => win.webContents.inspectElement(params.x, params.y) }
    );

    return Menu.buildFromTemplate(items);
  }

  _handleDownload (item) {
    const filename = item.getFilename();
    const savePath = dialog.showSaveDialogSync(this.win, {
      title: 'Guardar archivo',
      defaultPath: path.join(app.getPath('downloads'), filename)
    });

    if (!savePath) { item.cancel(); return; }

    item.setSavePath(savePath);

    item.on('updated', (_e, state) => {
      if (state === 'progressing' && !item.isPaused()) {
        const pct = item.getTotalBytes()
          ? Math.round((item.getReceivedBytes() / item.getTotalBytes()) * 100)
          : 0;
        if (this.win) this.win.setProgressBar(pct / 100);
      }
    });

    item.once('done', (_e, state) => {
      if (this.win) this.win.setProgressBar(-1);
      if (state === 'completed') this._notify('Descarga completada', `${filename} guardado.`);
    });
  }

  async _saveImage (srcURL) {
    const savePath = dialog.showSaveDialogSync(this.win, {
      title: 'Guardar imagen',
      defaultPath: path.join(app.getPath('pictures'), 'whatsapp-image.jpg')
    });
    if (!savePath) return;
    try {
      const res = await fetch(srcURL);
      const buf = Buffer.from(await res.arrayBuffer());
      require('fs').writeFileSync(savePath, buf);
      this._notify('Imagen guardada', path.basename(savePath));
    } catch (err) {
      console.error('[WindowManager] Error saving image:', err);
    }
  }

  openFindInPage () {
    if (!this.win) return;
    this._findBarVisible = true;
    this.win.webContents.executeJavaScript(`
      (() => {
        if (document.getElementById('__wad-find-bar')) return;
        const bar = document.createElement('div');
        bar.id = '__wad-find-bar';
        bar.style.cssText = \`
          position: fixed; top: 0; right: 0; z-index: 99999;
          background: #202c33; color: #e9edef; padding: 8px 12px;
          display: flex; gap: 6px; align-items: center;
          border-bottom-left-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.5);
          font-family: system-ui, sans-serif; font-size: 14px;
        \`;
        bar.innerHTML = \`
          <input id="__wad-find-input" placeholder="Buscar..." style="
            background: #2a3942; border: none; outline: none;
            color: #e9edef; padding: 4px 8px; border-radius: 4px; width: 200px;
          ">
          <span id="__wad-find-count" style="opacity:.6; min-width:50px"></span>
          <button id="__wad-find-prev" style="background:none;border:none;color:#e9edef;cursor:pointer;font-size:16px">‹</button>
          <button id="__wad-find-next" style="background:none;border:none;color:#e9edef;cursor:pointer;font-size:16px">›</button>
          <button id="__wad-find-close" style="background:none;border:none;color:#e9edef;cursor:pointer;font-size:18px;margin-left:4px">✕</button>
        \`;
        document.body.appendChild(bar);
        const input = document.getElementById('__wad-find-input');
        input.focus();
        input.addEventListener('input', (e) => window.__wadFind?.(e.target.value, false));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter')  window.__wadFind?.(input.value, !e.shiftKey);
          if (e.key === 'Escape') document.getElementById('__wad-find-close').click();
        });
        document.getElementById('__wad-find-next').onclick  = () => window.__wadFind?.(input.value, true);
        document.getElementById('__wad-find-prev').onclick  = () => window.__wadFind?.(input.value, false);
        document.getElementById('__wad-find-close').onclick = () => {
          bar.remove(); window.electronAPI?.stopFindInPage();
        };
      })();
    `).catch(() => {});
  }

  adjustZoom (delta) {
    if (!this.win) return;
    const current = this.win.webContents.getZoomFactor();
    const next    = Math.min(2.0, Math.max(0.5, +(current + delta).toFixed(2)));
    this.win.webContents.setZoomFactor(next);
    this.store.set('zoom', next);
  }

  resetZoom () {
    if (!this.win) return;
    this.win.webContents.setZoomFactor(1.0);
    this.store.set('zoom', 1.0);
  }

  show () {
    if (!this.win) return;
    if (this.win.isMinimized()) this.win.restore();
    this.win.show();
    this.win.focus();
  }

  toggleDevTools () { this.win?.webContents.toggleDevTools(); }
  reload ()         { this.win?.loadURL(WHATSAPP_URL, { userAgent: USER_AGENT }); }
  isVisible ()      { return this.win?.isVisible() ?? false; }

  _saveBounds () {
    if (!this.win || this.win.isMinimized() || this.win.isMaximized()) return;
    this.store.set('windowBounds', this.win.getBounds());
  }

  _iconPath (filename) {
    const devPath  = path.join(__dirname, '../../icons', filename);
    const prodPath = path.join(process.resourcesPath ?? '', 'icons', filename);
    return require('fs').existsSync(devPath) ? devPath : prodPath;
  }

  _notify (title, body) {
    if (!Notification.isSupported()) return;
    new Notification({ title, body, icon: this._iconPath('icon.png') }).show();
  }
}

module.exports = { WindowManager, WHATSAPP_URL, USER_AGENT };
