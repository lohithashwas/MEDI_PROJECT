'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, checks } from './components';
import { useI18n } from './i18n';

import { PageWelcome, usePageWelcome } from './page-welcome';
import { browserUtterance, speechUnavailable } from './browser-speech.mjs';
import { voiceText, localCheckAliases } from './voice-translations.mjs';
import { navigationIntent } from './voice-navigation.mjs';
import { bpCommand, bpControlCopy, sendBPCommand } from './bp-control.mjs';
import { useBackgroundMic, voiceFocus } from './use-background-mic';

const localeByLanguage = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN' };
const commandWords = {
  en: { dashboard: ['dashboard', 'home', 'overview'], checks: ['health check', 'test', 'screening'], appointments: ['appointment', 'book doctor', 'doctor visit'], medicine: ['medicine', 'medicines'], abha: ['abha', 'health id'], read: ['read', 'speak section', 'read page'], stop: ['stop', 'quiet'], diabetes: ['diabetes'], pressure: ['blood pressure', 'pressure'] },
  ta: { dashboard: ['டாஷ்போர்டு', 'முகப்பு', 'கண்ணோட்டம்'], checks: ['பரிசோதனை', 'சுகாதார சோதனை'], appointments: ['சந்திப்பு', 'மருத்துவர்'], medicine: ['மருந்து'], abha: ['அபா', 'abha'], read: ['படி', 'வாசி'], stop: ['நிறுத்து'], diabetes: ['நீரிழிவு'], pressure: ['அழுத்தம்'] },
  hi: { dashboard: ['डैशबोर्ड', 'होम', 'अवलोकन'], checks: ['जांच', 'स्वास्थ्य जांच', 'टेस्ट'], appointments: ['अपॉइंटमेंट', 'डॉक्टर'], medicine: ['दवा', 'दवाइयाँ'], abha: ['आभा', 'abha'], read: ['पढ़ो', 'पढ़ें'], stop: ['रुको', 'बंद'], diabetes: ['मधुमेह', 'डायबिटीज'], pressure: ['रक्तचाप', 'ब्लड प्रेशर'] },
  te: { dashboard: ['డాష్‌బోర్డ్', 'హోమ్', 'అవలోకనం'], checks: ['పరీక్ష', 'ఆరోగ్య పరీక్ష'], appointments: ['అపాయింట్‌మెంట్', 'డాక్టర్'], medicine: ['మందు', 'మందులు'], abha: ['ఆభా', 'abha'], read: ['చదవండి', 'చదువు'], stop: ['ఆపు'], diabetes: ['మధుమేహం', 'డయాబెటిస్'], pressure: ['రక్తపోటు', 'బ్లడ్ ప్రెషర్'] }
};
const replies = {
  en: { welcome: 'Hi, I’m Medi, your health guide. You can ask me to open health checks, book an appointment, read this section, or start a diabetes test.', listening: 'I’m listening.', dashboard: 'Opening your health dashboard.', checks: 'Opening your health checks. Say start diabetes test when you are ready.', appointments: 'Opening appointments.', medicine: 'Your medicine plan is on the health dashboard.', abha: 'Your ABHA health record is on the dashboard.', read: 'I will read this section aloud.', stop: 'I have stopped reading.', diabetes: 'Opening the diabetes risk assessment.', pressure: 'Opening the blood pressure assessment.', help: 'Try saying: open health checks, start diabetes test, book an appointment, or read this section.', unavailable: 'ElevenLabs is not configured, so I am using your browser voice.' },
  ta: { welcome: 'வணக்கம், நான் உங்கள் Medi சுகாதார வழிகாட்டி. சுகாதார பரிசோதனையைத் திறக்க, சந்திப்பை முன்பதிவு செய்ய அல்லது இந்தப் பகுதியைப் படிக்கச் சொல்லலாம்.', listening: 'நான் கேட்கிறேன்.', dashboard: 'உங்கள் சுகாதார டாஷ்போர்டைத் திறக்கிறேன்.', checks: 'உங்கள் சுகாதார பரிசோதனைகளைத் திறக்கிறேன்.', appointments: 'சந்திப்புகளைத் திறக்கிறேன்.', medicine: 'உங்கள் மருந்துத் திட்டம் சுகாதார டாஷ்போர்டில் உள்ளது.', abha: 'உங்கள் ABHA சுகாதாரப் பதிவு டாஷ்போர்டில் உள்ளது.', read: 'இந்தப் பகுதியை நான் சத்தமாகப் படிக்கிறேன்.', stop: 'படிப்பதை நிறுத்திவிட்டேன்.', diabetes: 'நீரிழிவு அபாய மதிப்பீட்டைத் திறக்கிறேன்.', pressure: 'இரத்த அழுத்த மதிப்பீட்டைத் திறக்கிறேன்.', help: 'சுகாதார பரிசோதனையைத் திற அல்லது இந்தப் பகுதியைப் படி என்று சொல்லிப் பாருங்கள்.', unavailable: 'ElevenLabs அமைக்கப்படவில்லை; உலாவி குரலைப் பயன்படுத்துகிறேன்.' },
  hi: { welcome: 'नमस्ते, मैं Medi हूँ, आपका स्वास्थ्य मार्गदर्शक। आप मुझसे स्वास्थ्य जांच खोलने, अपॉइंटमेंट बुक करने या इस भाग को पढ़ने के लिए कह सकते हैं।', listening: 'मैं सुन रहा हूँ।', dashboard: 'आपका स्वास्थ्य डैशबोर्ड खोल रहा हूँ।', checks: 'आपकी स्वास्थ्य जांच खोल रहा हूँ।', appointments: 'अपॉइंटमेंट खोल रहा हूँ।', medicine: 'आपकी दवा योजना स्वास्थ्य डैशबोर्ड पर है।', abha: 'आपका ABHA स्वास्थ्य रिकॉर्ड डैशबोर्ड पर है।', read: 'मैं इस भाग को ज़ोर से पढ़ रहा हूँ।', stop: 'मैंने पढ़ना बंद कर दिया है।', diabetes: 'मधुमेह जोखिम जांच खोल रहा हूँ।', pressure: 'रक्तचाप जांच खोल रहा हूँ।', help: 'स्वास्थ्य जांच खोलें, अपॉइंटमेंट बुक करें, या इस भाग को पढ़ें बोलकर देखें।', unavailable: 'ElevenLabs कॉन्फ़िगर नहीं है, इसलिए ब्राउज़र आवाज़ उपयोग कर रहा हूँ।' },
  te: { welcome: 'నమస్కారం, నేను మీ Medi ఆరోగ్య మార్గదర్శిని. ఆరోగ్య పరీక్షలను తెరవమని, అపాయింట్‌మెంట్ బుక్ చేయమని లేదా ఈ భాగాన్ని చదవమని చెప్పవచ్చు.', listening: 'నేను వింటున్నాను.', dashboard: 'మీ ఆరోగ్య డాష్‌బోర్డ్ తెరుస్తున్నాను.', checks: 'మీ ఆరోగ్య పరీక్షలను తెరుస్తున్నాను.', appointments: 'అపాయింట్‌మెంట్‌లను తెరుస్తున్నాను.', medicine: 'మీ మందుల ప్రణాళిక ఆరోగ్య డాష్‌బోర్డ్‌లో ఉంది.', abha: 'మీ ABHA ఆరోగ్య రికార్డు డాష్‌బోర్డ్‌లో ఉంది.', read: 'నేను ఈ భాగాన్ని బిగ్గరగా చదువుతాను.', stop: 'చదవడం ఆపివేశాను.', diabetes: 'మధుమేహం ప్రమాద అంచనాను తెరుస్తున్నాను.', pressure: 'రక్తపోటు అంచనాను తెరుస్తున్నాను.', help: 'ఆరోగ్య పరీక్షలను తెరవండి, అపాయింట్‌మెంట్ బుక్ చేయండి లేదా ఈ భాగాన్ని చదవండి అని చెప్పండి.', unavailable: 'ElevenLabs కాన్ఫిగర్ చేయలేదు, కాబట్టి బ్రౌజర్ వాయిస్‌ను ఉపయోగిస్తున్నాను.' }
};
const interfaceCopy = {
  en: { launch: 'Talk to Medi', label: 'Medi voice assistant', close: 'Close voice assistant', guide: 'VOICE CARE GUIDE', title: 'Medi, your health guide', description: 'Say a page name, such as “health checks”, “checkup”, or “appointments”. No need to say “open”.', ready: 'Ready to help', speaking: 'Medi is speaking…', tap: 'Tap to speak', stopListening: 'Stop listening', try: 'Try saying', unavailable: 'Speech recognition is not available in this browser.', unheard: 'I could not hear that. Please try again.', privacy: 'Your microphone is activated only after you tap to speak.', examples: [{ label: '“Open health checks”', command: 'open health checks' }, { label: '“Start diabetes test”', command: 'start diabetes test' }, { label: '“Read this section”', command: 'read this section' }] },
  ta: { launch: 'Medi-யுடன் பேசுங்கள்', label: 'Medi குரல் உதவியாளர்', close: 'குரல் உதவியாளரை மூடு', guide: 'குரல் பராமரிப்பு வழிகாட்டி', title: 'Medi, உங்கள் சுகாதார வழிகாட்டி', description: 'வழிசெலுத்த, பரிசோதனைகளைத் திறக்க, உள்ளடக்கத்தைக் கேட்க மற்றும் அடுத்த படியைப் பெற இயல்பாகப் பேசுங்கள்.', ready: 'உதவ தயாராக உள்ளது', speaking: 'Medi பேசுகிறது…', tap: 'பேசத் தட்டவும்', stopListening: 'கேட்பதை நிறுத்து', try: 'இப்படிச் சொல்லிப் பாருங்கள்', unavailable: 'இந்த உலாவியில் குரல் அங்கீகாரம் இல்லை.', unheard: 'என்னால் கேட்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.', privacy: 'நீங்கள் பேசத் தட்டிய பின்னரே மைக்ரோஃபோன் செயல்படும்.', examples: [{ label: '“சுகாதார பரிசோதனையைத் திற”', command: 'சுகாதார பரிசோதனை' }, { label: '“நீரிழிவு சோதனையைத் தொடங்கு”', command: 'நீரிழிவு' }, { label: '“இந்தப் பகுதியைப் படி”', command: 'இந்தப் பகுதியைப் படி' }] },
  hi: { launch: 'Medi से बात करें', label: 'Medi वॉइस असिस्टेंट', close: 'वॉइस असिस्टेंट बंद करें', guide: 'वॉइस केयर गाइड', title: 'Medi, आपका स्वास्थ्य मार्गदर्शक', description: 'नेविगेट करने, जांच खोलने, सामग्री सुनने और अगला कदम जानने के लिए स्वाभाविक रूप से बोलें।', ready: 'मदद के लिए तैयार', speaking: 'Medi बोल रहा है…', tap: 'बोलने के लिए टैप करें', stopListening: 'सुनना बंद करें', try: 'ऐसे बोलकर देखें', unavailable: 'इस ब्राउज़र में वॉइस रिकग्निशन उपलब्ध नहीं है।', unheard: 'मैं वह सुन नहीं पाया। फिर से कोशिश करें।', privacy: 'आपके बोलने के लिए टैप करने के बाद ही माइक्रोफ़ोन सक्रिय होता है।', examples: [{ label: '“स्वास्थ्य जांच खोलें”', command: 'स्वास्थ्य जांच' }, { label: '“मधुमेह जांच शुरू करें”', command: 'मधुमेह' }, { label: '“इस भाग को पढ़ें”', command: 'इस भाग को पढ़ें' }] },
  te: { launch: 'Mediతో మాట్లాడండి', label: 'Medi వాయిస్ సహాయకుడు', close: 'వాయిస్ సహాయకుడిని మూసివేయండి', guide: 'వాయిస్ కేర్ గైడ్', title: 'Medi, మీ ఆరోగ్య మార్గదర్శిని', description: 'నావిగేట్ చేయడానికి, పరీక్షలను తెరవడానికి, కంటెంట్ వినడానికి మరియు తదుపరి దశను పొందడానికి సహజంగా మాట్లాడండి.', ready: 'సహాయం చేయడానికి సిద్ధంగా ఉంది', speaking: 'Medi మాట్లాడుతోంది…', tap: 'మాట్లాడటానికి నొక్కండి', stopListening: 'వినడం ఆపండి', try: 'ఇలా చెప్పి చూడండి', unavailable: 'ఈ బ్రౌజర్‌లో వాయిస్ గుర్తింపు అందుబాటులో లేదు.', unheard: 'నేను అది వినలేకపోయాను. మళ్లీ ప్రయత్నించండి.', privacy: 'మీరు మాట్లాడటానికి నొక్కిన తర్వాతే మైక్రోఫోన్ సక్రియమవుతుంది.', examples: [{ label: '“ఆరోగ్య పరీక్షలను తెరవండి”', command: 'ఆరోగ్య పరీక్ష' }, { label: '“మధుమేహ పరీక్ష ప్రారంభించండి”', command: 'మధుమేహం' }, { label: '“ఈ భాగాన్ని చదవండి”', command: 'ఈ భాగాన్ని చదవండి' }] }
};


const micCopy = {
  en: 'Once enabled, the mic stays on across pages, even with this panel closed. It pauses for spoken replies and voice checks. Use Mic off to stop.',
  ta: 'இயக்கிய பிறகு, பக்கங்களை மாற்றினாலும் மைக் செயல்படும். குரல் பதில்கள் மற்றும் பரிசோதனைகளின்போது இடைநிறுத்தப்படும். நிறுத்த Mic off அழுத்தவும்.',
  hi: 'चालू करने के बाद पेज बदलने पर भी माइक चालू रहता है। जवाब और वॉइस जांच के दौरान रुकता है। बंद करने के लिए Mic off दबाएं।',
  te: 'ప్రారంభించిన తర్వాత పేజీలు మారినా మైక్ ఆన్‌లో ఉంటుంది. వాయిస్ సమాధానాలు, పరీక్షల సమయంలో ఆగుతుంది. ఆపడానికి Mic off నొక్కండి.'
};
const checkAliases = { heart: ['heart health'], respiratory: ['respiratory', 'lung health'], kidney: ['kidney'], liver: ['liver'], anemia: ['anemia', 'anaemia'], mental: ['stress', 'wellbeing'], lifestyle: ['lifestyle'], lab: ['lab result', 'lab test'] };
const voiceDestinations = [
  { label: 'Live device', href: '/portal/live-device', aliases: ['live device', 'live vitals', 'device readings', 'நேரடி சாதனம்', 'लाइव डिवाइस', 'లైవ్ డివైస్'] },
  { label: 'Health history', href: '/portal/health-history', aliases: ['health history', 'medical history', 'சுகாதார வரலாறு', 'स्वास्थ्य इतिहास', 'ఆరోగ్య చరిత్ర'] },
  { label: 'Messages', href: 'messages', aliases: ['messages', 'message', 'செய்திகள்', 'संदेश', 'సందేశాలు'] },
  { label: 'Patients', href: '/doctor/patients', aliases: ['patient list', 'patients'] },
  { label: 'Medicines', href: '/portal#medicines', aliases: ['medicines', 'medicine plan'] },
  { label: 'ABHA health record', href: '/portal#abha', aliases: ['abha', 'health id'] },
  { label: 'Clinic visits', href: '/portal#clinic-visits', aliases: ['clinic visits'] },
  { label: 'Website home', href: '/', aliases: ['website home', 'landing page'] },
  { label: 'Solutions', href: '/#solutions', aliases: ['solutions'] },
  { label: 'How it works', href: '/#how-it-works', aliases: ['how it works'] },
  { label: 'For clinicians', href: '/#for-clinicians', aliases: ['for clinicians'] },
  { label: 'Sign in', href: '/signin', aliases: ['sign in', 'login'] },
  { label: 'Create account', href: '/register', aliases: ['create account', 'register', 'sign up'] }
];

function hasAny(text, terms = []) { return terms.some((term) => /^[a-z ]+$/.test(term) ? (` ${text.replace(/[^a-z0-9]+/g, ' ')} `).includes(` ${term} `) : text.includes(term)); }
function detectedLanguage(raw, fallback) {
  if (/[\u0B80-\u0BFF]/.test(raw)) return 'ta';
  if (/[\u0900-\u097F]/.test(raw)) return 'hi';
  if (/[\u0C00-\u0C7F]/.test(raw)) return 'te';
  const text = raw.toLowerCase();
  if (text.includes('tamil') || text.includes('தமிழ்')) return 'ta';
  if (text.includes('hindi') || text.includes('हिंदी')) return 'hi';
  if (text.includes('telugu') || text.includes('తెలుగు')) return 'te';
  return localeByLanguage[fallback] ? fallback : 'en';
}

export function VoiceAssistant() {
  const { language, setLanguage } = useI18n(); const pathname = usePathname(); const router = useRouter(); const speechVersion = useRef(0); const audioRef = useRef(null); const speechTimer = useRef(null);
  const [audioError, setAudioError] = useState('');
  const [open, setOpen] = useState(false); const [speaking, setSpeaking] = useState(false); const [transcript, setTranscript] = useState(''); const [message, setMessage] = useState('');
  const cancelSpeech = useCallback(() => {
    speechVersion.current++; clearTimeout(speechTimer.current);
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); audioRef.current = null; }
    setSpeaking(false); voiceFocus('assistant', false);
  }, []);
  const say = useCallback(async (text, spokenLanguage = language) => {
    clearTimeout(speechTimer.current); const version = ++speechVersion.current; voiceFocus('assistant', true);
    const done = () => { if (version === speechVersion.current) { clearTimeout(speechTimer.current); setSpeaking(false); voiceFocus('assistant', false); } };
    window.speechSynthesis?.cancel(); if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }
    setMessage(text); setSpeaking(true); setAudioError('');
    speechTimer.current = setTimeout(() => { if (version === speechVersion.current) cancelSpeech(); }, 60000);
    try {
      const response = await fetch('/api/voice', { method: 'POST', signal: AbortSignal.timeout(16000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language: spokenLanguage }) });
      if (!response.ok) throw new Error();
      const blob = await response.blob(); if (version !== speechVersion.current) return;
      const url = URL.createObjectURL(blob); const audio = new Audio(url); audioRef.current = audio;
      audio.onended = audio.onerror = () => { done(); URL.revokeObjectURL(url); };
      await audio.play();
    } catch {
      if (version !== speechVersion.current) return;
      try {
        const utterance = await browserUtterance(text, spokenLanguage);
        if (version !== speechVersion.current) return;
        utterance.onend = done; utterance.onerror = () => { if (version === speechVersion.current) setAudioError(speechUnavailable(spokenLanguage)); done(); };
        window.speechSynthesis.speak(utterance);
      } catch { if (version === speechVersion.current) setAudioError(speechUnavailable(spokenLanguage)); done(); }
    }
  }, [language, cancelSpeech]);
  const welcomeRef = useRef(null);
  const execute = useCallback((raw) => {
    const activeLanguage = detectedLanguage(raw, language); const text = raw.toLowerCase(); const words = Object.fromEntries(Object.keys(commandWords.en).map(key => [key, [...commandWords.en[key], ...(commandWords[activeLanguage]?.[key] || [])]])); const reply = replies[activeLanguage] || replies.en;
    if (activeLanguage !== language) setLanguage(activeLanguage);
    setTranscript(raw);
    const bpAction = bpCommand(raw);
    if (bpAction) {
      const bpText = bpControlCopy[activeLanguage] || bpControlCopy.en;
      setMessage(bpText.busy);
      sendBPCommand(bpAction).then(() => say(bpAction === 'ON' ? bpText.done : bpText.stopped, activeLanguage)).catch(() => say(bpText.error, activeLanguage));
      return;
    }
    if (welcomeRef.current?.respond(raw)) return;
    if (hasAny(text, ['stop listening', 'microphone off', 'turn off mic', 'mic off', 'மைக் அணை', 'கேட்பதை நிறுத்து', 'மைக்ரோஃபோனை அணை', 'माइक बंद', 'सुनना बंद', 'మైక్ ఆఫ్', 'వినడం ఆపు'])) { mic.disable(); setMessage(voiceText('Microphone off', activeLanguage)); return; }
    if (hasAny(text, words.stop)) { window.speechSynthesis?.cancel(); if (audioRef.current) audioRef.current.pause(); say(reply.stop, activeLanguage); return; }
    if (hasAny(text, words.read)) { setMessage(reply.read); document.querySelector('.portal-content > section, main > section')?.querySelector('[data-speech-ignore]')?.click(); return; }
    const destination = voiceDestinations.find((item) => hasAny(text, [...item.aliases, voiceText(item.label, activeLanguage).toLowerCase()]));
    if (destination) { router.push(destination.href === 'messages' ? (pathname.startsWith('/doctor') ? '/doctor/messages' : '/portal/messages') : destination.href); say(voiceText(destination.label, activeLanguage), activeLanguage); return; }
    const check = checks.find((item) => hasAny(text, [item.title.toLowerCase(), voiceText(item.title, activeLanguage).toLowerCase(), ...(checkAliases[item.id] || []), ...(localCheckAliases[item.id] || [])]));
    if (check) { router.push(`/screening?check=${check.id}${check.id === 'diabetes' ? '&voice=1' : ''}`); say(voiceText(check.title, activeLanguage), activeLanguage); return; }
    if (hasAny(text, words.diabetes)) { router.push('/screening?check=diabetes&voice=1'); say(reply.diabetes, activeLanguage); return; }
    if (hasAny(text, words.pressure)) { router.push('/screening?check=pressure'); say(reply.pressure, activeLanguage); return; }
    if (navigationIntent(text) === 'appointments' || hasAny(text, words.appointments)) { router.push(pathname.startsWith('/doctor') ? '/doctor/appointments' : '/appointments'); say(reply.appointments, activeLanguage); return; }
    if (navigationIntent(text) === 'checks' || hasAny(text, words.checks)) { router.push('/screening'); say(reply.checks, activeLanguage); return; }
    if (hasAny(text, words.medicine) || hasAny(text, words.abha)) { router.push(hasAny(text, words.medicine) ? '/portal#medicines' : '/portal#abha'); say(hasAny(text, words.medicine) ? reply.medicine : reply.abha, activeLanguage); return; }
    if (hasAny(text, words.dashboard)) { router.push(pathname.startsWith('/doctor') ? '/doctor' : '/portal'); say(reply.dashboard, activeLanguage); return; }
    say(reply.help, activeLanguage);
  }, [language, pathname, router, say, setLanguage]);
  const mic = useBackgroundMic({ locale: localeByLanguage[language], onCommand: execute, onTranscript: setTranscript, onMessage: setMessage, unavailable: (interfaceCopy[language] || interfaceCopy.en).unavailable, unheard: (interfaceCopy[language] || interfaceCopy.en).unheard });
  const { enabled, listening } = mic;
  const welcome = usePageWelcome({ pathname, enabled, router, say, cancelSpeech, language });
  welcomeRef.current = welcome;
  useEffect(() => () => cancelSpeech(), [cancelSpeech]);
  useEffect(() => { if (mic.error) setOpen(true); }, [mic.error]);
  const toggleMic = () => { if (!enabled) { window.dispatchEvent(new Event('medikit-stop-guidance')); cancelSpeech(); setTranscript(''); } mic.toggle(); };
  const reply = replies[language] || replies.en; const ui = interfaceCopy[language] || interfaceCopy.en;
  return <aside className={`voice-assistant${open ? ' open' : ''}`} aria-label={ui.label}>{!open && <PageWelcome welcome={welcome} floating />}<button className="voice-launcher" onClick={() => { setOpen(!open); if (!open && !message) setMessage(reply.welcome); }} aria-expanded={open}><span className={speaking ? 'voice-orb speaking' : 'voice-orb'}><Icon name="spark" size={20} /></span><span>{enabled ? voiceText(listening ? 'Mic on · Listening' : 'Mic on · Paused', language) : ui.launch}</span></button>{enabled && <button className="voice-mic-off" onClick={mic.disable} aria-label={voiceText('Turn off microphone', language)}>{voiceText('Mic off', language)}</button>}{open && <div className="voice-panel"><header><div><span className="eyebrow"><span className="live-dot" />{ui.guide}</span><h2>{ui.title}</h2></div><button className="icon-plain" onClick={() => setOpen(false)} aria-label={ui.close}><Icon name="close" size={18} /></button></header><PageWelcome welcome={welcome} /><p>{ui.description}</p><div className="voice-status"><span className={listening ? 'mic-state active' : 'mic-state'}><Icon name={listening ? 'pulse' : 'user'} size={17} /></span><div><b>{listening ? reply.listening : speaking ? ui.speaking : ui.ready}</b><small>{transcript || message || ui.examples[0].label}</small></div></div><button className={enabled ? 'voice-listen listening' : 'voice-listen'} aria-pressed={enabled} onClick={toggleMic}><Icon name={listening ? 'close' : 'pulse'} size={19} />{enabled ? ui.stopListening : ui.tap}</button><div role="status" aria-live="polite" className="voice-error">{mic.error || audioError}</div><div className="voice-examples"><span>{voiceText('Pages and sections', language)}</span><button onClick={() => execute('health checks')}>{voiceText('Health checks', language)}</button><button onClick={() => execute('appointments')}>{voiceText('Appointments', language)}</button>{voiceDestinations.map((item) => <button key={item.href} onClick={() => execute(item.aliases[0])}>{voiceText(item.label, language)}</button>)}{checks.map((check) => <button key={check.id} onClick={() => execute(check.title.toLowerCase())}>{voiceText(check.title, language)}</button>)}<button onClick={() => execute("BP on")}>{(bpControlCopy[language] || bpControlCopy.en).on}</button><button onClick={() => execute("BP off")}>{(bpControlCopy[language] || bpControlCopy.en).off}</button><span>{ui.try}</span>{ui.examples.map((example) => <button key={example.command} onClick={() => execute(example.command)}>{example.label}</button>)}</div><small className="voice-privacy"><Icon name="shield" size={13} />{micCopy[language] || micCopy.en}</small></div>}</aside>;
}
