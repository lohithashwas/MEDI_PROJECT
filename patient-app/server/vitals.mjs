// Server-only adapter. Never bundle this file or Firebase credentials in the APK.
const positive = value => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};
const stamp = value => {
  if (typeof value === 'number') {
    const date = new Date(value < 1e12 ? value * 1000 : value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  return typeof value === 'string' && value.trim() ? value : null;
};
export function normalizeBP(payload) {
  const sys = positive(payload?.sys), dia = positive(payload?.dia);
  return { values: sys && dia ? { bloodPressure: `${sys}/${dia}` } : {}, at: stamp(payload?.datetime), status: sys && dia ? 'Firebase BP device · unassigned reading' : 'BP device has no valid reading' };
}
export function normalizeVitals(payload) {
  const values = {};
  for (const [key, aliases] of Object.entries({ heartRate: ['heartRate','heart_rate','Heart Rate'], spo2: ['spo2','SpO2','oxygenSaturation'], temperature: ['temperature','Temperature'], glucose: ['glucose','Glucose'], stressLevel: ['stressLevel','Stress_Level'] })) {
    const raw = aliases.map(key => payload?.[key]).find(value => value !== undefined);
    const value = positive(raw);
    if (value !== null) values[key] = value;
    else if (key === 'stressLevel' && (raw === 0 || raw === '0')) values[key] = 0;
  }
  const steps = payload?.steps ?? payload?.Steps;
  if (steps !== null && steps !== undefined && steps !== '' && typeof steps !== 'boolean' && Number.isInteger(Number(steps)) && Number(steps) >= 0) values.steps = Number(steps);
  const measuredAt = {};
  for (const key of Object.keys(values)) measuredAt[key] = stamp(payload?.measuredAt?.[key] ?? payload?.updatedAt ?? payload?.timestamp);
  return { values, measuredAt, at: stamp(payload?.updatedAt ?? payload?.timestamp), status: Object.keys(values).length ? 'MediKet patient device' : 'Patient device has no readings' };
}
async function firebase(url, auth, fetcher) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !/\.(firebaseio\.com|firebasedatabase\.app)$/.test(target.hostname)) throw new Error('Invalid Firebase endpoint');
  target.searchParams.set('auth', auth);
  const response = await fetcher(target, { cache:'no-store', signal:AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Upstream unavailable');
  return response.json();
}
export async function readVitals(env = process.env, fetcher = fetch) {
  const bp = async () => {
    if (!env.BP_FIREBASE_URL || !env.BP_FIREBASE_AUTH) return {values:{}, at:null, status:'BP source not configured'};
    try { return normalizeBP(await firebase(env.BP_FIREBASE_URL, env.BP_FIREBASE_AUTH, fetcher)); }
    catch { return {values:{}, at:null, status:'BP feed unavailable'}; }
  };
  const patient = async () => {
    if (!env.MEDIKET_FIREBASE_URL || !env.MEDIKET_FIREBASE_AUTH || !/^[A-Za-z0-9_-]+$/.test(env.MOBILE_PATIENT_ID || '')) return {values:{},at:null,status:'Patient device not configured'};
    try {
      const url = new URL(env.MEDIKET_FIREBASE_URL); url.pathname = `/users/${env.MOBILE_PATIENT_ID}/vitals/latest.json`; url.search = '';
      return normalizeVitals(await firebase(url.toString(), env.MEDIKET_FIREBASE_AUTH, fetcher));
    } catch { return {values:{},at:null,status:'Patient device feed unavailable'}; }
  };
  const [b,v] = await Promise.all([bp(),patient()]);
  // Patient vitals never override the independent BP reading.
  return {values:{...v.values,...b.values},measuredAt:{...v.measuredAt,bloodPressure:b.at},bpStatus:b.status,vitalsStatus:v.status,bpAt:b.at,vitalsAt:v.at};
}
