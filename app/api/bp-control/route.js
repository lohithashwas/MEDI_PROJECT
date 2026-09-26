export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
let triggering = false;

function endpoint() {
  if (!process.env.BP_CONTROL_FIREBASE_URL || !process.env.BP_CONTROL_FIREBASE_AUTH) return null;
  const url = new URL('/control/state.json', process.env.BP_CONTROL_FIREBASE_URL);
  url.searchParams.set('auth', process.env.BP_CONTROL_FIREBASE_AUTH);
  return url;
}
async function write(url, state) {
  const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state), cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Control unavailable');
}
export async function GET() {
  try {
    const url = endpoint();
    if (!url) return Response.json({ state: null }, { status: 503, headers });
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error();
    const state = await response.json();
    if (state !== 'ON' && state !== 'OFF') throw new Error();
    return Response.json({ state }, { headers });
  } catch { return Response.json({ state: null }, { status: 502, headers }); }
}
export async function POST(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin.' }, { status: 403, headers });
  const { action } = await request.json().catch(() => ({}));
  if (!['ON', 'OFF'].includes(action)) return Response.json({ error: 'Invalid action.' }, { status: 400, headers });
  if (action === 'ON' && triggering) return Response.json({ error: 'BP trigger already running.' }, { status: 409, headers });
  let url;
  try { url = endpoint(); } catch { /* Invalid configuration. */ }
  if (!url) return Response.json({ error: 'BP control is not configured.' }, { status: 503, headers });
  if (action === 'ON') triggering = true;
  try {
    if (action === 'OFF') {
      await write(url, 'OFF');
    } else {
      // Always attempt OFF, even if ON times out after reaching the device.
      // This server-side pulse survives navigation or closing the browser tab.
      try {
        await write(url, 'ON');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } finally {
        await write(url, 'OFF');
      }
    }
    return Response.json({ state: 'OFF', triggered: action === 'ON' }, { headers });
  } catch {
    return Response.json({ state: null, error: 'Control failed. Device state could not be confirmed; try BP off.' }, { status: 502, headers });
  } finally { if (action === 'ON') triggering = false; }
}
