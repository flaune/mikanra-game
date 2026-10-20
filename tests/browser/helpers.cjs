const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(__dirname, '../../output/playwright');
fs.mkdirSync(output, { recursive: true });
const baseUrl = process.env.MIKANRA_E2E_URL || 'http://127.0.0.1:4175';
const fixtureUrl = new URL('/tests/browser/fixtures/cafe.html', baseUrl).href;
// CI uses software WebGL. Exercise a supported desktop viewport without GPU timing assumptions.
const viewport = process.env.CI ? { width: 1000, height: 700 } : { width: 1440, height: 900 };
function launchBrowser() {
  return chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
    args: ['--enable-webgl', '--ignore-gpu-blocklist'],
  });
}
module.exports = { output, baseUrl, fixtureUrl, launchBrowser, viewport };
