# Work note — Contact form Ads conversion + phone-click audit

**Date:** 2026-08-12  
**Branch:** `fix/contact-form-ads-conversion`  
**Mode:** Deploy separately — Netlify contact success → same Ads conversion as AI Quote Request Completed.

## Defect (production)

`/contact?sent=1` showed thank-you UI and `history.replaceState`, but never called `gtag('event','conversion',…)`. Base tag `AW-17027441328` loaded; lead conversion did not.

## Fix

1. On real form `submit` (required consent checkbox already blocks invalid submits): `SparkleanAds.markContactFormSubmitPending()` stores `contact-{ts}-{rand}` in sessionStorage.
2. On `?sent=1` (Netlify accepted redirect): `SparkleanAds.trackContactFormAccepted()` consumes pending id and fires **one** conversion to `AW-17027441328/HnWnCJPRt9kcELDFqLc_` with `transaction_id` = that id.
3. Direct `/contact?sent=1` or refresh after replaceState → **no** pending → **zero** conversions.
4. Same sessionStorage dedupe as intake `leadId` path.

No base-tag reinstall. No Ads bidding/campaign edits.

## Phone-click audit (separate from “Calls from ads”)

| Path | What fires today | Ads lead conversion? |
|------|------------------|----------------------|
| `js/sparklean-events.js` `tel:` click → `phone_click` | Analytics (`dataLayer` / gtag event name only) | **No** |
| Sticky bar `tel:2398883588` | Same `phone_click` via delegate | **No** |
| Nav / page `tel:` links | Same | **No** |
| Google Ads **Calls from ads** | Call asset / call extensions in Ads UI | **Not wired in website code** |

Do **not** treat `phone_click` as the “AI Quote Request Completed” or “Calls from ads” conversion. Call-asset conversion remains an Ads-side setting (Tony).

## Proof required after deploy

One controlled Netlify contact submission → Network shows exactly one `googleadservices` / `conversion` hit with `send_to` containing `HnWnCJPRt9kcELDFqLc_` and a `contact-*` transaction id.
