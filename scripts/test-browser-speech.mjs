import assert from 'node:assert/strict';
import { browserUtterance } from '../app/browser-speech.mjs';

const events = new EventTarget();
let voices = [{ lang: 'en-US' }];
globalThis.window = {
  speechSynthesis: {
    getVoices: () => voices,
    addEventListener: (...args) => events.addEventListener(...args),
    removeEventListener: (...args) => events.removeEventListener(...args)
  },
  SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } }
};
for (const language of ['ta', 'te']) {
  voices = [{ lang: 'en-US' }];
  const pending = browserUtterance('Localized speech', language);
  setTimeout(() => {
    voices.push({ lang: `${language}-IN` });
    events.dispatchEvent(new Event('voiceschanged'));
  }, 10);
  const utterance = await pending;
  assert.equal(utterance.lang, `${language}-IN`);
  assert.equal(utterance.voice.lang, `${language}-IN`);
}
voices = [{ lang: 'en-US' }];
await assert.rejects(browserUtterance('తెలుగు', 'te'), /Language voice unavailable/);
console.log('PASS: delayed Tamil/Telugu voices and no incorrect English fallback');
