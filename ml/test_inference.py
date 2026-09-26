import copy,json,unittest
from pathlib import Path
from predict import predict
ROOT=Path(__file__).resolve().parent
class InferenceTests(unittest.TestCase):
    def example(self,name):return json.loads((ROOT/'examples'/f'{name}.json').read_text())
    def test_clinical_context_abstains(self):self.assertEqual(predict(self.example('kiosk'))['status'],'abstain')
    def test_missing_input(self):
        p=self.example('sepsis');del p['measurements']['heart_rate_bpm'];self.assertEqual(predict(p)['status'],'abstain')
    def test_bad_values(self):
        for key,value in [('spo2_percent',101),('heart_rate_bpm',0),('temperature_c',98.6),('glucose_mg_dl',float('nan')),('stress_level',True)]:
            p=self.example('sepsis');p['measurements'][key]=value;self.assertEqual(predict(p)['status'],'abstain')
    def test_optional_missing_fields(self):
        p=self.example('sepsis');p['measurements']['glucose_mg_dl']=None
        out=predict(p);self.assertEqual(out['status'],'model_withheld');self.assertFalse(out['clinical_use'])
    def test_both_models(self):
        for task in ('diabetes',):
            out=predict(self.example(task));self.assertEqual(out['status'],'research_result');self.assertTrue(0<=out['experimental_score']<=1);self.assertIsNone(out['overall_health_status'])
    def test_stress_cannot_change_score(self):
        p=self.example('diabetes');p['measurements']['stress_level']=20;a=predict(p);p['measurements']['stress_level']=95;b=predict(p);self.assertEqual(a['experimental_score'],b['experimental_score']);self.assertIn('stress_level',b['unused_inputs'])
    def test_failed_model_withheld(self):
        out=predict(self.example('sepsis'));self.assertEqual(out['status'],'model_withheld');self.assertNotIn('experimental_score',out)
    def test_xgboost_demo(self):
        out=predict(self.example('sepsis-demo'));self.assertEqual(out['status'],'demonstration_result');self.assertTrue(out['algorithm'].startswith('xgboost'));self.assertFalse(out['clinical_use']);self.assertIn('stress_level',out['unused_inputs'])
    def test_default_xgboost(self):
        out=predict(self.example('diabetes'));self.assertEqual(out['variant'],'xgboost');self.assertTrue(out['algorithm'].startswith('xgboost'))
    def test_no_acknowledgement(self):
        p=self.example('diabetes');p['research_only']=False;self.assertEqual(predict(p)['status'],'abstain')
    def test_no_unknown_inputs(self):
        p=self.example('diabetes');p['measurements']['glucose']=90;self.assertEqual(predict(p)['status'],'abstain')
if __name__=='__main__':unittest.main()
