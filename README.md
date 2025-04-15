# WhatsApp Desktop para Linux

**Versión 1.0.0**

Esta es una aplicación de escritorio desarrollada utilizando **Electron**, que permite a los usuarios interactuar con **WhatsApp** de manera independiente del navegador, con soporte para llamadas y videollamadas. El objetivo de este proyecto es proporcionar una experiencia de usuario equivalente a la aplicación oficial de WhatsApp para Windows/Mac, pero en sistemas Linux.

## Características

- **Aplicación nativa para Linux**: Ejecuta WhatsApp directamente en el escritorio sin necesidad de un navegador web.
- **Soporte completo para llamadas y videollamadas**: A diferencia de la versión web en navegadores, esta aplicación permite realizar y recibir llamadas y videollamadas.
- **User-Agent personalizado**: Simula un navegador Chrome para evitar restricciones de WhatsApp Web.
- **Permisos multimedia**: Configuración completa para acceder a cámara, micrófono y notificaciones.
- **Menú contextual personalizado**: Opciones como cortar, copiar, pegar, recargar, imprimir y herramientas de desarrollo.
- **Optimizado para Linux**: Creado específicamente para funcionar en distribuciones basadas en Debian.

## Tecnologías utilizadas

- **Electron**: Framework para crear aplicaciones de escritorio utilizando tecnologías web.
- **Node.js**: Entorno de ejecución para JavaScript del lado del servidor.
- **JavaScript/HTML/CSS**: Para el desarrollo de la interfaz de usuario.

## Requisitos previos

Antes de comenzar, asegúrate de tener lo siguiente instalado:

- **Node.js** (Versión 14 o superior)
- **npm** (Node Package Manager)

## Instalación

### Pasos para instalar y ejecutar la aplicación:

1. **Clonar el repositorio**:

   ```bash
   git clone https://github.com/jgomezbau/whatsapp-desktop.git
   cd whatsapp-desktop
   ```

2. **Instalar dependencias**:

   ```bash
   npm install
   ```

3. **Ejecutar la aplicación**:

   ```bash
   npm start
   ```

4. **Crear el archivo AppImage**:

   ```bash
   npm run linux
   ```

   El archivo AppImage se generará en la carpeta `dist/`.

## Cómo funciona

Esta aplicación funciona creando un entorno Electron con configuraciones específicas para evitar la detección como "navegador no compatible" por parte de WhatsApp Web. Utiliza:

1. **User-Agent personalizado**: Simula ser Chrome para evitar restricciones.
2. **Preload Script**: Modifica el entorno del navegador para ocultar características de Electron.
3. **Configuraciones especiales**: Habilita características específicas de WebRTC necesarias para videollamadas.
4. **Gestión de permisos**: Configura automáticamente los permisos de cámara y micrófono.

## Uso

- **Inicio de sesión**: Escanea el código QR con WhatsApp en tu teléfono, igual que en WhatsApp Web.
- **Videollamadas**: Las videollamadas funcionarán automáticamente sin configuración adicional.
- **Menú contextual**: Haz clic derecho para acceder a opciones como copiar, pegar, recargar, etc.
- **DevTools**: Puedes acceder a las herramientas de desarrollo desde el menú contextual.

## Solución de problemas

Si experimentas problemas:

1. **Permisos de cámara/micrófono**: Si tienes problemas con la cámara o el micrófono, usa la opción "Inspeccionar" del menú contextual para ver los errores.
2. **Reinicio de sesión**: A veces, cerrar la sesión y volver a escanear el código QR soluciona problemas de conexión.
3. **Error de navegador no compatible**: Si aparece este mensaje, comunícalo como un issue en el repositorio.

## Limitaciones

- Esta aplicación no es oficial y podría dejar de funcionar si WhatsApp cambia su política o implementación.
- No se garantiza que todas las funciones estén disponibles o que permanezcan funcionando tras actualizaciones de WhatsApp.

## Contribuciones

Si deseas contribuir a este proyecto, por favor:

1. Haz un fork del repositorio.
2. Crea una nueva rama para tus cambios: `git checkout -b feature/nueva-funcionalidad`.
3. Realiza tus cambios y haz commit: `git commit -am 'Añadir nueva funcionalidad'`.
4. Sube los cambios a tu fork: `git push origin feature/nueva-funcionalidad`.
5. Crea un Pull Request.

## Licencia

Este proyecto está licenciado bajo la MIT License.

## Descargo de responsabilidad

Esta aplicación no está afiliada, asociada, autorizada, respaldada por, o de ninguna manera oficialmente conectada con WhatsApp o cualquiera de sus filiales o subsidiarias. WhatsApp es una marca registrada de sus respectivos propietarios.

---

**Este README refleja las características, el uso y las instrucciones de instalación de la aplicación de escritorio para WhatsApp, optimizada para soportar llamadas y videollamadas en sistemas Linux.**