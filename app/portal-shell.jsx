'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Brand, Icon } from './components';
import { LanguagePicker, useI18n } from './i18n';

const patientNav = [
  ['/', 'grid', 'Overview'], ['/portal', 'grid', 'Overview'], ['/screening', 'clipboard', 'Health checks'], ['/appointments', 'calendar', 'Appointments'], ['/portal/messages', 'message', 'Messages']
];
const doctorNav = [['/doctor', 'grid', 'Dashboard'], ['/doctor/patients', 'users', 'Patients'], ['/doctor/appointments', 'calendar', 'Appointments'], ['/doctor/messages', 'message', 'Messages']];
const patientPageLabels = {
  en: { live: 'Live device', history: 'Health history' },
  ta: { live: 'நேரடி சாதனம்', history: 'சுகாதார வரலாறு' },
  hi: { live: 'लाइव डिवाइस', history: 'स्वास्थ्य इतिहास' },
  te: { live: 'లైవ్ డివైస్', history: 'ఆరోగ్య చరిత్ర' }
};

export function useSession() {
  const [session, setSession] = useState(null);
  useEffect(() => { const saved = window.localStorage.getItem('medikit-session'); if (saved) setSession(JSON.parse(saved)); }, []);
  return session;
}

export function RequireRole({ children, role }) {
  const session = useSession(); const router = useRouter();
  useEffect(() => { if (session && session.role !== role) router.replace(session.role === 'doctor' ? '/doctor' : '/portal'); }, [session, role, router]);
  if (!session || session.role !== role) return <div className="app-loading"><span className="loading-mark"><Icon name="cross" /></span><p>Loading your secure workspace…</p></div>;
  return children;
}

export function PortalShell({ children, role = 'patient', title, subtitle, action }) {
  const pathname = usePathname(); const router = useRouter(); const [session, setSession] = useState(null); const [mobileOpen, setMobileOpen] = useState(false); const { t, language } = useI18n();
  useEffect(() => { const saved = window.localStorage.getItem('medikit-session'); if (saved) setSession(JSON.parse(saved)); }, []);
  const nav = role === 'doctor' ? doctorNav : patientNav;
  const signOut = () => { window.localStorage.removeItem('medikit-session'); router.push('/signin'); };
  const patientLabels = patientPageLabels[language] || patientPageLabels.en;
  const translatedNav = role === 'doctor' ? [['/doctor', 'grid', t('clinicianDashboard')], ['/doctor/patients', 'users', t('patients')], ['/doctor/appointments', 'calendar', t('appointments')], ['/doctor/messages', 'message', t('messages')]] : [['/portal', 'grid', t('dashboard')], ['/portal/live-device', 'pulse', patientLabels.live], ['/screening', 'clipboard', t('healthChecks')], ['/portal/health-history', 'clipboard', patientLabels.history], ['/appointments', 'calendar', t('appointments')], ['/portal/messages', 'message', t('messages')]];
  return <div className="portal-layout"><aside className={mobileOpen ? 'portal-sidebar open' : 'portal-sidebar'}><div className="sidebar-brand"><Brand /></div><div className="workspace-label">{role === 'doctor' ? t('careWorkspace') : t('myHealth')}</div><nav className="portal-nav">{translatedNav.map(([href, icon, text]) => <Link className={pathname === href ? 'active' : ''} href={href} key={href} onClick={() => setMobileOpen(false)}><Icon name={icon} size={18} />{text}</Link>)}</nav><div className="sidebar-bottom"><div className="help-card"><span><Icon name="shield" size={17} /></span><div><b>{t('healthRecord')}</b><p>{role === 'doctor' ? t('careWorkspace') : t('myHealth')}</p></div></div><button className="profile-chip" onClick={signOut}><span className="user-avatar">{session?.name?.charAt(0) || 'M'}</span><span><b>{session?.name || 'Maya Patel'}</b><small>{role === 'doctor' ? t('careWorkspace') : t('patient')}</small></span><Icon name="logout" size={16} /></button></div></aside><section className="portal-main"><header className="portal-header"><button className="mobile-nav" onClick={() => setMobileOpen(!mobileOpen)}><Icon name="menu" /></button><div><p className="portal-breadcrumb">{role === 'doctor' ? t('careWorkspace') : t('myHealth')}</p><h1>{title}</h1>{subtitle && <p className="portal-subtitle">{subtitle}</p>}</div><div className="portal-actions"><LanguagePicker compact /><button className="notification" aria-label="Notifications"><Icon name="bell" size={19} /><span /></button>{action}</div></header>{children}</section></div>;
}
