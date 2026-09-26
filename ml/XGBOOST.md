# XGBoost hackathon models

XGBoost 3.4.1 is trained and is now the default research variant in the local console. Three depth configurations (2, 4, 6) were compared using grouped development cross-validation. Calibration uses its own split.

| Task | Selected | Test ROC-AUC | Average precision | Recall at 0.5 |
|---|---|---:|---:|---:|
| diabetes | xgboost_depth4 | 0.8234 | 0.4168 | 13.0% |
| sepsis | xgboost_depth2 | 0.6093 | 0.0963 | 0.0% |

These are exploratory follow-up results using a previously inspected holdout, not new independent validation. The diabetes baseline had ROC-AUC 0.8228; the improvement is small. ICU hospital-B ROC-AUC is 0.5454, so the sepsis model is not released for individual predictions.

## Run the demo

```powershell
Set-Location L:\MEDIKET
.\.ml-venv\Scripts\python.exe ml\serve.py --port 8001
```

Open http://127.0.0.1:8001/ and choose Diabetes or ICU sample demonstration. The latter uses illustrative inputs, is explicitly marked demonstration, and returns no medical triage decision. BMI and stress are not used by the ICU model.

CLI:

```powershell
.\.ml-venv\Scripts\python.exe ml\predict.py ml\examples\sepsis-demo.json
```

Training: `python ml/train.py --family xgboost`. Add `--task diabetes` or `--task sepsis` for one task. Native `*_booster.json` files contain the booster only; use the joblib pipeline for matching preprocessing and calibration. Baseline artifacts remain available with `"variant": "baseline"`.

31 tests passed, including split isolation for both model families, artifact checksum verification, API streaming, model readiness, input validation, and prevention of live-to-demo inference. See README.md for the complete run instructions.
