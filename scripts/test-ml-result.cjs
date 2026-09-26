const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const source = fs.readFileSync('app/api/ml-result/route.js', 'utf8');
  const { GET } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const originalFetch = global.fetch;
  const originalOrigin = process.env.MEDIKET_ML_ORIGIN;
  try {
    process.env.MEDIKET_ML_ORIGIN = 'http://127.0.0.1:8001';
    global.fetch = async (url, options) => {
      assert.equal(String(url), 'http://127.0.0.1:8001/health-status');
      assert.equal(options.cache, 'no-store');
      return Response.json({ fetched_at: 123, source_status: 'connected', measurements: { heart_rate_bpm: 72 }, triage: { status: 'NOT_ASSESSED', reason: 'Unsupported context', ml_signals: [{field:'ml_sepsis',status:'ABSTAIN'}] } });
    };
    let response = await GET(); let result = await response.json();
    assert.equal(response.status, 200); assert.equal(result.assessment, 'NOT_ASSESSED');
    assert.equal(result.measurements.heart_rate_bpm, 72); assert.equal(result.clinicalUse, false);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    global.fetch = async () => { throw new Error('Offline'); };
    response = await GET(); result = await response.json();
    assert.equal(response.status, 503); assert.equal(result.status, 'unavailable'); assert.equal(result.measurements, undefined);
    global.fetch = async () => Response.json({});
    assert.equal((await GET()).status, 503);
    process.env.MEDIKET_ML_ORIGIN = 'https://example.com';
    global.fetch = async () => { assert.fail('External ML URL must not be fetched'); };
    assert.equal((await GET()).status, 503);
    console.log('PASS: live ML mapping, no-store, offline clearing, malformed response, local-only origin');
  } finally {
    global.fetch = originalFetch;
    if (originalOrigin === undefined) delete process.env.MEDIKET_ML_ORIGIN;
    else process.env.MEDIKET_ML_ORIGIN = originalOrigin;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
