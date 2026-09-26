import json
import unittest
from unittest.mock import patch
from serve import compute_health_status, model_status
from triage import classify_ml_signals, classify_vitals, overall_triage


class MonitorTests(unittest.TestCase):
    def test_live_readings_never_enter_demonstration(self):
        live = {'measurements': {'heart_rate_bpm': 90, 'spo2_percent': 97,
                                'systolic_bp_mmhg': 120, 'diastolic_bp_mmhg': 80},
                'status': 'connected'}
        with patch('serve.read_live', return_value=live), patch('serve.predict') as predict:
            result = compute_health_status()
            predict.assert_not_called()
        self.assertEqual(result['ml_scores'], {'sepsis': None, 'diabetes': None})
        self.assertEqual(result['triage']['status'], 'NOT_ASSESSED')
        self.assertIsNone(result['triage']['overall_health_status'])

    def test_missing_data_never_means_normal(self):
        result = overall_triage(classify_vitals({}), classify_ml_signals({}))
        self.assertEqual(result['counts']['RECORDED'], 0)
        self.assertTrue(all(s['status'] == 'UNAVAILABLE' for s in result['vital_signals']))
        self.assertEqual(result['status'], 'NOT_ASSESSED')

    def test_research_scores_never_become_emergency(self):
        signals = classify_ml_signals({'sepsis': 0.99, 'diabetes': 0.99})
        self.assertTrue(all(s['status'] == 'ABSTAIN' for s in signals))

    def test_nonfinite_readings_are_json_safe(self):
        signals = classify_vitals({'heart_rate_bpm': float('nan'), 'bmi': True})
        json.dumps(signals, allow_nan=False)
        self.assertTrue(all(s['value'] is None for s in signals))

    def test_readiness_requires_loadable_models(self):
        with patch('serve.load_bundle', side_effect=OSError('missing')):
            self.assertTrue(all(s['status'] == 'unavailable' for s in model_status().values()))


if __name__ == '__main__':
    unittest.main()
