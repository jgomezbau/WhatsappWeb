# WhatsApp Desktop Linux

Unofficial WhatsApp desktop wrapper for Linux, built with Electron and packaged for native distribution.

It provides a dedicated desktop window for WhatsApp Web with Linux-friendly packaging, tray integration, native notifications, persistent settings, and a small set of quality-of-life desktop features.

## Disclaimer

This project is unofficial and is not affiliated with, endorsed by, or sponsored by WhatsApp or Meta.

WhatsApp and its related names, marks, and logos are trademarks of their respective owners. This repository only packages the web client experience into a Linux desktop wrapper and does not claim ownership of the WhatsApp service or brand.

## Features

- Native Linux desktop app wrapper around WhatsApp Web
- `.deb` and AppImage release artifacts
- Tray icon with unread-state support
- Native notifications
- Persistent window and app settings
- Download handling with save dialog and progress feedback
- In-app zoom controls and find-in-page support
- Spell checking and context menu integration
- Auto-update support via GitHub Releases for packaged builds
- Wayland-oriented WebRTC flags for camera, microphone, and calls support

## Screenshots

Screenshots can be added here before the public release once the final visual presentation is locked in.

## Requirements

- Linux
- Node.js 20 or newer
- npm 9 or newer

## Installation

### AppImage

```bash
chmod +x whatsapp-desktop-linux-*.AppImage
./whatsapp-desktop-linux-*.AppImage
```

The AppImage runs without installation. On some desktop environments it may integrate automatically; on others it may need to be launched once before showing up in the application menu.

### Debian package

```bash
sudo dpkg -i whatsapp-desktop-linux-*.deb
sudo apt-get install -f
```

The Debian package installs the desktop launcher, icon metadata, and system integration entries.

## Development

```bash
git clone https://github.com/jgomezbau/whatsapp-desktop-linux.git
cd whatsapp-desktop-linux
npm install
npm start
```

To launch Electron with the main-process inspector enabled:

```bash
npm run dev
```

## Build And Packaging

Build all configured Linux artifacts:

```bash
npm run build:all
```

Build only AppImage:

```bash
npm run build:appimage
```

Build only Debian package:

```bash
npm run build:deb
```

Generated artifacts are written to `dist/`.

### Expected release artifacts

The current release configuration is validated for Linux `x64` and produces:

- `whatsapp-desktop-linux-<version>-x64.AppImage`
- `whatsapp-desktop-linux-<version>-x64.deb`

## Project Structure

```text
whatsapp-desktop-linux/
├── resources/
│   ├── icons/
│   │   ├── icon-unread.png
│   │   └── icon.png
│   └── whatsapp-desktop.desktop
├── src/
│   ├── main/
│   │   ├── assets.js
│   │   ├── ipc.js
│   │   ├── main.js
│   │   ├── menu.js
│   │   ├── store.js
│   │   ├── tray.js
│   │   ├── updater.js
│   │   └── windows.js
│   ├── preload/
│   │   └── preload.js
│   └── renderer/
│       └── loading.html
├── CHANGELOG.md
├── package.json
└── README.md
```

## Packaging Notes

- Runtime tray and notification icons are sourced from `resources/icons`.
- The repository no longer keeps a Windows `.ico` file because the current public release scope is Linux-only and the file was not used by the build.
- `resources/whatsapp-desktop.desktop` documents the intended desktop entry metadata for Linux packaging and AppImage integration.
- Debian packaging includes portal and tray-related dependencies to improve desktop integration on common Linux environments.

## Calls And Video Calls

Call support depends on WhatsApp Web capabilities and account availability. If the call buttons do not appear, check that the relevant WhatsApp Web features are enabled for your account and confirm that camera and microphone permissions are available at the OS level.

On Wayland-based systems, `xdg-desktop-portal` support is especially important for media-device access.

## Troubleshooting

### Camera or microphone does not work

- Verify system permissions for camera and microphone
- Make sure `xdg-desktop-portal` is installed and running
- On Wayland, confirm PipeWire is available
- Restart the app completely after changing portal or device permissions

### The app shows a black or unstable window

- Disable hardware acceleration from the app settings
- Restart the application after changing the setting

### The AppImage does not appear in the application menu

- Launch it once manually
- Check whether your desktop environment supports AppImage integration automatically

### WhatsApp asks for the QR code on every launch

- Do not remove the app's user data directory between sessions

## Contributing

Issues and pull requests are welcome. When contributing:

- keep changes focused
- preserve current user-facing behavior unless a fix is required
- update documentation when packaging, assets, or release behavior changes

## License

This project is licensed under the MIT License.
