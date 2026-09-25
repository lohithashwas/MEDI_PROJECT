'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { voiceText } from './voice-translations.mjs';

export const pageWelcomes = {
  '/signin': { question: 'Welcome back. Would you like to sign in to your health space?', label: 'Sign in', selector: '.auth-card input' },
  '/register': { question: 'Would you like to get started with a new health account?', label: 'Get started', selector: '.auth-card input' },
  '/portal': { question: 'Welcome to your health space. Would you like to take a health check?', label: 'Health checks', href: '/screening' },
  '/appointments': { question: 'Would you like to book an appointment with your care team?', label: 'Book appointment', selector: '[data-voice-action="book-appointment"]', click: true },
  '/screening': { question: 'Would you like to take a health check? You can choose diabetes, blood pressure, heart health, or another check.', label: 'Choose a health check', selector: '.checks-grid', response: 'Which health check would you like? Say its name, or choose a check on this page.' },
  '/portal/live-device': { question: 'Would you like to see your latest device readings?', label: 'View readings', selector: '.device-readings-section' },
  '/portal/health-history': { question: 'Would you like to review your previous health checks?', label: 'View health history', selector: '.full-history-list, .history-empty' },
  '/portal/messages': { question: 'Would you like to write a message to your care team?', label: 'Write a message', selector: '.message-compose input' },
  '/doctor': { question: 'Welcome to your care workspace. Would you like to review your patients?', label: 'View patients', href: '/doctor/patients' },
  '/doctor/patients': { question: 'Would you like to find a patient? You can search the patient list.', label: 'Find a patient', selector: '.patients-tools input' },
  '/doctor/appointments': { question: 'Would you like to review your appointment schedule?', label: 'View schedule', selector: '.calendar-schedule' },
  '/doctor/messages': { question: 'Would you like to write a message to a patient?', label: 'Write a message', selector: '.message-compose input' }
};

export function usePageWelcome({ pathname, enabled, router, say, cancelSpeech, language }) {
  const [visible, setVisible] = useState(false);
  const pending = useRef(null);
  const spoken = useRef(null);
  const prompt = useMemo(() => { const item = pageWelcomes[pathname]; return item ? { ...item, question: voiceText(item.question, language), label: voiceText(item.label, language), response: item.response ? voiceText(item.response, language) : undefined } : null; }, [pathname, language]);

  useEffect(() => {
    cancelSpeech();
    pending.current = prompt ? pathname : null;
    spoken.current = null;
    setVisible(Boolean(prompt));
    return () => { pending.current = null; };
  }, [pathname, prompt, cancelSpeech]);

  useEffect(() => {
    if (!enabled || !visible || !prompt || spoken.current === pathname) return;
    // Let the destination render and avoid talking over an opened assessment.
    const timer = setTimeout(() => {
      if (document.querySelector('[role="dialog"], .voice-test-guide.active')) return;
      spoken.current = pathname;
      say(prompt.question, language);
    }, 650);
    return () => clearTimeout(timer);
  }, [enabled, visible, pathname, prompt, say, language]);

  const dismiss = useCallback(() => { pending.current = null; setVisible(false); cancelSpeech(); }, [cancelSpeech]);
  const accept = useCallback(() => {
    if (pending.current !== pathname || !prompt) return;
    dismiss();
    if (prompt.href) { router.push(prompt.href); return; }
    const target = document.querySelector(prompt.selector);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (prompt.click) target.click();
      else { if (!target.matches('input, textarea, button, a')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    }
    if (enabled && prompt.response) say(prompt.response, language);
  }, [pathname, prompt, dismiss, router, enabled, say, language]);

  const respond = useCallback(raw => {
    if (pending.current !== pathname || !visible) return false;
    const answer = raw.toLowerCase().replace(/[.!?,।]/g, '').trim();
    if (/^(yes|yeah|yep|sure|okay|ok|yes please|please do|ஆம்|ஆமாம்|சரி|हाँ|हां|जी हाँ|जी हां|ठीक है|అవును|సరే)$/.test(answer)) { accept(); return true; }
    if (/^(no|no thanks|not now|no thank you|later|இல்லை|வேண்டாம்|இப்போது வேண்டாம்|नहीं|अभी नहीं|వద్దు|లేదు|ఇప్పుడు వద్దు)$/.test(answer)) { dismiss(); return true; }
    return false;
  }, [pathname, visible, accept, dismiss]);

  return { language, prompt, visible, accept, dismiss, respond };
}

export function PageWelcome({ welcome, floating }) {
  if (!welcome.visible || !welcome.prompt) return null;
  return <div className={`page-welcome${floating ? ' floating' : ''}`} aria-label={voiceText('Page assistance', welcome.language)}>
    <button className="page-welcome-close" aria-label={voiceText('Dismiss page assistance', welcome.language)} onClick={welcome.dismiss}>×</button>
    <p>{welcome.prompt.question}</p>
    <div><button onClick={welcome.accept}>{welcome.prompt.label}</button><button onClick={welcome.dismiss}>{voiceText('Not now', welcome.language)}</button></div>
  </div>;
}
