"""Describe reading availability without inventing a clinical triage model."""
import math

FIELDS = {
    'heart_rate_bpm': ('Heart Rate', 'bpm'),
    'spo2_percent': ('SpO₂', '%'),
    'systolic_bp_mmhg': ('Systolic BP', 'mmHg'),
    'diastolic_bp_mmhg': ('Diastolic BP', 'mmHg'),
    'temperature_c': ('Temperature', '°C'),
    'glucose_mg_dl': ('Glucose', 'mg/dL'),
    'bmi': ('BMI', 'kg/m²'),
    'stress_level': ('Stress Level', 'device score'),
}


def classify_vitals(measurements):
    signals = []
    for field, (label, unit) in FIELDS.items():
        value = measurements.get(field)
        valid = isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)
        signals.append({'field': field, 'label': label, 'unit': unit,
                        'value': value if valid else None,
                        'status': 'RECORDED' if valid else 'UNAVAILABLE',
                        'note': 'Device reading; freshness and clinical meaning are not established.' if valid else 'No usable measurement.'})
    return signals


def classify_ml_signals(ml_results):
    return [{'field': f'ml_{model}', 'label': f'ML {model.capitalize()} Score',
             'value': None, 'unit': '%', 'status': 'ABSTAIN', 'is_ml': True,
             'note': 'Live device readings do not meet this research model input context.'}
            for model in ('sepsis', 'diabetes')]


def overall_triage(vital_signals, ml_signals):
    recorded = sum(s['status'] == 'RECORDED' for s in vital_signals)
    return {'status': 'NOT_ASSESSED', 'rank': None,
            'reason': 'Live readings are displayed for inspection. These models cannot determine overall health or medical urgency.',
            'clinical_use': False, 'overall_health_status': None,
            'vital_signals': vital_signals, 'ml_signals': ml_signals,
            'counts': {'RECORDED': recorded, 'UNAVAILABLE': len(vital_signals) - recorded,
                       'total': len(vital_signals)},
            'research_disclaimer': 'Research only. No validated live triage model is available.'}
