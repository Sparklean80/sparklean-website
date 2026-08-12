# Conversion boundary evidence — 2026-08-12

**Review branch:** `review/lead-conversion-boundary`  
**Production baseline pin:** `76633d0507be579694f19e8b531c77045e3f4ce5`  
**Status:** Implementation + local / adversarial tests pushed for Control Room review.  
**Explicitly not done here:** merge to `main`, Netlify deploy/preview, Ads campaign changes, production form submissions, founder acceptance claim.

## 1. Baseline gaps (`76633d0`)

What that tip **does** prove:

- Contact form sets a pending `contact-*` id on submit and, after `?sent=1`, fires `send_to=AW-17027441328/HnWnCJPRt9kcELDFqLc_` with `transaction_id` = that pending id.
- Direct `?sent=1` without pending → zero conversions.
- Guided intake fires the same conversion only after `quote-submit` returns `leadId`.

What it **does not** prove:

- No durable lead store (Netlify Blobs).
- No server-accepted contact path (browser navigation / Netlify Forms success URL only).
- No `BROWSER_SENT` vs Google-confirmed distinction — browser `gtag` leave ≠ Ads reporting confirmation.
- No `OFFLINE_QUEUED` / alert path when Ads helper is blocked after lead accept.
- No reconciliation for stuck `PENDING` Google-attributed leads.

**Language rule for this pack:** evidence may say **BROWSER_SENT** only. There is **no Google-confirmed attribution** state in this system. Do **not** claim Google attribution or reporting confirmation.

## 2. Contact (genuine) — proof checklist

Preview deploy URL: **not opened in this review push** (no Netlify credentials / no deploy).

| Step | Expected | Observed |
|------|----------|----------|
| POST `/.netlify/functions/contact-submit` | `{ ok, leadId, reportToken }` | Local contract + unit coverage; live preview deferred |
| Blob lead | `intakeSource=CONTACT_FORM`, `trackingStatus=PENDING` | Covered by leads-store + adversarial suite |
| Brevo / Slack | Lead email / optional Slack | Not exercised against production |
| Thank-you UI | `#cp-thanks` visible | Wired in `pages/contact.html` |
| Ads network | Exactly one conversion; `transaction_id` = `leadId` | Unit: fireAndReport → BROWSER_SENT |
| Replay | Zero additional conversions | Adversarial: duplicate report → `duplicate: true` |
| Report | `conversion-report` → `BROWSER_SENT` | Unit covered |

## 3. Guided intake (independent) — proof checklist

Explicitly **not** the contact form.

| Step | Expected | Observed |
|------|----------|----------|
| POST `/.netlify/functions/quote-submit` | `{ ok, leadId, reportToken }` | Funnel mocks + function contract |
| Blob lead | `intakeSource=GUIDED_INTAKE`, `PENDING` | leads-store |
| Success UI | Intake done copy | paid-intake funnel tests |
| Ads network | Exactly one conversion; `transaction_id` = `leadId` | funnel pass |
| Replay | Zero | Ads + adversarial |
| Report | `BROWSER_SENT` | Unit |

## 4. JS blocked — proof checklist

| Step | Expected | Observed |
|------|----------|----------|
| Lead accepted | Blob remains | Unit |
| Ads helper / `gtag` unavailable | Not treated as success | `test:ads` helper-missing → OFFLINE_QUEUED |
| Report | `OFFLINE_QUEUED` or `FAILED` | Pass |
| Alert | Allowlisted retry payload only | Adversarial PII/token leak scan |
| UI | Delayed-tracking copy | Wired in contact + intake |

## 5. Schedule (version-controlled)

- `netlify.toml` → `[functions."leads-reconcile"]` `schedule = "*/15 * * * *"`
- `netlify/functions/leads-reconcile.mjs` → `export const config = { schedule: "*/15 * * * *" }`
- Unauthorized HTTP reconcile (no schedule event / wrong key) → **401**

## 6. Retention / deletion

- Blob store: `sparklean-leads` (operational conversion tracking — **not** a CRM of full customer PII).
- `reportToken` TTL: **24 hours** (`REPORT_TOKEN_TTL_MS`); expired reports → 401.
- Ops may `deleteLead(leadId)` after offline import or retention window; helper exported from `leads-store.mjs`.
- Alerts use **allowlisted** retry fields only (`RETRY_PAYLOAD_KEYS`); never `reportToken`, never customer email/phone/name, never API credentials.

## 7. Local automated evidence

```text
npm run test:funnel
# includes test:ads, test:paid-intake, test:leads-store, test:conversion-adversarial
```

Results recorded in the evidence commit message / Control Room return block after preflight.

## 8. Stop condition

**Stop for Control Room review.** No merge, deploy, Netlify preview, Ads changes, or production submissions from this push.
