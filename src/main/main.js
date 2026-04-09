'use strict';

const {
  app, globalShortcut, powerMonitor, Menu, shell
} = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { Store }         = require('./store');
const { WindowManager } = require('./windows');
const { TrayManager }   = require('./tray');
const { setupIPC }      = require('./ipc');
const { setupUpdater }  = require('./updater');

const store = new Store();

if (!store.get('hardwareAccel')) {
  app.disableHardwareAcceleration();
}

const audioConfig = store.get('audioConfig');
if (audioConfig.agc)         app.commandLine.appendSwitch('disable-audio-output-resampler');
if (audioConfig.volumeLimit) app.commandLine.appendSwitch('disable-audio-volume-limit');

// ── Wayland / X11 + WebRTC flags ──────────────────────────────────────────
const isWayland = !!process.env.WAYLAND_DISPLAY;

if (isWayland) {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
  app.commandLine.appendSwitch('enable-features', [
    'WebRTCPipeWireCapturer',
    'PipeWireCamera',
    'WaylandWindowDecorations',
    'VaapiVideoDecodeLinux',
    'VaapiVideoDecoder'
  ].join(','));
  // Habilita captura de cámara/micro vía PipeWire portal en Wayland
  app.commandLine.appendSwitch('enable-webrtc-pipewire-capturer');
} else {
  app.commandLine.appendSwitch('enable-features', [
    'WebRTCPipeWireCapturer',
    'VaapiVideoDecoder'
  ].join(','));
}

app.commandLine.appendSwitch('enable-webrtc-hide-local-ips-with-mdns', 'false');
// ─────────────────────────────────────────────────────────────────────────

app.setName('WhatsApp');

// Evita que aparezca como org.chromium.Chromium en el monitor de tareas
app.setDesktopName('whatsapp-desktop.desktop');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let wm;
let tm;

app.on('second-instance', (_e, argv) => {
  if (wm) wm.show();
  const url = argv.find(a => a.startsWith('whatsapp://'));
  if (url && wm?.win) wm.win.webContents.send('protocol-url', url);
});

function ensureAppImageDesktopEntry() {
  const appImagePath = process.env.APPIMAGE;
  if (!appImagePath) return;

  const home = os.homedir();
  const applicationsDir = path.join(home, '.local', 'share', 'applications');
  const iconsDir = path.join(home, '.local', 'share', 'icons', 'hicolor', '256x256', 'apps');
  const desktopFile = path.join(applicationsDir, 'whatsapp-desktop.desktop');
  const installedIconPath = path.join(iconsDir, 'whatsapp-desktop.png');

  const iconCandidates = [
    path.join(process.resourcesPath || '', 'icons', 'icon.png'),
    path.join(process.resourcesPath || '', 'resources', 'icons', 'icon.png'),
    path.join(__dirname, '../../icons/icon.png')
  ];

  const sourceIconPath = iconCandidates.find(candidate => fs.existsSync(candidate));
  if (!sourceIconPath) return;

  fs.mkdirSync(applicationsDir, { recursive: true });
  fs.mkdirSync(iconsDir, { recursive: true });

  try {
    if (
      !fs.existsSync(installedIconPath) ||
      fs.statSync(sourceIconPath).mtimeMs > fs.statSync(installedIconPath).mtimeMs
    ) {
      fs.copyFileSync(sourceIconPath, installedIconPath);
    }
  } catch {}

  const desktopContent = `[Desktop Entry]
Type=Application
Name=WhatsApp
Comment=Aplicación de escritorio para WhatsApp con soporte para videollamadas
Exec="${appImagePath}" --no-sandbox %U
TryExec=${appImagePath}
Icon=${installedIconPath}
Terminal=false
Categories=Network;Chat;InstantMessaging;
Keywords=whatsapp;chat;messaging;
MimeType=x-scheme-handler/whatsapp;
StartupNotify=true
StartupWMClass=whatsapp-desktop
`;

  try {
    const current = fs.existsSync(desktopFile) ? fs.readFileSync(desktopFile, 'utf8') : '';
    if (current !== desktopContent) {
      fs.writeFileSync(desktopFile, desktopContent, { mode: 0o755 });
    }
  } catch {}

  try {
    require('child_process').spawn('update-desktop-database', [applicationsDir], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  } catch {}
}

function injectWA (shortcut) {
  if (!wm?.win) return;
  wm.win.webContents.focus();
  wm.win.webContents.sendInputEvent({
    type: 'keyDown',
    keyCode: shortcut.key,
    modifiers: shortcut.modifiers ?? []
  });
}

app.whenReady().then(async () => {
  ensureAppImageDesktopEntry();

  wm = new WindowManager(store);
  await wm.create();

  const menu = Menu.buildFromTemplate([
    {
      label: 'Chats',
      submenu: [
        {
          label: 'Nuevo chat',
          accelerator: 'Ctrl+N',
          click: () => injectWA({ key: 'N', modifiers: ['ctrl'] })
        },
        {
          label: 'Nuevo grupo',
          accelerator: 'Ctrl+Shift+N',
          click: () => injectWA({ key: 'N', modifiers: ['ctrl', 'shift'] })
        },
        { type: 'separator' },
        {
          label: 'Chat siguiente',
          accelerator: 'Ctrl+Shift+]',
          click: () => injectWA({ key: ']', modifiers: ['ctrl', 'shift'] })
        },
        {
          label: 'Chat anterior',
          accelerator: 'Ctrl+Shift+[',
          click: () => injectWA({ key: '[', modifiers: ['ctrl', 'shift'] })
        },
        { type: 'separator' },
        {
          label: 'Archivar chat',
          accelerator: 'Ctrl+E',
          click: () => injectWA({ key: 'E', modifiers: ['ctrl'] })
        },
        {
          label: 'Silenciar chat',
          accelerator: 'Ctrl+Shift+M',
          click: () => injectWA({ key: 'M', modifiers: ['ctrl', 'shift'] })
        },
        {
          label: 'Marcar como no leído',
          accelerator: 'Ctrl+Shift+U',
          click: () => injectWA({ key: 'U', modifiers: ['ctrl', 'shift'] })
        },
        {
          label: 'Eliminar chat',
          accelerator: 'Ctrl+Backspace',
          click: () => injectWA({ key: 'Backspace', modifiers: ['ctrl'] })
        },
        { type: 'separator' },
        {
          label: 'Ver perfil del contacto',
          accelerator: 'Ctrl+P',
          click: () => injectWA({ key: 'P', modifiers: ['ctrl'] })
        },
        {
          label: 'Buscar en chat',
          accelerator: 'Ctrl+F',
          click: () => wm?.openFindInPage()
        }
      ]
    },
    {
      label: 'Llamadas',
      submenu: [
        {
          label: '📞  Llamada de voz',
          click: () => {
            wm?.win?.webContents.executeJavaScript(`
              (() => {
                const btn = document.querySelector('[data-testid="call-voice"]') ||
                            document.querySelector('[aria-label*="voz"]') ||
                            document.querySelector('[aria-label*="voice"]');
                btn?.click();
              })();
            `).catch(() => {});
          }
        },
        {
          label: '📹  Videollamada',
          click: () => {
            wm?.win?.webContents.executeJavaScript(`
              (() => {
                const btn = document.querySelector('[data-testid="call-video"]') ||
                            document.querySelector('[aria-label*="video"]') ||
                            document.querySelector('[aria-label*="vídeo"]');
                btn?.click();
              })();
            `).catch(() => {});
          }
        },
        { type: 'separator' },
        {
          label: 'Ver historial de llamadas',
          click: () => {
            wm?.win?.webContents.executeJavaScript(`
              (() => {
                const btn = document.querySelector('[data-testid="calls"]') ||
                            document.querySelector('[aria-label*="Llamadas"]');
                btn?.click();
              })();
            `).catch(() => {});
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Deshacer',         role: 'undo'      },
        { label: 'Rehacer',          role: 'redo'      },
        { type: 'separator' },
        { label: 'Cortar',           role: 'cut'       },
        { label: 'Copiar',           role: 'copy'      },
        { label: 'Pegar',            role: 'paste'     },
        { label: 'Seleccionar todo', role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Buscar en página',
          accelerator: 'Ctrl+F',
          click: () => wm?.openFindInPage()
        }
      ]
    },
    {
      label: 'Vista',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'Ctrl+R',
          click: () => wm?.reload()
        },
        {
          label: 'Forzar recarga',
          accelerator: 'Ctrl+F5',
          click: () => wm?.reload()
        },
        { type: 'separator' },
        {
          label: 'Acercar zoom',
          accelerator: 'Ctrl+=',
          click: () => wm?.adjustZoom(+0.1)
        },
        {
          label: 'Alejar zoom',
          accelerator: 'Ctrl+-',
          click: () => wm?.adjustZoom(-0.1)
        },
        {
          label: 'Zoom normal',
          accelerator: 'Ctrl+0',
          click: () => wm?.resetZoom()
        },
        { type: 'separator' },
        {
          label: 'Pantalla completa',
          accelerator: 'F11',
          click: () => {
            if (!wm?.win) return;
            wm.win.setFullScreen(!wm.win.isFullScreen());
          }
        },
        { type: 'separator' },
        {
          label: 'Herramientas de desarrollo',
          accelerator: 'F12',
          click: () => wm?.toggleDevTools()
        }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        {
          label: 'Minimizar',
          accelerator: 'Ctrl+M',
          click: () => wm?.win?.minimize()
        },
        {
          label: 'Maximizar / Restaurar',
          click: () => {
            if (!wm?.win) return;
            wm.win.isMaximized() ? wm.win.unmaximize() : wm.win.maximize();
          }
        },
        {
          label: 'Ocultar al tray',
          click: () => wm?.win?.hide()
        },
        { type: 'separator' },
        {
          label: 'Fijar barra de menú',
          type: 'checkbox',
          checked: false,
          click: (item) => {
            wm?.win?.setMenuBarVisibility(item.checked);
            wm?.win?.setAutoHideMenuBar(!item.checked);
          }
        }
      ]
    },
    {
      label: 'Ajustes',
      submenu: [
        {
          label: 'Cerrar al tray',
          type: 'checkbox',
          checked: store.get('closeToTray'),
          click: (item) => store.set('closeToTray', item.checked)
        },
        {
          label: 'Iniciar minimizado',
          type: 'checkbox',
          checked: store.get('startMinimized'),
          click: (item) => store.set('startMinimized', item.checked)
        },
        {
          label: 'Notificaciones',
          type: 'checkbox',
          checked: store.get('notifications'),
          click: (item) => store.set('notifications', item.checked)
        },
        {
          label: 'Corrector ortográfico',
          type: 'checkbox',
          checked: store.get('spellCheck'),
          click: (item) => {
            store.set('spellCheck', item.checked);
            wm?.win?.webContents.session.setSpellCheckerEnabled(item.checked);
          }
        },
        { type: 'separator' },
        {
          label: 'Aceleración por hardware',
          type: 'checkbox',
          checked: store.get('hardwareAccel'),
          click: (item) => {
            store.set('hardwareAccel', item.checked);
            const { dialog } = require('electron');
            dialog.showMessageBox(wm.win, {
              type: 'info',
              title: 'Reinicio necesario',
              message: 'Este cambio requiere reiniciar la aplicación.',
              buttons: ['Reiniciar ahora', 'Más tarde']
            }).then(({ response }) => {
              if (response === 0) { app.relaunch(); app.exit(); }
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Limpiar caché y recargar',
          click: async () => {
            await wm?.win?.webContents.session.clearCache();
            wm?.reload();
          }
        },
        {
          label: 'Abrir carpeta de datos',
          click: () => shell.openPath(app.getPath('userData'))
        }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Atajos de WhatsApp Web',
          click: () => shell.openExternal('https://faq.whatsapp.com/6204576529560565')
        },
        {
          label: 'Novedades beta (WABetaInfo)',
          click: () => shell.openExternal('https://wabetainfo.com')
        },
        {
          label: 'Centro de ayuda de WhatsApp',
          click: () => shell.openExternal('https://faq.whatsapp.com')
        },
        { type: 'separator' },
        {
          label: 'Reportar un problema',
          click: () => shell.openExternal('https://github.com/jgomezbau/whatsapp-desktop/issues')
        },
        { type: 'separator' },
        {
          label: `WhatsApp Desktop v${app.getVersion()}`,
          enabled: false
        },
        {
          label: `Electron v${process.versions.electron}`,
          enabled: false
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'Ctrl+Q',
          click: () => { app.isQuiting = true; app.quit(); }
        }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);
  wm.win.setMenuBarVisibility(false);
  wm.win.setAutoHideMenuBar(true);

  tm = new TrayManager(wm, store);
  tm.create();

  setupIPC(wm, tm, store);

  if (app.isPackaged) setupUpdater(wm);

  _registerShortcuts();
  _watchPower();

  app.on('activate', () => {
    if (wm) wm.show();
  });
});

function _registerShortcuts () {
  const shortcuts = {
    'F12':        () => wm.toggleDevTools(),
    'F5':         () => wm.reload(),
    'Ctrl+F5':    () => wm.reload(),
    'Ctrl+F':     () => wm.openFindInPage(),
    'Ctrl+Plus':  () => wm.adjustZoom(+0.1),
    'Ctrl+=':     () => wm.adjustZoom(+0.1),
    'Ctrl+Minus': () => wm.adjustZoom(-0.1),
    'Ctrl+0':     () => wm.resetZoom(),
    'Ctrl+Q':     () => { app.isQuiting = true; app.quit(); }
  };

  for (const [accel, fn] of Object.entries(shortcuts)) {
    try {
      globalShortcut.register(accel, fn);
    } catch {}
  }
}

function _watchPower () {
  powerMonitor.on('resume', () => {
    setTimeout(() => wm?.reload(), 2000);
  });
}

app.on('before-quit', () => { app.isQuiting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.setAsDefaultProtocolClient('whatsapp');
app.on('open-url', (_e, url) => {
  if (wm?.win) wm.win.webContents.send('protocol-url', url);
});
