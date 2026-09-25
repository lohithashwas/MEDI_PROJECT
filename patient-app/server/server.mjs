import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { readVitals } from './vitals.mjs';

// Reuse server credentials already configured for the website, without copying
// them into source, browser assets, Gradle arguments or the Android application.
for (const file of ['../../.env.local', '../.env.local']) {
  const path = fileURLToPath(new URL(file, import.meta.url));
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const pair = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (pair && !process.env[pair[1]]) process.env[pair[1]] = pair[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}
if (!process.env.MOBILE_PAIRING_TOKEN || process.env.MOBILE_PAIRING_TOKEN.length < 24) throw new Error('Set MOBILE_PAIRING_TOKEN to a random value of at least 24 characters in patient-app/.env.local.');
const token = Buffer.from(`Bearer ${process.env.MOBILE_PAIRING_TOKEN}`);
const server = http.createServer(async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.url === '/health' && req.method === 'GET') { res.end(JSON.stringify({status:'ok'})); return; }
  if (req.url !== '/api/mobile/vitals' || req.method !== 'GET') { res.writeHead(404);res.end('{"error":"Not found"}');return; }
  const supplied = Buffer.from(req.headers.authorization || '');
  if (supplied.length !== token.length || !timingSafeEqual(supplied, token)) { res.writeHead(401);res.end('{"error":"Pairing required"}');return; }
  try { res.end(JSON.stringify(await readVitals())); }
  catch { res.writeHead(502);res.end('{"error":"Device feeds unavailable"}'); }
});
server.listen(Number(process.env.MOBILE_PORT || 3020), process.env.MOBILE_HOST || '127.0.0.1', () => console.log('MediKet device adapter listening. Put an HTTPS reverse proxy in front for Android access.'));
