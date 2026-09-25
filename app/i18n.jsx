'use client';
import { voiceFocus } from './use-background-mic';
import { browserUtterance, speechUnavailable } from './browser-speech.mjs';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createLocalizer, normalizePhrase } from './localize-dom.mjs';
import { additionalTranslations } from './translations.mjs';
import { FullscreenToggle } from './fullscreen-toggle';

const translations = {
  en: {
    language: 'Language', solutions: 'Solutions', howItWorks: 'How it works', forClinicians: 'For clinicians', signIn: 'Sign in', getStarted: 'Get started', startCheck: 'Start a check', dashboard: 'Overview', healthChecks: 'Health checks', appointments: 'Appointments', messages: 'Messages', patients: 'Patients', clinicianDashboard: 'Dashboard', careWorkspace: 'Care workspace', myHealth: 'My health space', signOut: 'Sign out', bookCare: 'Book care', liveDashboard: 'Live device dashboard', todaysVitals: "Today's vital signs", refreshLive: 'Refresh live data', heartRate: 'Heart rate', bloodOxygen: 'Blood oxygen', bloodPressure: 'Blood pressure', temperature: 'Temperature', updated: 'Updated', deviceConnecting: 'Connecting to device…', deviceUnavailable: 'Device feed unavailable', awarenessOnly: 'Vitals are shown for awareness, not diagnosis.', autoRefresh: 'Automatic refresh every 10 seconds', healthRecord: 'Health record', abhaRecord: 'ABHA health record', linkAbha: 'Link ABHA card', linked: 'Linked', notLinked: 'Not linked', previousVisits: 'Previous visits', clinicHistory: 'Clinic history', medicines: 'Medicines', medicinePlan: 'Your medicine plan', addMedicine: 'Add medicine', active: 'Active', completeTesting: 'Complete testing hub', viewAllTests: 'View all tests', yourActivity: 'Your activity', checkHistory: 'Health check history', complete: 'Complete', privateHealth: 'Your private health space', findForward: 'Find a clearer way forward.', startCheckNow: 'Start check', viewCheck: 'View check', seeSummary: 'See my summary', backChecks: 'Back to health checks', secureSignIn: 'Secure sign in', welcomeBack: 'Welcome back.', patient: 'Patient', clinician: 'Clinician', email: 'Email address', password: 'Password', rememberMe: 'Remember me', forgotPassword: 'Forgot password?', createAccount: 'Create an account', createYourAccount: 'Create your account', fullName: 'Full name', createPassword: 'Create a password', patientPortal: 'Patient portal', doctorPortal: 'Clinician portal', goodMorning: 'Good morning', wellbeing: 'Wellbeing', healthJourney: 'Your health journey', nextAppointment: 'Next appointment', healthFocus: 'Health focus', visitHistory: 'View all care history', save: 'Save', cancel: 'Cancel', manage: 'Manage', clinic: 'Clinic', newMessage: 'New message', demo: 'Demo', today: 'Today'
  },
  ta: {
    language: 'மொழி', solutions: 'தீர்வுகள்', howItWorks: 'எப்படி செயல்படுகிறது', forClinicians: 'மருத்துவக் குழுக்களுக்கு', signIn: 'உள்நுழைக', getStarted: 'தொடங்குங்கள்', startCheck: 'பரிசோதனையைத் தொடங்கு', dashboard: 'கண்ணோட்டம்', healthChecks: 'சுகாதார பரிசோதனைகள்', appointments: 'சந்திப்புகள்', messages: 'செய்திகள்', patients: 'நோயாளிகள்', clinicianDashboard: 'டாஷ்போர்டு', careWorkspace: 'பராமரிப்பு பணியிடம்', myHealth: 'என் சுகாதார இடம்', signOut: 'வெளியேறு', bookCare: 'பராமரிப்பை முன்பதிவு செய்', liveDashboard: 'நேரடி சாதன டாஷ்போர்டு', todaysVitals: 'இன்றைய முக்கிய அறிகுறிகள்', refreshLive: 'நேரடி தரவைப் புதுப்பி', heartRate: 'இதயத் துடிப்பு', bloodOxygen: 'இரத்த ஆக்சிஜன்', bloodPressure: 'இரத்த அழுத்தம்', temperature: 'வெப்பநிலை', updated: 'புதுப்பிக்கப்பட்டது', deviceConnecting: 'சாதனத்துடன் இணைக்கப்படுகிறது…', deviceUnavailable: 'சாதனத் தரவு கிடைக்கவில்லை', awarenessOnly: 'முக்கிய அறிகுறிகள் விழிப்புணர்வுக்காக மட்டுமே; நோய் கண்டறிதலுக்காக அல்ல.', autoRefresh: 'ஒவ்வொரு 10 விநாடிக்கும் தானியங்கி புதுப்பிப்பு', healthRecord: 'சுகாதாரப் பதிவு', abhaRecord: 'ABHA சுகாதாரப் பதிவு', linkAbha: 'ABHA அட்டையை இணை', linked: 'இணைக்கப்பட்டது', notLinked: 'இணைக்கப்படவில்லை', previousVisits: 'முந்தைய வருகைகள்', clinicHistory: 'கிளினிக் வரலாறு', medicines: 'மருந்துகள்', medicinePlan: 'உங்கள் மருந்துத் திட்டம்', addMedicine: 'மருந்தைச் சேர்', active: 'செயலில்', completeTesting: 'முழுமையான பரிசோதனை மையம்', viewAllTests: 'அனைத்து பரிசோதனைகளையும் காண்க', yourActivity: 'உங்கள் செயல்பாடு', checkHistory: 'பரிசோதனை வரலாறு', complete: 'முடிந்தது', privateHealth: 'உங்கள் தனிப்பட்ட சுகாதார இடம்', findForward: 'தெளிவான வழியைத் தேடுங்கள்.', startCheckNow: 'பரிசோதனையைத் தொடங்கு', viewCheck: 'பரிசோதனையைக் காண்க', seeSummary: 'என் சுருக்கத்தைக் காண்க', backChecks: 'சுகாதார பரிசோதனைகளுக்குத் திரும்பு', secureSignIn: 'பாதுகாப்பான உள்நுழைவு', welcomeBack: 'மீண்டும் வரவேற்கிறோம்.', patient: 'நோயாளர்', clinician: 'மருத்துவர்', email: 'மின்னஞ்சல் முகவரி', password: 'கடவுச்சொல்', rememberMe: 'என்னை நினைவில் கொள்', forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?', createAccount: 'கணக்கை உருவாக்கு', createYourAccount: 'உங்கள் கணக்கை உருவாக்கு', fullName: 'முழுப் பெயர்', createPassword: 'கடவுச்சொல்லை உருவாக்கு', patientPortal: 'நோயாளர் தளம்', doctorPortal: 'மருத்துவர் தளம்', goodMorning: 'காலை வணக்கம்', wellbeing: 'நல்வாழ்வு', healthJourney: 'உங்கள் சுகாதாரப் பயணம்', nextAppointment: 'அடுத்த சந்திப்பு', healthFocus: 'சுகாதார கவனம்', visitHistory: 'அனைத்து பராமரிப்பு வரலாற்றையும் காண்க', save: 'சேமி', cancel: 'ரத்து செய்', manage: 'நிர்வகி', clinic: 'கிளினிக்', newMessage: 'புதிய செய்தி', demo: 'மாதிரி', today: 'இன்று'
  },
  hi: {
    language: 'भाषा', solutions: 'समाधान', howItWorks: 'यह कैसे काम करता है', forClinicians: 'चिकित्सक टीमों के लिए', signIn: 'साइन इन करें', getStarted: 'शुरू करें', startCheck: 'जांच शुरू करें', dashboard: 'अवलोकन', healthChecks: 'स्वास्थ्य जांच', appointments: 'अपॉइंटमेंट', messages: 'संदेश', patients: 'मरीज़', clinicianDashboard: 'डैशबोर्ड', careWorkspace: 'केयर वर्कस्पेस', myHealth: 'मेरा स्वास्थ्य स्थान', signOut: 'साइन आउट', bookCare: 'देखभाल बुक करें', liveDashboard: 'लाइव डिवाइस डैशबोर्ड', todaysVitals: 'आज के महत्वपूर्ण संकेत', refreshLive: 'लाइव डेटा रीफ्रेश करें', heartRate: 'हृदय गति', bloodOxygen: 'रक्त ऑक्सीजन', bloodPressure: 'रक्तचाप', temperature: 'तापमान', updated: 'अपडेट किया गया', deviceConnecting: 'डिवाइस से कनेक्ट किया जा रहा है…', deviceUnavailable: 'डिवाइस डेटा उपलब्ध नहीं है', awarenessOnly: 'महत्वपूर्ण संकेत केवल जागरूकता के लिए हैं, निदान के लिए नहीं।', autoRefresh: 'हर 10 सेकंड में स्वचालित रीफ्रेश', healthRecord: 'स्वास्थ्य रिकॉर्ड', abhaRecord: 'ABHA स्वास्थ्य रिकॉर्ड', linkAbha: 'ABHA कार्ड जोड़ें', linked: 'जुड़ा हुआ', notLinked: 'जुड़ा नहीं है', previousVisits: 'पिछली विज़िट', clinicHistory: 'क्लिनिक इतिहास', medicines: 'दवाइयाँ', medicinePlan: 'आपकी दवा योजना', addMedicine: 'दवा जोड़ें', active: 'सक्रिय', completeTesting: 'पूर्ण जांच केंद्र', viewAllTests: 'सभी जांच देखें', yourActivity: 'आपकी गतिविधि', checkHistory: 'जांच इतिहास', complete: 'पूर्ण', privateHealth: 'आपका निजी स्वास्थ्य स्थान', findForward: 'एक स्पष्ट रास्ता खोजें।', startCheckNow: 'जांच शुरू करें', viewCheck: 'जांच देखें', seeSummary: 'मेरा सारांश देखें', backChecks: 'स्वास्थ्य जांच पर वापस जाएँ', secureSignIn: 'सुरक्षित साइन इन', welcomeBack: 'वापस स्वागत है।', patient: 'मरीज़', clinician: 'चिकित्सक', email: 'ईमेल पता', password: 'पासवर्ड', rememberMe: 'मुझे याद रखें', forgotPassword: 'पासवर्ड भूल गए?', createAccount: 'खाता बनाएँ', createYourAccount: 'अपना खाता बनाएँ', fullName: 'पूरा नाम', createPassword: 'पासवर्ड बनाएँ', patientPortal: 'मरीज़ पोर्टल', doctorPortal: 'चिकित्सक पोर्टल', goodMorning: 'सुप्रभात', wellbeing: 'कल्याण', healthJourney: 'आपकी स्वास्थ्य यात्रा', nextAppointment: 'अगली अपॉइंटमेंट', healthFocus: 'स्वास्थ्य फोकस', visitHistory: 'पूरा देखभाल इतिहास देखें', save: 'सहेजें', cancel: 'रद्द करें', manage: 'प्रबंधित करें', clinic: 'क्लिनिक', newMessage: 'नया संदेश', demo: 'डेमो', today: 'आज'
  },
  te: {
    language: 'భాష', solutions: 'పరిష్కారాలు', howItWorks: 'ఇది ఎలా పనిచేస్తుంది', forClinicians: 'వైద్య బృందాల కోసం', signIn: 'సైన్ ఇన్', getStarted: 'ప్రారంభించండి', startCheck: 'పరీక్ష ప్రారంభించండి', dashboard: 'అవలోకనం', healthChecks: 'ఆరోగ్య పరీక్షలు', appointments: 'అపాయింట్‌మెంట్లు', messages: 'సందేశాలు', patients: 'రోగులు', clinicianDashboard: 'డాష్‌బోర్డ్', careWorkspace: 'సంరక్షణ వర్క్‌స్పేస్', myHealth: 'నా ఆరోగ్య స్థలం', signOut: 'సైన్ అవుట్', bookCare: 'సంరక్షణ బుక్ చేయండి', liveDashboard: 'లైవ్ డివైస్ డాష్‌బోర్డ్', todaysVitals: 'నేటి ముఖ్య సంకేతాలు', refreshLive: 'లైవ్ డేటా రిఫ్రెష్ చేయండి', heartRate: 'హృదయ స్పందన', bloodOxygen: 'రక్త ఆక్సిజన్', bloodPressure: 'రక్తపోటు', temperature: 'ఉష్ణోగ్రత', updated: 'నవీకరించబడింది', deviceConnecting: 'పరికరానికి కనెక్ట్ అవుతోంది…', deviceUnavailable: 'పరికర డేటా అందుబాటులో లేదు', awarenessOnly: 'ముఖ్య సంకేతాలు అవగాహన కోసం మాత్రమే, నిర్ధారణ కోసం కాదు.', autoRefresh: 'ప్రతి 10 సెకన్లకు స్వయంచాలక రిఫ్రెష్', healthRecord: 'ఆరోగ్య రికార్డు', abhaRecord: 'ABHA ఆరోగ్య రికార్డు', linkAbha: 'ABHA కార్డ్ లింక్ చేయండి', linked: 'లింక్ చేయబడింది', notLinked: 'లింక్ చేయలేదు', previousVisits: 'మునుపటి సందర్శనలు', clinicHistory: 'క్లినిక్ చరిత్ర', medicines: 'మందులు', medicinePlan: 'మీ మందుల ప్రణాళిక', addMedicine: 'మందు జోడించండి', active: 'యాక్టివ్', completeTesting: 'పూర్తి పరీక్షా కేంద్రం', viewAllTests: 'అన్ని పరీక్షలు చూడండి', yourActivity: 'మీ కార్యాచరణ', checkHistory: 'పరీక్ష చరిత్ర', complete: 'పూర్తయింది', privateHealth: 'మీ ప్రైవేట్ ఆరోగ్య స్థలం', findForward: 'స్పష్టమైన మార్గాన్ని కనుగొనండి.', startCheckNow: 'పరీక్ష ప్రారంభించండి', viewCheck: 'పరీక్ష చూడండి', seeSummary: 'నా సారాంశం చూడండి', backChecks: 'ఆరోగ్య పరీక్షలకు తిరిగి వెళ్ళండి', secureSignIn: 'సురక్షిత సైన్ ఇన్', welcomeBack: 'తిరిగి స్వాగతం.', patient: 'రోగి', clinician: 'వైద్యుడు', email: 'ఇమెయిల్ చిరునామా', password: 'పాస్‌వర్డ్', rememberMe: 'నన్ను గుర్తుంచుకోండి', forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?', createAccount: 'ఖాతా సృష్టించండి', createYourAccount: 'మీ ఖాతాను సృష్టించండి', fullName: 'పూర్తి పేరు', createPassword: 'పాస్‌వర్డ్ సృష్టించండి', patientPortal: 'రోగి పోర్టల్', doctorPortal: 'వైద్యుల పోర్టల్', goodMorning: 'శుభోదయం', wellbeing: 'శ్రేయస్సు', healthJourney: 'మీ ఆరోగ్య ప్రయాణం', nextAppointment: 'తదుపరి అపాయింట్‌మెంట్', healthFocus: 'ఆరోగ్య దృష్టి', visitHistory: 'అన్ని సంరక్షణ చరిత్ర చూడండి', save: 'సేవ్ చేయండి', cancel: 'రద్దు చేయండి', manage: 'నిర్వహించండి', clinic: 'క్లినిక్', newMessage: 'కొత్త సందేశం', demo: 'డెమో', today: 'ఈ రోజు'
  }
};

const contentTranslations = {
  ta: {
    'Your health, your way': 'உங்கள் சுகாதாரம், உங்கள் வழி', 'Start with one small check-in.': 'ஒரு சிறிய சுகாதார பரிசோதனையுடன் தொடங்குங்கள்.', 'Health care that': 'வாழ்க்கையோடு இணைந்து செல்லும்', 'keeps up': 'சுகாதாரப் பராமரிப்பு', 'with life.': 'உங்களுக்காக.', 'One connected experience for your health.': 'உங்கள் சுகாதாரத்திற்கான ஒருங்கிணைந்த அனுபவம்.', 'Less guesswork.': 'குறைவான ஊகம்.', 'More confidence.': 'அதிக நம்பிக்கை.', 'Thoughtful care, at every step.': 'ஒவ்வொரு கட்டத்திலும் அக்கறையான பராமரிப்பு.', 'Better context makes better care.': 'சிறந்த தகவல் சிறந்த பராமரிப்பை உருவாக்கும்.', 'Good morning,': 'காலை வணக்கம்,', 'Here’s a calm view of your health today.': 'இன்று உங்கள் சுகாதாரத்தின் தெளிவான கண்ணோட்டம் இதோ.', 'Your health picture is taking shape.': 'உங்கள் சுகாதாரப் படம் உருவாகி வருகிறது.', 'Start with a small check-in.': 'ஒரு சிறிய பரிசோதனையுடன் தொடங்குங்கள்.', 'Your health journey': 'உங்கள் சுகாதாரப் பயணம்', 'Your wellbeing snapshot': 'உங்கள் நல்வாழ்வு சுருக்கம்', 'Your progress': 'உங்கள் முன்னேற்றம்', 'One small step today.': 'இன்று ஒரு சிறிய படி.', 'Your next visit.': 'உங்கள் அடுத்த வருகை.', 'Your care schedule': 'உங்கள் பராமரிப்பு அட்டவணை', 'Find a time that works.': 'உங்களுக்கு ஏற்ற நேரத்தைக் கண்டறியுங்கள்.', 'Your care team': 'உங்கள் பராமரிப்பு குழு', 'Your personal health summary will appear here.': 'உங்கள் தனிப்பட்ட சுகாதார சுருக்கம் இங்கே தோன்றும்.', 'Private by design': 'தனியுரிமையுடன் வடிவமைக்கப்பட்டது', 'Takes just minutes': 'சில நிமிடங்கள் மட்டுமே ஆகும்'
  },
  hi: {
    'Your health, your way': 'आपका स्वास्थ्य, आपके तरीके से', 'Start with one small check-in.': 'एक छोटी स्वास्थ्य जांच से शुरू करें।', 'Health care that': 'स्वास्थ्य देखभाल जो', 'keeps up': 'जीवन के साथ चलती है', 'with life.': '', 'One connected experience for your health.': 'आपके स्वास्थ्य के लिए एक जुड़ा हुआ अनुभव।', 'Less guesswork.': 'कम अनुमान।', 'More confidence.': 'अधिक भरोसा।', 'Thoughtful care, at every step.': 'हर कदम पर सोच-समझकर देखभाल।', 'Better context makes better care.': 'बेहतर जानकारी बेहतर देखभाल बनाती है।', 'Good morning,': 'सुप्रभात,', 'Here’s a calm view of your health today.': 'आज आपके स्वास्थ्य का एक स्पष्ट दृश्य।', 'Your health picture is taking shape.': 'आपके स्वास्थ्य की तस्वीर आकार ले रही है।', 'Start with a small check-in.': 'एक छोटी जांच से शुरू करें।', 'Your health journey': 'आपकी स्वास्थ्य यात्रा', 'Your wellbeing snapshot': 'आपकी कल्याण झलक', 'Your progress': 'आपकी प्रगति', 'One small step today.': 'आज एक छोटा कदम।', 'Your next visit.': 'आपकी अगली विज़िट।', 'Your care schedule': 'आपकी देखभाल समय-सारणी', 'Find a time that works.': 'आपके लिए सही समय खोजें।', 'Your care team': 'आपकी देखभाल टीम', 'Your personal health summary will appear here.': 'आपका व्यक्तिगत स्वास्थ्य सारांश यहाँ दिखाई देगा।', 'Private by design': 'डिज़ाइन से निजी', 'Takes just minutes': 'बस कुछ मिनट लगते हैं'
  },
  te: {
    'Your health, your way': 'మీ ఆరోగ్యం, మీ విధానం', 'Start with one small check-in.': 'ఒక చిన్న ఆరోగ్య పరీక్షతో ప్రారంభించండి.', 'Health care that': 'జీవితానికి అనుగుణంగా ఉండే', 'keeps up': 'ఆరోగ్య సంరక్షణ', 'with life.': 'మీ కోసం.', 'One connected experience for your health.': 'మీ ఆరోగ్యానికి ఒక అనుసంధాన అనుభవం.', 'Less guesswork.': 'తక్కువ ఊహ.', 'More confidence.': 'ఎక్కువ నమ్మకం.', 'Thoughtful care, at every step.': 'ప్రతి దశలో ఆలోచనాత్మక సంరక్షణ.', 'Better context makes better care.': 'మెరుగైన సమాచారం మెరుగైన సంరక్షణను అందిస్తుంది.', 'Good morning,': 'శుభోదయం,', 'Here’s a calm view of your health today.': 'ఈరోజు మీ ఆరోగ్యం యొక్క స్పష్టమైన వీక్షణ ఇదిగో.', 'Your health picture is taking shape.': 'మీ ఆరోగ్య చిత్రం రూపుదిద్దుకుంటోంది.', 'Start with a small check-in.': 'ఒక చిన్న పరీక్షతో ప్రారంభించండి.', 'Your health journey': 'మీ ఆరోగ్య ప్రయాణం', 'Your wellbeing snapshot': 'మీ శ్రేయస్సు సారాంశం', 'Your progress': 'మీ పురోగతి', 'One small step today.': 'ఈరోజు ఒక చిన్న అడుగు.', 'Your next visit.': 'మీ తదుపరి సందర్శన.', 'Your care schedule': 'మీ సంరక్షణ షెడ్యూల్', 'Find a time that works.': 'మీకు సరిపోయే సమయాన్ని కనుగొనండి.', 'Your care team': 'మీ సంరక్షణ బృందం', 'Your personal health summary will appear here.': 'మీ వ్యక్తిగత ఆరోగ్య సారాంశం ఇక్కడ కనిపిస్తుంది.', 'Private by design': 'స్వభావత గోప్యతతో', 'Takes just minutes': 'కొన్ని నిమిషాలు మాత్రమే పడుతుంది'
  }
};

const labels = { en: 'English', ta: 'தமிழ்', hi: 'हिंदी', te: 'తెలుగు' };
const supportedLanguages = new Set(Object.keys(labels));

function browserLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const candidates = [...(navigator.languages || []), navigator.language].filter(Boolean);
  const match = candidates.map((candidate) => candidate.toLowerCase().split('-')[0]).find((candidate) => supportedLanguages.has(candidate));
  return match || 'en';
}
const literalKeys = {
  'Solutions': 'solutions', 'How it works': 'howItWorks', 'For clinicians': 'forClinicians', 'Sign in': 'signIn', 'Get started': 'getStarted', 'Start a check': 'startCheck', 'Overview': 'dashboard', 'Health checks': 'healthChecks', 'Appointments': 'appointments', 'Messages': 'messages', 'Patients': 'patients', 'Dashboard': 'clinicianDashboard', 'Care workspace': 'careWorkspace', 'My health space': 'myHealth', 'Book care': 'bookCare', 'LIVE DEVICE DASHBOARD': 'liveDashboard', "Today's vital signs": 'todaysVitals', 'Refresh live data': 'refreshLive', 'Heart rate': 'heartRate', 'Blood oxygen': 'bloodOxygen', 'Blood pressure': 'bloodPressure', 'Temperature': 'temperature', 'Connecting to device…': 'deviceConnecting', 'Device feed unavailable': 'deviceUnavailable', 'ABHA health record': 'abhaRecord', 'Link ABHA card': 'linkAbha', 'Linked': 'linked', 'Not linked': 'notLinked', 'Previous visits': 'previousVisits', 'CLINIC HISTORY': 'clinicHistory', 'Medicines': 'medicines', 'MEDICINES': 'medicines', 'Your medicine plan': 'medicinePlan', 'Add medicine': 'addMedicine', 'Active': 'active', 'COMPLETE TESTING HUB': 'completeTesting', 'View all tests': 'viewAllTests', 'YOUR ACTIVITY': 'yourActivity', 'Health check history': 'checkHistory', 'Complete': 'complete', 'YOUR PRIVATE HEALTH SPACE': 'privateHealth', 'Find a clearer way forward.': 'findForward', 'Start check': 'startCheckNow', 'View check': 'viewCheck', 'See my summary': 'seeSummary', 'Back to health checks': 'backChecks', 'SECURE SIGN IN': 'secureSignIn', 'Welcome back.': 'welcomeBack', 'Patient': 'patient', 'Clinician': 'clinician', 'Email address': 'email', 'Password': 'password', 'Remember me': 'rememberMe', 'Forgot password?': 'forgotPassword', 'Create an account': 'createAccount', 'CREATE YOUR ACCOUNT': 'createYourAccount', 'Full name': 'fullName', 'Create a password': 'createPassword', 'New message': 'newMessage', 'Today': 'today'
};
const I18nContext = createContext(null);

const dictionaries = Object.fromEntries(['ta', 'hi', 'te'].map((language) => {
  const phrases = {};
  Object.entries(translations.en).forEach(([key, source]) => { phrases[normalizePhrase(source)] = translations[language][key]; });
  Object.entries(literalKeys).forEach(([source, key]) => { phrases[normalizePhrase(source)] = translations[language][key]; });
  Object.entries({ ...contentTranslations[language], ...additionalTranslations[language] }).forEach(([source, text]) => { phrases[normalizePhrase(source)] = text; });
  return [language, phrases];
}));

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [ready, setReady] = useState(false);
  const localize = useMemo(() => createLocalizer(dictionaries), []);
  useEffect(() => {
    let saved;
    try { saved = window.localStorage.getItem('medikit-language'); } catch { /* Storage may be disabled. */ }
    setLanguage(supportedLanguages.has(saved) ? saved : browserLanguage());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem('medikit-language', language); } catch { /* Switching still works without storage. */ }
    document.documentElement.lang = language;
  }, [language, ready]);
  useEffect(() => {
    if (!ready) return;
    const options = { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] };
    // Disconnect while writing to avoid observing our own translations.
    const localiseText = () => {
      observer.disconnect();
      localize(document.body, language);
      observer.observe(document.body, options);
    };
    const observer = new MutationObserver(localiseText);
    localiseText();
    return () => observer.disconnect();
  }, [language, ready, localize]);
  const value = useMemo(() => ({ language, setLanguage, t: (key, fallback) => translations[language]?.[key] || translations.en[key] || fallback || key }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}

export function LanguagePicker({ compact = false, light = false }) {
  const { language, setLanguage, t } = useI18n();
  return <div className={`view-controls${light ? ' light' : ''}`}><label className={`language-picker${compact ? ' compact' : ''}${light ? ' light' : ''}`}><span className="sr-only">{t('language')}</span><select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('language')}><option value="en">EN · {labels.en}</option><option value="ta">தமிழ்</option><option value="hi">हिंदी</option><option value="te">తెలుగు</option></select></label><FullscreenToggle language={language} /></div>;
}

export function AuthLanguagePicker() {
  const pathname = usePathname();
  if (pathname !== '/signin' && pathname !== '/register') return null;
  return <div className="auth-language-picker"><LanguagePicker compact /></div>;
}

const speechLocales = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN', te: 'te-IN' };
const speechLabels = { en: 'Read this section aloud', ta: 'இந்தப் பகுதியை சத்தமாகப் படி', hi: 'इस भाग को ज़ोर से पढ़ें', te: 'ఈ విభాగాన్ని బిగ్గరగా చదవండి' };
const stopLabels = { en: 'Stop reading', ta: 'படிப்பதை நிறுத்து', hi: 'पढ़ना बंद करें', te: 'చదవడం ఆపండి' };
const spokenFallbacks = {
  ta: {
    landing: 'மெடிகிட் உங்கள் சுகாதாரத்தை ஒரே இடத்தில் புரிந்துகொள்ள உதவுகிறது. சுகாதாரப் பரிசோதனைகளை முடித்து, தேவையானபோது மருத்துவருடன் சந்திப்பை முன்பதிவு செய்யலாம்.',
    portal: 'இது உங்கள் தனிப்பட்ட சுகாதார டாஷ்போர்டு. இதில் நலன் சுருக்கம், நேரடி முக்கிய அறிகுறிகள், சுகாதாரப் பரிசோதனைகள், ABHA சுகாதாரப் பதிவு, முந்தைய மருத்துவ வருகைகள் மற்றும் மருந்துத் திட்டம் உள்ளன.',
    screening: 'இந்த சுகாதாரப் பரிசோதனை மையத்தில் உங்கள் நலன், நீரிழிவு அபாயம், இரத்த அழுத்தம் மற்றும் பிற சுகாதாரத் தலைப்புகளுக்கான குறுகிய கேள்வித்தாள்கள் உள்ளன. ஒவ்வொரு பரிசோதனையும் விழிப்புணர்வுக்காக மட்டுமே; நோய் கண்டறிதலுக்காக அல்ல.',
    appointments: 'இந்தப் பகுதியில் உங்கள் சந்திப்புகள் மற்றும் பராமரிப்பு குழுவைப் பார்க்கலாம். உங்களுக்கு ஏற்ற நேரத்தில் புதிய மருத்துவர் சந்திப்பையும் முன்பதிவு செய்யலாம்.',
    doctor: 'இது மருத்துவக் குழுவின் பணியிடம். நோயாளர் பரிசோதனைகள், இன்றைய சந்திப்பு அட்டவணை மற்றும் கவனம் தேவைப்படும் சுகாதாரத் தகவல்களை இங்கே பார்க்கலாம்.',
    messages: 'இந்தப் பகுதியில் உங்கள் பராமரிப்பு குழுவுடனான தனிப்பட்ட செய்திகளைப் பார்க்கலாம் மற்றும் புதிய செய்தி அனுப்பலாம்.',
    auth: 'மெடிகிட்டிற்கு பாதுகாப்பாக உள்நுழையுங்கள். நோயாளர் தளம் அல்லது மருத்துவக் குழு பணியிடத்தைத் தேர்ந்தெடுத்து தொடரலாம்.'
  },
  hi: {
    landing: 'MediKit आपको एक ही स्थान पर अपने स्वास्थ्य को समझने में मदद करता है। स्वास्थ्य जांच पूरी करें और जरूरत होने पर किसी चिकित्सक के साथ अपॉइंटमेंट बुक करें।',
    portal: 'यह आपका निजी स्वास्थ्य डैशबोर्ड है। इसमें आपकी सेहत का सारांश, लाइव महत्वपूर्ण संकेत, स्वास्थ्य जांच, ABHA स्वास्थ्य रिकॉर्ड, पिछली क्लिनिक विज़िट और दवा योजना शामिल है।',
    screening: 'इस स्वास्थ्य जांच केंद्र में आपकी सेहत, मधुमेह जोखिम, रक्तचाप और अन्य स्वास्थ्य विषयों के लिए छोटे प्रश्नपत्र हैं। हर जांच केवल जागरूकता के लिए है, निदान के लिए नहीं।',
    appointments: 'इस भाग में आप अपनी अपॉइंटमेंट और केयर टीम देख सकते हैं। अपने अनुकूल समय पर नई चिकित्सक विज़िट भी बुक कर सकते हैं।',
    doctor: 'यह केयर टीम का कार्यक्षेत्र है। यहाँ रोगी जांच, आज की अपॉइंटमेंट सूची और ध्यान देने योग्य स्वास्थ्य जानकारी दिखाई जाती है।',
    messages: 'इस भाग में आप अपनी केयर टीम के साथ निजी संदेश देख सकते हैं और नया संदेश भेज सकते हैं।',
    auth: 'MediKit में सुरक्षित रूप से साइन इन करें। रोगी पोर्टल या चिकित्सक कार्यक्षेत्र चुनकर आगे बढ़ें।'
  },
  te: {
    landing: 'MediKit మీ ఆరోగ్యాన్ని ఒకే చోట అర్థం చేసుకోవడానికి సహాయపడుతుంది. ఆరోగ్య పరీక్షలను పూర్తి చేసి, అవసరమైనప్పుడు వైద్యుడితో అపాయింట్‌మెంట్ బుక్ చేసుకోవచ్చు.',
    portal: 'ఇది మీ వ్యక్తిగత ఆరోగ్య డాష్‌బోర్డ్. ఇందులో మీ శ్రేయస్సు సారాంశం, ప్రత్యక్ష ముఖ్య సంకేతాలు, ఆరోగ్య పరీక్షలు, ABHA ఆరోగ్య రికార్డు, గత క్లినిక్ సందర్శనలు మరియు మందుల ప్రణాళిక ఉంటాయి.',
    screening: 'ఈ ఆరోగ్య పరీక్షా కేంద్రంలో శ్రేయస్సు, మధుమేహ ప్రమాదం, రక్తపోటు మరియు ఇతర ఆరోగ్య అంశాల కోసం చిన్న ప్రశ్నాపత్రాలు ఉన్నాయి. ప్రతి పరీక్ష అవగాహన కోసం మాత్రమే, నిర్ధారణ కోసం కాదు.',
    appointments: 'ఈ విభాగంలో మీ అపాయింట్‌మెంట్‌లు మరియు సంరక్షణ బృందాన్ని చూడవచ్చు. మీకు అనుకూలమైన సమయానికి కొత్త వైద్య సందర్శనను కూడా బుక్ చేసుకోవచ్చు.',
    doctor: 'ఇది సంరక్షణ బృందం పనిస్థలం. ఇక్కడ రోగి పరీక్షలు, నేటి అపాయింట్‌మెంట్ షెడ్యూల్ మరియు దృష్టి అవసరమైన ఆరోగ్య సమాచారాన్ని చూడవచ్చు.',
    messages: 'ఈ విభాగంలో మీ సంరక్షణ బృందంతో ప్రైవేట్ సందేశాలను చూడవచ్చు మరియు కొత్త సందేశాన్ని పంపవచ్చు.',
    auth: 'MediKitకు సురక్షితంగా సైన్ ఇన్ చేయండి. రోగి పోర్టల్ లేదా వైద్యుల పనిస్థలాన్ని ఎంచుకుని కొనసాగండి.'
  }
};

function fallbackForSection(section, language) {
  if (language === 'en') return '';
  const path = window.location.pathname;
  const className = typeof section.className === 'string' ? section.className : '';
  let key = path === '/' ? 'landing' : path.includes('screening') ? 'screening' : path.includes('appointments') ? 'appointments' : path.includes('messages') ? 'messages' : path.includes('doctor') ? 'doctor' : path === '/signin' || path === '/register' ? 'auth' : 'portal';
  if (className.includes('auth-card')) key = 'auth';
  return spokenFallbacks[language]?.[key] || '';
}

export function SectionSpeechAssistant() {
  const { language } = useI18n();
  useEffect(() => {
    let activeButton = null; let activeAudio = null;
    const finish = (button) => {
      if (activeButton === button) { activeButton = null; voiceFocus('section', false); }
      button.classList.remove('speaking'); button.setAttribute('aria-label', speechLabels[language]); button.title = speechLabels[language];
    };
    const stop = () => {
      window.speechSynthesis?.cancel();
      if (activeAudio) { activeAudio.pause(); URL.revokeObjectURL(activeAudio.src); activeAudio = null; }
      if (activeButton) finish(activeButton);
    };
    const speakSection = async (section, button) => {
      if (activeButton === button) { stop(); return; }
      stop();
      window.speechSynthesis?.cancel();
      const clone = section.cloneNode(true);
      clone.querySelectorAll('[data-speech-ignore]').forEach((item) => item.remove());
      const originalContent = (clone.innerText || '').replace(/\s+/g, ' ').trim();
      if (!originalContent) return;
      voiceFocus('section', true); activeButton = button; button.classList.add('speaking'); button.setAttribute('aria-label', stopLabels[language]); button.title = stopLabels[language];
      let content = originalContent;
      if (language !== 'en') {
        try {
          const response = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: originalContent, targetLanguage: language }) });
          const translated = await response.json();
          content = response.ok && translated.text ? translated.text : fallbackForSection(section, language);
        } catch { content = fallbackForSection(section, language); }
      }
      if (!content || activeButton !== button) { finish(button); return; }
      try {
        const response = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: content, language }) });
        if (!response.ok) throw new Error('Voice unavailable');
        const blob = await response.blob();
        if (activeButton !== button) return;
        const url = URL.createObjectURL(blob); const audio = new Audio(url); activeAudio = audio;
        audio.onended = audio.onerror = () => { URL.revokeObjectURL(url); activeAudio = null; finish(button); };
        await audio.play();
      } catch {
        if (activeButton !== button) return;
        const unavailable = () => { finish(button); button.title = speechUnavailable(language); button.setAttribute('aria-label', speechUnavailable(language)); };
        try {
          const utterance = await browserUtterance(content, language);
          if (activeButton !== button) return;
          utterance.onend = () => finish(button); utterance.onerror = unavailable;
          window.speechSynthesis.speak(utterance);
        } catch { unavailable(); }
      }
    };
    const installButtons = () => {
      document.querySelectorAll('main > section, .portal-content section, .portal-content .abha-card, .portal-content .clinic-visits-card, .portal-content .check-card, .auth-card').forEach((section) => {
        const existing = section.querySelector(':scope > [data-speech-ignore]');
        if (existing?.dataset.speechLanguage === language) return;
        existing?.remove();
        section.classList.add('speakable-section');
        const button = document.createElement('button'); button.type = 'button'; button.className = 'section-speech-button'; button.dataset.speechIgnore = 'true'; button.dataset.speechLanguage = language; button.setAttribute('aria-label', speechLabels[language]); button.title = speechLabels[language];
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"></path><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"></path></svg><span>' + speechLabels[language] + '</span>';
        button.addEventListener('click', () => speakSection(section, button)); section.prepend(button);
      });
    };
    installButtons();
    const observer = new MutationObserver(installButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); stop(); };
  }, [language]);
  return null;
}
