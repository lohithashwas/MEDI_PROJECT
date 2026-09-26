import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { Ledger } from './ledger.mjs';

const envFile = new URL('../.env.local', import.meta.url);
if (existsSync(envFile)) for (const line of readFileSync(envFile,'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/,'$2');
}
const env = process.env;
const ledger = new Ledger({rpc:env.GANACHE_RPC_URL || 'http://127.0.0.1:7447', directory:env.GANACHE_LEDGER_DIR || '.blockchain/ledger-7447'});
await ledger.init();
let chainStatus = 'connecting', chainError = null, updatedAt = null;
const sources = {};
const definitions = [
  ['vitals','MEDIKET_FIREBASE_URL','MEDIKET_FIREBASE_AUTH', env.MEDIKET_VITALS_PATH],
  ['blood-pressure','BP_FIREBASE_URL','BP_FIREBASE_AUTH','latest'],
  ['bp-control','BP_CONTROL_FIREBASE_URL','BP_CONTROL_FIREBASE_AUTH','control/state'],
  ['temperature','TEMPERATURE_FIREBASE_URL','TEMPERATURE_FIREBASE_AUTH','temperature'],
  ['temperature-control','TEMPERATURE_FIREBASE_URL','TEMPERATURE_FIREBASE_AUTH','control/state'],
];
async function capture([name, endpoint, credential, path]) {
  if (!env[endpoint] || !env[credential] || !path) return {name,error:'Not configured'};
  try {
    const url = new URL('/'+path.replace(/^\/+|\.json$/g,'')+'.json', env[endpoint]);
    if (url.protocol !== 'https:' || !/\.(firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname)) throw new Error();
    url.searchParams.set('auth',env[credential]);
    const response = await fetch(url,{signal:AbortSignal.timeout(7000),cache:'no-store'});
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (data === null || (data && typeof data === 'object' && data.error)) return {name,error:'No source reading'};
    return {name,data};
  } catch { return {name,error:'Feed unavailable'}; }
}
async function tick() {
  try { await ledger.connect(); chainStatus='connected'; chainError=null; }
  catch (error) { chainStatus='unavailable'; chainError=error.message.startsWith('Chain') ? error.message : 'Ganache CLI is unavailable or does not match the configured chain.'; }
  const readings = await Promise.all(definitions.map(capture));
  for (const reading of readings) {
    sources[reading.name]={status:reading.error?'unavailable':'connected',message:reading.error || null,checkedAt:new Date().toISOString()};
    if (!reading.error) {
      try { await ledger.enqueue(reading.name,reading.data); }
      catch { sources[reading.name]={status:'error',message:'Could not queue source snapshot'}; }
    }
  }
  try { await ledger.flush(); chainStatus='connected'; chainError=null; }
  catch (error) { chainStatus='unavailable'; chainError=error.message.startsWith('Chain') ? error.message : 'Records are queued until Ganache confirms them.'; }
  updatedAt=new Date().toISOString();
}
http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json'); res.setHeader('Cache-Control','no-store');
  if (req.method !== 'GET' || req.url !== '/status') {res.writeHead(404);res.end('{"error":"Not found"}');return;}
  res.end(JSON.stringify({status:chainStatus,error:chainError,updatedAt,sources,...ledger.status()}));
}).listen(3021,'127.0.0.1',()=>console.log('MEDIKET blockchain collector: http://127.0.0.1:3021/status'));
async function loop() {
  try {await tick();} catch { chainStatus='unavailable'; chainError='Collector cycle failed; existing records retained.'; }
  setTimeout(loop,5000);
}
await loop();
