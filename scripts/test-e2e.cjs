const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let server;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function start(command, port) {
  const url = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), ...command, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'inherit', env: { ...process.env, MIKANRA_E2E: '1' } });
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw Error('Test server exited before becoming ready');
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return url; } catch { /* Wait for server startup. */ }
    await delay(250);
  }
  throw Error('Test server did not become ready');
}
async function stop() {
  const current = server; server = undefined;
  if (current && current.exitCode === null) {
    const closed = new Promise(resolve => current.once('exit', resolve));
    current.kill();
    await closed;
  }
}
async function run(file, url) {
  const child = spawn(process.execPath, [file], { cwd: root, stdio: 'inherit', env: { ...process.env, MIKANRA_E2E_URL: url } });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  if (code !== 0) throw Error(`${file} failed (${code})`);
}
async function main() {
  try {
    const dev = await start([], 4175);
    await run('tests/browser/preparation.cjs', dev);
    await run('tests/browser/chapter-check.cjs', dev);
    await stop();
    const preview = await start(['preview'], 4176);
    await run('tests/browser/release-smoke.cjs', preview);
  } finally { await stop(); }
}
process.once('SIGINT', () => { server?.kill(); process.exit(130); });
process.once('SIGTERM', () => { server?.kill(); process.exit(143); });
main().catch(error => { console.error(error); process.exitCode = 1; });
