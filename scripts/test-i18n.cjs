const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    const picker = () => page.locator('.language-picker select').first();
    const choose = async (language) => {
      await picker().selectOption(language);
      await page.waitForFunction((lang) => document.documentElement.lang === lang && localStorage.getItem('medikit-language') === lang, language);
    };
    await page.goto(baseURL);
    const original = await page.locator('.hero-copy').innerText();
    for (const language of ['ta', 'hi', 'te', 'en', 'hi', 'ta', 'en']) {
      await choose(language);
      if (language === 'en') assert.equal(await page.locator('.hero-copy').innerText(), original);
      else {
        assert.notEqual(await page.locator('.hero-copy').innerText(), original);
        assert.ok(!await page.locator('.hero-copy').innerText().then((text) => text.includes('Create your free account')));
      }
    }
    await choose('hi');
    assert.equal((await page.locator('.company-hero h1').innerText()).trim(), 'स्वास्थ्य देखभाल जो जीवन के साथ चलती है');
    await page.reload();
    await page.waitForFunction(() => document.documentElement.lang === 'hi');
    assert.equal(await picker().inputValue(), 'hi');
    // Client-side navigation retains the selected language.
    await page.locator('.header-cta').click();
    await page.waitForURL('**/register');
    assert.equal(await page.locator('input[autocomplete="new-password"]').getAttribute('placeholder'), 'कम से कम 8 अक्षर');
    await choose('en');
    assert.equal(await page.locator('input[autocomplete="new-password"]').getAttribute('placeholder'), 'At least 8 characters');
    await page.goto(`${baseURL}/signin`);
    await choose('ta');
    await page.locator('.password-field button').click();
    assert.equal(await page.locator('.password-field button').innerText(), 'மறை');
    await choose('te');
    assert.equal(await page.locator('.password-field button').innerText(), 'దాచు');
    await page.locator('.auth-submit').click();
    await page.waitForURL('**/portal');
    await page.goto(`${baseURL}/screening`);
    await page.locator('.check-card').first().locator('.card-action').click();
    const dialog = page.getByRole('dialog');
    const family = dialog.locator('select').first();
    await family.selectOption('Parent or sibling');
    assert.equal(await family.inputValue(), 'Parent or sibling');
    assert.equal(await family.locator('option:checked').innerText(), 'తల్లిదండ్రులు లేదా తోబుట్టువులు');
    await choose('hi');
    assert.equal(await family.inputValue(), 'Parent or sibling');
    assert.equal(await family.locator('option:checked').innerText(), 'माता-पिता या भाई-बहन');
    await dialog.locator('input[type="number"]').first().fill('42');
    await dialog.locator('select').last().selectOption('High');
    await dialog.locator('button[type="submit"]').click();
    await page.waitForSelector('.result-view');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('medikit-screenings')));
    assert.equal(saved.diabetes.label, 'Keep an eye on it');
    await choose('en');
    assert.equal(await page.locator('.result-view h2').innerText(), 'Keep an eye on it');
    await page.locator('.result-view button').click();
    // Every questionnaire must translate while retaining its option values.
    for (const language of ['ta', 'hi', 'te']) {
      await choose(language);
      const cards = page.locator('.check-card');
      assert.equal(await cards.count(), 10);
      for (let index = 0; index < 10; index++) {
        await cards.nth(index).locator('.card-action').click();
        assert.match(await dialog.locator('#assessment-title').innerText(), /[\u0900-\u0d7f]/);
        assert.match(await dialog.locator('p').first().innerText(), /[\u0900-\u0d7f]/);
        for (const field of await dialog.locator('label.field').all()) {
          assert.match(await field.innerText(), /[\u0900-\u0d7f]/);
        }
        for (const option of await dialog.locator('option:not([disabled])').all()) {
          const value = await option.getAttribute('value');
          assert.ok(value);
          assert.notEqual(await option.innerText(), value);
        }
        await dialog.locator('.close-modal').click();
      }
    }
    // Unknown text, user-editable content, and script/style contents stay intact.
    await page.evaluate(() => {
      const fixture = document.createElement('div');
      fixture.id = 'i18n-fixture';
      fixture.innerHTML = '<p translate="no">Sign in</p><div contenteditable="true">Sign in</div><textarea>Sign in</textarea><script type="application/json">"Sign in"</script><p class="unknown">Unlisted content</p><p class="dynamic">Show</p>';
      document.body.append(fixture);
    });
    await choose('ta');
    for (const selector of ['[translate="no"]', '[contenteditable]', 'textarea']) {
      assert.equal(await page.locator(`#i18n-fixture ${selector}`).textContent(), 'Sign in');
    }
    assert.equal(await page.locator('#i18n-fixture script').textContent(), '"Sign in"');
    assert.equal(await page.locator('#i18n-fixture .unknown').textContent(), 'Unlisted content');
    await page.locator('#i18n-fixture .dynamic').evaluate((element) => { element.firstChild.nodeValue = 'Hide'; });
    await page.waitForFunction(() => document.querySelector('#i18n-fixture .dynamic').textContent === 'மறை');
    await choose('en');
    assert.equal(await page.locator('#i18n-fixture .dynamic').textContent(), 'Hide');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await picker().isVisible());
    assert.deepEqual(errors, []);

    const blocked = await browser.newContext({ locale: 'ta-IN' });
    await blocked.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
      Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    });
    const blockedPage = await blocked.newPage();
    await blockedPage.goto(baseURL);
    await blockedPage.waitForFunction(() => document.documentElement.lang === 'ta');
    await blockedPage.locator('.language-picker select').selectOption('te');
    await blockedPage.waitForFunction(() => document.documentElement.lang === 'te');
    await blocked.close();
    console.log('PASS: four languages, round trips, persistence, navigation, dynamic forms, stable answer values, protected content, mobile picker, and disabled storage.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
