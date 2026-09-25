import {readFileSync, existsSync} from 'node:fs';
import {readVitals} from './vitals.mjs';
for (const file of ['../../.env.local','../.env.local']) {
  const path = new URL(file, import.meta.url);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path,'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}
const result = await readVitals();
// Only report connectivity and field names; never print credentials or health values.
console.log(JSON.stringify({fields:Object.keys(result.values),bpStatus:result.bpStatus,vitalsStatus:result.vitalsStatus,bpTimestampPresent:!!result.bpAt,vitalsTimestampPresent:!!result.vitalsAt}, null, 2));
