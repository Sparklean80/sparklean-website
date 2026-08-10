# Work note — Google Ads → website → lead funnel audit

**Date:** 2026-08-10  
**Mode:** Audit only (no commit / push / deploy / production changes)  
**Repo:** `Sparklean80/sparklean-website` (`C:\Users\Tony\Downloads\sparklean-website`)  
**Branch:** `main` (tracking `origin/main`)  
**Full SHA:** `a27ae9b3136f2056398ca607a55aef9ed1cdb7c7`  
**Tip subject:** Reframe the blog as a Knowledge Center and scrub indexed claim language.

**Note:** `docs/START_HERE.md` is not present in this repo; baseline taken from `AGENTS.md` + this work note.

---

## Verdict (do not claim funnel works)

The guided quote **component is live in production** as a JS overlay (not a dedicated URL). Google Ads conversion tag **gates correctly on Brevo success + `leadId`**. With Ads spend and **0 conversions**, the dominant failure modes are: (1) users never complete the intake that fires the conversion, (2) they use the **Netlify contact form** instead (no Ads conversion), (3) Ads URL hygiene (`{ignore}` → **404**), and (4) **no Call / Lead Form assets** and **no phone-click conversion** in code.

A production test submission that reaches `info@sparklean.co` (or `SPARKLEAN_LEAD_TO`) **and** records in Google Ads under `AW-17027441328/HnWnCJPRt9kcELDFqLc_` has **not** been completed in this audit.

---

## Exact root causes

1. **Conversion only fires from guided intake success, not from the visible contact form.**  
   `js/quote-intake.js` → `POST /.netlify/functions/quote-submit` → Brevo email success → `leadId` → `SparkleanAds.trackQuoteRequestCompleted` → `gtag('event','conversion',{send_to:'AW-17027441328/HnWnCJPRt9kcELDFqLc_', transaction_id})`.  
   `/contact` primary UI is Netlify Forms (`sparklean-contact`) — **never** calls that conversion.

2. **“All CTAs go to `/contact`” is HTML fallback, not total removal of AI quote.**  
   Quote CTAs use `href="/contact"`; `quote-intake.js` intercepts most of them and opens the overlay. Proven live on `/residential-cleaning` and `/contact`. Without JS, users land on the contact form path.

3. **`/get-a-quote` never served a quote page on Netlify.**  
   Since `756f235` (2026-06-17): 301 → `/contact`. Query string **preserved** (`?utm…&gclid…` kept). There is no separate deployed AI-quote route to restore.

4. **Literal `{ignore}` in the path is a 404.**  
   Production: `/residential-cleaning%7Bignore%7D?…` and `/residential-cleaning/{ignore}?…` → **404**. That is an Ads final-URL / tracking-template defect, not a site feature. Clean `/get-a-quote?utm…` 301 keeps attribution.

5. **Calls cannot convert in Ads with current setup.**  
   No Call asset (Tony verified). Code has `tel:2398883588` only — **no** phone conversion / call-click gtag. Explains “Calls from ads” silent since Sep 2025.

6. **Funnel friction / split attention.**  
   Traffic on `/contact` sees a full contact form first; guided quote is secondary (hero/sidebar CTAs). Mobile sticky “Get quote” **does** open intake (wired in `quote-intake.js`). Completing a multi-step intake on paid clicks is rare at n=17.

7. **No GTM / Consent Mode in repo.**  
   Direct `gtag.js` + `AW-17027441328` only. Unit tests for gating pass; production attributed conversion not proven.

---

## What is working

| Item | Evidence |
|------|----------|
| Guided intake deployed | Live overlay: “A few brief questions” / Step 1 of 5 after Get a Quote |
| Scripts on key pages | `serviceFlows.js`, `quote-intake.js`, `sparklean-ads.js`, AW tag |
| Conversion gating (code) | `scripts/test-google-ads-conversion.mjs` — ALL PASSED |
| `get-a-quote` UTM preserve | 301 → `/contact?utm_source=google&gclid=TEST123` |
| Sticky mobile Get quote | Opens intake via `.sparklean-mcta__quote` handler |
| Lead email path (architecture) | quote-submit → Brevo → `SPARKLEAN_LEAD_TO` |
| Phone number present | `(239) 888-3588` / `tel:2398883588` |
| Residential LP speed (sample) | ~193ms DCL / ~328ms load in browser sample (not a CWV lab run) |

---

## What is broken / misaligned

| Item | Issue |
|------|--------|
| Ads → conversion | 0 conversions despite spend/clicks |
| Contact form path | Leads possible via Netlify Forms; **no** Ads conversion |
| `/get-a-quote` | Redirects to contact (legacy); not a quote experience URL |
| Contact CTA href | Looks like self-loop in HTML; works only via JS intercept |
| `{ignore}` URLs | 404 — drops session |
| Phone / Calls from ads | No Call asset; no site phone conversion tag |
| Dual lead systems | Intake (Brevo) vs contact form (Netlify) — different receipt paths |
| Funnel claim | **Unproven** until Tony inbox + Ads both confirm one paid test |

---

## Files / routes / services

| Layer | Path |
|-------|------|
| Overlay UI | `js/quote-intake.js`, `js/serviceFlows.js`, `css/quote-intake.css` |
| Ads conversion | `js/sparklean-ads.js` — `AW-17027441328/HnWnCJPRt9kcELDFqLc_` |
| Base tag | Inline gtag in page `<head>` (no GTM) |
| API | `netlify/functions/quote-submit.mjs` → Brevo API |
| Env | `BREVO_API_KEY`, `SPARKLEAN_FROM_EMAIL`, `SPARKLEAN_LEAD_TO` (`env.example`) |
| Contact form | `pages/contact.html` — Netlify Forms `sparklean-contact` |
| Redirects | `netlify.toml` — `/get-a-quote` → `/contact` (301) |
| Mobile bar | `js/sparklean-mobile-sticky-cta.js` |
| Tests | `scripts/test-google-ads-conversion.mjs` |
| Clean URLs | `/residential-cleaning`, `/contact`, city house-cleaning pages |

**Git history (quote / CTA / ads):**

- `1cfc36b` (2026-05-13) — Add quote intake + quote-submit  
- `756f235` (2026-06-17) — `/get-a-quote` → `/contact` 301 (legacy Namecheap)  
- `6a7fdfa` (2026-07-30) — Google Ads conversion on AI quote success  
- Sticky quote was originally `<a href="/contact">`; later button + intake open handler in `quote-intake.js`

AI quote was **not removed**; it was **never a dedicated route** on Netlify — always overlay + `/contact` fallback.

---

## Before → failure → required correction

| Path | Before (intended) | Failure | Correction |
|------|-------------------|---------|------------|
| Paid click → quote | Land → guided questions → Brevo lead → Ads conversion | Land on form / multi-step abandon / bad URL 404 / no completion | Single LP; open intake immediately; fix Ads URLs |
| `/get-a-quote` | Expect quote UX | 301 to contact form page | Stop using URL in Ads; or serve intake-first experience |
| Contact CTA | Guided quote | HTML self-link; form is primary | `data-sparklean-intake` / `#quote`; demote form for ads |
| Contact form submit | Count as Ads conversion | Never fires `HnWnCJPRt9kcELDFqLc_` | Don’t use for Ads **or** add success conversion (carefully) |
| Phone | Calls from ads | No asset + no tag | Call asset and/or website call conversion |
| `{ignore}` | Tracking param | Literal path → 404 | Fix Ads final URL / template |

---

## Tracking proof required (Tony)

1. From a **real Ads click** (or Tag Assistant with gclid): open intake on `/residential-cleaning`, complete submit.  
2. Confirm email in Sparklean inbox with Lead ID.  
3. Confirm Netlify function log: Brevo OK + `leadId`.  
4. In Google Ads: conversion `AI Quote Request Completed` increments for that click (not just “last pinged”).  
5. Optional: Tag Assistant shows `send_to=AW-17027441328/HnWnCJPRt9kcELDFqLc_` **only after** 200 + `leadId`.  
6. Confirm Netlify env: `BREVO_API_KEY` present in Production.

Until 1–4 pass, **do not claim the funnel works**.

---

## Safest fix order

1. **Ads (Tony, no code):** Remove literal `{ignore}` from final URLs; set **one** residential final URL: `https://www.sparklean.co/residential-cleaning`; pause competitor-name waste; attach Call asset if phone is a desired conversion.  
2. **Prove current intake:** One production guided submit → inbox + Ads.  
3. **Small site fix (bounded):** Auto-open or above-fold primary CTA to intake on residential for paid traffic; fix contact quote hrefs so they don’t look like loops; keep Netlify form as secondary.  
4. **Phone tracking (optional):** Website call conversion or Call asset — separate from quote conversion.  
5. **Only then** consider contact-form conversion or form deprecation.

---

## Anything requiring Tony

- Google Ads final URL / tracking template / keyword cleanup / Call asset  
- Confirm Brevo/Netlify env + recent lead emails  
- Authorize production test lead  
- Decide: contact Netlify form stays for organic only vs must also convert  
- Marco Island targeting (geo) — Ads console only  

---

## One bounded implementation scope

**Scope (when Tony says implement):**  
(1) Ads LP hygiene checklist (docs only if preferred), (2) residential paid path: primary CTA + optional `?quote=1` / paid-query auto-open of `SparkleanQuoteIntake`, (3) contact page quote links use `data-sparklean-intake` + `#quote` fallback (no redesign), (4) sticky already OK — leave alone unless broken, (5) no new pages, no CRM, no GTM migration, no homepage redesign.

**Out of scope:** site redesign, eight new LPs, competitor strategy rewrite, CRM database, Consent Mode overhaul.

---

## Best single residential ad landing path

**`https://www.sparklean.co/residential-cleaning`**

- Matches main traffic destination  
- Hero + sticky “Get quote” open guided intake immediately on mobile (proven)  
- Recurring preset CTAs available  
- Avoid `/contact` as primary Ads LP (form competes; conversion path ambiguous)  
- Avoid `/get-a-quote` (301 away from intent)  
- Avoid any URL containing literal `{ignore}`
