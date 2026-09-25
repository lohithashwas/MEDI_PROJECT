export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const endpoint = process.env.BP_FIREBASE_URL;
  const auth = process.env.BP_FIREBASE_AUTH;
  if (!endpoint || !auth) return Response.json({ bloodPressure: null, error: 'Blood pressure source is not configured.' }, { status: 503, headers });
  try {
    const url = new URL(endpoint);
    url.searchParams.set('auth', auth);
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Source unavailable');
    const payload = await response.json();
    const systolic = Number(payload?.sys);
    const diastolic = Number(payload?.dia);
    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic) || systolic <= 0 || diastolic <= 0) throw new Error('Missing reading');
    // Do not import bpm or other measurements from this BP-only source.
    return Response.json({
      bloodPressure: `${systolic}/${diastolic}`,
      recordedAt: typeof payload.datetime === 'string' ? payload.datetime : null,
      source: 'Firebase BP device'
    }, { headers });
  } catch {
    // Never substitute demo readings or expose the authenticated upstream URL.
    return Response.json({ bloodPressure: null, error: 'Blood pressure feed unavailable.' }, { status: 502, headers });
  }
}
