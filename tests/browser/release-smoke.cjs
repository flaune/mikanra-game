const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser, output } = require('./helpers.cjs');

(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const url = process.argv[2] || process.env.MIKANRA_E2E_URL || 'http://127.0.0.1:4176';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'Click to Play' && !button.disabled), undefined, { timeout: 60000 });
    assert.equal(await page.getByText('Playtest controls', { exact: false }).count(), 0);
    assert.equal(await page.evaluate(() => 'mikanraQA' in window), false);
    await page.screenshot({ path: path.join(output, 'release-title.png') });
    await page.getByRole('button', { name: 'Credits', exact: true }).click();
    const credits = await page.getByRole('region', { name: 'Credits' }).innerText();
    assert.match(credits, /OpenJTalk/);
    assert.doesNotMatch(credits, /NonCommercial|BY-NC|shojibeat/i);
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    for (const asset of ['audio/arrival.mp3', 'audio/ja/ja-01.mp3', 'rive/cafe-feedback.riv', 'rive/rive.wasm', 'licenses/index.html', 'social-preview.jpg']) {
      const result = await page.request.get(new URL(asset, url).href);
      assert.equal(result.status(), 200, asset);
      assert.ok((await result.body()).length > 100, asset);
      if (!asset.endsWith('.html')) assert.doesNotMatch(result.headers()['content-type'] || '', /text\/html/, asset);
    }
    await page.getByRole('button', { name: 'Click to Play', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.locator('[data-phase="game"]').waitFor();
    await page.screenshot({ path: path.join(output, 'release-arrival.png') });
    // Seed on the next document, after the old game's visibility/unload save flush.
    await page.addInitScript(() => {
      if (sessionStorage.getItem('mikanra.release.seed')) {
        localStorage.setItem('mikanra.chapter-one.v1', JSON.stringify({ version: 1, stage: 'briefing', hired: true, day: 2, customer: 0, tray: [], relationships: [1, 0, 0] }));
        sessionStorage.removeItem('mikanra.release.seed');
      }
    });
    await page.evaluate(() => sessionStorage.setItem('mikanra.release.seed', '1'));
    await page.reload();
    await page.getByRole('button', { name: 'Continue café', exact: true }).click({ timeout: 60000 });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mikanra.chapter-one.v1')).day), 2);
    await page.screenshot({ path: path.join(output, 'release-resume.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('heading', { name: 'A seat at your desktop.', exact: false }).waitFor();
    await page.screenshot({ path: path.join(output, 'release-mobile.png') });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'release-smoke-results.json'), JSON.stringify({ passed: true, url, errors, verified: ['production boot', 'credits', 'local audio/Rive/license/social assets', 'arrival skip', 'saved shift resumes', 'mobile notice', 'no QA controls'] }, null, 2));
    console.log('PASS production boot, assets, credits, arrival, saved shift, mobile notice and no QA controls.');
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'release-failure.png') }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
