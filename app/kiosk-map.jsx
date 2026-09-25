'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './components';
import { useI18n } from './i18n';

const exampleLocation = { lat: 12.9716, lng: 77.5946, label: 'Bengaluru demo area' };
const translations = {
  en: { eyebrow: 'CARE NEAR YOU', title: 'Nearest MediKit kiosks', description: 'Find a nearby kiosk for a guided check-in or a supported vital-sign reading.', find: 'Use my location', locating: 'Finding nearby kiosks…', demo: 'Showing example kiosks near Bengaluru. Use your location for a local view.', live: 'Showing kiosks near your approximate location.', privacy: 'Your location is used only in this browser and is not saved to your MediKit profile.', directions: 'Directions', demoPin: 'Demo kiosk', away: 'away', unable: 'We could not access your location. Showing the Bengaluru demo area instead.', notice: 'Demo locations', noticeText: 'These sample pins show the kiosk experience. Connect your verified kiosk directory before production.' },
  ta: { eyebrow: 'உங்களுக்கு அருகிலுள்ள பராமரிப்பு', title: 'அருகிலுள்ள MediKit கியோஸ்க்குகள்', description: 'வழிகாட்டப்பட்ட பரிசோதனை அல்லது உதவியுடன் முக்கிய அறிகுறி அளவீட்டிற்கு அருகிலுள்ள கியோஸ்க்கைக் கண்டறியுங்கள்.', find: 'என் இருப்பிடத்தைப் பயன்படுத்து', locating: 'அருகிலுள்ள கியோஸ்க்குகள் கண்டறியப்படுகின்றன…', demo: 'பெங்களூரு மாதிரி பகுதியில் கியோஸ்க்குகள் காட்டப்படுகின்றன. உள்ளூர் காட்சிக்கு உங்கள் இருப்பிடத்தைப் பயன்படுத்துங்கள்.', live: 'உங்கள் தோராயமான இருப்பிடத்திற்கு அருகிலுள்ள கியோஸ்க்குகள் காட்டப்படுகின்றன.', privacy: 'உங்கள் இருப்பிடம் இந்த உலாவியில் மட்டுமே பயன்படுத்தப்படும்; MediKit சுயவிவரத்தில் சேமிக்கப்படாது.', directions: 'வழிகள்', demoPin: 'மாதிரி கியோஸ்க்', away: 'தொலைவில்', unable: 'உங்கள் இருப்பிடத்தைப் பெற முடியவில்லை. பெங்களூரு மாதிரி பகுதி காட்டப்படுகிறது.', notice: 'மாதிரி இருப்பிடங்கள்', noticeText: 'இந்த மாதிரி பின்கள் கியோஸ்க் அனுபவத்தைக் காட்டுகின்றன. தயாரிப்பிற்கு முன் சரிபார்க்கப்பட்ட கியோஸ்க் கோப்பகத்தை இணைக்கவும்.' },
  hi: { eyebrow: 'आपके पास देखभाल', title: 'निकटतम MediKit कियोस्क', description: 'निर्देशित जांच या सहायक महत्वपूर्ण संकेत रीडिंग के लिए पास का कियोस्क खोजें।', find: 'मेरा स्थान उपयोग करें', locating: 'पास के कियोस्क खोजे जा रहे हैं…', demo: 'बेंगलुरु डेमो क्षेत्र के पास उदाहरण कियोस्क दिखाए जा रहे हैं। स्थानीय दृश्य के लिए अपना स्थान उपयोग करें।', live: 'आपके अनुमानित स्थान के पास कियोस्क दिखाए जा रहे हैं।', privacy: 'आपका स्थान केवल इस ब्राउज़र में उपयोग होता है और MediKit प्रोफ़ाइल में सहेजा नहीं जाता।', directions: 'दिशा-निर्देश', demoPin: 'डेमो कियोस्क', away: 'दूर', unable: 'आपका स्थान नहीं मिल सका। इसके बजाय बेंगलुरु डेमो क्षेत्र दिखाया जा रहा है।', notice: 'डेमो स्थान', noticeText: 'ये नमूना पिन कियोस्क अनुभव दिखाते हैं। उत्पादन से पहले अपना सत्यापित कियोस्क डायरेक्टरी जोड़ें।' },
  te: { eyebrow: 'మీకు సమీపంలోని సంరక్షణ', title: 'సమీప MediKit కియోస్క్‌లు', description: 'గైడెడ్ చెక్-ఇన్ లేదా సహాయక ముఖ్య సంకేతాల కొలత కోసం సమీప కియోస్క్‌ను కనుగొనండి.', find: 'నా స్థానాన్ని ఉపయోగించండి', locating: 'సమీప కియోస్క్‌లు కనుగొనబడుతున్నాయి…', demo: 'బెంగళూరు డెమో ప్రాంతం సమీపంలో ఉదాహరణ కియోస్క్‌లు చూపబడుతున్నాయి. స్థానిక వీక్షణ కోసం మీ స్థానాన్ని ఉపయోగించండి.', live: 'మీ సుమారు స్థానానికి సమీపంలో కియోస్క్‌లు చూపబడుతున్నాయి.', privacy: 'మీ స్థానం ఈ బ్రౌజర్‌లో మాత్రమే ఉపయోగించబడుతుంది; MediKit ప్రొఫైల్‌లో సేవ్ చేయబడదు.', directions: 'దిశలు', demoPin: 'డెమో కియోస్క్', away: 'దూరంలో', unable: 'మీ స్థానాన్ని పొందలేకపోయాము. బదులుగా బెంగళూరు డెమో ప్రాంతాన్ని చూపిస్తున్నాము.', notice: 'డెమో స్థానాలు', noticeText: 'ఈ నమూనా పిన్‌లు కియోస్క్ అనుభవాన్ని చూపుతాయి. ప్రొడక్షన్‌కు ముందు ధృవీకరించిన కియోస్క్ డైరెక్టరీని కనెక్ట్ చేయండి.' }
};

function kiosksNear(origin) {
  const templates = [
    ['MediKit Vital Station', 0.72, 28, '7:00 AM – 9:00 PM'],
    ['MediKit Care Point', 1.25, 164, '8:00 AM – 8:00 PM'],
    ['MediKit Health Kiosk', 2.05, 284, 'Open today']
  ];
  const offset = Math.abs(Math.floor((origin.lat * 1000) + (origin.lng * 1000))) % 38;
  return templates.map(([name, distance, angle, hours], index) => {
    const radians = ((angle + offset) * Math.PI) / 180;
    const latitude = origin.lat + (distance * Math.cos(radians)) / 111.32;
    const longitude = origin.lng + (distance * Math.sin(radians)) / (111.32 * Math.cos((origin.lat * Math.PI) / 180));
    return { id: `${index}-${latitude.toFixed(4)}`, name, distance, hours, lat: latitude, lng: longitude };
  });
}

export default function KioskMap() {
  const { language } = useI18n();
  const copy = translations[language] || translations.en;
  const [location, setLocation] = useState(null); const [locating, setLocating] = useState(false); const [message, setMessage] = useState(''); const [mapReady, setMapReady] = useState(false); const [selected, setSelected] = useState(null);
  const mapElement = useRef(null); const map = useRef(null); const leaflet = useRef(null); const markers = useRef(null);
  const origin = location || exampleLocation; const kiosks = useMemo(() => kiosksNear(origin), [origin.lat, origin.lng]);

  useEffect(() => {
    let mounted = true;
    import('leaflet').then((module) => {
      if (!mounted || !mapElement.current) return;
      const L = module.default || module; leaflet.current = L;
      map.current = L.map(mapElement.current, { zoomControl: false, scrollWheelZoom: false }).setView([origin.lat, origin.lng], 14);
      L.control.zoom({ position: 'bottomright' }).addTo(map.current);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map.current);
      markers.current = L.layerGroup().addTo(map.current); setMapReady(true);
    });
    return () => { mounted = false; map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!mapReady || !map.current || !leaflet.current || !markers.current) return;
    const L = leaflet.current; markers.current.clearLayers(); map.current.setView([origin.lat, origin.lng], location ? 14 : 12);
    L.circleMarker([origin.lat, origin.lng], { radius: 9, color: '#ffffff', weight: 3, fillColor: '#087d55', fillOpacity: 1 }).bindPopup(location ? 'Your approximate location' : exampleLocation.label).addTo(markers.current);
    kiosks.forEach((kiosk) => {
      const marker = L.marker([kiosk.lat, kiosk.lng], { icon: L.divIcon({ className: 'kiosk-map-marker', html: '<span>+</span>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).bindPopup(`<strong>${kiosk.name}</strong><br>${kiosk.distance.toFixed(1)} km away<br>${copy.demoPin}`);
      marker.on('click', () => setSelected(kiosk.id)); marker.addTo(markers.current);
    });
  }, [copy.demoPin, kiosks, location, mapReady, origin.lat, origin.lng]);

  const useLocation = () => {
    if (!navigator.geolocation) { setMessage(copy.unable); return; }
    setLocating(true); setMessage('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocation({ lat: coords.latitude, lng: coords.longitude }); setLocating(false); },
      () => { setMessage(copy.unable); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };
  const showKiosk = (kiosk) => { setSelected(kiosk.id); map.current?.flyTo([kiosk.lat, kiosk.lng], 16, { duration: .6 }); };
  const directions = (kiosk) => `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.lat},${origin.lng};${kiosk.lat},${kiosk.lng}`;

  return <section className="kiosk-section"><div className="kiosk-heading"><div><span className="eyebrow"><span className="dot" />{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.description}</p></div><button className="outline-button kiosk-location-button" onClick={useLocation} disabled={locating}><Icon name="pulse" size={16} />{locating ? copy.locating : copy.find}</button></div><div className="kiosk-map-grid"><div className="kiosk-map-wrap"><div ref={mapElement} className="kiosk-map" aria-label={copy.title} /><span className="map-demo-badge">{copy.demoPin}</span></div><div className="kiosk-list">{kiosks.map((kiosk) => <article className={selected === kiosk.id ? 'kiosk-card selected' : 'kiosk-card'} key={kiosk.id}><button className="kiosk-card-main" onClick={() => showKiosk(kiosk)}><span className="kiosk-icon"><Icon name="cross" size={17} /></span><span><b>{kiosk.name}</b><small>{kiosk.distance.toFixed(1)} km {copy.away} · {kiosk.hours}</small></span></button><a className="kiosk-directions" href={directions(kiosk)} target="_blank" rel="noreferrer">{copy.directions} <Icon name="arrow" size={14} /></a></article>)}</div></div><p className="kiosk-location-note"><Icon name="shield" size={15} />{message || (location ? copy.live : copy.demo)}</p><aside className="kiosk-demo-note"><b>{copy.notice}</b><span>{copy.noticeText}</span></aside></section>;
}
