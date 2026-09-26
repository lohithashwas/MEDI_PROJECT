export const dynamic = 'force-dynamic';

export async function POST(request) {
  const headers = { 'Cache-Control': 'no-store' };
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin.' }, { status: 403, headers });
  const { action } = await request.json().catch(() => ({}));
  if (action !== 'ON' && action !== 'OFF') return Response.json({ error: 'Invalid action.' }, { status: 400, headers });
  const endpoint = process.env.TEMPERATURE_FIREBASE_URL;
  const auth = process.env.TEMPERATURE_FIREBASE_AUTH;
  if (!endpoint || !auth) return Response.json({ error: 'Temperature control is not configured.' }, { status: 503, headers });
  try {
    const url = new URL('/control/state.json', endpoint);
    url.searchParams.set('auth', auth);
    const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action), cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error();
    return Response.json({ state: action }, { headers });
  } catch {
    return Response.json({ state: null, error: 'Temperature command failed; device state is unknown.' }, { status: 502, headers });
  }
}
