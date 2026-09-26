'use client';
import { useRef, useState } from 'react';

const copy = {
  en: { on: 'Temperature on', off: 'Temperature off', busy: 'Sending command…', onSent: 'ON command sent. Press OFF to stop.', offSent: 'OFF command sent.', error: 'Command failed. State unknown; try OFF.' },
  ta: { on: 'வெப்பநிலை இயக்கு', off: 'வெப்பநிலை அணை', busy: 'கட்டளை அனுப்பப்படுகிறது…', onSent: 'இயக்கும் கட்டளை அனுப்பப்பட்டது. நிறுத்த அணை பொத்தானை அழுத்தவும்.', offSent: 'அணைக்கும் கட்டளை அனுப்பப்பட்டது.', error: 'கட்டளை தோல்வி. நிலை தெரியவில்லை; அணை என்பதை முயற்சிக்கவும்.' },
  hi: { on: 'तापमान चालू', off: 'तापमान बंद', busy: 'कमांड भेज रहे हैं…', onSent: 'चालू करने की कमांड भेजी। रोकने के लिए बंद दबाएँ।', offSent: 'बंद करने की कमांड भेजी।', error: 'कमांड विफल। स्थिति अज्ञात; बंद करने का प्रयास करें।' },
  te: { on: 'ఉష్ణోగ్రత ఆన్', off: 'ఉష్ణోగ్రత ఆఫ్', busy: 'ఆదేశం పంపుతోంది…', onSent: 'ఆన్ ఆదేశం పంపింది. ఆపడానికి ఆఫ్ నొక్కండి.', offSent: 'ఆఫ్ ఆదేశం పంపింది.', error: 'ఆదేశం విఫలమైంది. స్థితి తెలియదు; ఆఫ్ ప్రయత్నించండి.' }
};
export function TemperatureControl({ language, onComplete }) {
  const text = copy[language] || copy.en;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const pending = useRef(false);
  const send = async action => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setResult(null);
    try {
      const response = await fetch('/api/temperature-control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.state !== action) throw new Error();
      setResult(action); onComplete();
    } catch { setResult('error'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <div className="bp-device-controls temperature-device-controls" data-speech-ignore="true">
    <div><button type="button" className="bp-on-button" disabled={busy} onClick={() => send('ON')}>{text.on}</button><button type="button" className="outline-button" disabled={busy} onClick={() => send('OFF')}>{text.off}</button></div>
    <small role="status">{busy ? text.busy : result === 'ON' ? text.onSent : result === 'OFF' ? text.offSent : result === 'error' ? text.error : ''}</small>
  </div>;
}
