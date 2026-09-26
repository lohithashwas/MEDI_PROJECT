'use client';

const fields = {
  heart_rate_bpm: ['Heart rate', 'bpm'], spo2_percent: ['Blood oxygen', '%'],
  systolic_bp_mmhg: ['Systolic BP', 'mmHg'], diastolic_bp_mmhg: ['Diastolic BP', 'mmHg'],
  temperature_c: ['Temperature', '°C'], glucose_mg_dl: ['Glucose', 'mg/dL'],
  bmi: ['BMI', 'kg/m²'], stress_level: ['Stress', 'device score']
};

export function MLLiveResult({ reading }) {
  const { data, status, refresh } = reading;
  const ready = status === 'ready' && data;
  const title = status === 'loading' ? 'Getting ML result…' : !ready ? 'ML service unavailable' :
    data.assessment === 'NOT_ASSESSED' ? 'Not assessed' : 'Research result received';
  return <section className="ml-live-result insight-card" aria-label="Live ML result">
    <div className="insight-title"><div><span className="eyebrow">LIVE DEVICE · ML OUTPUT</span><h2>ML result</h2></div>
      <button type="button" className="outline-button" onClick={refresh}>Refresh ML result</button></div>
    <div className="ml-result-summary" role="status"><strong>{title}</strong><p>{ready ? data.reason :
      status === 'loading' ? 'Reading the connected device feeds through the ML service.' :
        'The ML server is not reachable. No previous result is shown. Start the ML server and refresh.'}</p></div>
    {ready && <>
      <div className="ml-model-results">{data.models.map(model => <article key={model.field}>
        <h3>{model.label}</h3><b>{model.status === 'ABSTAIN' ? 'Cannot assess these readings' : 'Research output'}</b>
        <p>{model.note}</p>
      </article>)}</div>
      <details><summary>Device inputs received by ML</summary><dl className="ml-inputs">{Object.entries(fields).map(([field, [label, unit]]) =>
        <div key={field}><dt>{label}</dt><dd>{Number.isFinite(data.measurements[field]) ? `${data.measurements[field]} ${unit}` : 'Unavailable'}</dd></div>)}</dl>
        <p className="insight-note">BP recorded: {data.sources?.['blood-pressure']?.recorded_at || 'Not supplied'}. Temperature measurement time is not supplied.</p>
      </details>
      <p className="insight-note">ML fetched: {new Date(data.fetchedAt).toLocaleString()} · Device feeds: {data.sourceStatus || 'unavailable'}. Refreshes every 10 seconds. Fetch time is not measurement time.</p>
    </>}
    <p className="insight-note">Research models only. Live device readings do not meet the ICU or survey model requirements; this is not a diagnosis or an overall health score.</p>
  </section>;
}
