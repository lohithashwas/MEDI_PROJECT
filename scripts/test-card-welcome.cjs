const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.spoken = [];
      window.speechSynthesis.speak = utterance => { window.spoken.push(utterance.text); utterance.onstart?.(); setTimeout(() => utterance.onend?.(), 50); };
      window.speechSynthesis.cancel = () => {};
    });
    await page.goto('http://localhost:3010');
    await page.waitForFunction(() => window.spoken.some(text => text.includes('tap your ABHA card')));
    assert.ok(await page.getByRole('heading', { name: 'Tap your ABHA card', exact: true }).isVisible());
    assert.equal(await page.locator('.page-welcome').count(), 0, 'No competing welcome prompt');
    assert.equal(await page.evaluate(() => localStorage.getItem('medikit-session')), null, 'No fake card sign-in');
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => window.spoken.length);
    await page.getByRole('button', { name: 'Hear instructions', exact: true }).click();
    await page.waitForFunction(n => window.spoken.length > n, before);
    await page.screenshot({ path: 'card-welcome-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.getByRole('heading', { name: 'Tap your ABHA card', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.abha-tap-card').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.screenshot({ path: 'card-welcome-mobile.png', fullPage: true });
    await page.getByRole('link', { name: 'Sign in instead', exact: true }).click();
    await page.waitForURL('**/signin');
    assert.deepEqual(errors, []);
    console.log('PASS: animated entry, automatic/replayed speech, mobile layout, reduced motion, manual sign-in');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
