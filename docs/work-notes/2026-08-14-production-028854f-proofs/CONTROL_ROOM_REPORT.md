# Control Room — production merge/deploy of `028854f`

**Stop for Control Room.** No SEO started.

## Identity

| Item | Value |
|------|--------|
| **Accepted product SHA** | `028854f4b6f83ad6385fe3c2628d0e02ec1f3a88` |
| **Merge result (`main` tip)** | `028854f4b6f83ad6385fe3c2628d0e02ec1f3a88` (fast-forward; merge SHA = product SHA) |
| **Accepted evidence tip (pre-merge)** | `2c7ce736c69cd47c3f2ea96afc007f499b5e322a` |
| **Netlify production deploy id** | `6a7f4eaa1972b89cadcfb3a4` |
| **Production URL** | https://www.sparklean.co |
| **Unique deploy URL** | https://6a7f4eaa1972b89cadcfb3a4--sparklean-website.netlify.app |
| **Deploy published_at** | `2026-08-14T17:22:04.874Z` |
| **Deploy context / branch** | `production` / `main` |
| **CLI `commit_ref` on deploy object** | `null` (CLI file deploy; working tree was exact `028854f`) |

### Deployed product checks

- Live `/js/sparklean-ads.js` includes `getAdsConsent` / `ads_consent_denied`
- `/contact` and `/residential-cleaning` load `/js/sparklean-attribution.js` then `/js/sparklean-ads.js`
- Unique deploy URL content matches production apex for residential page length/scripts
- `SPARKLEAN_FORCE_BREVO_FAIL` **absent** on production (no forced Brevo failure)

## Bounded production proofs

Evidence: `docs/work-notes/2026-08-14-production-028854f-proofs/2026-08-14T17-25-13-689Z-sanitized-evidence.json`

| Case | Lead | Brevo path | Logical Google conv | `transaction_id`/`oid` = lead UUID | Durable report |
|------|------|------------|---------------------|-------------------------------------|----------------|
| Desktop contact | PASS (`8065f805-…`) | PASS (`ok` + reportToken path) | **1** | PASS | `BROWSER_SENT` |
| Mobile contact | PASS (`7d4cf5e8-…`) | PASS | **1** | PASS | `BROWSER_SENT` |
| Guided intake | PASS (`08a58c9b-…`) | PASS | **1** | PASS | `BROWSER_SENT` (delayed=0) |

Notes:

- Google fan-out ≈ 3 network URLs per logical conversion; logical count uses unique `oid` (= gtag `transaction_id`).
- No Brevo force in production.
- Secrets / reportTokens redacted from evidence; conversion ids + lead UUIDs preserved.

## Google Ads diagnostics

**NOT_ACCESSIBLE from this agent session** — `ads.google.com/aw/conversions` redirected to Google sign-in. No Ads UI recording claim. No manufactured paid ad click.

**Gap for Control Room / Tony:** Sign in to Google Ads → Conversions → “AI Quote Request Completed” (`AW-17027441328` / `HnWnCJPRt9kcELDFqLc_`) diagnostics / recent conversions and confirm whether the production proof lead UUIDs above appear as transaction IDs.

## Explicitly not done

- SEO / GSC indexing batches  
- Ads campaign / bidding / setting changes  
- Forced Brevo failure on production  
