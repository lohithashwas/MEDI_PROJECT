const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const code = fs.readFileSync('app/api/blood-pressure/route.js', 'utf8');
  const { GET } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  process.env.BP_FIREBASE_URL = 'https://example.test/latest.json';
  process.env.BP_FIREBASE_AUTH = 'test-secret';
  let upstream = { sys: 154, dia: 91, bpm: 81, datetime: '2026-08-12 11:02:59' };
  global.fetch = async (url, options) => {
    assert.equal(url.searchParams.get('auth'), 'test-secret');
    assert.equal(options.cache, 'no-store');
    return Response.json(upstream);
  };
  const response = await GET();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { bloodPressure: '154/91', recordedAt: '2026-08-12 11:02:59', source: 'Firebase BP device' });
  for (const invalid of [null, {}, { sys: 154 }, { sys: 'bad', dia: 91 }, { sys: 0, dia: 0 }]) {
    upstream = invalid;
    const result = await GET();
    assert.equal(result.status, 502);
    assert.equal((await result.json()).bloodPressure, null);
  }
  global.fetch = async () => new Response('Permission denied', { status: 401 });
  assert.equal((await GET()).status, 502);
  global.fetch = async () => { throw new Error('Timeout with secret'); };
  const failed = await GET();
  assert.equal(failed.status, 502);
  assert.ok(!(await failed.text()).includes('secret'));
  delete process.env.BP_FIREBASE_AUTH;
  assert.equal((await GET()).status, 503);
  console.log('PASS: BP-only mapping, date, missing data, denied access, timeout, configuration, secret redaction');
})().catch(error => { console.error(error); process.exitCode = 1; });
