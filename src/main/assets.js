'use strict';

const fs = require('fs');
const path = require('path');

const APP_NAME = 'WhatsApp';
const APP_EXECUTABLE = 'whatsapp-desktop';
const APP_DESKTOP_FILENAME = `${APP_EXECUTABLE}.desktop`;
const APP_DESCRIPTION = 'Unofficial WhatsApp desktop wrapper for Linux';

function resolveRuntimeIconPath(filename) {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'icons', filename),
    path.join(__dirname, '../../resources/icons', filename),
    path.join(__dirname, '../../icons', filename)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

module.exports = {
  APP_DESCRIPTION,
  APP_DESKTOP_FILENAME,
  APP_EXECUTABLE,
  APP_NAME,
  resolveRuntimeIconPath
};
