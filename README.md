# WhatsApp Desktop para Linux

**Versión 3.0.0** · Cliente no oficial basado en Electron

Cliente no oficial de WhatsApp Web para Linux, con soporte para notificaciones, icono en el tray, menú de aplicación completo y empaquetado en `.deb` y `AppImage`.

---

## Características

| Característica | Descripción |
|---|---|
| 📞 Llamadas y videollamadas | Disponibles a través de WhatsApp Web Beta |
| 🔔 Notificaciones nativas | Integradas con el sistema |
| 🖥️ Icono en el tray | Oculta al tray al cerrar, con menú contextual |
| 📋 Menú de aplicación | Chats, Llamadas, Editar, Vista, Ventana, Ajustes y Ayuda |
| 🔍 Buscar en página | `Ctrl+F` abre una barra de búsqueda integrada |
| 🔎 Zoom ajustable | `Ctrl++` / `Ctrl+-` / `Ctrl+0` |
| 📥 Gestor de descargas | Selector de destino y barra de progreso |
| ✅ Corrector ortográfico | Integrado con sugerencias en el menú contextual |
| 🔄 Auto-actualización | `electron-updater` vía GitHub Releases |
| 💤 Reconexión al despertar | Recarga automática al salir de suspensión |
| 🔒 Seguridad | `webSecurity: true`, sin `nodeIntegration`, `contextIsolation` activo |
| ⚙️ Configuración persistente | Todos los ajustes se guardan automáticamente entre sesiones |

---

## Estructura del proyecto

```text
whatsapp-desktop-linux/
├── icons/
│   ├── icon-unread.png
│   ├── icon.ico
│   └── icon.png
├── resources/
│   └── whatsapp-desktop.desktop
├── src/
│   ├── main/
│   │   ├── ipc.js
│   │   ├── main.js
│   │   ├── store.js
│   │   ├── tray.js
│   │   ├── updater.js
│   │   └── windows.js
│   ├── preload/
│   │   └── preload.js
│   └── renderer/
│       └── loading.html
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
```

---

## Requisitos previos

- **Node.js** 20 o superior
- **npm** 9 o superior
- Linux x64 o arm64

---

## Instalación y desarrollo

```bash
git clone https://github.com/jgomezbau/whatsapp-desktop-linux.git
cd whatsapp-desktop-linux
npm install
npm start
```

Modo desarrollo con inspector del proceso principal:

```bash
npm run dev
```

---

## Compilar distribución

```bash
npm run build:all
```

Solo AppImage:

```bash
npm run build:appimage
```

Solo `.deb`:

```bash
npm run build:deb
```

Los artefactos se generan en `dist/`.

---

## Instalación y uso

### Paquete `.deb`

Instalación:

```bash
sudo dpkg -i dist/*.deb
```

El paquete `.deb` integra la aplicación en el sistema automáticamente:

- instala la aplicación
- registra el lanzador en el menú de aplicaciones
- crea la entrada `.desktop`
- deja la app accesible desde el buscador del entorno de escritorio

No hace falta crear un `.desktop` manualmente al instalar el `.deb`.

### AppImage

Dar permisos y ejecutar:

```bash
chmod +x dist/*.AppImage
./dist/*.AppImage
```

El `AppImage` se puede ejecutar directamente sin instalación.

A diferencia del paquete `.deb`, el `AppImage` es portable y normalmente no instala la aplicación en el sistema. Según el entorno de escritorio o las herramientas que tenga el usuario, puede ocurrir una de estas dos cosas:

- que aparezca automáticamente en el menú de aplicaciones
- que haya que crear manualmente una entrada `.desktop` o usar una herramienta de integración de AppImage

En resumen:

- **`.deb`**: instala e integra la aplicación
- **`AppImage`**: ejecuta la aplicación sin instalarla y si no existe un .desktop lo crea automaticamente para hacerla accesible luego del menu de aplicaciones.

---

## Llamadas y videollamadas

Las llamadas y videollamadas funcionan a través de **WhatsApp Web Beta**.

Para que aparezcan los botones de llamada en los chats individuales, debes activar la beta desde WhatsApp Web:

1. Abre la aplicación
2. Ve a **Configuración**
3. Busca la opción de acceso o funciones beta
4. Activa la versión **Beta** de WhatsApp Web

Una vez activada, los botones de llamada de voz y videollamada deberían aparecer automáticamente en los chats compatibles. Puede requerir reiniciar la aplicacion.

---

## Menú de aplicación

La barra de menú está oculta por defecto para mantener la interfaz limpia.

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
| **Ayuda** | Atajos, enlaces útiles, reportar bugs, versión |

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

### WhatsApp Web

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

La configuración se guarda en la carpeta de datos de usuario de la aplicación.

| Clave | Tipo | Descripción |
|---|---|---|
| `closeToTray` | boolean | Cerrar ventana y ocultar al tray |
| `startMinimized` | boolean | Arrancar minimizado |
| `spellCheck` | boolean | Corrector ortográfico |
| `notifications` | boolean | Notificaciones nativas |
| `zoom` | number | Factor de zoom |
| `hardwareAccel` | boolean | Aceleración por hardware |
| `audioConfig.agc` | boolean | Ajustes de audio |
| `audioConfig.volumeLimit` | boolean | Ajustes de audio |

---

## Solución de problemas

**No aparecen las llamadas**
- Activa la versión Beta de WhatsApp Web
- Comprueba que estás en un chat individual compatible

**Cámara o micrófono no funcionan**
- Verifica permisos del sistema
- En Wayland, asegúrate de que PipeWire está funcionando

**Pantalla negra al iniciar**
- Desactiva la aceleración por hardware desde Ajustes

**Pide QR en cada inicio**
- No borres la carpeta de datos de usuario de la aplicación

**El AppImage no aparece en el menú**
- Ejecútalo manualmente
- Si tu sistema no lo integra automáticamente, crea una entrada `.desktop` o usa una herramienta de integración de AppImage

---

## Tecnologías

- **Electron 39.8.5**
- **electron-builder**
- **electron-updater**
- **Node.js**

---

## Contribuciones

1. Haz fork del proyecto
2. Crea una rama para tu cambio
3. Haz commit
4. Sube la rama
5. Abre un Pull Request

---

## Descargo de responsabilidad

Este proyecto no está afiliado ni avalado por WhatsApp LLC o Meta Platforms, Inc.

WhatsApp® es una marca registrada de sus respectivos propietarios.

Este software se distribuye bajo la licencia MIT.
