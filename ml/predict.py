"""Local-only research inference. No fabricated inputs or general-health diagnosis."""
from pathlib import Path
import argparse, json, math, threading
import joblib, numpy as np, pandas as pd

ROOT=Path(__file__).resolve().parent
BUNDLES={}
BUNDLE_LOCK=threading.Lock()

def load_bundle(path):
    """Reload atomically replaced local artifacts without restarting the server."""
    with BUNDLE_LOCK:
        version=(path.stat().st_mtime_ns,path.stat().st_size)
        cached=BUNDLES.get(path.stem)
        if cached is None or cached[0] != version:
            cached=(version,joblib.load(path))
            BUNDLES[path.stem]=cached
        return cached[1]
RANGES={'heart_rate_bpm':(1,350),'spo2_percent':(1,100),'temperature_c':(25,45),'systolic_bp_mmhg':(20,300),'diastolic_bp_mmhg':(10,200),'glucose_mg_dl':(10,1500),'bmi':(12,98),'stress_level':(0,100),'age_band':(1,13),'sex_code':(0,1),'high_bp_history':(0,1),'high_cholesterol_history':(0,1),'ever_smoked_100':(0,1),'physical_activity_30d':(0,1),'general_health':(1,5)}
CATEGORIES={'age_band','sex_code','high_bp_history','high_cholesterol_history','ever_smoked_100','physical_activity_30d','general_health'}

def abstain(reason, missing=None):
    return {'status':'abstain','reason':reason,'missing_inputs':missing or [],'clinical_use':False,'overall_health_status':None}

def predict(payload):
    if not isinstance(payload,dict): return abstain('Input must be a JSON object.')
    task=payload.get('model')
    if task not in ('sepsis','diabetes'): return abstain('Choose the sepsis or diabetes research model.')
    if payload.get('research_only') is not True: return abstain('Set research_only=true to acknowledge the non-clinical research output.')
    values=payload.get('measurements',{})
    if not isinstance(values,dict):return abstain('measurements must be an object.')
    unknown=set(values)-set(RANGES)
    if unknown:return abstain('Unknown measurement fields: '+', '.join(sorted(unknown)))
    for key,value in values.items():
        if value is None:continue
        lo,hi=RANGES[key]
        if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not lo<=value<=hi or (key in CATEGORIES and value!=int(value)):
            return abstain(f'Invalid {key}; expected a numeric value in [{lo}, {hi}] in the documented unit.')
    if values.get('systolic_bp_mmhg') is not None and values.get('diastolic_bp_mmhg') is not None and values['systolic_bp_mmhg']<=values['diastolic_bp_mmhg']:
        return abstain('Systolic blood pressure must exceed diastolic blood pressure.')
    demo = payload.get('demonstration') is True and payload.get('context') == 'synthetic_icu_demo'
    if task=='sepsis' and payload.get('context')!='adult_icu_first_6h_medians' and not demo:
        return abstain('This model requires first-six-ICU-hour medians from an adult ICU cohort. A kiosk or smartwatch snapshot is outside the training population.')
    if task=='diabetes' and payload.get('context')!='adult_brfss_style_survey':
        return abstain('This model requires the documented adult survey inputs. Current BP must not be substituted for diagnosed high-BP history.')
    variant=payload.get('variant','xgboost' if (ROOT/'artifacts'/f'{task}_xgboost.joblib').exists() else 'baseline')
    if variant not in ('baseline','xgboost'):return abstain('variant must be baseline or xgboost.')
    stem=task if variant=='baseline' else f'{task}_xgboost'
    path=ROOT/'artifacts'/f'{stem}.joblib'
    if not path.exists():return abstain('Train the model before inference.')
    try:
        bundle=load_bundle(path)  # Only load trusted, locally trained artifacts.
    except (OSError, ValueError, EOFError, ImportError, IndexError, KeyError):
        return abstain('Model artifact unavailable or incompatible. Retrain using the pinned environment.')
    features=bundle['features']
    required=[f for f in features if task!='sepsis' or f not in ('temperature_c','glucose_mg_dl')]
    missing=[f for f in required if values.get(f) is None]
    if missing:return abstain('Required inputs are missing; they will not be invented.',missing)
    if task=='sepsis' and not demo:
        return {'status':'model_withheld','reason':'This ICU model is not released for individual inference. For a hackathon demonstration with illustrative inputs only, use the sepsis-demo example.','clinical_use':False,'overall_health_status':None,'unused_inputs':sorted(set(values)-set(features))}
    row=pd.DataFrame([[values.get(f,np.nan) if values.get(f) is not None else np.nan for f in features]],columns=features)
    raw=float(bundle['model'].predict_proba(row)[0,1]);p=np.clip(raw,1e-6,1-1e-6)
    calibrated=float(bundle['calibration'].predict_proba([[np.log(p/(1-p))]])[0,1])
    return {'status':'demonstration_result' if demo else 'research_result','model':task,'algorithm':bundle['report']['selected'],'variant':variant,'outcome':'Published sepsis challenge label during ICU hours 7–24; demonstration with illustrative inputs only' if task=='sepsis' else 'Self-reported diabetes label in the 2015 BRFSS-derived dataset; not future diabetes onset or blood glucose','experimental_score':round(calibrated,6),'research_class_at_0_5':int(calibrated>=.5),'used_inputs':features,'imputed_inputs':[f for f in features if values.get(f) is None],'unused_inputs':sorted(set(values)-set(features)),'clinical_use':False,'overall_health_status':None,'test_roc_auc':bundle['report']['test']['roc_auc'],'test_recall_at_0_5':bundle['report']['test']['recall_at_0_5'],'limitation':'Hackathon/research output only. These models have limited generalization and can miss disease. Do not map scores to normal, OK, doctor-needed, or treatment decisions. Stress is not modeled. No glucose value is inferred.'}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('input',type=Path);args=parser.parse_args()
    try: print(json.dumps(predict(json.loads(args.input.read_text())),indent=2,allow_nan=False))
    except (ValueError,OSError) as exc: print(json.dumps(abstain(str(exc))));raise SystemExit(1)
