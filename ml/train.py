"""Reproducible candidate comparison, separate calibration, locked tests."""
import os
os.environ.setdefault('OMP_NUM_THREADS', '2')
from pathlib import Path
import json, hashlib, platform
import numpy as np
import pandas as pd
import sklearn, joblib
from sklearn.base import clone
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.dummy import DummyClassifier
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss, confusion_matrix, accuracy_score, precision_score, recall_score
from sklearn.inspection import permutation_importance
from prepare_data import FEATURES, ROOT

SEED = 20260925
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)

def score(y, p):
    pred = p >= .5
    return {'n': len(y), 'positives': int(np.sum(y)), 'prevalence': float(np.mean(y)), 'roc_auc': float(roc_auc_score(y,p)), 'average_precision': float(average_precision_score(y,p)), 'brier': float(brier_score_loss(y,p)), 'accuracy_at_0_5': float(accuracy_score(y,pred)), 'precision_at_0_5': float(precision_score(y,pred,zero_division=0)), 'recall_at_0_5': float(recall_score(y,pred)), 'confusion_matrix_at_0_5': confusion_matrix(y,pred).tolist()}

def logit(p):
    p=np.clip(p,1e-6,1-1e-6)
    return np.log(p/(1-p)).reshape(-1,1)

def train(task, family='baseline'):
    df = pd.read_csv(ROOT / 'data' / f'{task}_prepared.csv')
    features = FEATURES if task == 'sepsis' else [c for c in df if c != 'target']
    external = df[df.site == 'B'].copy() if task == 'sepsis' else None
    cohort = df[df.site == 'A'].copy() if task == 'sepsis' else df.copy()
    X=cohort[features].reset_index(drop=True); y=cohort.target.astype(int).reset_index(drop=True)
    # One row per ICU patient. Survey profiles have no identifiers: group identical input patterns.
    groups = cohort.patient_id.reset_index(drop=True) if task == 'sepsis' else pd.util.hash_pandas_object(X,index=False)
    dev_idx, test_idx = next(StratifiedGroupKFold(5,shuffle=True,random_state=SEED).split(X,y,groups))
    fit_rel, cal_rel = next(StratifiedGroupKFold(4,shuffle=True,random_state=SEED+1).split(X.iloc[dev_idx],y.iloc[dev_idx],groups.iloc[dev_idx]))
    fit_idx, cal_idx = dev_idx[fit_rel],dev_idx[cal_rel]
    assert not set(groups.iloc[fit_idx]) & set(groups.iloc[cal_idx])
    assert not set(groups.iloc[test_idx]) & set(groups.iloc[dev_idx])
    xf,yf,gf=X.iloc[fit_idx],y.iloc[fit_idx],groups.iloc[fit_idx]
    def pipeline(model, scale=False):
        steps=[SimpleImputer(strategy='median',add_indicator=True)]
        if scale: steps.append(StandardScaler())
        return make_pipeline(*steps,model)
    candidates={
        'dummy_prevalence':pipeline(DummyClassifier(strategy='prior')),
        'logistic_c0.1':pipeline(LogisticRegression(C=.1,max_iter=1000,random_state=SEED),True),
        'logistic_c1':pipeline(LogisticRegression(C=1,max_iter=1000,random_state=SEED),True),
        'random_forest':pipeline(RandomForestClassifier(n_estimators=120,max_depth=10,min_samples_leaf=20,n_jobs=2,random_state=SEED)),
        'hist_gradient_15':pipeline(HistGradientBoostingClassifier(max_iter=150,max_leaf_nodes=15,l2_regularization=5,learning_rate=.06,early_stopping=False,random_state=SEED)),
        'hist_gradient_31':pipeline(HistGradientBoostingClassifier(max_iter=150,max_leaf_nodes=31,l2_regularization=10,learning_rate=.04,early_stopping=False,random_state=SEED))}
    if family == 'xgboost':
        from xgboost import XGBClassifier
        candidates={f'xgboost_depth{depth}':pipeline(XGBClassifier(n_estimators=250,max_depth=depth,learning_rate=.04,min_child_weight=10,subsample=.85,colsample_bytree=.9,reg_lambda=10,objective='binary:logistic',eval_metric='logloss',tree_method='hist',n_jobs=2,random_state=SEED)) for depth in (2,4,6)}
    folds=list(StratifiedGroupKFold(3,shuffle=True,random_state=SEED+2).split(xf,yf,gf))
    leaderboard=[]
    for name, candidate in candidates.items():
        scores=[]
        for train_i,val_i in folds:
            m=clone(candidate).fit(xf.iloc[train_i],yf.iloc[train_i])
            scores.append(score(yf.iloc[val_i],m.predict_proba(xf.iloc[val_i])[:,1]))
        entry={'name':name,'mean_average_precision':float(np.mean([s['average_precision'] for s in scores])),'mean_roc_auc':float(np.mean([s['roc_auc'] for s in scores])),'folds':scores}
        leaderboard.append(entry); print(task,name,entry['mean_average_precision'],flush=True)
    chosen=max([r for r in leaderboard if r['name']!='dummy_prevalence'],key=lambda r:r['mean_average_precision'])['name']
    model=clone(candidates[chosen]).fit(xf,yf)
    calibration=LogisticRegression(C=100000,max_iter=1000).fit(logit(model.predict_proba(X.iloc[cal_idx])[:,1]),y.iloc[cal_idx])
    def predict(frame): return calibration.predict_proba(logit(model.predict_proba(frame)[:,1]))[:,1]
    probability=predict(X.iloc[test_idx]); report={'task':task,'seed':SEED,'selected':chosen,'selection_metric':'Mean 3-fold grouped CV average precision; test sets never used for selection','features':features,'split_sizes':{'fit':len(fit_idx),'calibration':len(cal_idx),'test':len(test_idx)},'leaderboard':leaderboard,'test':score(y.iloc[test_idx],probability)}
    # Patient bootstrap for ICU; profile-cluster bootstrap for survey, to respect repeated profiles.
    rng=np.random.default_rng(SEED); test_y=y.iloc[test_idx].to_numpy(); test_groups=groups.iloc[test_idx].to_numpy(); unique=np.unique(test_groups)
    buckets={g:np.flatnonzero(test_groups==g) for g in unique}; boot=[]
    for _ in range(200):
        ix=np.concatenate([buckets[g] for g in rng.choice(unique,len(unique),replace=True)])
        if len(np.unique(test_y[ix]))==2: boot.append([roc_auc_score(test_y[ix],probability[ix]),average_precision_score(test_y[ix],probability[ix])])
    report['test_ci95_bootstrap']={'roc_auc':np.quantile(np.array(boot)[:,0],[.025,.975]).tolist(),'average_precision':np.quantile(np.array(boot)[:,1],[.025,.975]).tolist(),'replicates':len(boot),'unit':'patient' if task=='sepsis' else 'feature-profile cluster'}
    report['calibration_bins']=[]
    for lo,hi in zip(np.arange(0,1,.1),np.arange(.1,1.1,.1)):
        ix=(probability>=lo)&(probability<hi)
        if ix.any():report['calibration_bins'].append({'count':int(ix.sum()),'mean_score':float(probability[ix].mean()),'observed_rate':float(test_y[ix].mean())})
    if external is not None:
        assert not set(cohort.patient_id)&set(external.patient_id)
        report['external_site_B']=score(external.target,predict(external[features]))
    if task=='diabetes':
        report['subgroups']={}
        for name,mask in {'sex_0':X.iloc[test_idx].sex_code==0,'sex_1':X.iloc[test_idx].sex_code==1,'age_band_1_6':X.iloc[test_idx].age_band<=6,'age_band_7_13':X.iloc[test_idx].age_band>6}.items():
            if len(np.unique(test_y[mask]))==2:report['subgroups'][name]=score(test_y[mask],probability[mask])
    # Importance measured on calibration split, not test data.
    importance=permutation_importance(model,X.iloc[cal_idx],y.iloc[cal_idx],scoring='average_precision',n_repeats=3,random_state=SEED,n_jobs=1)
    report['permutation_importance_calibration']={k:float(v) for k,v in zip(features,importance.importances_mean)}
    report['versions']={'python':platform.python_version(),'sklearn':sklearn.__version__,'numpy':np.__version__,'pandas':pd.__version__}
    if family=='xgboost':
        import xgboost
        report['versions']['xgboost']=xgboost.__version__
        report['evaluation_note']='Exploratory follow-up on the same previously inspected holdout. Hyperparameters selected using development CV only; not a new independent validation.'
        baseline_path=OUT/f'{task}_report.json'
        if baseline_path.exists():
            baseline=json.loads(baseline_path.read_text())
            report['baseline_comparison']={'selected':baseline['selected'],'test':baseline['test'],'mean_cv_average_precision':next(r['mean_average_precision'] for r in baseline['leaderboard'] if r['name']==baseline['selected'])}
    bundle={'model':model,'calibration':calibration,'features':features,'task':task,'report':report}
    stem=task if family=='baseline' else f'{task}_xgboost'
    temporary=OUT/f'{stem}.joblib.tmp'
    joblib.dump(bundle,temporary,compress=3)
    temporary.replace(OUT/f'{stem}.joblib')
    if family=='xgboost':model.steps[-1][1].save_model(OUT/f'{stem}_booster.json')
    (OUT/f'{stem}_report.json').write_text(json.dumps(report,indent=2))
    pd.DataFrame({'row_index':np.r_[fit_idx,cal_idx,test_idx],'split':['fit']*len(fit_idx)+['calibration']*len(cal_idx)+['test']*len(test_idx)}).to_csv(OUT/f'{stem}_split.csv',index=False)
    update_manifest()
    print(json.dumps({'task':task,'selected':chosen,'test':report['test'],'external':report.get('external_site_B')},indent=2),flush=True)

def update_manifest():
    manifest={}
    for path in sorted(OUT.glob('*.joblib')):
        manifest[path.name]={'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                             'individual_inference':'withheld; illustrative demo only' if path.name.startswith('sepsis') else 'research_only'}
    temporary=OUT/'manifest.json.tmp'
    temporary.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    temporary.replace(OUT/'manifest.json')

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--task',choices=['sepsis','diabetes','all'],default='all');parser.add_argument('--family',choices=['baseline','xgboost'],default='baseline');args=parser.parse_args()
    for task in (['sepsis','diabetes'] if args.task=='all' else [args.task]):train(task,args.family)
