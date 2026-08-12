# Conversion boundary evidence — 2026-08-12 (correction)

**Review branch:** `review/lead-conversion-boundary`
**Baseline pin:** `76633d0507be579694f19e8b531c77045e3f4ce5`
**Control Room:** `LEAD_CONVERSION_BOUNDARY_CORRECTION_REQUIRED` addressed on this branch.
**Status:** Stop for review — no merge, deploy, preview, Ads changes, or production submissions.

## Corrections landed

1. **First-party attribution** — `js/sparklean-attribution.js` (+ intake inline persist). Click IDs survive when `sparklean-ads.js` / gtag are blocked.
2. **Direct `conversion-report`** when SparkleanAds absent (contact + guided intake).
3. **`fireAndReportConversion`** inspects durable report response; report failure → delayed/`UNRESOLVED`, never BROWSER_SENT success.
4. **Token hash only** on Blob; timing-safe verify; bearer returned once.
5. **Version/CAS mutation boundary** + BlobsServer concurrency proofs (`test:blob-concurrency`).
6. **Reconcile auth** — never `x-netlify-event` alone; HTTP requires `SPARKLEAN_RECONCILE_KEY`; schedule needs authentic payload + configured secret.
7. **Abuse bounds** — same-site origin gate, rate limits, idempotency keys, payload clips.

## Language

Evidence may say **BROWSER_SENT** only. There is **no Google-confirmed attribution** state.

## Schedule (VC)

- `netlify.toml` `[functions."leads-reconcile"] schedule = "*/15 * * * *"`
- `leads-reconcile.mjs` `export const config.schedule`

## Retention

- Blob `sparklean-leads`: operational tracking; `reportToken` TTL 24h (hash stored).
- `deleteLead` for ops deletion after import/window.
- Alerts: allowlisted retry fields only (no PII / bearer / credentials).

## Blocked-script proof (automated)

`test:conversion-adversarial` blocked-script case: Ads absent → click ID captured → lead once → OFFLINE_QUEUED → delayed copy → alert clean → replay no duplicate lead.

## Local test funnel (correction)

| Suite | Pass | Fail | Skip |
|-------|------|------|------|
| test:ads | 174 | 0 | 0 |
| test:paid-intake | 137 | 0 | 0 |
| test:leads-store | 22 | 0 | 0 |
| test:conversion-adversarial | 24 | 0 | 0 |
| test:blob-concurrency | 11 | 0 | 0 |

## Stop

No merge · no deploy · no Netlify preview · no campaign changes · no production submissions.
