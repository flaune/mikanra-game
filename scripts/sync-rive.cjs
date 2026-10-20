const { copyFileSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
mkdirSync(resolve(root, 'public/rive'), { recursive: true });
copyFileSync(resolve(root, 'node_modules/@rive-app/canvas-lite/rive.wasm'), resolve(root, 'public/rive/rive.wasm'));
