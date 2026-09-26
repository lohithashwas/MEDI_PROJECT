'use client';

export function DevicePatientDetails({ vitals }) {
  const fields = [['Patient name', vitals?.name], ['Patient ID', vitals?.patientId], ['Card UID', vitals?.cardUid], ['Reader ID', vitals?.readerId], ['Latitude', vitals?.latitude], ['Longitude', vitals?.longitude]];
  return <dl className="device-patient-details" aria-label="Device patient details">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>;
}
