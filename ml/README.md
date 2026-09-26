# MEDIKET ML: training, inference, and live research console

The ML workflow is runnable end to end: reproducible XGBoost training, separately calibrated scores, CLI inference, a loopback HTTP API, and a browser console connected to the existing MEDIKET device feeds.

## Running the system

From `L:\MEDIKET`, use `.\.ml-venv\Scripts\python.exe` (the environment is inside this repository).

```powershell
# Train both models; saves models, evaluation reports, split assignments and checksums.
.\.ml-venv\Scripts\python.exe ml\train.py --family xgboost

# Launch the console (leave this terminal running).
.\.ml-venv\Scripts\python.exe ml\serve.py --port 8001
```

Open [the ML console](http://127.0.0.1:8001/). In another terminal:

```powershell
# Required for live readings; model demonstrations also work without the website.
npm run dev -- --port 3002
```

The website uses its existing device configuration. The ML server reads `/api/vitals`, `/api/blood-pressure`, and `/api/temperature`; it never triggers hardware measurements or writes to Firebase. Set `MEDIKET_WEB_ORIGIN` before launching the ML server if the website uses a different local HTTP port. `--refresh 5` controls live stream refreshes.

```powershell
# Illustrative ICU example and survey research inference
.\.ml-venv\Scripts\python.exe ml\predict.py ml\examples\sepsis-demo.json
.\.ml-venv\Scripts\python.exe ml\predict.py ml\examples\diabetes.json

# Regression, API, streaming, provenance and split-isolation checks
.\.ml-venv\Scripts\python.exe -m unittest discover -s ml -p "test_*.py" -v
```

The console's Run Model button executes the chosen example or edited JSON. Live readings remain separate from these examples. Missing, zero-sentinel, and out-of-range measurements appear unavailable. Recorded timestamps are available in `/live`; fetch time is not measurement time, and saved BP can be old.

## Results and release limits

| Model | Selected configuration | Internal ROC-AUC | Average precision | Recall at 0.5 |
|---|---|---:|---:|---:|
| Diabetes | XGBoost depth 4 | 0.8234 | 0.4168 | 13.0% |
| Sepsis | XGBoost depth 2 | 0.6093 | 0.0963 | 0.0% |

Sepsis hospital-B ROC-AUC is **0.5454**. It remains withheld for individual inference; `sepsis-demo.json` permits only explicitly illustrative inputs. Diabetes predicts the supplied self-reported survey label, not future disease or a glucose measurement. Its low sensitivity at 0.5 is a substantial limitation.

These models cannot establish normal health, medical urgency, or a treatment decision. `/health-status` returns `NOT_ASSESSED`, and live model signals abstain. Live kiosk snapshots must never be relabeled as synthetic ICU demonstrations. No clinically validated seven-input triage model is provided.

“Selected” means highest grouped development cross-validation average precision among the three XGBoost depths tested, not best possible performance. These are exploratory results on a previously inspected holdout, not new independent clinical validation.

## Reproducible setup

The existing environment uses Python 3.14 and the exact versions in `requirements-lock.txt`.

```powershell
python -m venv .ml-venv
.\.ml-venv\Scripts\python.exe -m pip install -r ml\requirements-lock.txt
.\.ml-venv\Scripts\python.exe ml\download_data.py
.\.ml-venv\Scripts\python.exe ml\prepare_data.py
.\.ml-venv\Scripts\python.exe ml\train.py --family xgboost
```

Downloads are pinned by SHA-256 in `sources.json`. Training is offline once prepared datasets exist. Add `--task diabetes` or `--task sepsis` to train one model. `--family baseline` compares the original non-XGBoost candidates. XGBoost training does not require a preexisting baseline report.

## Evaluation design and supported inputs

Approximately 60% of development data fits candidates, 20% calibrates the selected candidate with sigmoid calibration, and 20% forms the internal test. Three-fold grouped cross-validation selects the candidate on average precision. Identical survey feature profiles stay together; ICU data contains one row per patient. Imputation fits within each training fold. Hospital B is held outside development. Reports include bootstrap intervals, confusion matrices, calibration bins, subgroup results for diabetes, and calibration-set permutation importance.

The ICU task uses first-six-hour medians for heart rate, SpO₂, temperature, systolic and diastolic BP, and glucose. It predicts the published challenge label during hours 7–24 in an eligible adult ICU cohort. Challenge labels are already shifted before estimated onset. Temperature and glucose may be imputed; all other ICU features are required. BMI and stress are unused.

The diabetes model requires BMI, age band, dataset sex code, diagnosed high-BP history, high-cholesterol history, lifetime smoking history, recent physical activity, and self-rated health. Current BP cannot replace diagnosed history. Missing questionnaire answers are never guessed. Age bands are 1=18–24, 2=25–29, then five-year bands through 12=75–79, 13=80+. Sex coding is 0=female, 1=male as supplied by the source. General health is 1=excellent through 5=poor; history fields are 0/1. Smoking means at least 100 lifetime cigarettes; activity refers to the last 30 days outside work.

All measurement units are explicit in JSON field names. Bounds are input sanity checks, not healthy ranges. Stress and ECG are not modeled. Scores are never averaged into overall health.

## API and artifacts

- `GET /health`: loads both default models and returns readiness plus measured evaluation metrics; HTTP 503 if a model is unavailable.
- `POST /predict`: same JSON as the CLI, with a 16 KiB body limit and bounded read timeout.
- `GET /live`: device readings, source status, timestamps, and abstention reason.
- `GET /health-status`: display-ready readings and explicit non-assessment.
- `GET /stream`: server-sent updates; slow clients cannot block other subscribers.
- `GET /examples/diabetes` and `/examples/sepsis-demo`: editable demonstration presets.

`artifacts/*_xgboost.joblib` stores preprocessing, fitted estimator, calibration and evaluation metadata. Native booster JSON alone does not reproduce calibrated pipeline inference. Models are atomically replaced and reloaded after retraining. `artifacts/manifest.json` records artifact sizes and SHA-256 checksums and is regenerated by training. Only load trusted local joblib artifacts.

The server binds to loopback and is a development service, without production authentication. Review [DATA_RESEARCH.md](DATA_RESEARCH.md), [XGBOOST.md](XGBOOST.md), and the machine-readable reports for dataset provenance and evaluation limits. Clinical deployment would require an appropriate paired dataset, clinician-defined outcomes, prospective external validation, and reviewed thresholds.

## Live Device website integration

The website at `/portal/live-device` includes an **ML result** panel. It polls the server-side `/api/ml-result` route every 10 seconds and with **Refresh live data**. That route reads the ML server's `/health-status` output, including input measurements, source availability, model abstention reasons and fetch time. Configure `MEDIKET_ML_ORIGIN` on the website server when using a different local ML port (default `http://127.0.0.1:8001`).

The panel clears results when the ML service is unavailable. Existing kiosk inputs currently return **Not assessed**, because neither research model supports that context. It does not substitute demonstration scores. Run `node scripts/test-ml-result.cjs` to verify proxy mapping and failure behavior.
