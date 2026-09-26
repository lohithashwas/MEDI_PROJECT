export const bpControlCopy = {
  en: { on: 'BP on', off: 'BP off', hint: 'Say “BP on” to start. Switches off automatically after 2 seconds.', busy: 'Sending BP command…', done: 'BP trigger sent; control is off. Waiting for the BP device reading.', stopped: 'BP off command sent.', error: 'BP command failed. State unknown; try BP off.' },
  ta: { on: 'பிபி இயக்கு', off: 'பிபி அணை', hint: '“பிபி இயக்கு” என்று சொல்லுங்கள். 2 விநாடிகளில் தானாக அணையும்.', busy: 'பிபி கட்டளை அனுப்பப்படுகிறது…', done: 'பிபி தொடக்கக் கட்டளை அனுப்பப்பட்டது; கட்டுப்பாடு அணைக்கப்பட்டது. அளவீட்டிற்காகக் காத்திருக்கிறது.', stopped: 'பிபி அணைக்கும் கட்டளை அனுப்பப்பட்டது.', error: 'பிபி கட்டளை தோல்வி. நிலை தெரியவில்லை; பிபி அணை என்பதை முயற்சிக்கவும்.' },
  hi: { on: 'बीपी चालू', off: 'बीपी बंद', hint: '“बीपी चालू” कहें। 2 सेकंड बाद अपने आप बंद होगा।', busy: 'बीपी कमांड भेज रहे हैं…', done: 'बीपी ट्रिगर भेजा; नियंत्रण बंद है। बीपी रीडिंग की प्रतीक्षा है।', stopped: 'बीपी बंद करने की कमांड भेजी गई।', error: 'बीपी कमांड विफल। स्थिति अज्ञात; बीपी बंद करने का प्रयास करें।' },
  te: { on: 'బీపీ ఆన్', off: 'బీపీ ఆఫ్', hint: '“బీపీ ఆన్” అనండి. 2 సెకన్ల తర్వాత స్వయంగా ఆఫ్ అవుతుంది.', busy: 'బీపీ ఆదేశం పంపుతోంది…', done: 'బీపీ ప్రారంభ ఆదేశం పంపింది; నియంత్రణ ఆఫ్‌లో ఉంది. రీడింగ్ కోసం వేచి ఉంది.', stopped: 'బీపీ ఆఫ్ ఆదేశం పంపింది.', error: 'బీపీ ఆదేశం విఫలమైంది. స్థితి తెలియదు; బీపీ ఆఫ్ ప్రయత్నించండి.' }
};
export function bpCommand(raw) {
  const text = raw.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
  const command = text.replace(/^please /, '').replace(/ please$/, '');
  const device = '(?:b\\s*p|blood pressure)(?: machine| device)?';
  for (const [action, verbs] of [['OFF', '(?:off|stop)'], ['ON', '(?:on|start|trigger)']]) {
    if (new RegExp(`^(?:(?:turn |switch )?${verbs} (?:the )?${device}|(?:turn |switch )?${device} ${verbs})$`).test(command)) return action;
  }
  if (/^(?:பிபி|பி பி|இரத்த அழுத்தம்) (?:அணை|நிறுத்து)$|^(?:बीपी|बी पी) बंद$|^(?:బీపీ|బిపి|బి పి) (?:ఆఫ్|ఆపు)$/u.test(command)) return 'OFF';
  if (/^(?:பிபி|பி பி|இரத்த அழுத்தம்) (?:இயக்கு|தொடங்கு|ஆன்)$|^(?:बीपी|बी पी) (?:चालू|शुरू)$|^(?:బీపీ|బిపి|బి పి) (?:ఆన్|ప్రారంభించు)$/u.test(command)) return 'ON';
  return null;
}
let pending = false;
export async function sendBPCommand(action) {
  if (pending && action === 'ON') throw new Error('BP command already pending');
  if (action === 'ON') pending = true;
  window.dispatchEvent(new CustomEvent('medikit-bp-control', { detail: { busy: true } }));
  try {
    const response = await fetch('/api/bp-control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const data = await response.json();
    if (!response.ok) throw new Error('BP command failed');
    window.dispatchEvent(new CustomEvent('medikit-bp-control', { detail: { ...data, busy: false } }));
    return data;
  } catch (error) {
    window.dispatchEvent(new CustomEvent('medikit-bp-control', { detail: { state: null, error: true, busy: false } }));
    throw error;
  } finally { if (action === 'ON') pending = false; }
}
