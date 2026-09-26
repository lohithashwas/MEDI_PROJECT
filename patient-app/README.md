# MediKet Care Master — Android 1.2

This private master edition connects directly to the configured Firebase Realtime Databases. It does not need the website, ML server, mobile adapter, a local PC, or manual pairing. Internet access and valid configured credentials are required.

## Install

Install `dist/MediKet-Care-Master-v1.2.0.apk` on Android. Version 1.2.0 / version code 3 uses the same development signing certificate as earlier direct-install builds, allowing an update without uninstalling. It is not a Play Store production-signed release.

**Private build:** Firebase credentials requested by the owner are embedded at build time. They can be extracted from an APK. Do not publish or share this master APK outside trusted devices. Source files contain environment-variable names only. Other website credentials (voice, translation, etc.) are not included. Clearing local app data disconnects the app but cannot remove credentials compiled into the installed APK.

## Exact mappings

| Database | Path | App behavior |
|---|---|---|
| project-a0538 | `/latest` | `sys` + `dia` -> BP in mmHg; `datetime` -> measurement time |
| bp-and-temp | `/control/state` | BP ON sends `"ON"`, waits 2 seconds after acknowledgement, then attempts `"OFF"`; separate OFF button |
| temperture-89982 | `/temperature` | Scalar Fahrenheit -> Celsius display, original Fahrenheit also shown |
| temperture-89982 | `/control/state` | Independent Temperature ON/OFF buttons and returned state |
| Existing MEDIKET Firebase | Explicit `MEDIKET_VITALS_PATH` from local configuration | Patient details, HR, SpO2, steps, stress, glucose, BMI and ECG when supplied |

The source-details expander shows all received fields at these five paths, including BP flags, source pulse, power telemetry and other diagnostics. It does not browse other patients or copy the entire Firebase database. Unknown-unit patient temperature remains raw source data and never overrides the independent Fahrenheit sensor.

Device feeds refresh independently every five seconds while the app is foregrounded; pull down or tap Refresh for a manual update. An unavailable source clears its readings without discarding the other connected feeds. Zero HR/SpO2, malformed numbers, reversed BP, unsupported units and missing values never become invented measurements. Zero steps/stress remain valid.

The scalar temperature source has no timestamp: its freshness is shown as unknown. Fetch time is separate from measurement time. BP and temperature sources carry no patient ID, so they are not automatically assigned to a patient's health record.

## Controls and limits

Controls write only the specified `/control/state` string. A Firebase acknowledgement confirms a saved command, not physical device operation or a finished reading. Actual hardware must implement the same paths. BP automatic OFF is best-effort while the app runs; a killed process or lost network can prevent OFF, so a firmware timeout is required for a guaranteed hardware cutoff. Controls are exercised against mocks during tests; read-only live checks do not start the cuff or temperature hardware.

Health notes, medicine checklists, bookmarks, water logging, nearby maps and official care links remain available. Actual clinical consultations and schemes use external services. The app does not invent consultations, clinical outcomes, ML diagnoses or missing readings.

## Build locally

From `patient-app`:

```powershell
node server/prepare-master.mjs
flutter analyze --no-pub
flutter test --no-pub
flutter test test/firebase_live_test.dart --no-pub --dart-define=LIVE_FIREBASE_TEST=true --dart-define-from-file=.private/firebase-defines.json
flutter build apk --release --no-pub --dart-define-from-file=.private/firebase-defines.json
```

Preparation reads only the nine required Firebase settings from `../.env.local`, verifies the five paths using read-only GET requests, and writes an ignored `.private/firebase-defines.json`. It does not print secrets. The APK and intermediate build files contain the compiled configuration; keep them private. Rebuild after rotating credentials. Building without defines retains the earlier HTTPS server/pairing mode.

Implementation references: [Firebase REST authentication](https://firebase.google.com/docs/database/rest/auth), [Firebase REST writes](https://firebase.google.com/docs/database/rest/save-data), [Flutter Android releases](https://docs.flutter.dev/deployment/android).
