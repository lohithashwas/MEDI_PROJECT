const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [language, script, appointment, checks, kidney, yes, no] of [
      ['ta', /[\u0B80-\u0BFF]/, 'சந்திப்புகள்', 'சுகாதார பரிசோதனை', 'சிறுநீரகம்', 'ஆமாம்', 'இப்போது வேண்டாம்'],
      ['hi', /[\u0900-\u097F]/, 'अपॉइंटमेंट', 'स्वास्थ्य जांच', 'किडनी', 'जी हाँ', 'अभी नहीं'],
      ['te', /[\u0C00-\u0C7F]/, 'అపాయింట్‌మెంట్', 'ఆరోగ్య పరీక్ష', 'మూత్రపిండ', 'సరే', 'ఇప్పుడు వద్దు']
    ]) {
      const page = await browser.newPage();
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(language => {
        localStorage.setItem('medikit-language', language);
        localStorage.setItem('medikit-session', JSON.stringify({ name: 'Test', role: 'patient' }));
        window.mics = []; window.spoken = [];
        window.SpeechRecognition = class {
          start() { this.active = true; window.mics.push(this); this.onstart?.(); }
          abort() { this.active = false; setTimeout(() => this.onend?.(), 0); }
          emit(text) { const result = [{ transcript: text }]; result.isFinal = true; this.onresult?.({ resultIndex: 0, results: [result] }); }
        };
        // Supply deterministic voices without relying on this machine's voice packs.
        window.speechSynthesis.getVoices = () => ['en', 'ta', 'hi', 'te'].map(lang => ({ lang: lang + '-IN' }));
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
        window.speechSynthesis.speak = utterance => { window.spoken.push({ text: utterance.text, lang: utterance.lang }); setTimeout(() => utterance.onend?.(), 30); };
        window.speechSynthesis.cancel = () => {};
      }, language);
      await page.route('**/api/voice', route => { requests.push(route.request().postDataJSON()); return route.fulfill({ status: 503, body: '{}' }); });
      await page.goto('http://localhost:3010/appointments');
      await page.waitForFunction(lang => document.documentElement.lang === lang, language);
      assert.match(await page.locator('.page-welcome p').textContent(), script);
      await page.locator('.voice-launcher').click();
      await page.locator('.voice-listen').click();
      await page.waitForFunction(lang => window.spoken.some(item => item.lang === lang + '-IN'), language);
      const command = async text => { await page.waitForFunction(() => window.mics.at(-1)?.active); await page.evaluate(text => window.mics.at(-1).emit(text), text); };
      assert.equal(await page.evaluate(() => window.mics.at(-1).lang), language + '-IN');
      await command(yes);
      await page.waitForSelector('.booking-modal');
      await page.locator('.close-modal').click();
      await command(checks);
      await page.waitForURL('**/screening');
      await command(kidney);
      await page.waitForURL('**/screening?check=kidney');
      await page.waitForSelector('#assessment-title');
      await page.locator('.close-modal').click();
      await command(appointment);
      await page.waitForURL('**/appointments');
      await command(no);
      await page.waitForFunction(() => !document.querySelector('.page-welcome'));
      assert.ok(requests.length > 0);
      assert.ok(requests.every(item => item.language === language), JSON.stringify(requests));
      assert.ok(requests.every(item => script.test(item.text)), 'All replies use the selected language');
      assert.deepEqual(errors, []);
      await page.close();
      console.log('PASS: ' + language + ' prompts, speech locale, yes/no, navigation, kidney check');
    }
    const diagnostic = await browser.newPage();
    await diagnostic.goto('http://localhost:3010');
    await diagnostic.waitForTimeout(1500);
    console.log('Installed browser voice languages:', await diagnostic.evaluate(() => [...new Set(speechSynthesis.getVoices().map(voice => voice.lang))]));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
