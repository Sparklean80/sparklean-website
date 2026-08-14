# Control Room report — product `028854f` Deploy Preview proofs

**Stop for Control Room review.** No SEO, merge, production deploy, or Google Ads setting changes.

## SHAs

| Role | SHA |
|------|-----|
| **Product** | `028854f4b6f83ad6385fe3c2628d0e02ec1f3a88` |
| **Evidence** | `94668e97070b2ef7d98f5616b44f47de82a4b03e` |
| Production baseline pin | `76633d0507be579694f19e8b531c77045e3f4ce5` |

**Preview URL:** https://conversion-028854f--sparklean-website.netlify.app  
**Branch:** `review/lead-conversion-boundary`

## Product lineage (this stop)

1. `37589a8` — Ads consent gate + attribution sitewide + preview Brevo fail flag  
2. `146820d` — `leads-reconcile-invoke` (scheduled reconcile is not HTTP-callable) + no delayed UI on consent deny  
3. `028854f` — Brevo-fail host/DEPLOY_URL hardening + `PREVIEW_BREVO_FORCE_FAIL` response code  

## Required proofs (all PASS)

| Case | Result |
|------|--------|
| Guided intake durable `BROWSER_SENT` (desktop + mobile; delayed note = 0; survives reload/retry) | **PASS** |
| Consent denied → zero Google lead conversions; lead/Brevo continue; durable `OFFLINE_QUEUED` | **PASS** |
| Consent granted → exactly one logical Google conversion + `BROWSER_SENT` | **PASS** |
| Consent default/unresolved → may fire (legacy production-safe) + `BROWSER_SENT` | **PASS** |
| Unauthorized reconcile denied (`leads-reconcile-invoke` → 401; secret never in evidence) | **PASS** |
| Authorized reconcile idempotent (200/ok then replay 200/ok) | **PASS** |
| Forced Brevo failure → `ok:false`, no reportToken, code `PREVIEW_BREVO_FORCE_FAIL` (no false delivered/success) | **PASS** |
| Normal Brevo path restored + delivered (`ok:true` + reportToken) after FORCE unset | **PASS** |

Raw sanitized evidence: `docs/work-notes/2026-08-14-control-room-028854f/`  
Merged acceptance: `MERGED-sanitized-evidence.json` (`allRequired: true`).

## Verdicts (unchanged)

- `PRODUCTION_CONTACT_CONVERSION_CODE_DEPLOYED_BROWSER_GOOGLE_PROOF_REQUIRED`
- `AI_INTAKE_CONVERSION_HARDENING_PREVIEW_ONLY_BROWSER_PROOF_REQUIRED`

**Google Ads UI recording:** `NOT_CHECKED` (do not claim Ads UI recorded conversions).

## Notes for reviewers

- Contact + intake use Blob `leadId` + `reportToken` → `fireAndReportConversion`; durable `conversion-report` must reach terminal state (`BROWSER_SENT` or consent-denied `OFFLINE_QUEUED`). “Delayed” UI is not acceptance on the happy path.
- Consent: `ad_storage=denied` skips gtag conversion; lead/Brevo still accepted.
- Reconcile HTTP proofs use **`/.netlify/functions/leads-reconcile-invoke`**. Scheduled `leads-reconcile` returns platform empty **403** over HTTP (expected Netlify schedule lock).
- Preview Brevo fail: requires `SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL=1` **and** `SPARKLEAN_FORCE_BREVO_FAIL=1`, scoped to functions/runtime; fail-closed on `www.sparklean.co` / `sparklean.co`. **FORCE was unset after the fail proof.** Real `BREVO_API_KEY` was not altered.
- Evidence sanitizer preserves conversion id `17027441328`, label `HnWnCJPRt9kcELDFqLc_`, and lead/transaction UUIDs; redacts emails/phones/tokens/reconcile key.

## Explicitly not done

- Merge to `main` / production deploy  
- SEO / GSC indexing  
- Google Ads campaign / bidding / UI setting changes  
