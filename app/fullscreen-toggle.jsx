'use client';

import { useEffect, useState } from 'react';

const copy = {
  en: { enter: 'Full screen', exit: 'Exit full screen', hint: 'Exit full screen (Esc)', unavailable: 'Full screen is unavailable in this browser.', failed: 'Could not change full-screen mode. Please try again.' },
  ta: { enter: 'முழுத் திரை', exit: 'முழுத் திரையிலிருந்து வெளியேறு', hint: 'முழுத் திரையிலிருந்து வெளியேறு (Esc)', unavailable: 'இந்த உலாவியில் முழுத் திரை வசதி இல்லை.', failed: 'முழுத் திரை முறையை மாற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' },
  hi: { enter: 'पूर्ण स्क्रीन', exit: 'पूर्ण स्क्रीन से बाहर आएँ', hint: 'पूर्ण स्क्रीन से बाहर आएँ (Esc)', unavailable: 'इस ब्राउज़र में पूर्ण स्क्रीन उपलब्ध नहीं है।', failed: 'पूर्ण स्क्रीन मोड बदल नहीं सका। कृपया फिर कोशिश करें।' },
  te: { enter: 'పూర్తి తెర', exit: 'పూర్తి తెర నుండి బయటకు రండి', hint: 'పూర్తి తెర నుండి బయటకు రండి (Esc)', unavailable: 'ఈ బ్రౌజర్‌లో పూర్తి తెర అందుబాటులో లేదు.', failed: 'పూర్తి తెర విధానాన్ని మార్చలేకపోయాము. మళ్లీ ప్రయత్నించండి.' },
};

export function FullscreenToggle({ language = 'en' }) {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const text = copy[language] || copy.en;

  useEffect(() => {
    setSupported(Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen && document.exitFullscreen));
    const sync = () => { setActive(Boolean(document.fullscreenElement)); setFailed(false); };
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = async () => {
    setPending(true);
    setFailed(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      setActive(Boolean(document.fullscreenElement));
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return <div className="fullscreen-control" translate="no">
    <button className="fullscreen-toggle" type="button" onClick={toggle} disabled={!supported || pending}
      aria-pressed={active} aria-label={!supported ? text.unavailable : active ? text.exit : text.enter}
      title={!supported ? text.unavailable : active ? text.hint : text.enter}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={active ? 'M9 3v6H3m18 0h-6V3M3 15h6v6m6 0v-6h6' : 'M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6'} />
      </svg>
      <span>{active ? text.exit : text.enter}</span>
    </button>
    {failed && <span className="fullscreen-error" role="status">{text.failed}</span>}
  </div>;
}
