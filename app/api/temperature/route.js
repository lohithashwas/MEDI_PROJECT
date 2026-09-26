export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const endpoint = process.env.TEMPERATURE_FIREBASE_URL;
  const auth = process.env.TEMPERATURE_FIREBASE_AUTH;
  if (!endpoint || !auth) return Response.json({ temperature: null, error: 'Temperature source is not configured.' }, { status: 503, headers });
  try {
    const url = new URL('/temperature.json', endpoint);
    url.searchParams.set('auth', auth);
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error();
    const raw = await response.json();
    const temperature = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : NaN;
    if (!Number.isFinite(temperature)) throw new Error();
    return Response.json({ temperature, unit: '°F', source: 'Temperature device' }, { headers });
  } catch {
    return Response.json({ temperature: null, error: 'Temperature feed unavailable.' }, { status: 502, headers });
  }
}
