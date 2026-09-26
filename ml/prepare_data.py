"""Prepare separate, documented cohorts; never join unrelated people or outcomes."""
from pathlib import Path
import hashlib, json, zipfile, io
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data'
FEATURES = ['heart_rate_bpm', 'spo2_percent', 'temperature_c', 'systolic_bp_mmhg', 'diastolic_bp_mmhg', 'glucose_mg_dl']
SOURCE_COLUMNS = ['HR', 'O2Sat', 'Temp', 'SBP', 'DBP', 'Glucose']
RANGES = [(1, 350), (1, 100), (25, 45), (20, 300), (10, 200), (10, 1500)]

def prepare():
    audit = {'archives': {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.file_digest(p.open('rb'), 'sha256').hexdigest()} for p in DATA.glob('*.zip')}}
    with zipfile.ZipFile(DATA / 'kaggle-sepsis.zip') as z:
        rows, excluded = [], {'short_followup': 0, 'already_positive': 0, 'insufficient_inputs': 0, 'invalid_time': 0}
        files = sorted(n for n in z.namelist() if n.endswith('.psv'))
        for i, name in enumerate(files):
            df = pd.read_csv(z.open(name), sep='|')
            if len(df) < 24:
                excluded['short_followup'] += 1; continue
            if not np.array_equal(df['ICULOS'].iloc[:24].to_numpy(), np.arange(1, 25)):
                excluded['invalid_time'] += 1; continue
            if df.SepsisLabel.iloc[:6].max() != 0:
                excluded['already_positive'] += 1; continue
            early = df[SOURCE_COLUMNS].iloc[:6].copy()
            for col, (lo, hi) in zip(SOURCE_COLUMNS, RANGES):
                early[col] = early[col].where(early[col].between(lo, hi))
            values = early.median().to_numpy()
            # Need at least HR, oxygen and both BP medians; missing temperature/glucose imputed in training folds only.
            if np.isnan(values[[0, 1, 3, 4]]).any():
                excluded['insufficient_inputs'] += 1; continue
            rows.append(dict(zip(FEATURES, values)) | {'patient_id': Path(name).stem, 'site': 'A' if 'setA' in name else 'B', 'target': int(df.SepsisLabel.iloc[6:24].max())})
            if i % 5000 == 0: print(f'Processed {i}/{len(files)} ICU records', flush=True)
        frame = pd.DataFrame(rows)
        frame.to_csv(DATA / 'sepsis_prepared.csv', index=False)
        audit['sepsis'] = {'source_records': len(files), 'included': len(frame), 'excluded': excluded, 'site_counts': frame.groupby('site').target.agg(['count','sum']).to_dict(), 'missing_fraction': frame[FEATURES].isna().mean().to_dict()}
        (DATA / 'sepsis-mirror-LICENSE.txt').write_bytes(z.read('LICENSE.txt'))
    with zipfile.ZipFile(DATA / 'kaggle-diabetes-health-indicators.zip') as z:
        df = pd.read_csv(z.open('diabetes_binary_health_indicators_BRFSS2015.csv'))
    mapping = {'BMI': 'bmi', 'Age': 'age_band', 'Sex': 'sex_code', 'HighBP': 'high_bp_history', 'HighChol': 'high_cholesterol_history', 'Smoker': 'ever_smoked_100', 'PhysActivity': 'physical_activity_30d', 'GenHlth': 'general_health'}
    d = df[list(mapping) + ['Diabetes_binary']].rename(columns=mapping | {'Diabetes_binary':'target'})
    d.to_csv(DATA / 'diabetes_prepared.csv', index=False)
    audit['diabetes'] = {'rows': len(d), 'positives': int(d.target.sum()), 'features': list(mapping.values()), 'exact_full_row_duplicates_original': int(df.duplicated().sum()), 'note': 'Identical selected feature profiles are grouped across all train/calibration/test splits. Duplicate profiles retained as survey observations, not treated as independent validation subjects.'}
    with zipfile.ZipFile(DATA / 'cdc-LLCP2015ASC.zip') as z:
        count = 0; diagnostic = {}
        for line in z.open(z.namelist()[0]):
            if not line.strip(): continue
            count += 1
            code = line[116:117].decode()
            diagnostic[code] = diagnostic.get(code, 0) + 1
    audit['cdc_original'] = {'records': count, 'DIABETE3_counts': diagnostic, 'use': 'Government provenance audit only. Same 2015 survey as Kaggle; not an independent external test and not pooled with its own derivative.'}
    (ROOT / 'data_audit.json').write_text(json.dumps(audit, indent=2))
    print(json.dumps(audit, indent=2), flush=True)

if __name__ == '__main__': prepare()
