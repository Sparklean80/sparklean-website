# Phase 1 full local-SEO package — evidence

**Date:** 2026-08-14  
**Product SHA:** 638cf4767d578bda1b2d7f1335707bf76b153b37  
**Preview deploy:** https://6a7f5ea0315c536f6bf99651--sparklean-website.netlify.app  
**Conversion baseline preserved:** product `028854f` system untouched (static landing checks pass)

## 1) URL ↔ keyword-intent map

| URL | Primary intent | Notes |
|-----|----------------|-------|
| `/residential-cleaning` | Broad SWFL house cleaning / recurring accountability hub | Paid default LP; not city-community intent |
| `/house-cleaning-naples` | House cleaning Naples FL (discretion / estates) | Paid + organic city |
| `/house-cleaning-bonita-springs` | House cleaning Bonita Springs FL (home market) | Paid + organic city |
| `/house-cleaning-estero` | House cleaning Estero FL (golf communities) | Paid + organic city |
| `/house-cleaning-fort-myers` | House cleaning Fort Myers FL (citywide) | Paid + organic city |
| `/house-cleaning-cape-coral` | House cleaning Cape Coral FL (canal homes) | Paid + organic city |
| `/vacation-rental-cleaning` | Airbnb / STR turnover cleaning SWFL | Not owner recurring |
| `/contact` | Quote intake / contact | Conversion endpoint |

## 2) Google Ads ad-group → final URL map (proposed — Ads console unchanged)

| Suggested ad group theme | Final URL | Message match on page |
|--------------------------|-----------|------------------------|
| House Cleaning — Naples | `https://www.sparklean.co/house-cleaning-naples` | `#paid-match` strip |
| House Cleaning — Bonita Springs | `https://www.sparklean.co/house-cleaning-bonita-springs` | `#paid-match` |
| House Cleaning — Estero | `https://www.sparklean.co/house-cleaning-estero` | `#paid-match` |
| House Cleaning — Fort Myers | `https://www.sparklean.co/house-cleaning-fort-myers` | `#paid-match` |
| House Cleaning — Cape Coral | `https://www.sparklean.co/house-cleaning-cape-coral` | `#paid-match` |
| House Cleaning — SWFL / General | `https://www.sparklean.co/residential-cleaning` | `#paid-match` + cost factors |
| Vacation / Airbnb / Turnover | `https://www.sparklean.co/vacation-rental-cleaning` | Turnover CTAs `airbnbRental` |
| Cost of house cleaning (research) | City or residential `#cost-factors` | No fake prices; quote CTA |

**Tony Ads console still must:** remove literal `{ignore}` from any final URL/template (still 404 live).

## 3) SEO verification (product tree)

| Check | Result |
|-------|--------|
| City pages unique title/meta/canonical/H1 | Pass (mobile duplicate H1 demoted to `.hero-mobile-h`) |
| Paid-match strip | Pass — all 5 cities + residential |
| Cost-factors section | Pass — all 5 cities + residential + vacation |
| Weekly/biweekly | Pass — strip + cards (FM/Cape updated) |
| Naples hero rating | Pass — `4.9★` (was `5★`) |
| Vacation inspection / issue notes | Pass — section + FAQ; linens staging only; restock not assumed |
| Money-page Webflow CDN | Pass — **0** remaining CDN refs on money pages |
| Sitemap includes cities + vacation | Pass |
| Schema sync | Pass (`test:schema`) |
| `test:funnel` / `test:ads` | Pass |
| Landing conversion static check | Pass (`test-conversion-preservation-landings.mjs`) |
| Production leads for proof | **Not run** — awaiting Control Room |

## 4) Conversion preservation (P0)

Static verification on all new/enhanced landings:
- `AW-17027441328` + `sparklean-ads.js` / attribution / events / quote-intake
- Conversion label `HnWnCJPRt9kcELDFqLc_` still only in ads.js
- `tel:2398883588` + intake CTAs + sticky CTA
- Reply-To customer path preserved in contact/quote submit  
**Not proven in this batch (needs CR-authorized prod proof):** durable lead create, Brevo send, one logical conversion, consent OFFLINE_QUEUED, thank-you refresh idempotency.

## 5) Email auth preservation

No DNS/SPF/DKIM/DMARC or From/Reply-To changes in this product commit.

## 6) Performance / LCP

| Item | Status |
|------|--------|
| Money-page heroes local WebP + srcset | Done (prior + this batch) |
| Remaining money-page marketing CDN → `/images/cdn-migrated/` | Done this batch |
| Homepage LCP preload | Present for local hero WebP |
| Font preconnect | Retained |
| Quantitative before/after mobile LCP (PSI lab) | **Unproven** — preview URL available for Tony/PSI; not simulated here |

## 7) Screenshots

Saved under `docs/work-notes/2026-08-14-phase1-full-local-seo/screenshots/` (Deploy Preview):

| File | What |
|------|------|
| `naples-desktop-hero.png` | Desktop hero — H1, 4.9★, primary CTAs |
| `naples-desktop-paid-match.png` | Desktop paid-match Call + quote CTAs |
| `naples-mobile-paid-match.png` | Mobile paid-match bullets + Call/quote + sticky bar |
| `naples-mobile-cost-factors.png` | Mobile cost-factors section |

## 8) Skipped / simulated / unproven

1. Google Ads console changes (forbidden)  
2. Production merge/deploy (forbidden until CR/Tony)  
3. Production test leads / live conversion proof (forbidden until CR)  
4. Lab PSI before/after LCP numbers (not fetched; money-page CDN assets migrated — qualitative before/after only)  
5. Exact live Ads ad-group names (unknown from repo — mapping is recommended, not scraped)  
6. Phase 2 commercial hubs (held)
7. Vacation page has cost-factors + inspection; no `#paid-match` strip (city/residential paid-match only per brief)

## 9) Visual standard

Black/gold luxury system preserved; added scannable paid-match + cost cards without template clutter.

## 10) Control Room stop

**STOP for Control Room review.** No production deploy, no merge to live, no Ads edits, no production test leads until Tony authorizes.
