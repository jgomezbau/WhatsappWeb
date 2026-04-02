'use strict';

/**
 * Simple persistent key-value store backed by JSON.
 * Avoids ESM issues with electron-store v9+.
 */

const path = require('path');
const fs   = require('fs');
const { app } = require('electron');

const DEFAULTS = {
  windowBounds:   { width: 1280, height: 800, x: undefined, y: undefined },
  startMinimized: false,
  closeToTray:    true,
  spellCheck:     true,
  zoom:           1.0,
  notifications:  true,
  hardwareAccel:  true,
  audioConfig: {
    agc:         false,
    volumeLimit: false
  }
};

class Store {
  constructor () {
    this._path = path.join(app.getPath('userData'), 'config.json');
    this._data = this._load();
  }

  _load () {
    try {
      const raw = JSON.parse(fs.readFileSync(this._path, 'utf8'));
      return this._deepMerge(DEFAULTS, raw);
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  _save () {
    try {
      fs.writeFileSync(this._path, JSON.stringify(this._data, null, 2));
    } catch (err) {
      console.error('[Store] Error saving config:', err);
    }
  }

  _deepMerge (target, source) {
    const out = structuredClone(target);
    for (const key of Object.keys(source ?? {})) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        out[key] = this._deepMerge(target[key] ?? {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  /** Get a value by dot-separated key path. */
  get (key, fallback = undefined) {
    const val = key.split('.').reduce((obj, k) => obj?.[k], this._data);
    return val !== undefined ? val : fallback;
  }

  /** Set a value by dot-separated key path. */
  set (key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    const target = keys.reduce((obj, k) => {
      if (obj[k] === undefined || typeof obj[k] !== 'object') obj[k] = {};
      return obj[k];
    }, this._data);
    target[last] = value;
    this._save();
  }

  /** Return a plain snapshot of all stored data. */
  getAll () {
    return structuredClone(this._data);
  }
}

module.exports = { Store };
