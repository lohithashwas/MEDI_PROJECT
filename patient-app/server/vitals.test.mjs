import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBP,normalizeVitals,readVitals} from './vitals.mjs';
test('Per-sensor timestamps remain independent of the overall update',()=>{
  const feed=normalizeVitals({heartRate:70,spo2:98,updatedAt:1800000000000,measuredAt:{heartRate:1700000000000}});
  assert.equal(feed.measuredAt.heartRate,new Date(1700000000000).toISOString());
  assert.equal(feed.measuredAt.spo2,new Date(1800000000000).toISOString());
});
test('BP only imports the separate blood pressure measurement',()=>{
  assert.deepEqual(normalizeBP({sys:118,dia:76,bpm:88}).values,{bloodPressure:'118/76'});
  assert.deepEqual(normalizeBP({sys:null,dia:76}).values,{});
});
test('Patient values never invent missing readings or overwrite BP',()=>{
  assert.deepEqual(normalizeVitals({heartRate:72,spo2:null,steps:0,bloodPressure:'190/100',temperature:false}).values,{heartRate:72,steps:0});
  assert.deepEqual(normalizeVitals(null).values,{});
  assert.deepEqual(normalizeVitals({stressLevel:0}).values,{stressLevel:0});
});
test('Two independent Firebase reads combine without sharing measurements',async()=>{
  const env={BP_FIREBASE_URL:'https://bp.firebaseio.com/latest.json',BP_FIREBASE_AUTH:'bp-key',MEDIKET_FIREBASE_URL:'https://vitals.firebaseio.com',MEDIKET_FIREBASE_AUTH:'vitals-key',MOBILE_PATIENT_ID:'patient_001'};
  const result=await readVitals(env,async url=>{
    if(url.hostname==='bp.firebaseio.com'){assert.equal(url.searchParams.get('auth'),'bp-key');return Response.json({sys:120,dia:80,bpm:99});}
    assert.equal(url.pathname,'/users/patient_001/vitals/latest.json');assert.equal(url.searchParams.get('auth'),'vitals-key');return Response.json({heartRate:71,spo2:97,updatedAt:1750000000000});
  });
  assert.deepEqual(result.values,{heartRate:71,spo2:97,bloodPressure:'120/80'});
  assert.ok(result.vitalsAt.endsWith('Z'));
  const failed=await readVitals(env,async()=>{throw new Error('offline');});assert.deepEqual(failed.values,{});
  assert.equal(failed.bpStatus,'BP feed unavailable');
});
test('No patient ID never reads an arbitrary patient',async()=>{
  let called=false;const result=await readVitals({MEDIKET_FIREBASE_URL:'https://vitals.firebaseio.com',MEDIKET_FIREBASE_AUTH:'secret'},async()=>{called=true;});
  assert.equal(called,false);assert.equal(result.vitalsStatus,'Patient device not configured');
});
