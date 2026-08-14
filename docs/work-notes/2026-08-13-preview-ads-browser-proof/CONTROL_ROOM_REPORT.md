# Control Room — Google Ads claim boundary (preview browser proof)

**Date:** 2026-08-13  
**Stopped for independent review.** No merge, no production deploy, no Google Ads setting change, no production test.

## Verdicts (unchanged)

| Surface | Verdict |
|---------|---------|
| Production contact form | `PRODUCTION_CONTACT_CONVERSION_CODE_DEPLOYED_BROWSER_GOOGLE_PROOF_REQUIRED` |
| AI quote intake hardening | `AI_INTAKE_CONVERSION_HARDENING_PREVIEW_ONLY_BROWSER_PROOF_REQUIRED` |

Do **not** read either as confirmed Google conversion or production success.

## Exact preview

| Field | Value |
|-------|--------|
| Preview URL | https://conversion-b18a49f-exact--sparklean-website.netlify.app |
| Product SHA | `b18a49f726f596c9b8e6b5e9b5f362807480ddb7` |
| Evidence tip (not this deploy) | `f55dec8022ce0f35a47f16131f732650c8ba33b1` |
| Production main | `76633d0507be579694f19e8b531c77045e3f4ce5` |
| Netlify deploy id | `6a7debbd7a87e6e5f0099d66` |
| Worktree | `C:\Users\Tony\Downloads\sparklean-website-preview-exact-b18a49f` (detached `b18a49f`) |
| Packaging | `npm ci` so `@netlify/blobs` is bundled — **no product source change** |

Raw capture: `docs/work-notes/2026-08-13-preview-ads-browser-proof/2026-08-13T16-08-38-866Z-evidence.json`

## Product mismatch (must not be papered over)

On **production `76633d0`**, contact conversion uses `contact-*` pending id + `?sent=1` consume.

On **preview product `b18a49f`**, `/contact` intercepts submit → `contact-submit` → Blob UUID `leadId` → `fireAndReportConversion(leadId)`.  
`?sent=1` is thank-you only (no Ads invent). **`contact-*` transaction IDs are not used on this SHA.**

## Browser results (Playwright desktop 1440 + mobile 390)

### 1. Desktop contact — **FAIL**

- Submit reached `POST /.netlify/functions/contact-submit` → **500** public failure.
- Thank-you **not** shown. `sparklean_ads_conv_lead_ids` **empty**.
- Function log: `[contact-submit] email aborted OUTBOX_MISSING`
- Screenshot: `…-desktop-contact-after.png`

### 2. Mobile contact — **FAIL**

- Same: **500**, public failure, no thank-you, no fired id.
- Screenshot: `…-mobile-contact-after.png`

### 3. Google conversion network (label + transaction id) — **NOT PROVEN**

Zero requests contained conversion label `HnWnCJPRt9kcELDFqLc_` or `en=conversion` / `event=conversion`.

Hits that *were* captured are **gtag.config / page_view / remarketing** (`en=gtag.config`, `en=page_view`, `viewthroughconversion/…`, `/rmkt/collect`, `/ccm/collect`).  
Those fire on page load of any page with the base AW tag. **Not** the lead conversion action.

| Step | Raw Google-ish hits | Hits with label `HnWn…` | `contact-*` id | conversion-report |
|------|---------------------|-------------------------|----------------|-------------------|
| Desktop contact | 10 | **0** | **0** | **0** |
| Mobile contact | 10 | **0** | **0** | **0** |
| Direct `?sent=1` + refresh | 8 | **0** | **0** | **0** |
| AI intake | 10 | **0** | n/a | **0** |
| AI intake, ads/gtag blocked | 0 | **0** | n/a | **0** |

Google Ads **receipt/recording** of a conversion: **not confirmed** (no conversion request fired).

### 4. Direct / refresh `?sent=1` — **partial (no conversion event)**

- Thank-you UI **did** show on `?sent=1` (legacy bookmark path).
- **Zero** `HnWn…` conversion requests on open or refresh.
- Raw count of 8 is config/page_view only, not lead conversion.
- This does **not** prove the **production** `contact-*` consume path (that path is not on `b18a49f`).

Screenshots: `…-desktop-sent1-direct.png`, `…-desktop-sent1-refresh.png`

### 5. AI intake (preview) — **FAIL** (submit)

Path: `/residential-cleaning?quote=1` (paid minimum UI).

- `quote-submit` **500**. UI error shown. No `reportToken`, no `conversion-report`, no Google conversion event, replay n/a.
- Function log: lead Blob row appeared (`leadId=202078f5-6c5d-4b67-9d50-66f21f9ae814`, `trackingStatus=PENDING`) then **`OUTBOX_MISSING`**; OpenAI summary skipped (401 invalid issuer — unrelated).
- Blocked-tag run: gtag/ads aborted as intended (**0** Google hits) but intake still **500**, so **OFFLINE_QUEUED recovery was not exercised**.

Screenshots: `…-intake-intake-open.png`, `…-intake-intake-after.png`, `…-intake-blocked-intake-after.png`

## Failures / skips

| Item | Status |
|------|--------|
| Exact-SHA preview URL | **Done** |
| Desktop genuine contact submit | **Fail** — `contact-submit` 500 `OUTBOX_MISSING` |
| Mobile genuine contact submit | **Fail** — same |
| Google conversion request + label `HnWn…` | **Fail / not observed** |
| Unique `contact-*` transaction id | **Skip on this SHA** — product uses Blob UUID, and submit never succeeded |
| `?sent=1` zero *conversion* requests | **Observed 0 conversion events**; config/page_view still fire |
| Durable Blob lead + Brevo + reportToken + conversion-report + Google + replay dedupe | **Fail** — outbox missing after lead create |
| Blocked-script/tag recovery | **Skip** — submit failed before report path |
| Google Ads UI recording | **Not attempted / not confirmed** |
| Production site test | **Not authorized — skipped** |
| Merge / `--prod` / Ads settings | **Not done** |

## Diagnosis (evidence only — not a claimed fix)

Exact `b18a49f` Blobs writes are not durably readable before outbox CAS (`OUTBOX_MISSING`). A later **uncommitted** strong-consistency/etag wrap (prior preview session) made API submits succeed on a *different* draft alias; that patch is **not** this SHA and is **not** deployed here.

## Stop

Independent Control Room review required. No further preview intakes, no production work, no Ads changes unless newly authorized.
