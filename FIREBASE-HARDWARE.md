# MediKit RFID and vital-sign format

Database: `https://mediket-fyp-default-rtdb.asia-southeast1.firebasedatabase.app`

This is the agreed target schema for the hardware integration, not a claim that
RFID login is already connected. The database was empty when inspected.
`firebase-hardware-format.json` contains illustrative data only; replace it with
real registered cards, patients and measurements. Do not upload the example tap
as a real patient tap or the example readings as actual measurements.

## Database paths

```text
cards/{CARD_UID}/patientId
cards/{CARD_UID}/enabled
users/{patientId}/profile
users/{patientId}/vitals/latest
users/{patientId}/healthChecks/{checkId}
readers/{readerId}/latestTap
```

Use `kiosk-01` for the first reader. Each physical kiosk must have its own reader
ID; its website watches only that reader's tap event.

## Register the card and patient once

Example card UID: `A1B2C3D4`. Store RFID UIDs as uppercase hexadecimal with no
spaces, colons or hyphens. Preserve leading zeros. The RFID UID is distinct from
the patient's ABHA number.

At `cards/A1B2C3D4`:

```json
{"patientId":"patient_001","enabled":true}
```

At `users/patient_001/profile`:

```json
{"name":"Example Patient","role":"patient","abhaId":"","email":""}
```

The name and patient role are required. ABHA ID and email are optional. Use a
stable patient ID; do not use the person's name as the database key. Register
these records before publishing the tap. The website must not create an account
for an unknown card or trust a patient role sent with a tap event.

## Hardware: publish each new tap

Write this object to `readers/kiosk-01/latestTap` using Firebase `set` or REST PUT:

```json
{
  "eventId": "NEW-UNIQUE-ID-FOR-EVERY-TAP",
  "cardUid": "A1B2C3D4",
  "tappedAt": {".sv":"timestamp"}
}
```

Generate a fresh event ID even when the same card is tapped again. A UUID or a
unique boot ID plus an incrementing counter works. Publish once per physical tap;
do not continuously rewrite an event while the card rests on the reader. Firebase
resolves the server timestamp placeholder to milliseconds since Unix epoch.

The website integration will observe a new, recent event for its configured
reader, resolve `cards/{cardUid}`, require `enabled: true`, load the matching
profile, establish that patient's session and open `/portal`. It must not log in
using an old tap already present when the page opens. Unknown cards, disabled
cards and missing profiles must remain on the tap screen with a useful message.

## Hardware: publish actual sensor readings

After resolving the card's patient ID, write readings to
`users/patient_001/vitals/latest`:

```json
{
  "cardUid":"A1B2C3D4",
  "readerId":"kiosk-01",
  "heartRate":72,
  "spo2":98,
  "temperature":36.7,
  "glucose":96,
  "stressLevel":28,
  "steps":4820,
  "updatedAt":{".sv":"timestamp"}
}
```

| Field | Type / unit |
| --- | --- |
| `heartRate` | Number, beats/minute |
| `spo2` | Number, percent |
| `temperature` | Number, degrees Celsius |
| `glucose` | Number, mg/dL |
| `stressLevel` | Number, percent on a 0–100 scale, only if your device supplies it |
| `steps` | Nonnegative integer, today's step count |
| `updatedAt` | Firebase server timestamp, milliseconds |

Send numbers, not strings containing units. Omit a measurement or write `null`
when it is unavailable; never substitute example values or zero. A real zero
step count is valid. For a full measurement snapshot, replace `latest` using PUT
so old fields do not remain from previous measurements. If sensors update
independently, also supply `measuredAt` with per-field timestamps, for example
`"measuredAt":{"heartRate":{ ".sv":"timestamp" }}`; don't make an old reading
look current by updating only the overall timestamp.

Keep writing to the patient associated with that measurement. Do not move one
patient's readings to a newly tapped patient's record.

## Website-owned health checks

Reserve `users/{patientId}/healthChecks/{checkId}` for the website's saved check
results. Hardware should not write these. Check IDs are `diabetes`, `pressure`,
`heart`, `respiratory`, `kidney`, `liver`, `anemia`, `mental`, `lifestyle`, `lab`.
The website will store answers, the calculated summary and completion timestamp
under the signed-in patient, rather than a shared kiosk history.

## Blood pressure remains separate

Do not send BP to this database for the website. Retain the existing BP source:
`https://project-a0538-default-rtdb.asia-southeast1.firebasedatabase.app/latest.json`
with `sys`, `dia` and `datetime`, using its existing separate credential.

The BP feed currently has no patient/card identifier. It remains a separate device
reading and must not be silently saved as a patient's measurement without a way
to associate the measurement with that patient.

## Connection rules

Keep Firebase credentials out of website client code and source control. The
website reads through its server. Reader access should be scoped to the reader's
tap path and permitted measurement writes; card registration and user profiles
belong to the registration/admin flow. Card possession is a kiosk sign-in method,
not official ABHA identity verification.

When the hardware is ready, publish one real registered card tap and a measurement
snapshot, then verify these exact paths before enabling automatic login.
