export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
function number(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function normalise(payload) {
  const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
  const samples = Array.isArray(payload.ecg) ? payload.ecg : payload.ecg?.samples;
  const ecg = Array.isArray(samples) && samples.length >= 2 && samples.every(value => typeof value === 'number' && Number.isFinite(value)) ? samples.slice(-1000) : null;
  return {
    patientId: text(payload.patientId),
    name: text(payload.name),
    cardUid: text(payload.cardUid),
    readerId: text(payload.readerId),
    latitude: number(payload.latitude),
    longitude: number(payload.longitude),
    ecg,
    heartRate: number(payload.heartRate ?? payload.heart_rate ?? payload['Heart Rate']),
    spo2: number(payload.spo2 ?? payload.SpO2 ?? payload.oxygenSaturation),
    bloodPressure: null, // BP comes only from /api/blood-pressure.
    temperature: null, // Temperature comes only from /api/temperature.
    glucose: number(payload.glucose ?? payload.Glucose),
    stressLevel: number(payload.stressLevel ?? payload.Stress_Level),
    steps: number(payload.steps ?? payload.Steps),
    source: 'Connected device',
    updatedAt: payload.updatedAt ?? payload.timestamp ?? null
  };
}
export async function GET() {
  try {
    let upstream;
    if (process.env.MEDIKET_FIREBASE_URL) {
      // Explicit kiosk measurement path; do not guess a patient from the browser.
      const path = process.env.MEDIKET_VITALS_PATH;
      if (!path) return Response.json({ error: 'Vitals path is not configured.' }, { status: 503, headers });
      upstream = new URL(`${path.replace(/\.json$/, '').replace(/^\/+|\/+$/g, '')}.json`, `${process.env.MEDIKET_FIREBASE_URL.replace(/\/+$/, '')}/`);
      if (process.env.MEDIKET_FIREBASE_AUTH) upstream.searchParams.set('auth', process.env.MEDIKET_FIREBASE_AUTH);
    } else if (process.env.VITALS_API_URL) {
      upstream = new URL(process.env.VITALS_API_URL);
    } else {
      return Response.json({ error: 'Vitals source is not configured.' }, { status: 503, headers });
    }
    const response = await fetch(upstream, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Source unavailable');
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Missing reading');
    const reading = normalise(payload);
    if (!reading.ecg && ['heartRate', 'spo2', 'glucose', 'stressLevel', 'steps'].every(key => reading[key] === null)) throw new Error('Missing measurements');
    return Response.json(reading, { headers });
  } catch {
    return Response.json({ error: 'Device feed unavailable.' }, { status: 502, headers });
  }
}
