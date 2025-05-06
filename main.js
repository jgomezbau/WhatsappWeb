const { app, BrowserWindow, Menu, session, shell, Tray, nativeImage, ipcMain, Notification, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('WhatsApp');

let mainWindow;
let tray;

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const WHATSAPP_URL = 'https://web.whatsapp.com';
const configPath = path.join(app.getPath('userData'), 'media-config.json');

// Leer configuración de multimedia
function readMediaConfig() {
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return { agc: false, volumeLimit: false, outOfProcess: false };
    }
}

// Guardar configuración de multimedia
function writeMediaConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config));
}

// Aplicar flags de Chromium según configuración
const mediaConfig = readMediaConfig();
if (mediaConfig.agc) app.commandLine.appendSwitch('disable-audio-output-resampler');
if (mediaConfig.volumeLimit) app.commandLine.appendSwitch('disable-audio-volume-limit');
if (mediaConfig.outOfProcess) app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');

// Detectar entorno de escritorio
function getDesktopEnv() {
    const env = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase();
    if (env.includes('gnome')) return 'gnome';
    if (env.includes('kde')) return 'kde';
    return 'other';
}

// Generar icono de tray con punto amarillo
function getTrayIcon(unread) {
    const iconPath = unread
        ? path.join(__dirname, 'icons', 'icon-unread.png')
        : path.join(__dirname, 'icons', 'icon.png');
    return nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 });
}

function createTray() {
    if (tray) return;
    const iconPath = path.join(__dirname, 'icons', 'icon.png');
    tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 }));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Mostrar WhatsApp',
            click: () => {
                if (mainWindow) mainWindow.show();
            }
        },
        {
            label: 'Salir',
            click: () => {
                app.quit(); // Esto termina todos los procesos
            }
        }
    ]);
    tray.setToolTip('WhatsApp');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        if (mainWindow) mainWindow.show();
    });
}

// Cambiar opción multimedia y reiniciar la app
function toggleMediaOption(option) {
    const config = readMediaConfig();
    config[option] = !config[option];
    writeMediaConfig(config);
    app.relaunch();
    app.exit();
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'icons', 'icon.png'),
        show: false,
        title: "WhatsApp",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: true,
            webSecurity: false, // Cambia a false para pruebas
            allowRunningInsecureContent: false,
            sandbox: false // Añadido para evitar problemas de sandbox
        }
    });

    // User-Agent spoofing
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = USER_AGENT;
        callback({ requestHeaders: details.requestHeaders });
    });

    // Permisos mínimos necesarios
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowed = ['media', 'microphone', 'camera', 'fullscreen', 'notifications']; // Añadir 'notifications' aquí
        callback(allowed.includes(permission));
    });

    // Solo permitir navegación dentro de WhatsApp
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith(WHATSAPP_URL)) {
            mainWindow.loadURL(url);
        } else {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith(WHATSAPP_URL)) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    // Menú contextual simple
    mainWindow.webContents.on('context-menu', (event, params) => {
        const menu = Menu.buildFromTemplate([
            { label: 'Cortar', role: 'cut', enabled: params.isEditable },
            { label: 'Copiar', role: 'copy', enabled: params.selectionText.trim() !== '' },
            { label: 'Pegar', role: 'paste', enabled: params.isEditable },
            { type: 'separator' },
            { label: 'Recargar', click: () => mainWindow.reload() },
            { label: 'Inspeccionar', click: () => mainWindow.webContents.inspectElement(params.x, params.y) }
        ]);
        menu.popup();
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Error al cargar:', errorCode, errorDescription, validatedURL);
        mainWindow.loadURL('data:text/html,<h1>Error al cargar WhatsApp Web</h1><p>' + errorDescription + '</p>');
    });

    mainWindow.webContents.on('crashed', () => {
        console.error('El proceso de renderizado ha fallado');
        mainWindow.loadURL('data:text/html,<h1>WhatsApp Web ha fallado</h1>');
    });

    mainWindow.loadURL(WHATSAPP_URL);
    mainWindow.setMenu(null);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        createTray();
    });

    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

// Evitar múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
        // Asegura que el tray siga activo (no hace falta recrearlo aquí)
    });

    app.whenReady().then(() => {
        createWindow();

        // Registrar atajo F12 para abrir/cerrar DevTools
        globalShortcut.register('F12', () => {
            if (mainWindow) {
                mainWindow.webContents.toggleDevTools();
            }
        });

        // Escuchar las solicitudes de notificación desde el preload script
        ipcMain.on('show-notification', (event, { title, options }) => {
            console.log(`[Main] Received notification request: Title='${title}'`); // Log para depuración
            if (Notification.isSupported() && mainWindow) { // Asegurarse que mainWindow exista
                const notification = new Notification({
                    title: title,
                    body: options?.body || '',
                    icon: path.join(__dirname, 'icons', 'icon.png'), // Usar icono de la app por defecto
                    silent: options?.silent || false
                    // Podrías intentar usar options.icon si es una URL válida, pero es más complejo
                });

                notification.on('click', () => {
                    console.log('[Main] Notification clicked'); // Log para depuración
                    if (mainWindow) {
                        console.log(`[Main] Window state before action: visible=${mainWindow.isVisible()}, minimized=${mainWindow.isMinimized()}, focused=${mainWindow.isFocused()}`); // Log detallado

                        // 1. Si está minimizada, restaurarla.
                        if (mainWindow.isMinimized()) {
                            console.log('[Main] Window is minimized, restoring...');
                            mainWindow.restore();
                        }

                        // 2. Si no está visible (puede estar oculta por .hide()), mostrarla.
                        //    show() también debería traerla al frente si ya está visible pero no enfocada.
                        if (!mainWindow.isVisible()) {
                             console.log('[Main] Window is not visible, showing...');
                             mainWindow.show();
                        }

                        // 3. Asegurar el foco explícitamente.
                        console.log('[Main] Focusing window...');
                        mainWindow.focus();

                        console.log(`[Main] Window state after action: visible=${mainWindow.isVisible()}, minimized=${mainWindow.isMinimized()}, focused=${mainWindow.isFocused()}`); // Log detallado
                    } else {
                        console.log('[Main] mainWindow is null, cannot show/focus.');
                    }
                });

                notification.on('failed', (err) => {
                     console.error('[Main] Notification failed to show:', err);
                });

                notification.show();
            } else if (!Notification.isSupported()) {
                 console.warn('[Main] Notifications not supported on this system.');
            }
        });

        // NUEVO: Escuchar el contador de mensajes no leídos
        ipcMain.on('unread-count', async (event, count) => {
            const env = getDesktopEnv();
            if (env === 'gnome') {
                app.setBadgeCount(count);
            }
            if (env === 'kde' && tray) {
                // Cambia el icono del tray según si hay mensajes no leídos
                const icon = await getTrayIcon(count > 0);
                tray.setImage(icon);
            }
        });

        // Mantener el handler 'activate' para otros casos (ej. clic en el dock en macOS)
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            } else if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
            }
        });

    }); // Fin de app.whenReady().then()

    app.on('window-all-closed', () => {
        // Si quieres que la app termine completamente al cerrar la ventana:
        app.quit();
    });

    // Asegurarse de desregistrar el atajo al salir
    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    app.on('before-quit', () => { app.isQuiting = true; });
}