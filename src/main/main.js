'use strict';

const {
  app, globalShortcut, powerMonitor, Menu
} = require('electron');
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

app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer,VaapiVideoDecoder');
app.commandLine.appendSwitch('enable-webrtc-hide-local-ips-with-mdns', 'false');

if (process.env.WAYLAND_DISPLAY && !process.env.ELECTRON_OZONE_PLATFORM_HINT) {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
  app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations');
}

app.setName('WhatsApp');
Menu.setApplicationMenu(null);

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

app.whenReady().then(async () => {
  wm = new WindowManager(store);
  await wm.create();

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
    'Ctrl+R':     () => wm.reload(),
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
app.on('will-quit',   () => globalShortcut.unregisterAll());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.setAsDefaultProtocolClient('whatsapp');
app.on('open-url', (_e, url) => {
  if (wm?.win) wm.win.webContents.send('protocol-url', url);
});