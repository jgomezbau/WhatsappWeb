const { app, BrowserWindow, Menu, session, shell } = require('electron');
const path = require('path');

// No desactivamos aceleración por hardware para permitir mejor rendimiento en videollamadas
// app.disableHardwareAcceleration();

let mainWindow;

// User agent de Chrome actual para evitar detección
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function createWindow() {
    // Configuramos la ventana principal con soporte para características multimedia
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            devTools: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            webgl: true,
            webaudio: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icons', 'icon.png'),
        show: false // Mostraremos la ventana una vez esté cargada
    });

    // Establecemos un user agent de Chrome para evitar detección
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = USER_AGENT;
        callback({ requestHeaders: details.requestHeaders });
    });

    // Dominios permitidos de WhatsApp
    const allowedDomains = ['web.whatsapp.com'];
    const allowedLoginDomains = [/whatsapp\.com$/];

    // Gestionar apertura de ventanas
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const hostname = new URL(url).hostname;
        if (allowedLoginDomains.some(domain => domain instanceof RegExp ? domain.test(hostname) : hostname.includes(domain))) {
            mainWindow.loadURL(url);
        } else {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Gestionar navegación
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const hostname = new URL(url).hostname;
        if (!allowedLoginDomains.some(domain => domain instanceof RegExp ? domain.test(hostname) : hostname.includes(domain))) {
            shell.openExternal(url);
        }
    });
    
    // Cargar WhatsApp Web
    mainWindow.loadURL('https://web.whatsapp.com');
    mainWindow.setMenu(null);

    // Mostrar la ventana cuando esté lista
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Configurar los permisos para multimedia (cruciales para videollamadas)
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = [
            'media', 
            'mediaKeySystem',
            'geolocation',
            'notifications',
            'fullscreen',
            'clipboard-read',
            'clipboard-write'
        ];
        callback(allowedPermissions.includes(permission));
    });

    // Actualizar menú contextual para incluir "Inspeccionar"
    const contextMenuTemplate = [
        { label: 'Cortar', role: 'cut', enabled: false },
        { label: 'Copiar', role: 'copy', enabled: false },
        { label: 'Pegar', role: 'paste' },
        { label: 'Seleccionar todo', role: 'selectAll' },
        { type: 'separator' },
        { label: 'Recargar', click: () => { mainWindow.reload(); } },
        { label: 'Imprimir', click: () => { mainWindow.webContents.print(); } },
        { label: 'Inspeccionar', click: (_, params) => { mainWindow.webContents.inspectElement(params.x, params.y); } },
        { type: 'separator' },
        { label: 'Activar DevTools', click: () => { mainWindow.webContents.openDevTools(); } }
    ];

    // Agregar listener para el clic derecho (context-menu)
    mainWindow.webContents.on('context-menu', (event, params) => {
        // Actualizar estado de opciones si fuera necesario
        contextMenuTemplate[0].enabled = params.isEditable;
        contextMenuTemplate[1].enabled = params.selectionText.trim() !== '';
        contextMenuTemplate[2].enabled = params.isEditable;
        const menu = Menu.buildFromTemplate(contextMenuTemplate);
        menu.popup();
    });

    // Activar las capacidades de audio y video necesarias para videollamadas
    mainWindow.webContents.setAudioMuted(false);

    // Manejar el cierre de la ventana
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Iniciar la aplicación cuando esté lista
app.whenReady().then(() => {
    // Registrar protocolos necesarios (importante para videollamadas)
    session.defaultSession.protocol.registerHttpProtocol('wss', (request, callback) => {
        // Necesario para manejar correctamente los protocolos seguros de WebSocket que usa WhatsApp
    });
    
    createWindow();
});

// Manejar el cierre de todas las ventanas
app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});

// Manejar la activación de la aplicación (macOS)
app.on('activate', () => { 
    if (mainWindow === null) createWindow(); 
});