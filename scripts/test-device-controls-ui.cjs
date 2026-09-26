const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [], actions = [], temperatureActions = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('medikit-language', 'en');
      localStorage.setItem('medikit-session', JSON.stringify({ name: 'Test', role: 'patient' }));
    });
    let temperature = 98.1;
    await page.route('**/api/vitals', route => route.fulfill({ json: { heartRate: 79, spo2: 95, temperature: 12, bloodPressure: '999/999', glucose: 100, steps: 8203, source: 'Connected device' } }));
    await page.route('**/api/temperature', route => route.fulfill({ json: { temperature, unit: '°F' } }));
    await page.route('**/api/blood-pressure', route => route.fulfill({ json: { bloodPressure: '120/80', recordedAt: '2026-09-25 17:00' } }));
    await page.route('**/api/bp-control', async route => {
      const { action } = route.request().postDataJSON(); actions.push(action);
      await route.fulfill({ json: { state: 'OFF', triggered: action === 'ON' } });
    });
    await page.route('**/api/temperature-control', async route => {
      const { action } = route.request().postDataJSON(); temperatureActions.push(action);
      await route.fulfill({ json: { state: action } });
    });
    await page.route('**/api/voice', route => route.fulfill({ status: 503, json: {} }));
    await page.goto((process.env.BASE_URL || 'http://localhost:3000') + '/portal/live-device');
    const cards = page.locator('.device-reading');
    await page.waitForFunction(() => document.querySelector('.device-readings-grid')?.textContent.includes('98.1'));
    assert.match(await cards.nth(2).innerText(), /120\/80/);
    assert.match(await cards.nth(3).innerText(), /98\.1\s*°F/);
    assert.equal(actions.length, 0, 'Opening the page must not trigger BP');
    assert.equal(temperatureActions.length, 0);
    const tempControls = page.locator('.temperature-device-controls');
    await tempControls.getByRole('button', { name: 'Temperature on', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.temperature-device-controls [role=status]')?.textContent.includes('ON command sent'));
    await tempControls.getByRole('button', { name: 'Temperature off', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.temperature-device-controls [role=status]')?.textContent.includes('OFF command sent'));
    assert.deepEqual(temperatureActions, ['ON', 'OFF']);
    assert.equal(actions.length, 0, 'Temperature must not trigger BP');
    await page.locator('.bp-device-controls').getByRole('button', { name: 'BP on', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.bp-device-controls [role=status]')?.textContent.includes('trigger sent'));
    await page.locator('.bp-device-controls').getByRole('button', { name: 'BP off', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.bp-device-controls [role=status]')?.textContent.includes('off command'));
    await page.locator('.voice-launcher').click();
    await page.locator('.voice-examples').getByRole('button', { name: 'BP on', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.bp-device-controls [role=status]')?.textContent.includes('trigger sent'));
    assert.deepEqual(actions, ['ON', 'OFF', 'ON']);
    temperature = 97.7;
    await page.waitForFunction(() => document.querySelector('.device-readings-grid')?.textContent.includes('97.7'), null, { timeout: 15000 });
    await page.goto((process.env.BASE_URL || 'http://localhost:3000') + '/portal');
    await page.waitForFunction(() => document.querySelector('.vitals-grid')?.textContent.includes('97.7'));
    const overview = await page.locator('.vitals-grid').innerText();
    assert.match(overview, /97\.7\s*°F/);
    assert.match(overview, /120\/80/);
    assert.ok(await page.locator('.temperature-device-controls').getByRole('button', { name: 'Temperature on', exact: true }).isVisible());
    assert.ok(!overview.includes('999/999'));
    assert.deepEqual(errors, []);
    console.log('PASS: independent BP/temperature cards, Fahrenheit, temperature ON/OFF, BP click and voice controls, automatic refresh and overview. Hardware writes mocked.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
