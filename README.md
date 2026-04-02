# WhatsApp Desktop para Linux

**Versión 3.0.0** · Cliente no oficial basado en Electron

Un wrapper moderno de WhatsApp Web optimizado para Linux, con soporte completo para videollamadas, notificaciones nativas, icono en el tray y mucho más.

---

## Características

| Característica | Descripción |
|---|---|
| 🎥 Videollamadas | WebRTC + PipeWire — funciona en Wayland y X11 |
| 🔔 Notificaciones nativas | Las notificaciones del sistema se muestran correctamente |
| 🔍 Buscar en página | `Ctrl+F` abre una barra de búsqueda integrada |
| 🔎 Zoom ajustable | `Ctrl++` / `Ctrl+-` / `Ctrl+0` (persiste entre sesiones) |
| 📥 Gestor de descargas | Diálogo para elegir ruta + barra de progreso en la ventana |
| 🖥️ Icono en el tray | Cierra al tray, badge de mensajes no leídos (GNOME/KDE) |
| ✅ Corrector ortográfico | Integrado, con sugerencias en el menú contextual |
| 🔄 Auto-actualización | electron-updater vía GitHub Releases (en builds empaquetados) |
| 💤 Reconexión al despertar | Se recarga automáticamente al salir del modo suspensión |
| 🔒 Seguridad mejorada | `webSecurity: true`, sin `nodeIntegration`, `contextIsolation` activo |

---

## Estructura del proyecto

```
whatsapp-desktop/
├── src/
│   ├── main/
│   │   ├── main.js       ← Punto de entrada del proceso principal
│   │   ├── store.js      ← Configuración persistente (JSON)
│   │   ├── windows.js    ← Gestión de ventanas
│   │   ├── tray.js       ← Icono en el área de notificaciones
│   │   ├── ipc.js        ← Canales de comunicación IPC
│   │   └── updater.js    ← Auto-actualización
│   ├── preload/
│   │   └── preload.js    ← Bridge seguro renderer ↔ main
│   └── renderer/
│       └── loading.html  ← Pantalla de carga animada
├── resources/
│   └── icons/
│       ├── icon.png
│       ├── icon.ico
│       └── icon-unread.png
├── package.json
└── README.md
```

---

## Requisitos previos

- **Node.js** 20 LTS o superior
- **npm** 10+
- Linux (x64 o arm64); probado en Ubuntu 24.04, Fedora 40, Arch Linux

---

## Instalación y desarrollo

```bash
# 1. Clonar
git clone https://github.com/jgomezbau/whatsapp-desktop.git
cd whatsapp-desktop

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm start

# 4. Inspección de proceso principal (Chrome DevTools en chrome://inspect)
npm run dev
```

---

## Compilar distribución

```bash
# AppImage (x64 + arm64) y .deb (x64)
npm run build:all

# Solo AppImage
npm run build:appimage

# Solo .deb
npm run build:deb
```

Los artefactos se generan en `dist/`.

---

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl+F` | Buscar en la página |
| `Ctrl++` / `Ctrl+=` | Aumentar zoom |
| `Ctrl+-` | Reducir zoom |
| `Ctrl+0` | Restablecer zoom |
| `Ctrl+R` / `F5` | Recargar WhatsApp |
| `Ctrl+Q` | Salir de la aplicación |
| `F12` | Abrir DevTools |

---

## Configuración

La configuración se guarda en `~/.config/whatsapp-desktop/config.json`.  
Puedes editarla con el menú contextual (clic derecho) → ajustes o directamente:

| Clave | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `closeToTray` | bool | `true` | Cerrar ventana → ocultar al tray |
| `startMinimized` | bool | `false` | Arrancar minimizado |
| `spellCheck` | bool | `true` | Corrector ortográfico |
| `notifications` | bool | `true` | Notificaciones nativas |
| `zoom` | number | `1.0` | Factor de zoom (0.5–2.0) |
| `hardwareAccel` | bool | `true` | Aceleración GPU |
| `audioConfig.agc` | bool | `false` | Desactivar remuestreo de audio |
| `audioConfig.volumeLimit` | bool | `false` | Desactivar límite de volumen |

---

## Solución de problemas

**Cámara / micrófono no funcionan**  
→ Asegúrate de que tu usuario tiene permisos de `video` y `audio` (`groups $USER`).  
→ En Wayland, comprueba que PipeWire esté corriendo: `systemctl --user status pipewire`.

**Pantalla negra o "navegador no compatible"**  
→ Ejecuta `npm start` en terminal y revisa la consola para ver el error exacto.  
→ Prueba a deshabilitar la aceleración hardware en `config.json`: `"hardwareAccel": false`.

**Notificaciones no aparecen (KDE)**  
→ Verifica que `libnotify` esté instalado: `sudo apt install libnotify-bin` (Debian/Ubuntu).

---

## Contribuciones

1. Fork → rama `feature/nombre-funcionalidad`
2. Cambios + `git commit -am 'feat: descripción'`
3. Push + Pull Request

---

## Descargo de responsabilidad

Este proyecto no está afiliado ni avalado por WhatsApp LLC o Meta Platforms, Inc.  
WhatsApp® es una marca registrada de sus respectivos propietarios.  
Este software se distribuye bajo la licencia MIT.
