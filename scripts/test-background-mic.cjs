const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('medikit-session', JSON.stringify({ name: 'Mic Test', role: 'patient' }));
      window.mics = [];
      window.SpeechRecognition = class {
        start() { this.active = true; window.mics.push(this); this.onstart?.(); }
        abort() { this.active = false; setTimeout(() => this.onend?.(), 0); }
        emit(text) { const result = [{ transcript: text }]; result.isFinal = true; this.onresult?.({ resultIndex: 0, results: [result] }); }
      };
      window.speechSynthesis.speak = utterance => { if (!window.holdSpeech) setTimeout(() => utterance.onend?.(), 30); };
      window.speechSynthesis.cancel = () => {};
    });
    await page.route('**/api/voice', route => route.fulfill({ status: 503, body: '{}' }));
    await page.goto(process.env.BASE_URL || 'http://localhost:3010');
    await page.locator('.voice-launcher').click();
    await page.evaluate(() => { window.holdSpeech = true; });
    await page.getByRole('button', { name: 'Website home', exact: true }).click();
    await page.locator('.voice-listen').click();
    await page.evaluate(() => { window.holdSpeech = false; });
    const ready = () => page.waitForFunction(() => window.mics.at(-1)?.active);
    const command = async text => { await ready(); await page.evaluate(text => window.mics.at(-1).emit(text), text); };
    await ready();
    await page.evaluate(() => { const result = [{ transcript: 'open health' }]; result.isFinal = false; window.mics.at(-1).onresult({ resultIndex: 0, results: [result] }); });
    await page.waitForFunction(() => document.querySelector('.voice-status')?.textContent.includes('open health'));
    await page.getByRole('button', { name: 'Close voice assistant', exact: true }).click();
    await command('open appointments');
    await page.waitForURL('**/appointments');
    await page.waitForSelector('.appointments-page');
    await command('helath checks');
    await page.waitForURL('**/screening');
    await command('appoints');
    await page.waitForURL('**/appointments');
    await command('checkup');
    await page.waitForURL('**/screening');
    await command('open health history');
    await page.waitForURL('**/portal/health-history');
    assert.ok(await page.locator('.voice-mic-off').isVisible());
    await command('open live device');
    await page.waitForURL('**/portal/live-device');
    await command('open messages');
    await page.waitForURL('**/portal/messages');
    await command('open kidney check');
    await page.waitForURL('**/screening?check=kidney');
    await page.waitForSelector('#assessment-title');
    assert.equal(await page.locator('#assessment-title').textContent(), 'Kidney health');
    await command('open liver check');
    await page.waitForURL('**/screening?check=liver');
    await page.waitForFunction(() => document.querySelector('#assessment-title')?.textContent === 'Liver health');
    await ready();
    const count = await page.evaluate(() => window.mics.length);
    await page.evaluate(() => window.mics.at(-1).abort());
    await page.waitForFunction(n => window.mics.length > n && window.mics.at(-1).active, count);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('medikit-voice-focus', { detail: { owner: 'test', active: true } })));
    await page.waitForFunction(() => !window.mics.at(-1).active);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('medikit-voice-focus', { detail: { owner: 'test', active: false } })));
    await ready();
    await command('stop listening');
    await page.waitForFunction(() => !window.mics.at(-1).active);
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.voice-mic-off').count(), 0);
    await page.locator('.voice-launcher').click();
    await page.locator('.voice-listen').click();
    await ready();
    await page.evaluate(() => window.mics.at(-1).onerror({ error: 'not-allowed' }));
    await page.waitForTimeout(800);
    assert.equal(await page.locator('.voice-listen').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => window.mics.at(-1).active), false);
    assert.ok((await page.locator('.voice-error').textContent()).includes('Microphone access is blocked'));
    await page.locator('.voice-listen').click();
    await ready();
    const beforeNetwork = await page.evaluate(() => window.mics.length);
    await page.evaluate(() => window.mics.at(-1).onerror({ error: 'network' }));
    await page.waitForFunction(n => window.mics.length > n && window.mics.at(-1).active, beforeNetwork);
    assert.equal(await page.locator('.voice-listen').getAttribute('aria-pressed'), 'true');
    await page.locator('.voice-mic-off').click();
    assert.deepEqual(errors, []);
    console.log('PASS: navigation, new checks, restart, audio pause/resume, mic off, permission denial, stuck speech interruption, interim transcript, network retry');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
