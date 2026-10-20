const { spawnSync } = require('node:child_process');
const { mkdirSync, copyFileSync } = require('node:fs');
const { join } = require('node:path');
const root = join(__dirname, '..');
const result = spawnSync(process.execPath, [join(__dirname, 'rive.cjs'), 'rive', '--once'], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
mkdirSync(join(root, 'public/rive'), { recursive: true });
copyFileSync(join(root, 'rive/build/rive.riv'), join(root, 'public/rive/cafe-feedback.riv'));
copyFileSync(join(root, 'node_modules/@rive-app/canvas-lite/rive.wasm'), join(root, 'public/rive/rive.wasm'));
