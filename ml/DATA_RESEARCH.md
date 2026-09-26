# Dataset research and provenance

## Downloaded and used

1. **PhysioNet/CinC Challenge 2019, via Kaggle mirror.** The public ICU dataset includes HR, oxygen saturation, temperature, BP, and measured glucose. We use the per-patient PSV files, not the mirror's precombined `Dataset.csv`. Patient files from hospitals A and B stay separate. Two sampled records were compared with the official host and matched after line-ending normalization; this is a spot check, not full archive authentication. See `mirror_verification.json`.
   - Primary documentation: https://physionet.org/content/challenge-2019/1.0.0/
   - Official files: https://physionet.org/files/challenge-2019/1.0.0/training/
   - Downloaded mirror: https://www.kaggle.com/datasets/salikhussaini49/prediction-of-sepsis
   - Attribution: Reyna et al., Early Prediction of Sepsis From Clinical Data: The PhysioNet/Computing in Cardiology Challenge 2019; PhysioNet.
   - License discrepancy: the mirror's bundled license says ODbL, whereas the current official project page advertises CC BY 4.0. The original notice is retained locally as `data/sepsis-mirror-LICENSE.txt`. Resolve redistribution terms before publishing the dataset or derived model package; this delivery stays in the user's local workspace.

2. **CDC BRFSS 2015 original public-use data.** Original government ASCII archive downloaded directly from CDC, and original record/diagnosis-code counts audited. Not an external test of the derivative from the same survey.
   - Government page: https://www.cdc.gov/brfss/annual_data/annual_2015.html
   - Variable layout: https://www.cdc.gov/brfss/annual_data/2015/llcp_varlayout_15_onecolumn.html
   - CDC source and questionnaire methods must be acknowledged. Public-use survey data must not be used to identify respondents.

3. **Diabetes Health Indicators Dataset, Alex Teboul / Kaggle.** The unbalanced full binary file is used, preserving its original class distribution. It is derived from CDC BRFSS 2015. The balanced 50/50 file is not used. No survey weights are available in this derivative.
   - https://www.kaggle.com/datasets/alexteboul/diabetes-health-indicators-dataset
   - Kaggle API metadata reported CC0: Public Domain at retrieval.
   - UCI discovery/field reference: https://archive.ics.uci.edu/dataset/891/cdc+diabetes+health+indicators
   - UCI metadata contains inconsistent year/feature-count descriptions; the downloaded CSV, its header, original CDC 2015 archive, and Kaggle source identity define this experiment. We do not treat the UCI copy as independent data.

## Considered but not used for training

| Source | Why it does not solve the complete seven-input request |
|---|---|
| UCI Heart Disease | Clinical heart-disease outcome, but no SpO₂, temperature, BMI, or stress; maximum exercise HR cannot be replaced with resting HR. |
| UCI Maternal Health Risk | Pregnancy-specific cohort and risk labels. Not an appropriate general-patient model; lacks SpO₂, BMI, and a compatible stress measure. |
| MIMIC-IV-ED | Clinician triage acuity plus several vitals; full records require credentialing and data-use terms. Does not supply all seven requested inputs in the triage table. No access controls were bypassed. |
| WESAD | Laboratory stress study with 15 participants and wearable waveforms. Its stress task and sensors cannot be equated to an arbitrary scalar `stressLevel`; not joined to unrelated ICU/survey people. |
| Synthetic/threshold-generated vital-sign datasets | High accuracy against a generated label would primarily measure recovery of that generating formula, not actual health outcomes. Not used to claim clinical prediction. |

Primary references:

- https://archive.ics.uci.edu/dataset/45/heart+disease
- https://archive.ics.uci.edu/dataset/863/maternal+health+risk
- https://physionet.org/content/mimic-iv-ed/2.2/
- https://ubi29.informatik.uni-siegen.de/usi/data_wesad.html

## Missing evidence

No verified common cohort was found with all seven inputs, consistent timing, compatible measurement methods, and clinician-confirmed “normal / OK / doctor needed” labels. Stress remains unmodeled, BMI is unavailable in the ICU cohort, and live HR/SpO₂/temperature/glucose are absent in the survey cohort. The delivered models therefore make distinct, narrowly defined research predictions. Their scores must not be fused into a general triage decision.
