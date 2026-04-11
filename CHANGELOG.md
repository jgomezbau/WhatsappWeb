# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Changed
- Reorganized release assets under `resources/icons` and removed the unused Windows `.ico` icon from the Linux release path.
- Cleaned up Electron main-process structure by extracting shared asset helpers and the application menu into dedicated modules.
- Switched the preload bridge to `contextBridge` so renderer integrations use Electron's supported isolated-context pattern.
- Improved Linux packaging metadata for public releases, including icon paths, artifact naming, desktop entry metadata, and Debian dependencies.
- Rewrote the README for public release readiness and contributor onboarding.

## [3.0.0] - 2026-04-11

### Added
- Initial public release baseline for the Electron-based Linux desktop wrapper.
- Linux packaging support for AppImage and `.deb` artifacts.
- System tray integration, native notifications, persistent settings, download handling, zoom controls, and auto-update wiring.
