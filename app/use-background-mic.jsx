'use client';

import { useEffect, useRef, useState } from 'react';

// Mounted in the root layout: route changes must not recreate the recognizer.
export function useBackgroundMic({ locale, onCommand, onTranscript, onMessage, unavailable, unheard }) {
  const latest = useRef({});
  latest.current = { locale, onCommand, onTranscript, onMessage, unavailable, unheard };
  const [enabled, setEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const control = useRef(null);
  useEffect(() => {
    let recognizer = null, wanted = false, disposed = false, timer, networkFailures = 0;
    const owners = new Set();
    const schedule = () => { clearTimeout(timer); if (wanted && !disposed) timer = setTimeout(start, networkFailures ? networkFailures * 1500 : 500); };
    const stop = () => { clearTimeout(timer); recognizer?.abort(); setListening(false); };
    const start = () => {
      if (!wanted || disposed || recognizer || owners.size) return;
      if (!window.isSecureContext) { wanted = false; setEnabled(false); setError('Microphone access needs HTTPS or localhost. Open the secure website address and try again.'); return; }
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) { wanted = false; setEnabled(false); setError(latest.current.unavailable + ' Open the website in a browser with speech recognition support.'); return; }
      const current = new Recognition(); recognizer = current;
      current.lang = latest.current.locale; current.continuous = true; current.interimResults = true;
      current.onstart = () => setListening(true);
      current.onresult = (event) => {
        if (!wanted || owners.size) return;
        networkFailures = 0; setError('');
        latest.current.onTranscript?.(Array.from(event.results).slice(event.resultIndex).map(result => result[0].transcript).join(' '));
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) { latest.current.onCommand(event.results[i][0].transcript); break; }
        }
      };
      current.onerror = (event) => {
        if (event.error === 'network' && ++networkFailures <= 2) {
          setError('Speech recognition could not connect. Retrying…'); stop(); return;
        }
        const errors = {
          'not-allowed': 'Microphone access is blocked. Allow Microphone in this site’s browser permissions, then tap to speak again.',
          'service-not-allowed': 'This browser blocked its speech recognition service. Try opening the site in another supported browser.',
          'audio-capture': 'No microphone is available. Check your connected microphone and system input settings, then try again.',
          'language-not-supported': 'The speech service does not support the selected language. Select another language and try again.',
          network: 'The browser’s speech recognition service could not connect. Check your internet connection or try another browser.'
        };
        if (errors[event.error]) {
          wanted = false; setEnabled(false); stop(); setError(errors[event.error]);
        }
      };
      current.onend = () => { if (recognizer === current) recognizer = null; if (!disposed) { setListening(false); schedule(); } };
      try { current.start(); } catch { recognizer = null; wanted = false; setEnabled(false); setError(latest.current.unheard); }
    };
    const focus = (event) => {
      if (event.detail.active) owners.add(event.detail.owner); else owners.delete(event.detail.owner);
      if (owners.size) stop(); else schedule();
    };
    control.current = {
      toggle() { wanted = !wanted; setEnabled(wanted); setError(''); networkFailures = 0; if (wanted) start(); else stop(); },
      disable() { wanted = false; setEnabled(false); stop(); },
      languageChanged() { if (recognizer && recognizer.lang !== latest.current.locale) stop(); }
    };
    window.addEventListener('medikit-voice-focus', focus);
    return () => { disposed = true; wanted = false; clearTimeout(timer); if (recognizer) { recognizer.onend = recognizer.onstart = recognizer.onresult = recognizer.onerror = null; recognizer.abort(); } window.removeEventListener('medikit-voice-focus', focus); };
  }, []);
  useEffect(() => { control.current?.languageChanged(); }, [locale]);
  return { enabled, listening, error, toggle: () => control.current?.toggle(), disable: () => control.current?.disable() };
}

export function voiceFocus(owner, active) {
  window.dispatchEvent(new CustomEvent('medikit-voice-focus', { detail: { owner, active } }));
}
