import json,unittest,hashlib
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parent
class EvaluationTests(unittest.TestCase):
    def test_artifact_manifest_matches_saved_models(self):
        manifest=json.loads((ROOT/'artifacts'/'manifest.json').read_text())
        self.assertEqual(set(manifest), {p.name for p in (ROOT/'artifacts').glob('*.joblib')})
        for name, metadata in manifest.items():
            content=(ROOT/'artifacts'/name).read_bytes()
            self.assertEqual(len(content),metadata['bytes'])
            self.assertEqual(hashlib.sha256(content).hexdigest(),metadata['sha256'])
    def test_no_split_overlap(self):
        for stem in ('diabetes','sepsis','diabetes_xgboost','sepsis_xgboost'):
            task=stem.split('_')[0]
            df=pd.read_csv(ROOT/'data'/f'{task}_prepared.csv')
            if task=='sepsis':df=df[df.site=='A'].reset_index(drop=True);groups=df.patient_id
            else:groups=pd.util.hash_pandas_object(df.drop(columns='target'),index=False)
            split=pd.read_csv(ROOT/'artifacts'/f'{stem}_split.csv')
            self.assertEqual(len(split),len(df));self.assertEqual(split.row_index.nunique(),len(df))
            sets={name:set(groups.iloc[rows.row_index]) for name,rows in split.groupby('split')}
            self.assertFalse(sets['fit']&sets['calibration']);self.assertFalse(sets['fit']&sets['test']);self.assertFalse(sets['calibration']&sets['test'])
    def test_selection_uses_development_scores(self):
        for stem in ('diabetes','sepsis','diabetes_xgboost','sepsis_xgboost'):
            task=stem.split('_')[0]
            r=json.loads((ROOT/'artifacts'/f'{stem}_report.json').read_text())
            best=max((x for x in r['leaderboard'] if x['name']!='dummy_prevalence'),key=lambda x:x['mean_average_precision'])
            self.assertEqual(r['selected'],best['name'])
    def test_mirror_spot_checks(self):
        checks=json.loads((ROOT/'mirror_verification.json').read_text());self.assertEqual(len(checks),2)
        self.assertTrue(all(x['normalized_content_matches'] for x in checks))
if __name__=='__main__':unittest.main()
