# Measured results and release assessment

These are measured results from the saved experiment, not promised clinical performance. Candidate selection used development-set grouped cross-validation average precision. The following tests were not used to select candidates.

| Model | Selected algorithm | Test patients/rows | Positive labels | ROC-AUC | Average precision | Sensitivity at 0.5 | Brier score |
|---|---|---:|---:|---:|---:|---:|---:|
| sepsis | random_forest | 986 | 13 | 0.527 | 0.016 | 0.0% | 0.0131 |
| diabetes | hist_gradient_15 | 50,737 | 7,069 | 0.823 | 0.415 | 13.6% | 0.0981 |

## Interpretation

- **Sepsis: withheld from individual inference.** Internal ROC-AUC is close to chance. Hospital B testing also shows weak discrimination. Accuracy is high only because almost all examples are negative. At threshold 0.5 the model misses every positive case; this is not an acceptable clinical classifier.
- **Diabetes: research-only scores.** Ranking performance is materially better than the prevalence baseline, but there is no external validation or local-patient validation. At threshold 0.5 it misses most positive labels. A negative result must never be called healthy.
- No single model combines all seven requested measurements. No compatible stress measurement was available. No universal clinical triage labels were present.

## Confidence and external testing

- sepsis: internal ROC-AUC 95% bootstrap interval 0.353–0.709; average precision interval 0.008–0.032. Bootstrap unit: patient.
- diabetes: internal ROC-AUC 95% bootstrap interval 0.813–0.831; average precision interval 0.402–0.430. Bootstrap unit: feature-profile cluster.
- ICU hospital B: 13,769 patients, 78 positive labels; ROC-AUC 0.576, average precision 0.0087, prevalence 0.57%. No hospital-B data were used for fitting or calibration.

## Candidate comparison (development CV only)

| Task | Candidate | Mean ROC-AUC | Mean average precision |
|---|---|---:|---:|
| sepsis | dummy_prevalence | 0.500 | 0.0132 |
| sepsis | logistic_c0.1 | 0.599 | 0.0275 |
| sepsis | logistic_c1 | 0.613 | 0.0291 |
| sepsis | random_forest | 0.657 | 0.0506 |
| sepsis | hist_gradient_15 | 0.629 | 0.0376 |
| sepsis | hist_gradient_31 | 0.624 | 0.0330 |
| diabetes | dummy_prevalence | 0.500 | 0.1393 |
| diabetes | logistic_c0.1 | 0.817 | 0.3993 |
| diabetes | logistic_c1 | 0.817 | 0.3993 |
| diabetes | random_forest | 0.823 | 0.4223 |
| diabetes | hist_gradient_15 | 0.824 | 0.4242 |
| diabetes | hist_gradient_31 | 0.825 | 0.4242 |

## Data and selection limits

The ICU task uses the first six hours to predict the published challenge label during hours 7–24. Labels are already shifted six hours before estimated onset. Requiring 24-hour follow-up excludes short stays, including some early positive cases, and is a material selection limitation. Only 65 positives remain in hospital A after eligibility filters; this is inadequate evidence for a dependable model from the restricted features. The result is retained rather than changing the endpoint after seeing the test results.

The CDC-derived data retain repeated profiles, with all identical chosen input profiles grouped into the same split. This prevents profile leakage but does not replace respondent IDs or external validation. The derivative has no original survey weights, so estimates are not nationally representative.

The original CDC archive has 441,456 records. The Kaggle binary derivative used for diabetes has 253,680 rows. These are overlapping provenance sources, not separate independent datasets.

## Artifacts and validation

The fitted models and calibrators are in `artifacts/*.joblib`. All artifacts are research-only. Input validation and API guards have unit tests. No model writes patient information or predictions into Firebase.
