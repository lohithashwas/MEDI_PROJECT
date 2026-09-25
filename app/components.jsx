import Link from 'next/link';

export function Icon({ name, size = 20, stroke = 1.9 }) {
  const paths = {
    cross: <><path d="M12 3v18M3 12h18" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    arrowUp: <><path d="M5 12h14M13 18l6-6-6-6" /></>,
    check: <path d="m5 12 4.2 4L19 6.5" />,
    heart: <path d="M20.8 8.5c0 6-8.8 10.9-8.8 10.9S3.2 14.5 3.2 8.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.8 1.5Z" />,
    drop: <path d="M12 2.8S5.6 10.1 5.6 14.5a6.4 6.4 0 0 0 12.8 0C18.4 10.1 12 2.8 12 2.8Z" />,
    pulse: <path d="M3 12h4l2.2-5 4.1 10L16 12h5" />,
    wind: <><path d="M3 8h11a3 3 0 1 0-2.8-4" /><path d="M3 12h15a3 3 0 1 1-2.8 4" /><path d="M3 16h6" /></>,
    spark: <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />,
    beaker: <><path d="M8 3h8M10 3v6l-5.6 8.5A2.7 2.7 0 0 0 6.7 21h10.6a2.7 2.7 0 0 0 2.3-3.5L14 9V3" /><path d="M7 16h10" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    shield: <path d="M12 3 20 6v5c0 5-3.4 8.1-8 10-4.6-1.9-8-5-8-10V6l8-3Z" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    download: <><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 21h14" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.6-4 3.2-6 8-6s7.4 2 8 6" /></>,
    users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 20c.4-3.6 2.4-5.5 5.5-5.5s5.1 1.9 5.5 5.5M15 15c2.8.1 4.7 1.7 5 4.6" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    clipboard: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6" /></>,
    message: <path d="M21 11.5a8 8 0 0 1-8.4 8L7 22l1.5-4.1A8 8 0 1 1 21 11.5Z" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.4 2.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3.4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.4-2.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4.2v-3.4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L8 5.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h3.4V4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.4 2.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    bell: <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" />,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.3 2" /></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    trend: <><path d="m4 16 5-5 4 3 7-8" /><path d="M15 6h5v5" /></>,
    stethoscope: <><path d="M6 4v5a6 6 0 0 0 12 0V4M9 4v5M15 4v5M18 15a3 3 0 1 0 3 3v-3" /></>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.cross}</svg>;
}

export function Brand({ light = false }) {
  return <Link className={`brand${light ? ' light-brand' : ''}`} href="/"><span className="brand-mark"><Icon name="cross" size={20} /></span><span>medi<span>kit</span></span></Link>;
}

export const checks = [
  { id: 'diabetes', category: 'Questionnaire', icon: 'drop', title: 'Diabetes risk', time: '3 min', description: 'Spot early Type 2 diabetes risk from everyday health indicators.', tags: ['Age & BMI', 'Family history', 'Glucose'], questions: [{ key: 'age', label: 'Your age', type: 'number', placeholder: 'e.g. 42', required: true }, { key: 'bmi', label: 'BMI (if known)', type: 'number', placeholder: 'e.g. 24.5' }, { key: 'family', label: 'Family history of diabetes?', options: ['No', 'Grandparent', 'Parent or sibling'] }, { key: 'activity', label: 'Active days per week', type: 'number', placeholder: '0–7' }, { key: 'glucose', label: 'Most recent glucose result', options: ['Normal / unknown', 'Borderline', 'High'] }] },
  { id: 'pressure', category: 'Questionnaire', icon: 'heart', title: 'Blood pressure', time: '3 min', description: 'Check lifestyle factors that can affect your blood pressure.', tags: ['BP reading', 'Salt intake', 'Stress'], questions: [{ key: 'reading', label: 'Latest blood-pressure reading', placeholder: 'e.g. 120/80' }, { key: 'salt', label: 'How is your salt intake?', options: ['Low', 'Moderate', 'High'] }, { key: 'exercise', label: 'Exercise frequency', options: ['Daily', '3–4 times a week', '1–2 times a week', 'Rarely'] }, { key: 'stress', label: 'Current stress level', options: ['Low', 'Moderate', 'High'] }] },
  { id: 'heart', category: 'Physical checks', icon: 'pulse', title: 'Heart health', time: '4 min', description: 'Review cardiovascular symptoms, movement and recovery signals.', tags: ['Activity', 'Symptoms', 'Recovery'], questions: [{ key: 'breath', label: 'Breathlessness during normal activity?', options: ['Never', 'Occasionally', 'Often'] }, { key: 'pain', label: 'Chest discomfort?', options: ['Never', 'Occasionally', 'Often'] }, { key: 'movement', label: 'Movement most days?', options: ['Yes', 'Sometimes', 'No'] }] },
  { id: 'respiratory', category: 'Physical checks', icon: 'wind', title: 'Respiratory health', time: '3 min', description: 'A simple check-in for lung symptoms and environmental exposure.', tags: ['Breathing', 'Exposure', 'Cough'], questions: [{ key: 'cough', label: 'Persistent cough?', options: ['No', 'Sometimes', 'Often'] }, { key: 'exposure', label: 'Smoke or dust exposure?', options: ['No', 'Occasional', 'Frequent'] }, { key: 'wheeze', label: 'Wheezing or chest tightness?', options: ['No', 'Sometimes', 'Often'] }] },
  { id: 'kidney', category: 'Questionnaire', icon: 'drop', title: 'Kidney health', time: '3 min', description: 'Screen common kidney-health indicators, including urinary symptoms and energy.', tags: ['Swelling', 'Urination', 'Blood pressure'], questions: [{ key: 'swelling', label: 'Swelling in feet, ankles, or legs?', options: ['Never', 'Occasionally', 'Often'] }, { key: 'urine', label: 'Any changes in urination?', options: ['No', 'Sometimes', 'Often'] }, { key: 'bp', label: 'Do you have high blood pressure?', options: ['No / unknown', 'Borderline', 'Yes'] }, { key: 'energy', label: 'How has your energy felt?', options: ['Good', 'Sometimes tired', 'Often fatigued'] }] },
  { id: 'liver', category: 'Questionnaire', icon: 'shield', title: 'Liver health', time: '3 min', description: 'A short lifestyle and symptom check that supports liver-health awareness.', tags: ['Lifestyle', 'Symptoms', 'Energy'], questions: [{ key: 'alcohol', label: 'Alcohol consumption?', options: ['None', 'Occasional', 'Moderate', 'Frequent'] }, { key: 'appetite', label: 'Changes in appetite?', options: ['No changes', 'Slight change', 'Significant change'] }, { key: 'fatigue', label: 'Unexplained fatigue?', options: ['No', 'Sometimes', 'Often'] }, { key: 'urine', label: 'Dark coloured urine?', options: ['No', 'Sometimes', 'Often'] }] },
  { id: 'anemia', category: 'Questionnaire', icon: 'drop', title: 'Anaemia screening', time: '3 min', description: 'Check symptoms and habits commonly associated with iron deficiency.', tags: ['Fatigue', 'Diet', 'Dizziness'], questions: [{ key: 'fatigue', label: 'Current energy level?', options: ['Good energy', 'Sometimes tired', 'Often fatigued'] }, { key: 'dizziness', label: 'Dizziness or lightheadedness?', options: ['Never', 'Sometimes', 'Often'] }, { key: 'diet', label: 'Iron-rich foods in your diet?', options: ['Regularly', 'Sometimes', 'Rarely'] }, { key: 'heart', label: 'Fast heartbeat at rest?', options: ['Never', 'Sometimes', 'Often'] }] },
  { id: 'mental', category: 'Wellbeing', icon: 'spark', title: 'Stress & wellbeing', time: '2 min', description: 'Understand the habits that help your mind and body recharge.', tags: ['Sleep', 'Mood', 'Stress'], questions: [{ key: 'sleep', label: 'Average nightly sleep', options: ['7–9 hours', '6–7 hours', 'Less than 6 hours'] }, { key: 'mood', label: 'How has your mood felt lately?', options: ['Good', 'Up and down', 'Low / overwhelmed'] }, { key: 'support', label: 'Do you have someone to talk to?', options: ['Yes', 'Sometimes', 'Not really'] }] },
  { id: 'lifestyle', category: 'Wellbeing', icon: 'spark', title: 'Lifestyle check', time: '3 min', description: 'Take stock of movement, food, sleep, and the routines supporting your health.', tags: ['Movement', 'Nutrition', 'Sleep'], questions: [{ key: 'movement', label: 'Active days each week?', options: ['5+ days', '3–4 days', '1–2 days', 'Rarely'] }, { key: 'food', label: 'Fruit and vegetables each day?', options: ['5+ servings', '3–4 servings', '1–2 servings', 'Rarely'] }, { key: 'sleep', label: 'Typical sleep quality?', options: ['Restful', 'Mostly good', 'Often disturbed'] }, { key: 'tobacco', label: 'Tobacco use?', options: ['No', 'Previously', 'Current use'] }] },
  { id: 'lab', category: 'Lab tests', icon: 'beaker', title: 'Lab results', time: '2 min', description: 'Record a few recent values to keep your health snapshot current.', tags: ['Glucose', 'Protein', 'pH'], questions: [{ key: 'glucose', label: 'Urine/blood glucose', options: ['Normal', 'Trace / borderline', 'High'] }, { key: 'protein', label: 'Urine protein', options: ['Normal', 'Trace', 'Above normal'] }, { key: 'ph', label: 'Urine pH (if known)', type: 'number', placeholder: '4–9' }] }
];

export function riskFor(values) {
  const text = Object.values(values).join(' ').toLowerCase();
  const flags = ['high', 'often', 'rarely', 'less than', 'low / overwhelmed', 'above normal', 'parent', 'frequent'];
  const score = flags.reduce((total, flag) => total + (text.includes(flag) ? 1 : 0), 0);
  return score >= 3 ? { label: 'Needs attention', tone: 'high', note: 'Consider discussing these results with a healthcare professional.' } : score >= 1 ? { label: 'Keep an eye on it', tone: 'mid', note: 'A few responses may benefit from simple lifestyle changes.' } : { label: 'Looking positive', tone: 'low', note: 'Your answers show a healthy starting point. Keep caring for your routine.' };
}
