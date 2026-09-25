'use client';
import { browserUtterance, speechUnavailable } from './browser-speech.mjs';
import { voiceFocus } from './use-background-mic';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './components';
import { useI18n } from './i18n';

const locales = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN' };
const copy = {
  en: { title: 'Complete this check by voice', description: 'Medi will ask each question and fill your answers. Speak after each question.', start: 'Start voice check', active: 'Voice check in progress', ready: 'Medi is ready to guide this check.', stop: 'Stop voice check', listening: 'Listening for your answer…', retry: 'I did not understand that. Please answer again, or say skip for an optional question.', done: 'Thank you. Your diabetes check-in is complete.', unavailable: 'Speech recognition is not available in this browser.', prompts: { age: 'First, please tell me your age in years. For example, say 42.', bmi: 'What is your BMI, if you know it? Say a number such as 24 point 5, or say skip.', family: 'Do you have a family history of diabetes? Say no, grandparent, or parent or sibling.', activity: 'How many active days do you have in a usual week? Say a number from zero to seven, or say skip.', glucose: 'What was your most recent glucose result? Say normal, borderline, or high.' } },
  ta: { title: 'குரல் மூலம் இந்தப் பரிசோதனையை முடிக்கவும்', description: 'Medi ஒவ்வொரு கேள்வியையும் கேட்டு உங்கள் பதில்களை நிரப்பும். ஒவ்வொரு கேள்விக்குப் பிறகும் பேசுங்கள்.', start: 'குரல் பரிசோதனையைத் தொடங்கு', active: 'குரல் பரிசோதனை நடந்து கொண்டிருக்கிறது', ready: 'இந்தப் பரிசோதனைக்கு Medi வழிகாட்டத் தயாராக உள்ளது.', stop: 'குரல் பரிசோதனையை நிறுத்து', listening: 'உங்கள் பதிலைக் கேட்கிறது…', retry: 'என்னால் புரிந்துகொள்ள முடியவில்லை. மீண்டும் பதிலளிக்கவும் அல்லது விருப்பக் கேள்விக்கு தவிர் என்று சொல்லவும்.', done: 'நன்றி. உங்கள் நீரிழிவு பரிசோதனை முடிந்தது.', unavailable: 'இந்த உலாவியில் குரல் அங்கீகாரம் இல்லை.', prompts: { age: 'முதலில், உங்கள் வயதை ஆண்டுகளில் சொல்லுங்கள். உதாரணமாக, 42 என்று சொல்லுங்கள்.', bmi: 'உங்கள் பி.எம்.ஐ. தெரிந்தால் சொல்லுங்கள். 24 புள்ளி 5 போன்ற எண்ணைச் சொல்லலாம் அல்லது தவிர் என்று சொல்லலாம்.', family: 'உங்கள் குடும்பத்தில் நீரிழிவு வரலாறு உள்ளதா? இல்லை, தாத்தா பாட்டி, அல்லது பெற்றோர் அல்லது உடன்பிறப்பு என்று சொல்லுங்கள்.', activity: 'வழக்கமான வாரத்தில் எத்தனை நாட்கள் சுறுசுறுப்பாக இருக்கிறீர்கள்? பூஜ்ஜியத்திலிருந்து ஏழு வரையிலான எண்ணைச் சொல்லுங்கள் அல்லது தவிர் என்று சொல்லுங்கள்.', glucose: 'உங்கள் சமீபத்திய குளுக்கோஸ் முடிவு என்ன? சாதாரணம், எல்லைக்கோடு, அல்லது அதிகம் என்று சொல்லுங்கள்.' } },
  hi: { title: 'आवाज़ से यह जांच पूरी करें', description: 'Medi हर प्रश्न पूछेगा और आपके उत्तर भरेगा। हर प्रश्न के बाद बोलें।', start: 'वॉइस जांच शुरू करें', active: 'वॉइस जांच जारी है', ready: 'Medi इस जांच में मार्गदर्शन के लिए तैयार है।', stop: 'वॉइस जांच बंद करें', listening: 'आपका उत्तर सुना जा रहा है…', retry: 'मैं समझ नहीं पाया। फिर से उत्तर दें, या वैकल्पिक प्रश्न के लिए स्किप बोलें।', done: 'धन्यवाद। आपकी मधुमेह जांच पूरी हो गई है।', unavailable: 'इस ब्राउज़र में वॉइस रिकग्निशन उपलब्ध नहीं है।', prompts: { age: 'सबसे पहले, अपनी उम्र वर्षों में बताएं। उदाहरण के लिए, 42 बोलें।', bmi: 'यदि आपको अपना बीएमआई पता है तो बताएं। 24 दशमलव 5 जैसा अंक बोलें, या स्किप बोलें।', family: 'क्या आपके परिवार में मधुमेह का इतिहास है? नहीं, दादा दादी, या माता पिता या भाई बहन बोलें।', activity: 'सामान्य सप्ताह में आप कितने दिन सक्रिय रहते हैं? शून्य से सात तक कोई संख्या बोलें, या स्किप बोलें।', glucose: 'आपका सबसे हाल का ग्लूकोज परिणाम क्या था? सामान्य, बॉर्डरलाइन, या उच्च बोलें।' } },
  te: { title: 'వాయిస్‌తో ఈ పరీక్షను పూర్తి చేయండి', description: 'Medi ప్రతి ప్రశ్న అడిగి మీ సమాధానాలను నింపుతుంది. ప్రతి ప్రశ్న తర్వాత మాట్లాడండి.', start: 'వాయిస్ పరీక్ష ప్రారంభించండి', active: 'వాయిస్ పరీక్ష కొనసాగుతోంది', ready: 'ఈ పరీక్షకు మార్గనిర్దేశం చేయడానికి Medi సిద్ధంగా ఉంది.', stop: 'వాయిస్ పరీక్షను ఆపండి', listening: 'మీ సమాధానం వింటోంది…', retry: 'నేను అర్థం చేసుకోలేకపోయాను. మళ్లీ సమాధానం చెప్పండి లేదా ఐచ్ఛిక ప్రశ్నకు స్కిప్ చెప్పండి.', done: 'ధన్యవాదాలు. మీ మధుమేహ పరీక్ష పూర్తయింది.', unavailable: 'ఈ బ్రౌజర్‌లో వాయిస్ గుర్తింపు అందుబాటులో లేదు.', prompts: { age: 'ముందుగా, మీ వయస్సును సంవత్సరాలలో చెప్పండి. ఉదాహరణకు, 42 అని చెప్పండి.', bmi: 'మీ బి.ఎం.ఐ. తెలిసి ఉంటే చెప్పండి. 24 పాయింట్ 5 వంటి సంఖ్యను చెప్పండి లేదా స్కిప్ చెప్పండి.', family: 'మీ కుటుంబంలో మధుమేహ చరిత్ర ఉందా? లేదు, తాత అమ్మమ్మ, లేదా తల్లిదండ్రులు లేదా తోబుట్టువులు అని చెప్పండి.', activity: 'సాధారణ వారంలో మీరు ఎన్ని రోజులు చురుకుగా ఉంటారు? సున్నా నుండి ఏడు వరకు ఒక సంఖ్య చెప్పండి లేదా స్కిప్ చెప్పండి.', glucose: 'మీ ఇటీవలి గ్లూకోజ్ ఫలితం ఏమిటి? సాధారణం, బోర్డర్‌లైన్ లేదా అధికం అని చెప్పండి.' } }
};

const aliases = {
  family: { no: ['no', 'none', 'not', 'இல்லை', 'नहीं', 'नही', 'లేదు'], grandparent: ['grandparent', 'grand mother', 'grandfather', 'தாத்தா', 'பாட்டி', 'दादा', 'दादी', 'नाना', 'नानी', 'తాత', 'అమ్మమ్మ'], parent: ['parent', 'mother', 'father', 'sibling', 'அம்மா', 'அப்பா', 'சகோதர', 'माता', 'पिता', 'भाई', 'बहन', 'తల్లి', 'తండ్రి', 'తోబుట్టువ'] },
  glucose: { normal: ['normal', 'unknown', 'சாதாரண', 'सामान्य', 'నార్మల్', 'సాధారణ'], borderline: ['borderline', 'border line', 'எல்லைக்கோடு', 'सीमा', 'बॉर्डरलाइन', 'సరిహద్దు', 'బోర్డర్‌లైన్'], high: ['high', 'அதிக', 'उच्च', 'ज्यादा', 'అధిక'] }
};

function toArabicDigits(value) {
  const digitSets = ['٠١٢٣٤٥٦٧٨٩', '०१२३४५६७८९', '௦௧௨௩௪௫௬௭௮௯', '౦౧౨౩౪౫౬౭౮౯'];
  return digitSets.reduce((text, set) => set.split('').reduce((next, digit, index) => next.replaceAll(digit, String(index)), text), value);
}
function numberFromSpeech(value) {
  const normalized = toArabicDigits(value.toLowerCase().replace(/point|decimal|புள்ளி|दशमलव|పాయింట్/g, '.'));
  const found = normalized.match(/\d+(?:\.\d+)?/);
  return found ? Number(found[0]) : null;
}
function includesOne(value, options) { return options.some((option) => value.includes(option)); }

export default function VoiceTestGuide({ questions, onAnswer, onComplete, readyHint = false }) {
  const { language } = useI18n(); const text = copy[language] || copy.en;
  const [active, setActive] = useState(false); const [step, setStep] = useState(0); const [listening, setListening] = useState(false); const [message, setMessage] = useState(readyHint ? text.ready : ''); const [transcript, setTranscript] = useState('');
  const recognition = useRef(null); const audio = useRef(null); const answers = useRef({}); const activeRef = useRef(false);

  const stop = useCallback(() => { voiceFocus('guide', false); activeRef.current = false; recognition.current?.abort(); audio.current?.pause(); if (audio.current?.src) URL.revokeObjectURL(audio.current.src); window.speechSynthesis?.cancel(); setListening(false); setActive(false); }, []);
  const speak = useCallback(async (value, after) => {
    window.speechSynthesis?.cancel(); if (audio.current) audio.current.pause();
    const done = () => { if (activeRef.current) after?.(); };
    try {
      const response = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: value, language }) });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob()); const player = new Audio(url); audio.current = player;
      player.onended = player.onerror = () => { URL.revokeObjectURL(url); done(); };
      await player.play();
    } catch {
      try { const utterance = await browserUtterance(value, language); if (!activeRef.current) return; utterance.onend = done; utterance.onerror = () => { setMessage(speechUnavailable(language)); done(); }; window.speechSynthesis.speak(utterance); } catch { setMessage(speechUnavailable(language)); done(); }
    }
  }, [language]);

  const parseAnswer = useCallback((question, raw) => {
    const value = raw.toLowerCase(); const skipped = includesOne(value, ['skip', 'தவிர்', 'ஸ்கிப்', 'स्किप', 'छोड़', 'స్కిప్']);
    if (skipped && !question.required) return '';
    if (question.key === 'age' || question.key === 'bmi' || question.key === 'activity') {
      const number = numberFromSpeech(value);
      if (number === null) return null;
      if (question.key === 'age' && (number < 1 || number > 120)) return null;
      if (question.key === 'bmi' && (number < 8 || number > 90)) return null;
      if (question.key === 'activity' && (number < 0 || number > 7)) return null;
      return String(number);
    }
    const dictionary = aliases[question.key];
    const match = Object.entries(dictionary || {}).find(([, values]) => includesOne(value, values));
    if (!match) return null;
    return question.key === 'family' ? (match[0] === 'parent' ? 'Parent or sibling' : match[0] === 'grandparent' ? 'Grandparent' : 'No') : (match[0] === 'normal' ? 'Normal / unknown' : match[0] === 'borderline' ? 'Borderline' : 'High');
  }, []);

  const listen = useCallback((questionIndex) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setMessage(text.unavailable); return; }
    const recognizer = new Recognition(); recognition.current = recognizer; recognizer.lang = locales[language]; recognizer.continuous = false; recognizer.interimResults = true;
    recognizer.onstart = () => { setListening(true); setMessage(text.listening); };
    recognizer.onresult = (event) => {
      const raw = Array.from(event.results).map((result) => result[0].transcript).join(' '); setTranscript(raw);
      if (!event.results[event.results.length - 1].isFinal) return;
      const question = questions[questionIndex]; const result = parseAnswer(question, raw);
      if (result === null) { setListening(false); speak(text.retry, () => listen(questionIndex)); return; }
      const nextAnswers = { ...answers.current, [question.key]: result }; answers.current = nextAnswers; onAnswer(question.key, result); setListening(false);
      const nextIndex = questionIndex + 1;
      if (nextIndex >= questions.length) { setMessage(text.done); activeRef.current = false; setActive(false); speak(text.done); onComplete(nextAnswers); return; }
      setStep(nextIndex); speak(text.prompts[questions[nextIndex].key], () => listen(nextIndex));
    };
    recognizer.onerror = () => { setListening(false); if (activeRef.current) speak(text.retry, () => listen(questionIndex)); };
    recognizer.onend = () => setListening(false); recognizer.start();
  }, [language, onAnswer, onComplete, parseAnswer, questions, speak, text]);

  const start = () => { voiceFocus('guide', true); answers.current = {}; activeRef.current = true; setActive(true); setStep(0); setTranscript(''); speak(text.prompts[questions[0].key], () => listen(0)); };
  useEffect(() => () => stop(), [stop]);

  return <aside className={active ? 'voice-test-guide active' : 'voice-test-guide'}><div className="voice-test-copy"><span className="voice-test-icon"><Icon name="pulse" size={18} /></span><div><b>{active ? text.active : text.title}</b><p>{active ? `${step + 1} / ${questions.length} · ${listening ? text.listening : transcript || message}` : text.description}</p></div></div><button type="button" className={active ? 'voice-test-button stop' : 'voice-test-button'} onClick={active ? stop : start}><Icon name={active ? 'close' : 'pulse'} size={16} />{active ? text.stop : text.start}</button></aside>;
}
