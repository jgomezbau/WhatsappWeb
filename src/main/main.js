'use strict';

const {
  app, globalShortcut, powerMonitor, Menu, shell
} = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  APP_DESCRIPTION,
  APP_DESKTOP_FILENAME,
  APP_EXECUTABLE,
  APP_NAME,
  resolveRuntimeIconPath
} = require('./assets');
const { Store }         = require('./store');
const { WindowManager } = require('./windows');
const { TrayManager }   = require('./tray');
const { setupIPC }      = require('./ipc');
const { createApplicationMenu } = require('./menu');
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

app.setName(APP_NAME);

// Evita que aparezca como org.chromium.Chromium en el monitor de tareas
app.setDesktopName(APP_DESKTOP_FILENAME);

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
  const desktopFile = path.join(applicationsDir, APP_DESKTOP_FILENAME);
  const installedIconPath = path.join(iconsDir, `${APP_EXECUTABLE}.png`);
  const sourceIconPath = resolveRuntimeIconPath('icon.png');
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
Comment=${APP_DESCRIPTION}
Exec="${appImagePath}" --no-sandbox %U
TryExec=${appImagePath}
Icon=${installedIconPath}
Terminal=false
Categories=Network;Chat;InstantMessaging;
Keywords=whatsapp;chat;messaging;
MimeType=x-scheme-handler/whatsapp;
StartupNotify=true
StartupWMClass=${APP_EXECUTABLE}
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

  const menu = Menu.buildFromTemplate(
    createApplicationMenu({ shell, store, wm, injectWA })
  );

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
