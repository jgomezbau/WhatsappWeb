'use strict';

const { app, dialog } = require('electron');

function createApplicationMenu({ shell, store, wm, injectWA }) {
  return [
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
          label: 'Llamada de voz',
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
          label: 'Videollamada',
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
        { label: 'Deshacer', role: 'undo' },
        { label: 'Rehacer', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Pegar', role: 'paste' },
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
            dialog.showMessageBox(wm.win, {
              type: 'info',
              title: 'Reinicio necesario',
              message: 'Este cambio requiere reiniciar la aplicación.',
              buttons: ['Reiniciar ahora', 'Más tarde']
            }).then(({ response }) => {
              if (response === 0) {
                app.relaunch();
                app.exit();
              }
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
          click: () => {
            app.isQuiting = true;
            app.quit();
          }
        }
      ]
    }
  ];
}

module.exports = { createApplicationMenu };
