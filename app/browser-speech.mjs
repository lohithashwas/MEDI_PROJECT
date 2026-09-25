export function speechUnavailable(language) {
  return {
    en: 'Speech audio is unavailable. You can still use the on-screen controls.',
    ta: 'தமிழ் குரல் கிடைக்கவில்லை. சாதனத்தில் தமிழ் குரலை நிறுவவும் அல்லது சேவையக குரல் சேவையை அமைக்கவும். திரையில் உள்ள பொத்தான்களைப் பயன்படுத்தலாம்.',
    hi: 'हिंदी आवाज़ उपलब्ध नहीं है। डिवाइस पर हिंदी आवाज़ इंस्टॉल करें या सर्वर वॉइस सेवा सेट करें। स्क्रीन के बटन इस्तेमाल कर सकते हैं।',
    te: 'తెలుగు వాయిస్ అందుబాటులో లేదు. పరికరంలో తెలుగు వాయిస్ ఇన్‌స్టాల్ చేయండి లేదా సర్వర్ వాయిస్ సేవను అమర్చండి. తెరపై బటన్లను ఉపయోగించవచ్చు.'
  }[language] || 'Speech audio is unavailable.';
}

export async function browserUtterance(text, language) {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) throw new Error('Speech unavailable');
  const matchesLanguage = voice => voice.lang.toLowerCase().replace('_', '-').split('-')[0] === language;
  let voices = window.speechSynthesis.getVoices();
  if (!voices.some(matchesLanguage)) {
    await new Promise(resolve => {
      let timer;
      const done = () => { clearTimeout(timer); window.speechSynthesis.removeEventListener('voiceschanged', done); resolve(); };
      window.speechSynthesis.addEventListener('voiceschanged', done);
      timer = setTimeout(done, 1500);
    });
    voices = window.speechSynthesis.getVoices();
  }
  const matching = voices.filter(matchesLanguage);
  if (!matching.length && language !== 'en') throw new Error('Language voice unavailable');
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = `${language}-IN`;
  utterance.voice = matching.find(voice => voice.lang.toLowerCase() === `${language}-in`) || matching[0] || null;
  return utterance;
}
