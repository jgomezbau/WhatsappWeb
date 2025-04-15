const { app, BrowserWindow, Menu, session, shell, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

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

function createTray() {
    if (tray) return;
    const iconPath = path.join(__dirname, 'icons', 'icon.png');
    tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 }));

    const mediaConfig = readMediaConfig();

    const multimediaMenu = [
        {
            label: `Control automático de ganancia (AGC): ${mediaConfig.agc ? 'Deshabilitado' : 'Habilitado'}`,
            type: 'checkbox',
            checked: mediaConfig.agc,
            click: () => toggleMediaOption('agc')
        },
        {
            label: `Límite de volumen: ${mediaConfig.volumeLimit ? 'Deshabilitado' : 'Habilitado'}`,
            type: 'checkbox',
            checked: mediaConfig.volumeLimit,
            click: () => toggleMediaOption('volumeLimit')
        },
        {
            label: `AudioService OutOfProcess: ${mediaConfig.outOfProcess ? 'Deshabilitado' : 'Habilitado'}`,
            type: 'checkbox',
            checked: mediaConfig.outOfProcess,
            click: () => toggleMediaOption('outOfProcess')
        }
    ];

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Mostrar WhatsApp', click: () => mainWindow?.show() },
        { type: 'separator' },
        { label: 'Opciones Multimedia', submenu: multimediaMenu },
        { type: 'separator' },
        { label: 'Salir', click: () => { app.isQuiting = true; app.quit(); } }
    ]);
    tray.setToolTip('WhatsApp Desktop');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => mainWindow?.show());
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Mantener en background hasta que el usuario salga explícitamente
    }
});

app.on('before-quit', () => { app.isQuiting = true; });

app.on('activate', () => {
    if (!mainWindow) {
        createWindow();
    } else {
        mainWindow.show();
        mainWindow.focus(); // Add this line to focus the window
    }
});