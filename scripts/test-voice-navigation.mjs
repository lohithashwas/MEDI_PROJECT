import assert from 'node:assert/strict';
import { navigationIntent } from '../app/voice-navigation.mjs';

for (const phrase of ['appointment', 'appointments', 'open appointments', 'appoints', 'appoint', 'appoinments', 'apointments', 'appointment page', 'doctor visit', 'consultation']) {
  assert.equal(navigationIntent(phrase), 'appointments', phrase);
}
for (const phrase of ['health checks', 'open health checks', 'helath checks', 'health chek', 'checkup', 'check up', 'checks', 'screening', 'screenng', 'tests', 'medical checks', 'please show my health checks']) {
  assert.equal(navigationIntent(phrase), 'checks', phrase);
}
for (const phrase of ['hello', 'messages', 'read this section', 'stop listening', 'chess', 'my name is Maya']) {
  assert.equal(navigationIntent(phrase), null, phrase);
}
console.log('PASS: singular/plural navigation, short phrases, common typos, unrelated speech');
