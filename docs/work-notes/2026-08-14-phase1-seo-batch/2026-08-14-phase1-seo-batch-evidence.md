# Phase 1 SEO/conversion batch — evidence matrix

**Date:** 2026-08-14  
**Product SHA:** 7ada682a8297150c3c824b7a3f58e8fc5e35230b  
**Scope:** Remaining approved Phase 1 SEO/conversion items after Trust Shield + font preconnect.  
**Not in scope:** Phase 2 commercial hubs, Ads console bidding/settings edits, GSC bulk indexing, production deploy (report SHA first).

## Completed / open matrix

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Vacation rental cleaning page | **COMPLETED** | `/vacation-rental-cleaning` — unique turnover intent, title/H1/meta, schema (Service+FAQPage), `airbnbRental` CTAs, sitemap + 200 rewrite, indexable |
| 2 | Webflow CDN → local LCP heroes | **COMPLETED** (heroes) | Money-page heroes → `/images/heroes/*-{800,1400}.webp` + JPG fallback; homepage `rel=preload`; mobile `picture`/`srcset`; contact hero CSS updated. Below-fold decorative CDN images remain (open follow-up, not blocker) |
| 3 | Residential / city audit corrections | **COMPLETED** | City unique title/H1/meta confirmed; residential title/meta retargeted to regional accountability hub (reduces city cannibalization); city-band explains hub vs city vs vacation |
| 4 | Google Ads final URL checks | **COMPLETED** (repo) / **OPEN** (Ads console) | Live 200: `/residential-cleaning` (±slash, `?quote=1`), all 5 city pages, `/contact`, `/commercial-cleaning`. `/get-a-quote` → 301 `/contact`. Literal `/{ignore}` still **404** — Tony must remove from Ads final URL/template (no code fix) |
| 5 | City vs residential unique intent | **COMPLETED** | Cities keep community H1s (discretion / trust / golf / across city / canal). Residential H1 = “don’t have to manage”; title no longer city-list stacks |
| 6 | Titles, descriptions, canonicals, H1s, schema, sitemap, robots, internal links, mobile CTAs | **COMPLETED** | Vacation `index,follow`; schema synced sitewide; sitemap 31 URLs includes vacation; footer links added; sticky CTA scripts present on hubs/cities/vacation |
| 7 | Build / schema / funnel / conversion / crawl tests | **COMPLETED** | `npm run build` OK; `test:schema` pass; `test:funnel` pass; `test:ads` pass; `_crawl-verify.js` exit 0 (live crawl of existing money pages) |
| — | Email authentication | **CLOSED earlier** | Do not reopen |
| — | Phase 2 commercial hubs | **HELD** | Untouched |
| — | Production deploy | **NOT DONE** | Awaiting Tony after product SHA review |

## Ads final URL probe (live, 2026-08-14)

| URL | Result |
|-----|--------|
| `/residential-cleaning` | 200 |
| `/residential-cleaning/` | 200 |
| `/residential-cleaning?quote=1` | 200 |
| `/house-cleaning-{naples,bonita-springs,estero,fort-myers,cape-coral}` | 200 each |
| `/contact` | 200 |
| `/commercial-cleaning` | 200 |
| `/get-a-quote` | 301 → `/contact` |
| `/{ignore}` and `/%7Bignore%7D` | **404** — Ads console cleanup |

## Product paths touched (summary)

- `pages/vacation-rental-cleaning.html` (new)
- `images/heroes/*` (new local LCP assets)
- Money hubs + cities + `index.html` + `css/contact-page.css` (hero URLs, logos, footers)
- `pages/residential-cleaning.html` (title/meta/city-band differentiation)
- `netlify.toml`, `_redirects`, `sitemap.xml`
- `data/sparklean-entity.mjs`, `scripts/sync-entity-schema.mjs`
- Helper scripts: `migrate-lcp-heroes.mjs`, `add-vacation-footer-links.mjs`, etc.

## Explicitly not done

- Deploy to production
- Google Ads UI change for `{ignore}`
- Full below-fold Webflow image purge
- Phase 2 vertical money URLs
- New thin city×service combinations
