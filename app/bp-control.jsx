'use client';
import { useEffect, useState } from 'react';
import { bpControlCopy, sendBPCommand } from './bp-control.mjs';

export function BPControl({ language, onComplete }) {
  const text = bpControlCopy[language] || bpControlCopy.en;
  const [control, setControl] = useState({ state: null, busy: false });
  useEffect(() => {
    const update = event => { setControl(event.detail); if (!event.detail.busy && !event.detail.error) onComplete(); };
    window.addEventListener('medikit-bp-control', update);
    return () => window.removeEventListener('medikit-bp-control', update);
  }, [onComplete]);
  const send = action => { sendBPCommand(action).catch(() => {}); };
  return <div className="bp-device-controls" data-speech-ignore="true">
    <div><button type="button" className="bp-on-button" disabled={control.busy} onClick={() => send('ON')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v9M6.3 5.8a9 9 0 1 0 11.4 0" /></svg>{text.on}</button><button type="button" className="outline-button" onClick={() => send('OFF')}>{text.off}</button></div>
    <small>{text.hint}</small>
    <small role="status">{control.busy ? text.busy : control.error ? text.error : control.state === 'OFF' ? control.triggered ? text.done : text.stopped : ''}</small>
  </div>;
}
