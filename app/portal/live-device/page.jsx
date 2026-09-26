'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../../components';
import { PortalShell, RequireRole } from '../../portal-shell';
import { useI18n } from '../../i18n';
import { useDeviceReading } from '../../use-device-reading';
import { BPControl } from '../../bp-control.jsx';
import { HealthInsights } from '../../health-insights';
import { DevicePatientDetails } from '../../device-patient-details';
import { BlockchainRecords } from '../../blockchain-records';
import { MLLiveResult } from '../../ml-live-result';
import { TemperatureControl } from '../../temperature-control.jsx';

const copy = {
  en: { title: 'Live device dashboard', subtitle: 'A clear, live view of the readings shared by your connected device.', refresh: 'Refresh live data', live: 'LIVE DEVICE CONNECTION', connected: 'Device connected', connecting: 'Connecting to your device…', unavailable: 'Device feed unavailable', latest: 'Latest vital signs', updated: 'Last updated', source: 'Data source', heart: 'Heart rate', oxygen: 'Blood oxygen', pressure: 'Blood pressure', temperature: 'Temperature', glucose: 'Glucose', stress: 'Stress level', steps: 'Steps today', trend: 'Recent trend', steady: 'Readings are refreshed automatically every 10 seconds while this page is open.', awareness: 'These readings are for awareness, not diagnosis. If you feel unwell or are concerned, contact a qualified healthcare professional.', bpm: 'bpm', mmHg: 'mmHg', mmol: 'mg/dL', percent: '%' },
  ta: { title: 'நேரடி சாதன டாஷ்போர்டு', subtitle: 'உங்கள் இணைக்கப்பட்ட சாதனம் பகிரும் அளவீடுகளின் தெளிவான நேரடிக் காட்சி.', refresh: 'நேரடித் தரவைப் புதுப்பி', live: 'நேரடி சாதன இணைப்பு', connected: 'சாதனம் இணைக்கப்பட்டுள்ளது', connecting: 'சாதனத்துடன் இணைக்கப்படுகிறது…', unavailable: 'சாதனத் தரவு கிடைக்கவில்லை', latest: 'சமீபத்திய முக்கிய அறிகுறிகள்', updated: 'கடைசியாகப் புதுப்பிக்கப்பட்டது', source: 'தரவு மூலம்', heart: 'இதயத் துடிப்பு', oxygen: 'இரத்த ஆக்சிஜன்', pressure: 'இரத்த அழுத்தம்', temperature: 'வெப்பநிலை', glucose: 'குளுக்கோஸ்', stress: 'மன அழுத்த நிலை', steps: 'இன்றைய படிகள்', trend: 'சமீபத்திய போக்கு', steady: 'இந்தப் பக்கம் திறந்திருக்கும்போது அளவீடுகள் ஒவ்வொரு 10 விநாடிக்கும் தானாகப் புதுப்பிக்கப்படும்.', awareness: 'இந்த அளவீடுகள் விழிப்புணர்வுக்காக மட்டுமே; நோய் கண்டறிதலுக்காக அல்ல. உடல்நிலை சரியில்லையெனில் தகுதிவாய்ந்த சுகாதார நிபுணரைத் தொடர்புகொள்ளுங்கள்.', bpm: 'துடிப்புகள்/நிமிடம்', mmHg: 'mmHg', mmol: 'mg/dL', percent: '%' },
  hi: { title: 'लाइव डिवाइस डैशबोर्ड', subtitle: 'आपके कनेक्टेड डिवाइस द्वारा साझा की गई रीडिंग का स्पष्ट लाइव दृश्य।', refresh: 'लाइव डेटा रीफ्रेश करें', live: 'लाइव डिवाइस कनेक्शन', connected: 'डिवाइस कनेक्ट है', connecting: 'डिवाइस से कनेक्ट हो रहा है…', unavailable: 'डिवाइस डेटा उपलब्ध नहीं है', latest: 'नवीनतम महत्वपूर्ण संकेत', updated: 'अंतिम अपडेट', source: 'डेटा स्रोत', heart: 'हृदय गति', oxygen: 'रक्त ऑक्सीजन', pressure: 'रक्तचाप', temperature: 'तापमान', glucose: 'ग्लूकोज', stress: 'तनाव स्तर', steps: 'आज के कदम', trend: 'हाल का रुझान', steady: 'यह पेज खुला रहने पर रीडिंग हर 10 सेकंड में अपने आप रीफ्रेश होती हैं।', awareness: 'ये रीडिंग केवल जागरूकता के लिए हैं, निदान के लिए नहीं। अस्वस्थ महसूस होने या चिंता होने पर योग्य स्वास्थ्य विशेषज्ञ से संपर्क करें।', bpm: 'बीपीएम', mmHg: 'mmHg', mmol: 'mg/dL', percent: '%' },
  te: { title: 'లైవ్ డివైస్ డాష్‌బోర్డ్', subtitle: 'మీ కనెక్ట్ చేయబడిన పరికరం పంచుకునే రీడింగ్‌ల యొక్క స్పష్టమైన ప్రత్యక్ష వీక్షణ.', refresh: 'లైవ్ డేటాను రిఫ్రెష్ చేయండి', live: 'లైవ్ డివైస్ కనెక్షన్', connected: 'పరికరం కనెక్ట్ చేయబడింది', connecting: 'పరికరానికి కనెక్ట్ అవుతోంది…', unavailable: 'పరికర డేటా అందుబాటులో లేదు', latest: 'తాజా ముఖ్య సంకేతాలు', updated: 'చివరిగా నవీకరించబడింది', source: 'డేటా మూలం', heart: 'హృదయ స్పందన', oxygen: 'రక్త ఆక్సిజన్', pressure: 'రక్తపోటు', temperature: 'ఉష్ణోగ్రత', glucose: 'గ్లూకోజ్', stress: 'ఒత్తిడి స్థాయి', steps: 'నేటి అడుగులు', trend: 'ఇటీవలి ధోరణి', steady: 'ఈ పేజీ తెరిచి ఉన్నప్పుడు రీడింగ్‌లు ప్రతి 10 సెకన్లకు స్వయంచాలకంగా రిఫ్రెష్ అవుతాయి.', awareness: 'ఈ రీడింగ్‌లు అవగాహన కోసం మాత్రమే, నిర్ధారణ కోసం కాదు. మీకు అనారోగ్యంగా అనిపిస్తే లేదా ఆందోళన ఉంటే అర్హత కలిగిన ఆరోగ్య నిపుణుడిని సంప్రదించండి.', bpm: 'బిపిఎమ్', mmHg: 'mmHg', mmol: 'mg/dL', percent: '%' }
};

const bpCopy = { en: { saved: 'Latest saved reading', recorded: 'Recorded', source: 'Firebase BP device' }, ta: { saved: 'சமீபத்திய சேமித்த அளவீடு', recorded: 'பதிவு நேரம்', source: 'Firebase BP சாதனம்' }, hi: { saved: 'नवीनतम सहेजी गई रीडिंग', recorded: 'रिकॉर्ड किया गया', source: 'Firebase BP डिवाइस' }, te: { saved: 'తాజా సేవ్ చేసిన రీడింగ్', recorded: 'నమోదైన సమయం', source: 'Firebase BP పరికరం' } };

function readableTime(value, language) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(language === 'en' ? 'en-IN' : `${language}-IN`, { hour: '2-digit', minute: '2-digit' }).format(date); }

export default function LiveDevicePage() {
  const mlResult = useDeviceReading('/api/ml-result');
  const temperature = useDeviceReading('/api/temperature');
  const { language } = useI18n(); const text = copy[language] || copy.en;
  const bpText = bpCopy[language] || bpCopy.en;
  const [bloodPressure, setBloodPressure] = useState({ status: 'loading', value: null, recordedAt: null });
  const bpRequest = useRef(null);
  const loadBloodPressure = useCallback(async () => {
    bpRequest.current?.abort();
    const controller = new AbortController(); bpRequest.current = controller;
    try {
      const response = await fetch('/api/blood-pressure', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('BP unavailable');
      const reading = await response.json();
      if (!reading.bloodPressure) throw new Error('Missing BP');
      if (!controller.signal.aborted) setBloodPressure({ status: 'ready', value: reading.bloodPressure, recordedAt: reading.recordedAt });
    } catch { if (!controller.signal.aborted) setBloodPressure({ status: 'unavailable', value: null, recordedAt: null }); }
  }, []);
  useEffect(() => { loadBloodPressure(); const timer = window.setInterval(loadBloodPressure, 10000); return () => { window.clearInterval(timer); bpRequest.current?.abort(); }; }, [loadBloodPressure]);
  const [vitals, setVitals] = useState(null); const [status, setStatus] = useState('loading');
  const loadVitals = useCallback(async () => { try { const response = await fetch('/api/vitals', { cache: 'no-store' }); if (!response.ok) throw new Error(); const next = await response.json(); setVitals(next); setStatus('ready'); } catch { setVitals(null); setStatus('unavailable'); } }, []);
  useEffect(() => { loadVitals(); const timer = window.setInterval(loadVitals, 10000); return () => window.clearInterval(timer); }, [loadVitals]);
  const refreshReadings = () => { loadVitals(); loadBloodPressure(); temperature.refresh(); mlResult.refresh(); };
  const readings = [[text.heart, vitals?.heartRate, text.bpm, 'heart'], [text.oxygen, vitals?.spo2, text.percent, 'oxygen'], [text.pressure, bloodPressure.value, text.mmHg, 'pressure'], [text.temperature, temperature.data?.temperature, '°F', 'temperature'], [text.steps, vitals?.steps, '', 'steps']];
  return <RequireRole role="patient"><PortalShell title={text.title} subtitle={text.subtitle} action={<button className="header-cta" onClick={refreshReadings}><Icon name="pulse" size={16} />{text.refresh}</button>}><div className="portal-content dedicated-page"><section className="device-connection-card"><div><span className="eyebrow"><span className="live-dot" />{text.live}</span><h2>{status === 'loading' ? text.connecting : status === 'unavailable' ? text.unavailable : text.connected}</h2><p>{text.steady}</p></div><div className="device-connection-meta"><span><Icon name="clock" size={15} />{text.updated}: <b>{readableTime(vitals?.updatedAt, language)}</b></span><span><Icon name="shield" size={15} />{text.source}: <b>{vitals?.source || '—'}</b></span></div></section><DevicePatientDetails vitals={vitals} /><section className="device-readings-section"><div className="section-title-row"><div><span className="eyebrow">{text.live}</span><h2>{text.latest}</h2></div><button className="outline-button" onClick={refreshReadings}><Icon name="pulse" size={15} />{text.refresh}</button></div><div className="device-readings-grid">{readings.map(([label, value, unit, tone]) => <article className={`device-reading ${tone}`} key={label}><span className="device-reading-icon"><Icon name={tone === 'heart' ? 'heart' : tone === 'oxygen' ? 'pulse' : tone === 'pressure' ? 'trend' : tone === 'steps' ? 'users' : 'spark'} size={19} /></span><small>{label}</small><b>{value ?? '—'}<em>{value !== undefined && value !== null ? ` ${unit}` : ''}</em></b>{tone === 'temperature' && <TemperatureControl language={language} onComplete={temperature.refresh} />}{tone === 'pressure' ? <><BPControl language={language} onComplete={loadBloodPressure} />{bloodPressure.status !== 'ready' && <span className="reading-state">{bloodPressure.status === 'loading' ? text.connecting : text.unavailable}</span>}{bloodPressure.recordedAt && <small>{bpText.recorded}: {bloodPressure.recordedAt}</small>}</> : <span className="reading-state"><i />{(tone === 'temperature' ? temperature.status : status) === 'loading' ? text.connecting : value == null ? text.unavailable : text.connected}</span>}</article>)}</div></section><MLLiveResult reading={mlResult} /><BlockchainRecords /><HealthInsights vitals={vitals} simulateMissing /><section className="device-disclaimer"><Icon name="shield" size={18} /><p>{text.awareness}</p></section></div></PortalShell></RequireRole>;
}
