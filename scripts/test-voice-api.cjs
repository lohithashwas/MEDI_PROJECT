const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const source = fs.readFileSync('app/api/voice/route.js', 'utf8');
  const { POST } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const request = (text, language) => new Request('http://localhost/api/voice', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language })
  });
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_VOICE_ID;
  assert.equal((await POST(request('Hello', 'en'))).status, 503);
  process.env.ELEVENLABS_API_KEY = 'test-key';
  process.env.ELEVENLABS_VOICE_ID = 'test-voice';
  for (const [language, text, model] of [
    ['ta', 'வணக்கம்', 'eleven_flash_v2_5'], ['te', 'నమస్కారం', 'eleven_v3'],
    ['en', 'Hello', 'eleven_multilingual_v2'], ['hi', 'नमस्ते', 'eleven_multilingual_v2']
  ]) {
    global.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.text, text);
      assert.equal(body.language_code, language);
      assert.equal(body.model_id, model);
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(new Uint8Array([73, 68, 51]), { headers: { 'Content-Type': 'audio/mpeg' } });
    };
    const result = await POST(request(text, language));
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('content-type'), 'audio/mpeg');
    assert.equal((await result.arrayBuffer()).byteLength, 3);
  }
  assert.equal((await POST(request(' ', 'ta'))).status, 400);
  global.fetch = async () => new Response('Quota exceeded', { status: 429 });
  assert.equal((await POST(request('నమస్కారం', 'te'))).status, 429);
  global.fetch = async () => { throw new Error('Network error'); };
  assert.equal((await POST(request('வணக்கம்', 'ta'))).status, 500);
  console.log('PASS: Tamil/Telugu model support, audio response, missing configuration and provider failures');
})().catch(error => { console.error(error); process.exitCode = 1; });
