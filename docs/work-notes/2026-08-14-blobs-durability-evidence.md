# Conversion evidence — Blobs durability (2026-08-14)

**Review branch:** `review/lead-conversion-boundary`  
**Baseline pin:** `76633d0507be579694f19e8b531c77045e3f4ce5`  
**Product SHA (this correction):** `bb9b0fbc19b4bb475e5f2fc9522234a99cc92ae7`  
**Parent evidence tip before this:** `f55dec8022ce0f35a47f16131f732650c8ba33b1`  
**Prior product (failed exact-SHA preview):** `b18a49f726f596c9b8e6b5e9b5f362807480ddb7`

## Verdicts (still in force)

- `PRODUCTION_CONTACT_CONVERSION_CODE_DEPLOYED_BROWSER_GOOGLE_PROOF_REQUIRED`
- `AI_INTAKE_CONVERSION_HARDENING_PREVIEW_ONLY_BROWSER_PROOF_REQUIRED`

Do not claim Google conversion confirmed or production success.

## Why this product commit

Exact-SHA Deploy Preview of `b18a49f` (`conversion-b18a49f-exact--sparklean-website.netlify.app`, deploy `6a7debbd7a87e6e5f0099d66`) failed live browser proofs:

- Desktop/mobile contact → `contact-submit` **500**
- Guided intake → `quote-submit` **500**
- Function logs: `email aborted OUTBOX_MISSING` / `OUTBOX_MISSING` after lead create
- Zero Google conversion hits with label `HnWnCJPRt9kcELDFqLc_` (only gtag.config / page_view)

Root cause: Netlify Blobs on draft/branch deploy often omit ETag on write responses and read eventually; `writeCas` treated missing ETag as `CAS_CONFLICT`, and `ensureOutboxPending` returned an unsealed row → deliver path threw `OUTBOX_MISSING`.

## Product change (`bb9b0fb`)

File: `netlify/functions/lib/leads-store.mjs`

- Production store: `getStore({ name, consistency: "strong" })` + etag-cache wrap
- Strong reads only when not using injected BlobsServer
- `writeCas`: `modified === false` = real conflict; missing ETag → wait for sealed record
- `setJSON` wrap recovers ETag from list/read after successful write without header
- `ensureOutboxPending`: wait for durable seal; never return fake row on unconfirmed create

`docs/SPARKLEAN_REFERENCE.md` updated (date + durability note).

Architecture preserved: truthful states, no `CONFIRMED` from browser, CAS only, leases, outbox fencing, hashed report tokens, no PII in alerts.

## Local suites (product `bb9b0fb` tree)

| Suite | Result |
|-------|--------|
| `npm run test:funnel` | **pass** (exit 0) |
| `test:ads` | **pass** |
| `test:paid-intake` | **pass** |
| `test:leads-store` | **pass=28 fail=0 skip=0** |
| `test:conversion-adversarial` | **pass=24 fail=0 skip=0** |
| `test:blob-concurrency` | **pass=29 fail=0** |
| `test:idempotency-lease` | **pass=33 fail=0** |

## Prior exact-SHA preview artifacts (failure evidence)

Directory: `docs/work-notes/2026-08-13-preview-ads-browser-proof/`

- `CONTROL_ROOM_REPORT.md` — full fail matrix for `b18a49f`
- `2026-08-13T16-08-38-866Z-evidence.json` — network/function captures
- Screenshots (desktop/mobile contact, sent=1, intake, blocked-tag)

Harness: `scripts/preview-ads-browser-proof.mjs`

## Still required (not claimed done here)

1. Push this product + evidence
2. Exact-SHA Netlify Deploy Preview of **`bb9b0fb`** (not `b18a49f`, not dirty worktree)
3. Live contact + guided-intake + blocked-tag proofs with:
   - Blob lead
   - Brevo delivery
   - reportToken
   - conversion-report
   - Google network request containing `17027441328` + `HnWnCJPRt9kcELDFqLc_` + durable transaction id
   - refresh/replay zero extra conversions
4. Stop for Control Room — no merge, no prod, no Ads settings

## Explicit non-actions

- No merge to `main`
- No production deploy
- No Google Ads setting changes
- No unauthorized production submissions
- No claim that Google recorded a conversion
