export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  try {
    const origin = new URL(process.env.MEDIKET_ML_ORIGIN || 'http://127.0.0.1:8001');
    if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(origin.hostname) || origin.username || origin.password) {
      throw new Error('Invalid ML origin');
    }
    const response = await fetch(new URL('/health-status', origin), {
      cache: 'no-store', signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('ML service unavailable');
    const result = await response.json();
    if (!result || !result.triage || typeof result.triage.reason !== 'string' ||
        !Array.isArray(result.triage.ml_signals) || !result.measurements ||
        !Number.isFinite(result.fetched_at)) throw new Error('Invalid ML response');
    return Response.json({
      status: 'ready', fetchedAt: result.fetched_at,
      sourceStatus: result.source_status,
      assessment: result.triage.status,
      reason: result.triage.reason,
      models: result.triage.ml_signals,
      measurements: result.measurements,
      sources: result.sources,
      clinicalUse: false
    }, { headers });
  } catch {
    return Response.json({ status: 'unavailable', error: 'ML service unavailable. Start the ML server to receive results.' }, { status: 503, headers });
  }
}
