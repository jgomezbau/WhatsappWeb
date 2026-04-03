# WhatsApp Linux

**Versión 3.0.0** · Cliente no oficial basado en Electron

Un wrapper moderno de WhatsApp Web optimizado para Linux, con soporte completo para llamadas y videollamadas nativas, notificaciones, icono en el tray, menú de aplicación completo y mucho más.

---

## Características

| Característica | Descripción |
|---|---|
| 📞 Llamadas y videollamadas | Soporte nativo vía WhatsApp Web beta — WebRTC + PipeWire, funciona en Wayland y X11 |
| 🔔 Notificaciones nativas | Integradas con el sistema, con badge de mensajes no leídos en GNOME y KDE |
| 🖥️ Icono en el tray | Oculta al tray al cerrar, badge de mensajes no leídos, menú contextual |
| 📋 Menú de aplicación | Barra completa (Alt para mostrar/ocultar) con Chats, Llamadas, Editar, Vista, Ventana, Ajustes y Ayuda |
| 🔍 Buscar en página | `Ctrl+F` abre una barra de búsqueda integrada al estilo WhatsApp |
| 🔎 Zoom ajustable | `Ctrl++` / `Ctrl+-` / `Ctrl+0` — persiste entre sesiones |
| 📥 Gestor de descargas | Diálogo para elegir ruta + barra de progreso en la ventana |
| ✅ Corrector ortográfico | Integrado con sugerencias en el menú contextual |
| 🔄 Auto-actualización | electron-updater vía GitHub Releases (solo en builds empaquetados) |
| 💤 Reconexión al despertar | Se recarga automáticamente al salir del modo suspensión |
| 🔒 Seguridad | `webSecurity: true`, sin `nodeIntegration`, `contextIsolation` activo |
| ⚙️ Configuración persistente | Todos los ajustes se guardan automáticamente entre sesiones |

---

## Estructura del proyecto

```
whatsapp-linux/
├── src/
│   ├── main/
│   │   ├── main.js       ← Punto de entrada — flags, menú, shortcuts, lifecycle
│   │   ├── store.js      ← Configuración persistente (JSON con merge profundo)
│   │   ├── windows.js    ← Gestión de ventanas, sesión, permisos, descargas
│   │   ├── tray.js       ← Icono en el área de notificaciones + badge
│   │   ├── ipc.js        ← Todos los canales de comunicación main ↔ renderer
│   │   └── updater.js    ← Auto-actualización con electron-updater
│   ├── preload/
│   │   └── preload.js    ← Bridge renderer ↔ main, intercepción de notificaciones
│   └── renderer/
│       └── loading.html  ← Pantalla de carga animada mientras carga WhatsApp
├── icons/
│   ├── icon.png
│   ├── icon.ico
│   └── icon-unread.png
├── resources/
│   └── icons/            ← Iconos para el build empaquetado
├── package.json
└── README.md
```

---

## Requisitos previos

- **Node.js** 20 LTS o superior
- **npm** 9+
- Linux x64 o arm64 — probado en Ubuntu 24.04, Fedora 40, Arch Linux, openSUSE

---

## Instalación y desarrollo

```bash
# 1. Clonar
git clone https://github.com/jgomezbau/whatsapp-linux.git
cd whatsapp-linux

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm start

# 4. Con inspector del proceso principal (chrome://inspect)
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

Los artefactos se generan en `dist/`:
- `WhatsApp-Linux-3.0.0-x64.AppImage`
- `WhatsApp-Linux-3.0.0-arm64.AppImage`
- `whatsapp-linux_3.0.0_amd64.deb`

### Instalar el .deb
```bash
sudo dpkg -i dist/whatsapp-linux_3.0.0_amd64.deb
```

### Ejecutar el AppImage sin instalar
```bash
chmod +x dist/WhatsApp-Linux-3.0.0-x64.AppImage
./dist/WhatsApp-Linux-3.0.0-x64.AppImage
```

---

## Llamadas y videollamadas

Las llamadas funcionan de forma nativa a través del programa beta de WhatsApp Web.

**Para activar el acceso beta:**
1. Abre la app
2. Ve a **Configuración → Ayuda → Enviar comentarios**
3. Activa el toggle **"Unirse a la beta"**

Una vez dentro del programa beta, los botones de llamada de voz y videollamada aparecerán automáticamente en los chats individuales. El rollout global está en curso desde febrero de 2026.

---

## Menú de aplicación

La barra de menú está **oculta por defecto** para mantener la interfaz de WhatsApp impecable.

| Cómo acceder | Acción |
|---|---|
| `Alt` | Muestra la barra momentáneamente |
| **Ventana → Fijar barra de menú** | La deja visible de forma permanente |

### Secciones del menú

| Sección | Contenido destacado |
|---|---|
| **Chats** | Nuevo chat/grupo, navegar chats, archivar, silenciar, eliminar |
| **Llamadas** | Llamada de voz, videollamada, historial |
| **Editar** | Copiar, pegar, deshacer, buscar |
| **Vista** | Zoom, recargar, pantalla completa, DevTools |
| **Ventana** | Minimizar, maximizar, ocultar al tray |
| **Ajustes** | Tray, notificaciones, corrector, caché, carpeta de datos |
| **Ayuda** | Atajos de WA, WABetaInfo, reportar bug, versión |

---

## Atajos de teclado

### Aplicación
| Atajo | Acción |
|---|---|
| `Alt` | Mostrar / ocultar barra de menú |
| `Ctrl+F` | Buscar en la página |
| `Ctrl++` / `Ctrl+=` | Aumentar zoom |
| `Ctrl+-` | Reducir zoom |
| `Ctrl+0` | Restablecer zoom |
| `Ctrl+R` / `F5` | Recargar WhatsApp |
| `Ctrl+Q` | Salir de la aplicación |
| `F11` | Pantalla completa |
| `F12` | Abrir DevTools |

### WhatsApp Web (nativos)
| Atajo | Acción |
|---|---|
| `Ctrl+N` | Nuevo chat |
| `Ctrl+Shift+N` | Nuevo grupo |
| `Ctrl+Shift+]` | Chat siguiente |
| `Ctrl+Shift+[` | Chat anterior |
| `Ctrl+E` | Archivar chat |
| `Ctrl+Shift+M` | Silenciar chat |
| `Ctrl+Shift+U` | Marcar como no leído |
| `Ctrl+P` | Ver perfil del contacto |

---

## Configuración

La configuración se guarda en `~/.config/whatsapp-linux/config.json`.

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

**Las llamadas no aparecen**
→ Activa el programa beta: Configuración → Ayuda → Unirse a la beta.
→ El rollout es gradual, puede tardar unos días en activarse.

**Cámara / micrófono no funcionan**
→ Verifica que tu usuario esté en los grupos `video` y `audio`: `groups $USER`.
→ En Wayland, comprueba que PipeWire esté corriendo: `systemctl --user status pipewire`.

**Pantalla negra al iniciar**
→ Deshabilita la aceleración hardware: Menú → Ajustes → Aceleración por hardware.
→ O edita `~/.config/whatsapp-linux/config.json` y pon `"hardwareAccel": false`.

**Notificaciones no aparecen (KDE/Debian)**
→ Instala libnotify: `sudo apt install libnotify-bin`.

**Pide QR en cada inicio**
→ Asegúrate de no borrar `~/.config/whatsapp-linux/` — ahí se guarda la sesión.

---

## Tecnologías

- **Electron 35** — framework de aplicaciones de escritorio
- **electron-builder** — empaquetado multiplataforma
- **electron-updater** — auto-actualización vía GitHub Releases
- **Node.js 20+** — entorno de ejecución

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
