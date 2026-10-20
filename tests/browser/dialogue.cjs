const assert = require('node:assert/strict');
const { launchBrowser, baseUrl } = require('./helpers.cjs');
(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ reducedMotion: 'no-preference' });
  try {
    await page.goto(new URL('/tests/browser/fixtures/dialogue.html', baseUrl).href);
    await page.getByRole('button', { name: 'Start a new line' }).click();
    // Simulate expensive rendering starving the timer queue past the full reveal duration.
    await page.evaluate(() => { const end = performance.now() + 1200; while (performance.now() < end) { /* CPU stall for regression coverage. */ } });
    await page.getByRole('button', { name: 'Continue', exact: false }).waitFor({ timeout: 5000 });
    assert.equal(await page.getByRole('button', { name: 'Show text', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Start a new line' }).click();
    await page.getByRole('button', { name: 'Show text', exact: true }).click();
    await page.waitForTimeout(100);
    assert.equal(await page.getByRole('button', { name: 'Continue', exact: false }).count(), 1, 'Skipped text must never retreat');
    console.log('PASS dialogue completes after a CPU stall and skipped text never retreats.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
