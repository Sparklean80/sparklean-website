# Control Room — Priority 1 preview proof (product `bb9b0fb`)

**Date:** 2026-08-14  
**Stopped for independent review before SEO (Priority 2+).**

## Starting / ending SHAs

| Role | Full SHA |
|------|----------|
| Baseline `main` | `76633d0507be579694f19e8b531c77045e3f4ce5` |
| Prior product (failed preview) | `b18a49f726f596c9b8e6b5e9b5f362807480ddb7` |
| Prior evidence tip | `f55dec8022ce0f35a47f16131f732650c8ba33b1` |
| **Conversion product (this)** | `bb9b0fbc19b4bb475e5f2fc9522234a99cc92ae7` |
| **Conversion evidence (this tip)** | see latest evidence commit on branch after this note |
| Branch | `review/lead-conversion-boundary` |

## Exact Deploy Preview

| Field | Value |
|-------|--------|
| URL | https://conversion-bb9b0fb--sparklean-website.netlify.app |
| Deployed product SHA | `bb9b0fbc19b4bb475e5f2fc9522234a99cc92ae7` |
| Netlify deploy id | `6a7f3ecf566af05252492564` |
| Worktree | `sparklean-website-preview-bb9b0fb` (detached `bb9b0fb`, npm ci) |

## Verdicts (still honest)

- Production contact: `PRODUCTION_CONTACT_CONVERSION_CODE_DEPLOYED_BROWSER_GOOGLE_PROOF_REQUIRED`  
  (production browser Google proof still not done; not claimed fixed in Ads UI)
- AI intake hardening: preview-proven for accept + conversion request on this SHA; **Google Ads recording not confirmed**

Do **not** claim Google confirmed a conversion. Do **not** claim production success.

## Local suites (before product commit)

| Suite | Result |
|-------|--------|
| `test:funnel` | pass |
| `test:ads` | pass |
| `test:paid-intake` | pass |
| `test:leads-store` | 28/0/0 |
| `test:conversion-adversarial` | 24/0/0 |
| `test:blob-concurrency` | 29/0 |
| `test:idempotency-lease` | 33/0 |

## Live preview proofs (`2026-08-14T16-15-25-325Z-evidence.json`)

### Contact desktop — PASS (preview)

- `contact-submit` 200 → `leadId=9d002293-2abf-4380-9602-f2f0db69ee73` + reportToken
- Thank-you UI visible
- `conversion-report` → `BROWSER_SENT`
- Google lead conversion network (one logical conversion, 3 fan-out URLs):
  - `en=conversion`
  - conversion id path `/pagead/conversion/17027441328/`
  - label `HnWnCJPRt9kcELDFqLc_`
  - `transaction_id` = durable lead UUID `9d002293-…`
- Note: this SHA uses Blob UUID as transaction id, **not** production `contact-*`

### Contact mobile — PASS (preview)

- Same pattern: lead `4ad27e78-…`, thank-you, `BROWSER_SENT`, Google conversion label + tid match

### Direct `?sent=1` + refresh — PASS (zero lead conversions)

- Thank-you UI only
- **0** hits with `en=conversion` / label `HnWn…`
- Config/page_view noise may still appear (base tag)

### Guided intake — PASS with one harness gap

- `quote-submit` 200 → `leadId=3ad05649-…` + reportToken
- Google conversion request observed with label `HnWn…` and tid `3ad05649-…`
- Delayed-tracking note counted `1` in UI; harness **did not capture** a `conversion-report` response for this path (unlike contact). Blob key for this lead exists. Treat durable `BROWSER_SENT` for intake as **incomplete in harness evidence** until re-checked.
- Replay of same fired id → **0** extra Google conversion attempts (`replayExtraGoogleHits: 0`)

### Blocked Ads/gtag — PASS (recoverable)

- Ads helper + gtag routes aborted
- `quote-submit` 200 → `leadId=7aeffdb5-…`
- `conversion-report` → **`OFFLINE_QUEUED`**
- **0** Google conversion hits
- Delayed note shown

### Brevo

Labeled preview proofs accepted by functions; Brevo configured on branch-deploy. Inbox will show additional CR/preview test messages (API smoke + desktop/mobile contact + intake + blocked). Not a production customer lead.

### Blobs

Store `sparklean-leads` lists lead keys + outbox + idem keys for the above ids (CLI list).

## Product mismatch vs production contact path

| | Production `76633d0` | Preview product `bb9b0fb` |
|--|----------------------|---------------------------|
| Transaction id | `contact-*` pending | Blob UUID `leadId` |
| Thank-you path | `?sent=1` consume | server JSON → client thank-you |
| Durable Blob | No | Yes |

## Explicit non-actions

- No merge to `main`
- No production deploy
- No Google Ads setting changes
- No unauthorized production submissions
- No claim Ads UI shows the conversion yet

## Unresolved / next (authorized separately)

1. Re-capture intake `conversion-report` BROWSER_SENT (harness gap)
2. Contact refresh after successful thank-you (extra conversion count) — dedicated step
3. Cookie-consent denial path (not run this round)
4. Brevo intentional failure path (not run this round)
5. Authenticated reconcile proof (`SPARKLEAN_RECONCILE_KEY` still missing in Netlify env list previously)
6. Production gate — only after Tony authorizes
7. **Priority 2+ SEO** — not started; waits until Control Room accepts P1 stop or explicitly says continue

## SEO / rest of order

Not started in this return. Conversion and SEO remain separate commits by design.
