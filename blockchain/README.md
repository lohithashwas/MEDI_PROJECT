# MEDIKET Ganache CLI ledger

The Live Device website includes a **Device data in blocks** panel. A local collector reads the five configured Firebase feeds, encrypts each changed snapshot with AES-256-GCM, and stores the complete encrypted payload in a zero-value Ethereum transaction to the local account itself. Ganache automines the transaction into a real block. No Solidity contract or MetaMask connection is required.

## Run from the repository root

```powershell
# Only when port 7447 is unused; the current chain is already running.
npm run ganache
# In another terminal:
npm run blockchain:collect
# Website:
npm run dev -- --port 3002
```

Open http://127.0.0.1:3002/portal/live-device. Expand a record to see its block number, transaction hash, block hash, gas used, observation time, mining time and original source data decrypted locally.

## Network and storage

- Ganache CLI: loopback `127.0.0.1:7447`, chain ID 1337, network ID 5777.
- Collector: loopback `127.0.0.1:3021`; the website proxies its read-only `/status` endpoint through `/api/blockchain`.
- The current RPC uses the existing Ganache workspace on port 7447. Keep that workspace running. `npm run ganache` is an optional separate CLI launch with `.blockchain/ganache-7447`; do not launch it over the existing listener or substitute a fresh chain for the pinned workspace.
- Encryption key: `.blockchain/ledger-7447/encryption.key`. Back up this file together with the chain database. Without the key, encrypted records cannot be decoded.
- Durable encrypted outbox: `.blockchain/ledger-7447/outbox.json`. It retries when Ganache returns and preserves nonce information to recover a lost acknowledgement.
- `.blockchain/ledger-7447/chain.json` pins the genesis block and account. The collector refuses to silently switch to a different chain.

The website now connects directly to the existing Ganache chain on port 7447 (chain ID 1337, network ID 5777). Its existing 27 blocks were preserved. The previous CLI chain on port 8545 and its five records remain untouched in `.blockchain/ganache`, with their original key and outbox in `.blockchain`. No screenshot mnemonic was used. New records for 7447 use a separate local encryption key and chain identity file. Ganache test accounts must never hold public-chain funds.

## Captured data

The collector reads server-only configuration from `.env.local`:

| Source | Path |
|---|---|
| Patient device | Explicit `MEDIKET_VITALS_PATH` |
| Blood pressure | project-a0538 `/latest` |
| BP control | bp-and-temp `/control/state` |
| Temperature | temperture-89982 `/temperature` |
| Temperature control | temperture-89982 `/control/state` |

All fields returned at these paths, including device diagnostics, are preserved. Firebase URLs containing credentials, authentication tokens, private keys and the screenshot seed phrase are not placed on chain. Identical snapshots are deduplicated using a keyed content digest. Changed timestamps count as changed data. Temporary feed failures are reported instead of being stored as fabricated readings.

Polling runs five seconds after the preceding cycle completes. This is a snapshot archive, not a guaranteed capture of every sensor event: values overwritten between polls, especially short control pulses, can be missed. Null/absent source readings are reported as unavailable. Existing Firebase history, unrelated database paths, browser-only notes and appointments are not imported. Observation time does not establish when the sensor measured a value.

This local development chain is not a distributed medical records service. Decrypted records are exposed through the existing local development website; production deployment needs real user authentication, authorization, retention controls and key management. Do not expose the unlocked RPC or collector publicly. Never delete the database/key to troubleshoot a connection failure.

## Verification

```powershell
npm run blockchain:test
```

Tests use a separate ephemeral Ganache chain and synthetic values to check encryption, tamper rejection, real block receipts, restart replay, deduplication, durable queue recovery and lost acknowledgements.

CLI options follow the [Ganache CLI reference](https://archive.trufflesuite.com/docs/ganache/reference/cli-options/).

Dependency note: installation reported 35 audit findings in the resulting dependency tree. Ganache is an archived development tool; this integration remains loopback-only and is not a production deployment.

Verified in this build: five configured live Firebase sources produced five confirmed encrypted blocks, the website API returned HTTP 200, and the browser displayed a decoded BP record with its actual block and transaction hashes. Automated tests also restart disk-backed Ganache and verify that the same records remain available.
