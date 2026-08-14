# City paid-match visual redesign — evidence

**Date:** 2026-08-14  
**Product SHAs:**
- `fadf1b2d0e992da49cd6a93c6adf15194fbd5af0` — two-column paid-match + local coverage (replace city-band dump)
- `c112a525c4ae4dabe867ce01eb6d1b895bcd63d3` — eyebrow contrast + `#paid-match` / local scroll-margin

**Preview (draft only — not production):**  
https://city-paid-match-ui--sparklean-website.netlify.app  

**Deploy id:** `6a7f6bdebf02e5ae2bc876f2`

## What changed (product)

On all 5 city pages (`/house-cleaning-{naples,bonita-springs,estero,fort-myers,cape-coral}`):

1. **`#paid-match`** — premium ~1180px two-column section  
   - Left: city eyebrow, H2, body (≥16px), CTAs `Get My Cleaning Plan` + `Call (239) 888-3588`  
   - Right: 4 trust cards (supervised / bonded+insured / weekly–monthly / 24h guarantee)  
2. **Removed** the SEO city-band one-paragraph link dump  
3. **`#local-coverage`** — unique city paragraphs + neighborhoods + **exactly 3** service links  
4. **Related reading** cards — preserve former blog/internal-link value without inline underline walls  
5. Preserved: single H1, canonical, schema JSON-LD, `#paid-match`, `#cost-factors`, attribution, Ads, intake presets, `tel:2398883588`

## Tests

| Suite | Result |
|-------|--------|
| `npm run test:schema` | Pass |
| `npm run test:ads` | Pass |
| `npm run test:funnel` | Pass |
| `node scripts/test-conversion-preservation-landings.mjs` | Pass — see `conversion-preservation-static.txt` |
| Preview SEO HTTP (`verify-preview-seo-landings.mjs`) | Pass — 200, 1×H1, canonical, `#paid-match`, `#cost-factors`, ads.js, tel — see `seo-preview-http-checks.jsonl` |

## Screenshots

Under `screenshots/` (desktop 1440 + mobile 390):

| City | Paid-match | Local coverage |
|------|------------|----------------|
| Naples | `naples-desktop-paid-match.png` / `naples-mobile-paid-match.png` | `naples-desktop-local.png` / `naples-mobile-local.png` |
| Bonita Springs | `bonita-springs-*` | `bonita-springs-*` |
| Estero | `estero-*` | `estero-*` |
| Fort Myers | `fort-myers-*` | `fort-myers-*` |
| Cape Coral | `cape-coral-*` | `cape-coral-*` |

## Preview review URLs

- https://city-paid-match-ui--sparklean-website.netlify.app/house-cleaning-naples#paid-match  
- https://city-paid-match-ui--sparklean-website.netlify.app/house-cleaning-bonita-springs#paid-match  
- https://city-paid-match-ui--sparklean-website.netlify.app/house-cleaning-estero#paid-match  
- https://city-paid-match-ui--sparklean-website.netlify.app/house-cleaning-fort-myers#paid-match  
- https://city-paid-match-ui--sparklean-website.netlify.app/house-cleaning-cape-coral#paid-match  

## Stop

**No production deploy.** Awaiting Tony visual approval on draft preview.
