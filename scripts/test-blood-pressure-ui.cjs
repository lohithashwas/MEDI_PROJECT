const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('medikit-session', JSON.stringify({ name: 'BP Test', role: 'patient' })));
    await page.route('**/api/vitals', route => route.fulfill({ json: { heartRate: 72, spo2: 98, bloodPressure: '118/76', source: 'Demo device feed' } }));
    let failed = false, calls = 0;
    await page.route('**/api/blood-pressure', route => { calls++; return route.fulfill({ status: failed ? 502 : 200, json: failed ? { bloodPressure: null } : { bloodPressure: '154/91', recordedAt: '2026-08-12 11:02:59' } }); });
    await page.goto('http://localhost:3011/portal/live-device');
    await page.waitForFunction(() => document.querySelector('.device-reading.pressure b')?.textContent.includes('154/91'));
    assert.ok((await page.locator('.device-reading.pressure').textContent()).includes('2026-08-12 11:02:59'));
    assert.ok((await page.locator('.device-reading.heart b').textContent()).includes('72'));
    await page.waitForFunction(() => document.querySelector('.device-reading.pressure b')?.textContent.includes('154/91'));
    await page.waitForTimeout(10500);
    assert.ok(calls >= 2, 'BP automatically polls');
    failed = true;
    await page.getByRole('button', { name: 'Refresh live data', exact: true }).first().click();
    await page.waitForFunction(() => document.querySelector('.device-reading.pressure b')?.textContent === '—');
    assert.ok((await page.locator('.device-reading.pressure').textContent()).includes('unavailable'));
    assert.ok((await page.locator('.device-reading.heart b').textContent()).includes('72'));
    assert.deepEqual(errors, []);
    console.log('PASS: BP source isolation, timestamp, automatic polling, refresh, unavailable state');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
