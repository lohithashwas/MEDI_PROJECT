import unittest
from live_data import read_live
class LiveDataTests(unittest.TestCase):
    def test_mapping_and_no_demo_prediction(self):
        values={'vitals':{'heartRate':0,'spo2':98,'steps':0,'updatedAt':123,'stressLevel':20},'blood-pressure':{'bloodPressure':'120/80','recordedAt':'2026-08-12 11:02:59'},'temperature':{'temperature':98.6,'unit':'°F'}}
        data=read_live(values.__getitem__)
        self.assertEqual(data['status'],'connected');self.assertEqual(data['measurements']['temperature_c'],37)
        self.assertIsNone(data['measurements']['heart_rate_bpm']);self.assertEqual(data['measurements']['systolic_bp_mmhg'],120)
        self.assertIsNone(data['measurements']['glucose_mg_dl']);self.assertIsNone(data['measurements']['bmi'])
        self.assertEqual(data['prediction']['status'],'abstain');self.assertNotIn('experimental_score',data['prediction'])
    def test_source_failure_does_not_fake_values(self):
        def fail(path):raise OSError('unavailable')
        data=read_live(fail);self.assertEqual(data['status'],'unavailable');self.assertTrue(all(v is None for v in data['measurements'].values()))
    def test_unknown_temperature_unit(self):
        data=read_live(lambda _: {'temperature':99});self.assertIsNone(data['measurements']['temperature_c'])
    def test_invalid_feed_shapes(self):
        for response in (None, [], {'error': 'offline'}):
            data=read_live(lambda _: response)
            self.assertEqual(data['status'], 'unavailable')
    def test_invalid_bp_and_spo2_cleared(self):
        data=read_live(lambda _: {'spo2': 102, 'bloodPressure': '70/120'})
        for field in ('spo2_percent', 'systolic_bp_mmhg', 'diastolic_bp_mmhg'):
            self.assertIsNone(data['measurements'][field])
if __name__=='__main__':unittest.main()
