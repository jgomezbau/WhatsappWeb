'use strict';

const {
  BrowserWindow, Menu, session, shell, Notification, app, dialog
} = require('electron');
const path = require('path');
const { APP_NAME, resolveRuntimeIconPath } = require('./assets');

const WHATSAPP_URL = 'https://web.whatsapp.com';

// UA dinámico: usa la versión real de Chromium que trae Electron
// y elimina la referencia a Electron para evitar detección
let USER_AGENT = '';

class WindowManager {
  constructor (store) {
    this.store  = store;
    this.win    = null;
    this._findBarVisible = false;
    this._pendingDownloadOptions = null;
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
      title: APP_NAME,
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

    ses.on('will-download', (event, item) => {
      this._handleDownload(event, item);
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
        { label: 'Guardar imagen...', click: () => this._saveImage(params.srcURL, { x: params.x, y: params.y }) },
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

  _handleDownload (event, item) {
    let filename = item.getFilename();
    const saveDialogOptions = this._pendingDownloadOptions ?? {
      title: 'Guardar archivo',
      defaultPath: path.join(app.getPath('downloads'), filename)
    };
    const resolvedDefaultPath = this._resolveDownloadDefaultPath(saveDialogOptions, filename);
    this._pendingDownloadOptions = null;

    item.setSaveDialogOptions({
      ...saveDialogOptions,
      defaultPath: resolvedDefaultPath
    });

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

  async _saveImage (srcURL, clickPosition = null) {
    try {
      if (!this.win) return;
      const messageTimestamp = await this._getMessageTimestampAtPoint(clickPosition);
      const suggestedFilename = this._buildImageFilename(srcURL, messageTimestamp);
      this._pendingDownloadOptions = {
        title: 'Guardar imagen',
        defaultPath: path.join(
          app.getPath('pictures'),
          suggestedFilename
        )
      };
      const triggeredFromViewer = await this._triggerViewerDownload(clickPosition);
      if (!triggeredFromViewer) {
        this.win.webContents.downloadURL(srcURL);
      }
    } catch (err) {
      this._pendingDownloadOptions = null;
      console.error('[WindowManager] Error saving image:', err);
    }
  }

  _imageExtensionFromUrl (rawUrl, fallback = '.jpg') {
    const VALID_IMAGE_EXTENSIONS = new Set([
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'
    ]);

    try {
      const { pathname } = new URL(rawUrl);
      const candidate = path.basename(pathname);
      if (!candidate || candidate === '/') return fallback;

      const decoded = decodeURIComponent(candidate);
      const extension = path.extname(decoded).toLowerCase();

      return VALID_IMAGE_EXTENSIONS.has(extension) ? extension : fallback;
    } catch {
      return fallback;
    }
  }

  _buildImageFilename (rawUrl, timestamp = null) {
    const extension = this._imageExtensionFromUrl(rawUrl, '.jpg');
    return this._buildDefaultImageFilename(timestamp, extension);
  }

  _resolveDownloadDefaultPath (saveDialogOptions, itemFilename) {
    const basePath = saveDialogOptions?.defaultPath;
    if (!basePath) {
      return path.join(app.getPath('downloads'), itemFilename);
    }

    const dir = path.dirname(basePath);
    const suggestedFilename = path.basename(basePath);
    const preferredFilename = this._preferDownloadFilename(suggestedFilename, itemFilename);

    return path.join(dir, preferredFilename);
  }

  _preferDownloadFilename (suggestedFilename, itemFilename) {
    if (!suggestedFilename) return itemFilename;
    if (!itemFilename) return suggestedFilename;

    if (this._isGenericWhatsAppFilename(suggestedFilename) && !this._isGenericWhatsAppFilename(itemFilename)) {
      return itemFilename;
    }

    return suggestedFilename;
  }

  _isGenericWhatsAppFilename (filename) {
    return /^WhatsApp Image\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);
  }

  async _triggerViewerDownload (clickPosition) {
    if (!this.win || !clickPosition) return false;

    try {
      return await this.win.webContents.executeJavaScript(`
        (() => {
          const x = ${JSON.stringify(clickPosition.x)};
          const y = ${JSON.stringify(clickPosition.y)};
          const target = document.elementFromPoint(x, y);
          const dialogRoot =
            target?.closest?.('[role="dialog"]') ||
            target?.closest?.('[aria-modal="true"]') ||
            document.querySelector('[role="dialog"]') ||
            document.querySelector('[aria-modal="true"]') ||
            document.body;

          const isVisible = (el) => {
            if (!(el instanceof Element)) return false;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0;
          };

          const clickableFor = (el) => el.closest('button, [role="button"], [tabindex], div[tabindex]') || el;
          const scoreElement = (el) => {
            const text = [
              el.innerText || '',
              el.getAttribute('aria-label') || '',
              el.getAttribute('title') || '',
              el.getAttribute('data-icon') || ''
            ].join(' ').toLowerCase();

            let score = 0;
            if (text.includes('download')) score += 6;
            if (text.includes('descargar')) score += 6;
            if (text.includes('baixar')) score += 6;
            if (text.includes('scarica')) score += 6;
            if (text.includes('save')) score += 3;
            if (text.includes('guardar')) score += 3;
            if (text.includes('download-filled')) score += 2;

            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.35) score += 2;
            if (rect.right > window.innerWidth * 0.6) score += 1;

            return score;
          };

          const selectorList = [
            'button',
            '[role="button"]',
            '[tabindex]',
            '[data-icon]',
            'span',
            'div'
          ];

          const candidates = [];
          for (const selector of selectorList) {
            const matches = [...dialogRoot.querySelectorAll(selector)]
              .map((el) => clickableFor(el))
              .filter((el) => el instanceof HTMLElement && isVisible(el));

            for (const match of matches) {
              const score = scoreElement(match);
              if (score > 0) candidates.push({ el: match, score });
            }
          }

          candidates.sort((a, b) => b.score - a.score);
          const button = candidates[0]?.el;
          if (!(button instanceof HTMLElement)) return false;

          button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
          button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
          button.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
          button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
          button.click();

          return true;
        })();
      `, true);
    } catch {
      return false;
    }
  }

  async _getMessageTimestampAtPoint (clickPosition) {
    if (!this.win || !clickPosition) return null;

    try {
      const timestampData = await this.win.webContents.executeJavaScript(`
        (() => {
          const x = ${JSON.stringify(clickPosition.x)};
          const y = ${JSON.stringify(clickPosition.y)};
          const target = document.elementFromPoint(x, y);
          if (!target) return null;

          const TIMESTAMP_PATTERN = /(hoy|ayer|\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|\\d{1,2}\\s+de\\s+[a-záéíóú]+\\s+de\\s+\\d{2,4})/i;

          const isVisible = (el) => {
            if (!(el instanceof Element)) return false;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0;
          };

          const collectTextCandidates = (root) => {
            if (!(root instanceof Element)) return [];

            return [root, ...root.querySelectorAll('*')]
              .filter(isVisible)
              .flatMap((el) => {
                const texts = [];
                const innerText = (el.innerText || '').trim().replace(/\\s+/g, ' ');
                const ariaLabel = (el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ');
                const title = (el.getAttribute('title') || '').trim().replace(/\\s+/g, ' ');
                const dataPlain = (el.getAttribute('data-pre-plain-text') || '').trim().replace(/\\s+/g, ' ');

                if (innerText && innerText.length <= 200 && TIMESTAMP_PATTERN.test(innerText)) texts.push(innerText);
                if (ariaLabel && ariaLabel.length <= 200 && TIMESTAMP_PATTERN.test(ariaLabel)) texts.push(ariaLabel);
                if (title && title.length <= 200 && TIMESTAMP_PATTERN.test(title)) texts.push(title);
                if (dataPlain && dataPlain.length <= 200) texts.push(dataPlain);

                return texts;
              });
          };

          const unique = (items) => [...new Set(items.filter(Boolean))];

          const messageRoot =
            target.closest('[data-id]') ||
            target.closest('[role="row"]') ||
            target.closest('.message-in, .message-out, ._amk4, ._amjv') ||
            target.parentElement;

          const viewerRoot =
            target.closest('[role="dialog"]') ||
            target.closest('[aria-modal="true"]') ||
            null;

          const ancestorCandidates = [];
          let current = target;
          while (current && current instanceof Element && ancestorCandidates.length < 8) {
            ancestorCandidates.push(current);
            current = current.parentElement;
          }

          const directMessageMeta = messageRoot?.querySelector?.('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') ?? null;

          const textCandidates = unique([
            directMessageMeta,
            ...ancestorCandidates.flatMap((el) => collectTextCandidates(el).slice(0, 3)),
            ...collectTextCandidates(messageRoot).slice(0, 10),
            ...collectTextCandidates(viewerRoot).slice(0, 10)
          ]);

          return { textCandidates };
        })();
      `, true);

      return this._selectBestTimestamp(timestampData);
    } catch {
      return null;
    }
  }

  _selectBestTimestamp (timestampData) {
    if (!timestampData) return null;

    const candidates = Array.isArray(timestampData.textCandidates)
      ? timestampData.textCandidates
      : [];

    for (const candidate of candidates) {
      const parsed = this._parseWhatsAppTimestamp(candidate);
      if (parsed) return parsed;
    }

    return null;
  }

  _parseWhatsAppTimestamp (rawTimestamp) {
    if (!rawTimestamp) return null;
    if (typeof rawTimestamp !== 'string') return null;

    const normalized = rawTimestamp.trim().replace(/\s+/g, ' ');
    const baseDate = new Date();

    const bracketMatch = normalized.match(/\[(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([ap])\.?\s?m\.?)?,\s(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]/i);
    if (bracketMatch) {
      let [, hours, minutes, seconds, meridiem, day, month, year] = bracketMatch;
      let normalizedYear = Number(year);
      if (normalizedYear < 100) normalizedYear += 2000;
      let normalizedHours = Number(hours);
      if (meridiem) {
        const isPm = meridiem.toLowerCase() === 'p';
        if (isPm && normalizedHours < 12) normalizedHours += 12;
        if (!isPm && normalizedHours === 12) normalizedHours = 0;
      }

      return {
        year: String(normalizedYear).padStart(4, '0'),
        month: String(Number(month)).padStart(2, '0'),
        day: String(Number(day)).padStart(2, '0'),
        hour: String(normalizedHours).padStart(2, '0'),
        minute: String(Number(minutes)).padStart(2, '0'),
        second: String(Number(seconds || 0)).padStart(2, '0')
      };
    }

    const relativeMatch = normalized.match(/(hoy|ayer)\s+a\s+la(?:\(s\))?s?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
    if (relativeMatch) {
      const [, dayToken, hour, minute, second] = relativeMatch;
      if (/^ayer$/i.test(dayToken)) baseDate.setDate(baseDate.getDate() - 1);

      return {
        year: String(baseDate.getFullYear()),
        month: String(baseDate.getMonth() + 1).padStart(2, '0'),
        day: String(baseDate.getDate()).padStart(2, '0'),
        hour: String(Number(hour)).padStart(2, '0'),
        minute: String(Number(minute)).padStart(2, '0'),
        second: String(Number(second || 0)).padStart(2, '0')
      };
    }

    const slashDateMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+a\s+la(?:\(s\))?s?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
    if (slashDateMatch) {
      const [, day, month, year, hour, minute, second] = slashDateMatch;
      let normalizedYear = Number(year);
      if (normalizedYear < 100) normalizedYear += 2000;

      return {
        year: String(normalizedYear).padStart(4, '0'),
        month: String(Number(month)).padStart(2, '0'),
        day: String(Number(day)).padStart(2, '0'),
        hour: String(Number(hour)).padStart(2, '0'),
        minute: String(Number(minute)).padStart(2, '0'),
        second: String(Number(second || 0)).padStart(2, '0')
      };
    }

    const monthNameMatch = normalized.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{2,4}).*?(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
    if (!monthNameMatch) return null;

    const [, day, monthName, year, hour, minute, second] = monthNameMatch;
    const monthMap = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      setiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12
    };
    const month = monthMap[monthName.toLowerCase()];
    if (!month) return null;

    let normalizedYear = Number(year);
    if (normalizedYear < 100) normalizedYear += 2000;

    return {
      year: String(normalizedYear).padStart(4, '0'),
      month: String(month).padStart(2, '0'),
      day: String(Number(day)).padStart(2, '0'),
      hour: String(Number(hour)).padStart(2, '0'),
      minute: String(Number(minute)).padStart(2, '0'),
      second: String(Number(second || 0)).padStart(2, '0')
    };
  }

  _buildDefaultImageFilename (timestamp = null, extension = '.jpg') {
    if (!timestamp) return `WhatsApp Image${extension}`;

    const yyyy = timestamp.year;
    const mm = timestamp.month;
    const dd = timestamp.day;
    const hh = timestamp.hour;
    const min = timestamp.minute;
    const ss = timestamp.second;

    return `WhatsApp Image ${yyyy}-${mm}-${dd} at ${hh}.${min}.${ss}${extension}`;
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
    return resolveRuntimeIconPath(filename);
  }

  _notify (title, body) {
    if (!Notification.isSupported()) return;
    new Notification({ title, body, icon: this._iconPath('icon.png') }).show();
  }
}

module.exports = { WindowManager, WHATSAPP_URL, USER_AGENT };
