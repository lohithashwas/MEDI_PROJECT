const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('medikit-session', JSON.stringify({ name: 'Welcome Test', role: location.pathname.startsWith('/doctor') ? 'doctor' : 'patient' }));
      window.spoken = []; window.mics = [];
      window.SpeechRecognition = class {
        start() { this.active = true; window.mics.push(this); this.onstart?.(); }
        abort() { this.active = false; setTimeout(() => this.onend?.(), 0); }
        emit(text) { const result = [{ transcript: text }]; result.isFinal = true; this.onresult?.({ resultIndex: 0, results: [result] }); }
      };
      window.speechSynthesis.speak = utterance => { window.spoken.push(utterance.text); setTimeout(() => utterance.onend?.(), 30); };
      window.speechSynthesis.cancel = () => {};
    });
    await page.route('**/api/voice', route => route.fulfill({ status: 503, body: '{}' }));
    await page.route('**/api/vitals', route => route.fulfill({ json: { heartRate: 72 } }));
    await page.route('**/api/blood-pressure', route => route.fulfill({ json: { bloodPressure: '120/80' } }));
    const paths = ['/signin', '/register', '/portal', '/appointments', '/screening', '/portal/live-device', '/portal/health-history', '/portal/messages', '/doctor', '/doctor/patients', '/doctor/appointments', '/doctor/messages'];
    for (const path of paths) {
      await page.goto('http://localhost:3010' + path);
      await page.waitForSelector('.page-welcome');
      assert.ok((await page.locator('.page-welcome p').textContent()).includes('Would you like') || (await page.locator('.page-welcome p').textContent()).includes('would you like'), path);
      assert.equal(await page.evaluate(() => window.mics.length), 0, 'Never enable microphone on arrival');
    }
    await page.goto('http://localhost:3010/appointments');
    await page.locator('.page-welcome').getByRole('button', { name: 'Book appointment', exact: true }).click();
    await page.waitForSelector('.booking-modal');
    assert.equal(await page.locator('.page-welcome').count(), 0);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await page.locator('.voice-launcher').click();
    await page.locator('.voice-listen').click();
    await page.waitForFunction(() => window.spoken.some(text => text.includes('book an appointment')));
    await page.waitForFunction(() => window.mics.at(-1)?.active);
    await page.evaluate(() => window.mics.at(-1).emit('yes'));
    await page.waitForSelector('.booking-modal');
    assert.equal(await page.locator('.page-welcome').count(), 0);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(() => window.spoken.filter(text => text.includes('book an appointment')).length), 1);
    await page.reload();
    await page.locator('.page-welcome').getByRole('button', { name: 'Not now', exact: true }).click();
    assert.equal(await page.locator('.page-welcome').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: all 12 page prompts, opt-in speech, yes opens booking, dismiss, no repeated prompts');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
