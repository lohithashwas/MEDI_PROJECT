// Private local build preparation. Never print credential values.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const env = {};
for (const line of readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const pair = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (pair) env[pair[1]] = pair[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}
const keys = ['BP_FIREBASE_URL', 'BP_FIREBASE_AUTH', 'BP_CONTROL_FIREBASE_URL', 'BP_CONTROL_FIREBASE_AUTH',
  'TEMPERATURE_FIREBASE_URL', 'TEMPERATURE_FIREBASE_AUTH', 'MEDIKET_FIREBASE_URL', 'MEDIKET_FIREBASE_AUTH', 'MEDIKET_VITALS_PATH'];
const config = {};
for (const key of keys) {
  if (!env[key]) throw new Error(`Missing ${key}`);
  config[key] = env[key];
}
const targets = [
  ['Blood pressure', 'BP_FIREBASE_URL', 'BP_FIREBASE_AUTH', '/latest.json'],
  ['BP control', 'BP_CONTROL_FIREBASE_URL', 'BP_CONTROL_FIREBASE_AUTH', '/control/state.json'],
  ['Temperature', 'TEMPERATURE_FIREBASE_URL', 'TEMPERATURE_FIREBASE_AUTH', '/temperature.json'],
  ['Temperature control', 'TEMPERATURE_FIREBASE_URL', 'TEMPERATURE_FIREBASE_AUTH', '/control/state.json'],
  ['Patient vitals', 'MEDIKET_FIREBASE_URL', 'MEDIKET_FIREBASE_AUTH', `/${config.MEDIKET_VITALS_PATH.replace(/^\/+|\.json$/g, '')}.json`],
];
const checks = await Promise.all(targets.map(async ([name, endpoint, auth, path]) => {
  const url = new URL(path, config[endpoint]);
  if (url.protocol !== 'https:' || !/\.(firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname)) throw new Error(`Invalid endpoint for ${name}`);
  url.searchParams.set('auth', config[auth]);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const body = await response.json();
    const shape = name === 'Blood pressure' ? body && typeof body === 'object' && 'sys' in body && 'dia' in body :
      name === 'Temperature' ? typeof body === 'number' : name.endsWith('control') ? ['ON', 'OFF'].includes(body) : body && typeof body === 'object';
    return { name, httpStatus: response.status, validShape: Boolean(response.ok && shape),
      fields: response.ok && body && typeof body === 'object' ? Object.keys(body) : undefined };
  } catch { return { name, httpStatus: null, validShape: false }; }
}));
const folder = new URL('../.private/', import.meta.url);
mkdirSync(folder, { recursive: true });
writeFileSync(new URL('firebase-defines.json', folder), JSON.stringify(config));
writeFileSync(new URL('firebase-checks.json', folder), JSON.stringify(checks, null, 2));
console.log(JSON.stringify(checks, null, 2));
console.log('Private build configuration written. No credentials were printed. Read-only checks; no device was triggered.');
