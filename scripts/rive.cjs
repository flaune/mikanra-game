const { existsSync } = require('node:fs');
const { homedir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

// Also works in terminals opened before the installer updated PATH.
const installedCli = join(homedir(), '.rive', 'bin', process.platform === 'win32' ? 'rive.exe' : 'rive');
const command = existsSync(installedCli) ? installedCli : 'rive';
const result = spawnSync(command, process.argv.slice(2), {
  cwd: resolve(__dirname, '..'),
  stdio: 'inherit',
});
if (result.error) {
  console.error(`Unable to run Rive: ${result.error.message}`);
  console.error('Install the CLI: https://rive.app/docs/cli/getting-started');
}
process.exit(result.status ?? 1);
