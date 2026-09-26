'use client';

import { useEffect, useState } from 'react';
import { calculateBmi } from './health-metrics.mjs';
import { demoEcg, simulatedReadings, validReading } from './device-simulation.mjs';

export function HealthInsights({ vitals, simulateMissing = false }) {
  const [enabled, setEnabled] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const pulseReady = validReading(vitals?.heartRate, 1, 350);
  const active = simulateMissing && enabled && pulseReady;
  useEffect(() => {
    setSeconds(0);
    if (!active) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = reduced ? 1000 : 100;
    const timer = setInterval(() => { if (!document.hidden) setSeconds(value => value + step / 1000); }, step);
    return () => clearInterval(timer);
  }, [active, vitals?.patientId]);
  const demo = active ? simulatedReadings(vitals.heartRate, seconds) : null;
  const stressMeasured = validReading(vitals?.stressLevel, 0, 100);
  const glucoseMeasured = validReading(vitals?.glucose, 10, 1500);
  const measuredAt = vitals?.updatedAt ? new Date(vitals.updatedAt) : null;
  const timeLabel = measuredAt && Number.isFinite(measuredAt.getTime()) ? measuredAt.toLocaleString() : 'Time not supplied';
  return <section className="health-insights" aria-label="Additional health measurements">
    <div className="health-insights-heading"><span className="eyebrow">YOUR HEALTH DETAILS</span><h2>A fuller view of your health</h2><p>Device measurements and your body measurements, together.</p></div>
    {simulateMissing && <div className="simulation-banner"><div><strong>Pulse-linked demonstration</strong><p>Heart rate sets the ECG animation pace. Glucose and stress demo numbers are synthetic, not estimates of your health.</p><small>{active ? `Using latest heart rate: ${vitals.heartRate} bpm · Recorded: ${timeLabel}` : enabled ? 'Waiting for a usable heart-rate input.' : 'Simulation paused.'} Older readings can drive a replay; this does not make them fresh measurements.</small></div><label className="simulation-toggle"><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Simulate missing sensors</label></div>}
    <div className="health-insights-grid">
      <MetricCard title="Stress level" measured={stressMeasured} value={stressMeasured ? vitals.stressLevel : demo?.stress} unit="/100" simulated={!stressMeasured && Boolean(demo)} tone="violet" seconds={seconds} note={stressMeasured ? 'Device-reported score; not a clinical assessment.' : demo ? 'Synthetic demo index. Not a measured or predicted stress level.' : 'Waiting for a stress reading from your device.'} />
      <MetricCard title="Blood glucose" measured={glucoseMeasured} value={glucoseMeasured ? vitals.glucose : demo?.glucose} unit="mg/dL" simulated={!glucoseMeasured && Boolean(demo)} tone="blue" seconds={seconds} note={glucoseMeasured ? 'Latest device-reported glucose reading.' : demo ? 'Synthetic demo glucose. A glucose sensor is required for a real measurement.' : 'Connect a glucose sensor to see a measured reading.'} />
      <EcgCard samples={vitals?.ecg} heartRate={vitals?.heartRate} active={active} seconds={seconds} simulationMode={simulateMissing} />
      <BmiCard key={vitals?.patientId || 'pending'} />
    </div>
    {simulateMissing && <p className="insight-note simulation-boundary">Simulation stays in this browser. It is not sent to Firebase, the ML models, or the blockchain.</p>}
  </section>;
}

function MetricCard({ title, measured, value, unit, simulated, tone, seconds, note }) {
  const points = Array.from({length:48}, (_,i) => `${i * 240 / 47},${22 + 7 * Math.sin(i / 5 + Math.floor(seconds / 5) / 4)}`).join(' ');
  return <article className={`insight-card signal-metric ${tone}`}>
    <div className="insight-title"><span className="eyebrow">{measured ? 'DEVICE MEASUREMENT' : simulated ? 'DEMONSTRATION' : 'AWAITING SENSOR'}</span><span className={`measurement-badge ${simulated ? 'simulation-badge' : ''}`}>{measured ? 'Device reading' : simulated ? 'SIMULATED' : 'No reading'}</span></div>
    <h3>{title}</h3><div className="insight-value">{value ?? '—'}{value != null && <small>{unit}</small>}</div>
    {simulated && <svg className="demo-sparkline" viewBox="0 0 240 44" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
    <p>{note}</p>{simulated && <small className="insight-note">Demo animation · Updates every 5 seconds</small>}
  </article>;
}

const sampleBeat = [0, 0, 0, .02, .07, .12, .07, .02, 0, 0, -.08, -.18, .35, 1, .25, -.3, -.12, 0, 0, .03, .09, .18, .24, .2, .12, .04, 0, 0, 0, 0, 0];
const sampleEcg = Array.from({length:5}, () => sampleBeat).flat();
function EcgCard({ samples, heartRate, active, seconds, simulationMode }) {
  const ready = Array.isArray(samples) && samples.length >= 2 && samples.every(value => typeof value === 'number' && Number.isFinite(value));
  const displayed = ready ? samples : active ? demoEcg(heartRate, seconds) : simulationMode ? [] : sampleEcg;
  const min = displayed.length ? Math.min(...displayed) : 0, max = displayed.length ? Math.max(...displayed) : 0, range = max - min;
  const points = displayed.map((value,index) => `${index * 600 / (displayed.length - 1)},${range ? 110 - (value-min) / range * 90 : 65}`).join(' ');
  return <article className="insight-card ecg-card"><div className="insight-title"><div><span className="eyebrow">{ready ? 'ELECTRICAL HEART ACTIVITY' : 'WAVEFORM DEMONSTRATION'}</span><h3>ECG waveform</h3></div><span className={`measurement-badge ${!ready && active ? 'simulation-badge' : ''}`}>{ready ? 'Device samples' : active ? 'SIMULATED' : simulationMode ? 'Paused' : 'Sample ECG'}</span></div>
    <div className="ecg-display">{displayed.length ? <svg viewBox="0 0 600 130" role="img" aria-label={ready ? 'Device ECG samples, automatically scaled' : active ? 'Simulated ECG paced by the latest heart rate, not a patient recording' : 'Sample ECG waveform, not a patient recording'}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" /></svg> : <p>Waiting for heart rate or device ECG samples.</p>}</div>
    {active && !ready && <div className="ecg-pulse-meta"><span>Pulse input <b>{heartRate} bpm</b></span><span>Window <b>6 seconds</b></span><span>Source <b>Synthetic waveform</b></span></div>}
    <p>{ready ? `${samples.length} samples · Auto-scaled amplitude · No rhythm interpretation` : active ? 'Animation timing follows the latest heart-rate input. Wave shape is illustrative; this is not an ECG recording or rhythm analysis.' : 'Illustrative waveform · Not a patient recording'}</p>
  </article>;
}

function BmiCard() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const bmi = calculateBmi(height, weight);
  const invalid = height !== '' && weight !== '' && bmi === null;
  return <article className="insight-card bmi-card"><span className="eyebrow">BODY MEASUREMENTS</span><h3>Calculate your BMI</h3><p>Enter your height and weight to calculate your body mass index.</p>
    <div className="bmi-inputs"><label>Height <span>cm</span><input type="number" min="30" max="300" step="0.1" inputMode="decimal" placeholder="e.g. 170" value={height} onChange={event => setHeight(event.target.value)} /></label><label>Weight <span>kg</span><input type="number" min="1" max="700" step="0.1" inputMode="decimal" placeholder="e.g. 65" value={weight} onChange={event => setWeight(event.target.value)} /></label></div>
    <div className="bmi-result" aria-live="polite"><span>Your BMI</span><strong>{bmi === null ? '—' : bmi.toFixed(1)}<small>{bmi !== null ? ' kg/m²' : ''}</small></strong><p>{invalid ? 'Enter a height of 30–300 cm and weight of 1–700 kg.' : bmi === null ? 'Add both measurements to see your result.' : 'Calculated from the height and weight you entered.'}</p></div><small className="insight-note">BMI is a screening measure, not a diagnosis. These inputs are not saved.</small>
  </article>;
}
