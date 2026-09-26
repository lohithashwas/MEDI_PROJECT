import test from 'node:test';
import assert from 'node:assert/strict';
import { demoEcg, simulatedReadings, validReading } from '../app/device-simulation.mjs';

test('Simulation stops without a usable pulse',()=>{
  for(const hr of [null,undefined,0,-1,NaN,Infinity,'72',true,351]) {
    assert.equal(simulatedReadings(hr,10),null);
    assert.deepEqual(demoEcg(hr,10),[]);
  }
});
test('Demo glucose and stress are synthetic and never inferred from pulse',()=>{
  assert.deepEqual(simulatedReadings(60,10),simulatedReadings(130,10));
  assert.notDeepEqual(simulatedReadings(72,0),simulatedReadings(72,15));
  assert.equal(validReading(0,0,100),true);
});
test('Waveform pace follows pulse and changes over time',()=>{
  const slow=demoEcg(60,0),fast=demoEcg(120,0);
  assert.equal(slow.length,720);assert.ok(slow.every(Number.isFinite));
  const peaks=s=>s.filter((v,i)=>i>0&&i<s.length-1&&v>.7&&v>s[i-1]&&v>s[i+1]).length;
  assert.ok(peaks(fast)>peaks(slow));
  assert.notDeepEqual(slow,demoEcg(60,.1));
});
