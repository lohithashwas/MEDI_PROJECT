# MediKet Care — Android 1.1

Install `dist/MediKet-Care-v1.1.0.apk`. This direct-install release uses the existing development signing certificate. A store release requires your own signing setup.

## Device measurements

The dashboard starts empty, reads actual Firebase measurements through the authenticated server adapter, and refreshes every five seconds while running. Pull down to refresh manually. No substitute vital readings are generated. Recent, older, unknown-time and future-clock readings have distinct labels; per-sensor timestamps take priority.

The server reads Firebase credentials from the website's `../.env.local`. Never put Firebase database secrets into Flutter assets or an APK.

- BP uses `BP_FIREBASE_URL` and `BP_FIREBASE_AUTH`. Only `sys`, `dia`, `datetime` are used. This hardware feed has no patient identity, so BP remains explicitly unassigned.
- Other vitals use `MEDIKET_FIREBASE_URL`, `MEDIKET_FIREBASE_AUTH` and the explicit `MOBILE_PATIENT_ID` at `users/{id}/vitals/latest`. No patient ID is guessed.
- Configure `MOBILE_PAIRING_TOKEN` (at least 24 random characters) in `patient-app/.env.local`.
- Run `node server/server.mjs`. The adapter binds to loopback port 3020 by default. Expose it through your HTTPS server/reverse proxy.
- In the Android profile settings, enter the HTTPS origin and pairing code. Both persist in encrypted device storage. Clearing local data disconnects the device.
- A public server origin can optionally be supplied at build time with `--dart-define=MEDIKET_SERVER=https://your-host`. Do not compile pairing codes or Firebase credentials into the app.

The adapter currently serves one explicitly configured patient/device pair. It is not a multi-patient account system. No public HTTPS deployment is configured in this workspace. The BP source was successfully read during verification; other vitals require the missing patient ID.

## Nearby care

An interactive OpenStreetMap covers Kelambakkam, Thiruporur and the SSN College corridor. Government facilities and private hospitals have distinct markers. Three amber Mediket pins are proposed locations, not operating centers. Pins indicate approximate areas; directions search the facility name rather than navigating to an unverified exact entrance.

Facility identity sources are linked in the app:
- Kelambakkam PHC: https://www.nhm.gov.in/images/pdf/nrhm-in-state/state-wise-information/tamilnadu/24x7_phc_tamilnadu.pdf
- Thiruporur government facility: https://imhd.tn.gov.in/ayurveda-hospitals/
- Chettinad: https://www.chettinadhospital.com/contact

CMCHIS and PM-JAY coverage is marked unverified until current empanelment, individual eligibility and treatment coverage are confirmed. ABHA is identified as a health identity, not insurance. No suitability decision is invented.

## Other features

Encrypted personal health notes, prescribed medicine checklists, water logging, scheme bookmarks, emergency dialler and official eSanjeevani/clinic consultation links. Invented doctor profiles, local pretend bookings, prefilled medical records, fabricated charts and simulated video calls have been removed. Existing sample records are excluded on migration; user-created notes are retained.

## Verification

`flutter analyze`
`flutter test`
`node --test server/vitals.test.mjs`
`node server/check-live.mjs` (prints connection status only)
`flutter build apk --release`
