const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const baseURL = process.env.BASE_URL || 'http://localhost:3003';
    await page.goto(baseURL);
    const toggle = page.locator('.fullscreen-toggle');
    await page.waitForFunction(() => !document.querySelector('.fullscreen-toggle').disabled);
    await toggle.click();
    await page.waitForFunction(() => document.fullscreenElement === document.documentElement);
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    await page.locator('.header-cta').click();
    await page.waitForURL('**/register');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    for (const [language, label] of [['ta', 'முழுத் திரையிலிருந்து வெளியேறு'], ['hi', 'पूर्ण स्क्रीन से बाहर आएँ'], ['te', 'పూర్తి తెర నుండి బయటకు రండి']]) {
      await page.locator('.language-picker select').selectOption(language);
      assert.equal(await toggle.getAttribute('aria-label'), label);
    }
    await toggle.click();
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    await toggle.click();
    await page.waitForFunction(() => !!document.fullscreenElement);
    // Browser-initiated exits must update the button through fullscreenchange.
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => document.querySelector('.fullscreen-toggle').getAttribute('aria-pressed') === 'false');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await toggle.isVisible());
    const box = await toggle.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390);
    await page.evaluate(() => { document.documentElement.requestFullscreen = async () => { throw new Error('Denied'); }; });
    await toggle.click();
    await page.waitForSelector('.fullscreen-error');
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    assert.ok(await toggle.isEnabled());
    assert.deepEqual(errors, []);
    const unsupported = await browser.newPage();
    await unsupported.addInitScript(() => { Object.defineProperty(document, 'fullscreenEnabled', { value: false }); });
    await unsupported.goto(baseURL);
    assert.ok(await unsupported.locator('.fullscreen-toggle').isDisabled());
    console.log('PASS: native fullscreen entry/exit, navigation, translated controls, external exit, mobile layout, denied requests, unsupported browsers.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
