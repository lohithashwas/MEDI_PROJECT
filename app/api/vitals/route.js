export const dynamic = 'force-dynamic';

const demoVitals = {
  heartRate: 72,
  spo2: 98,
  bloodPressure: '118/76',
  temperature: 36.7,
  glucose: 96,
  stressLevel: 28,
  steps: 4820,
  source: 'Demo device feed',
  updatedAt: new Date().toISOString()
};

function normalise(payload) {
  return {
    heartRate: Number(payload.heartRate ?? payload.heart_rate ?? payload['Heart Rate']) || demoVitals.heartRate,
    spo2: Number(payload.spo2 ?? payload.SpO2 ?? payload.oxygenSaturation) || demoVitals.spo2,
    bloodPressure: String(payload.bloodPressure ?? payload.BP ?? payload.bp ?? demoVitals.bloodPressure),
    temperature: Number(payload.temperature ?? payload.Temperature) || demoVitals.temperature,
    glucose: Number(payload.glucose ?? payload.Glucose) || demoVitals.glucose,
    stressLevel: Number(payload.stressLevel ?? payload.Stress_Level) || demoVitals.stressLevel,
    steps: Number(payload.steps ?? payload.Steps) || demoVitals.steps,
    source: 'Connected device',
    updatedAt: payload.updatedAt ?? payload.timestamp ?? new Date().toISOString()
  };
}

export async function GET() {
  const upstream = process.env.VITALS_API_URL;
  if (!upstream) return Response.json(demoVitals);

  try {
    const response = await fetch(upstream, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('Vitals source unavailable');
    return Response.json(normalise(await response.json()));
  } catch {
    return Response.json({ ...demoVitals, source: 'Demo device feed · source unavailable' });
  }
}
