import './globals.css';
import './card-tap-welcome.css';
import './i18n.css';
import './voice-assistant.css';
import './kiosk-map.css';
import './voice-test-guide.css';
import './dedicated-dashboard.css';
import 'leaflet/dist/leaflet.css';
import { AuthLanguagePicker, I18nProvider, SectionSpeechAssistant } from './i18n';
import { VoiceAssistant } from './voice-assistant';

export const metadata = {
  title: 'MediKit | Connected preventive care',
  description: 'A connected health platform for people and care teams.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><I18nProvider><AuthLanguagePicker /><SectionSpeechAssistant />{children}<VoiceAssistant /></I18nProvider></body>
    </html>
  );
}
