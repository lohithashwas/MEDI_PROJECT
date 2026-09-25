'use client';

import { browserUtterance, speechUnavailable } from './browser-speech.mjs';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './components';
import { useI18n } from './i18n';
import { voiceFocus } from './use-background-mic';

const copy = {
  en: { eyebrow: 'YOUR HEALTH SPACE STARTS HERE', title: 'Tap your ABHA card', description: 'Hold your card near the RFID reader to get started.', speech: 'Welcome to MediKit. Please tap your ABHA card on the card reader to open your health space.', listen: 'Hear instructions', stop: 'Stop instructions', pending: 'Card reader connection pending', detail: 'Card sign-in will be available once the reader is connected. You can sign in below for now.', signin: 'Sign in instead', step1: 'Tap your card', step2: 'Find your profile', step3: 'Open your health space', unavailable: 'Audio guidance is unavailable in this browser. Follow the instructions above.' },
  ta: { eyebrow: 'உங்கள் சுகாதாரப் பயணம் இங்கே தொடங்குகிறது', title: 'உங்கள் ABHA அட்டையைத் தட்டவும்', description: 'தொடங்க உங்கள் அட்டையை RFID வாசிப்பான் அருகில் வைக்கவும்.', speech: 'MediKit உங்களை வரவேற்கிறது. உங்கள் சுகாதாரப் பக்கத்தைத் திறக்க ABHA அட்டையை வாசிப்பானில் தட்டவும்.', listen: 'வழிமுறைகளைக் கேளுங்கள்', stop: 'குரலை நிறுத்து', pending: 'அட்டை வாசிப்பான் இணைப்பு நிலுவையில் உள்ளது', detail: 'வாசிப்பான் இணைக்கப்பட்டதும் அட்டை உள்நுழைவு கிடைக்கும். இப்போது கீழே உள்நுழையலாம்.', signin: 'உள்நுழைக', step1: 'அட்டையைத் தட்டவும்', step2: 'சுயவிவரத்தைக் கண்டறிக', step3: 'சுகாதாரப் பக்கத்தைத் திறக்கவும்', unavailable: 'இந்த உலாவியில் குரல் வழிகாட்டுதல் இல்லை. மேலே உள்ள வழிமுறைகளைப் பின்பற்றவும்.' },
  hi: { eyebrow: 'आपका स्वास्थ्य स्थान यहाँ शुरू होता है', title: 'अपना ABHA कार्ड टैप करें', description: 'शुरू करने के लिए अपना कार्ड RFID रीडर के पास रखें।', speech: 'MediKit में आपका स्वागत है। अपना स्वास्थ्य स्थान खोलने के लिए ABHA कार्ड को कार्ड रीडर पर टैप करें।', listen: 'निर्देश सुनें', stop: 'निर्देश रोकें', pending: 'कार्ड रीडर कनेक्शन लंबित है', detail: 'रीडर कनेक्ट होने पर कार्ड से साइन इन उपलब्ध होगा। अभी नीचे साइन इन कर सकते हैं।', signin: 'साइन इन करें', step1: 'कार्ड टैप करें', step2: 'प्रोफ़ाइल खोजें', step3: 'स्वास्थ्य स्थान खोलें', unavailable: 'इस ब्राउज़र में ऑडियो निर्देश उपलब्ध नहीं हैं। ऊपर दिए गए निर्देशों का पालन करें।' },
  te: { eyebrow: 'మీ ఆరోగ్య స్థలం ఇక్కడ మొదలవుతుంది', title: 'మీ ABHA కార్డును ట్యాప్ చేయండి', description: 'ప్రారంభించడానికి మీ కార్డును RFID రీడర్ దగ్గర ఉంచండి.', speech: 'MediKit కు స్వాగతం. మీ ఆరోగ్య స్థలాన్ని తెరవడానికి ABHA కార్డును కార్డు రీడర్‌పై ట్యాప్ చేయండి.', listen: 'సూచనలు వినండి', stop: 'సూచనలు ఆపండి', pending: 'కార్డు రీడర్ కనెక్షన్ పెండింగ్‌లో ఉంది', detail: 'రీడర్ కనెక్ట్ అయిన తర్వాత కార్డుతో సైన్ ఇన్ చేయవచ్చు. ప్రస్తుతం క్రింద సైన్ ఇన్ చేయండి.', signin: 'సైన్ ఇన్ చేయండి', step1: 'కార్డును ట్యాప్ చేయండి', step2: 'ప్రొఫైల్ కనుగొనండి', step3: 'ఆరోగ్య స్థలం తెరవండి', unavailable: 'ఈ బ్రౌజర్‌లో ఆడియో సూచనలు అందుబాటులో లేవు. పై సూచనలను అనుసరించండి.' }
};

export default function CardTapWelcome() {
  const { language } = useI18n();
  const text = copy[language] || copy.en;
  const [speaking, setSpeaking] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const timer = useRef(null);
  const version = useRef(0);
  const audio = useRef(null);
  const request = useRef(null);
  const stop = useCallback(() => {
    version.current++; clearTimeout(timer.current);
    request.current?.abort(); request.current = null;
    if (audio.current) { audio.current.pause(); URL.revokeObjectURL(audio.current.src); audio.current = null; }
    window.speechSynthesis?.cancel(); setSpeaking(false); voiceFocus('card-welcome', false);
  }, []);
  useEffect(() => { window.addEventListener('medikit-stop-guidance', stop); return () => window.removeEventListener('medikit-stop-guidance', stop); }, [stop]);
  const speak = useCallback(async () => {
    stop();
    setAudioUnavailable(false);
    const current = version.current;
    setSpeaking(true); voiceFocus('card-welcome', true);
    request.current = new AbortController();
    timer.current = setTimeout(() => request.current?.abort(), 16000);
    try {
      const response = await fetch('/api/voice', { method: 'POST', signal: request.current.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.speech, language }) });
      if (!response.ok) throw new Error('Voice unavailable');
      const blob = await response.blob();
      if (current !== version.current) return;
      clearTimeout(timer.current);
      const player = new Audio(URL.createObjectURL(blob)); audio.current = player;
      player.onended = () => { if (current === version.current) stop(); };
      player.onerror = () => { if (current === version.current) { setAudioUnavailable(true); stop(); } };
      await player.play();
      return;
    } catch {
      if (current !== version.current) return;
      clearTimeout(timer.current);
      if (audio.current) { audio.current.pause(); URL.revokeObjectURL(audio.current.src); audio.current = null; }
    }
    let utterance;
    try { utterance = await browserUtterance(text.speech, language); } catch { if (current === version.current) { setAudioUnavailable(true); stop(); } return; }
    if (current !== version.current) return;
    utterance.onstart = () => { if (current === version.current) setSpeaking(true); };
    utterance.onend = () => { if (current === version.current) stop(); };
    utterance.onerror = () => { if (current === version.current) { setAudioUnavailable(true); stop(); } };
    voiceFocus('card-welcome', true);
    timer.current = setTimeout(stop, 15000);
    window.speechSynthesis.speak(utterance);
  }, [language, text, stop]);
  useEffect(() => {
    // Browsers may require a gesture; the visible replay button works in that case.
    const start = setTimeout(speak, 800);
    return () => { clearTimeout(start); stop(); };
  }, [speak, stop]);

  return <section className="card-tap-welcome" aria-labelledby="card-tap-title">
    <div className="card-tap-copy"><span className="eyebrow">{text.eyebrow}</span><h1 id="card-tap-title">{text.title}</h1><p className="card-tap-description">{text.description}</p>
      <button className="outline-button" onClick={speaking ? stop : speak}><Icon name="pulse" size={18} />{speaking ? text.stop : text.listen}</button>
      {audioUnavailable && <p role="status">{speechUnavailable(language)}</p>}
      <ol className="card-tap-steps">{[text.step1, text.step2, text.step3].map((step, i) => <li key={step}><span>{i + 1}</span>{step}</li>)}</ol>
      <div className="card-reader-status" role="status"><b>{text.pending}</b><p>{text.detail}</p></div>
      <Link className="text-link" href="/signin">{text.signin} <Icon name="arrow" size={17} /></Link>
    </div>
    <div className="card-tap-art" aria-hidden="true"><div className="card-tap-halo" /><div className="abha-tap-card"><div><span className="brand-mark"><Icon name="cross" size={22} /></span><b>ABHA</b><Icon name="shield" size={22} /></div><span className="card-chip" /><span className="card-placeholder wide" /><span className="card-placeholder" /><small>HEALTH CARD</small></div><div className="tap-signal"><i /><i /><i /></div><div className="rfid-reader"><div className="reader-pad"><Icon name="pulse" size={36} /><span>TAP HERE</span></div><span className="reader-light" /><small>RFID CARD READER</small></div></div>
  </section>;
}
