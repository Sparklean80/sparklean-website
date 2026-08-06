# Sparklean entity & schema audit

**Branch:** `feat/entity-schema-consolidation`  
**Date:** 2026-08-05  
**Scope:** Machine-readable identity consolidation for Google Search, local search, and AI retrieval.  
**Not claimed:** Rankings, rich-result eligibility, AI recommendations, or lead volume.

---

## Locked identity (source of truth)

| Field | Value |
|--------|--------|
| Public name | Sparklean Cleaning |
| Legal name | Sparklean Cleaning LLC |
| Never say | “corporation” |
| Canonical `@id` | `https://www.sparklean.co/#organization` |
| Description | Sparklean Cleaning is a professionally managed and supervised residential and commercial cleaning company serving Southwest Florida. |
| Phone | `+1-239-888-3588` |
| Email | `info@sparklean.co` |
| Types | `Organization` + `LocalBusiness` |
| Code module | `data/sparklean-entity.mjs` |
| Sync | `node scripts/sync-entity-schema.mjs` |
| Tests | `npm run test:schema` |

### Why not `ProfessionalService`

Schema.org **deprecated** the general [`ProfessionalService`](https://schema.org/ProfessionalService) type because it caused confusion with `Service`. It was briefly included on this branch and **removed** after independent review. Cleaning offerings are represented with page-level `Service` objects and the org `OfferCatalog` — not a deprecated subtype chosen for specificity theater.

No Google rich-result eligibility is claimed for any `@type` choice.

---

## Street address decision (documented)

Sparklean operates as a **service-area business**. The marketing site intentionally **does not publish a street address** (home/office privacy). Schema therefore:

- Omits any `address` / `PostalAddress` object entirely (including region-only stubs)
- Relies on truthful six-city `areaServed` instead of fake branch `LocalBusiness` entities
- Accepts that **LocalBusiness rich-result eligibility may be limited** without a complete public address

Do **not** invent or partially fabricate an address to satisfy a schema linter or rich-result checklist. Never expose a private home/office address.

---

## Pre-change inventory (audit findings)

Pages audited: homepage, About, Residential, Commercial, Post-construction, Specialized, Contact, Naples, Bonita Springs, Estero, Fort Myers, Cape Coral, Blog index/articles, Inner Circle, Customer Portal.

| Issue | Before | After |
|--------|--------|--------|
| Competing business `@id` | Both `#organization` and `#localbusiness` | Single `#organization` |
| `legalName` | Missing | `Sparklean Cleaning LLC` |
| Locked description | Missing / inconsistent | Exact locked sentence on org + visible on Home/About |
| `sameAs` | Google Maps **search** URL (embeds Bernwood query string) | Removed from schema until verified direct profile URLs |
| Marco Island in `areaServed` | Often missing | Always present (6 markets) |
| City pages | Redefined full `LocalBusiness` with city URL | `WebPage` + city `Service` with `provider` → `#organization` |
| About | Anonymous `LocalBusiness` (no `@id`) | References canonical org + founders |
| AggregateRating | Hard-coded `4.9` / `96` reviews sitewide | **Removed** from schema until founder verifies live GBP count |
| Opening hours | Missing / unpublished | Still omitted (not inventing) |
| Post-construction JSON-LD | Broken (missing `</script>`) | Fixed via sync |
| Canonical generator | Inline per-page HTML (drift-prone) | `data/sparklean-entity.mjs` + sync script |
| `ProfessionalService` | Briefly added on this branch | **Removed** — Schema.org deprecated type |
| Partial `PostalAddress` (FL/US only) | Briefly added on this branch | **Removed** — no manufactured address |

### Name / phone / rating conflicts (before)

- **Names:** Consistently “Sparklean Cleaning” (good)
- **Phones:** Consistently `+1-239-888-3588` (good)
- **IDs:** Split `#organization` vs `#localbusiness` (bad)
- **sameAs:** Only Maps search URL (bad for entity linking; also address-leaking query)
- **Ratings:** Static `reviewCount: 96` risked drifting from live GBP

### Marco Island page

No dedicated `/house-cleaning-marco-island` page exists (by design — no thin doorway page). Marco Island is included in territory copy and schema `areaServed`.

---

## Entity linking model (after)

```
#organization  (Organization + LocalBusiness)
    ↑ publisher / about / provider / worksFor
WebSite (#website)
WebPage (page-specific #webpage)
Service (page-specific #service) — city & service hubs
FAQPage / BreadcrumbList (page-specific IDs)
Person founders (#founder-tony-giuliano, #founder-roxana-tellez)
OfferCatalog (#offer-catalog)
```

City pages = **service areas**, not physical Sparklean branches.

---

## Visible content alignment

- Homepage About + FAQ + service-area band: locked positioning + six markets including Marco Island
- About story: locked sentence + management/accountability language
- Residential / Commercial / city bands: adapted (not copy-pasted) positioning
- Provable differentiators reinforced where already evidenced: supervised teams, direct employees, background checks, insurance/bonding/workers’ comp, 24-hour guarantee, documented scheduling/communication

---

## Validation performed

| Check | Result |
|--------|--------|
| Parse every JSON-LD block (public HTML) | **Pass** — `npm run test:schema` |
| No `#localbusiness` | **Pass** |
| No Maps search in `sameAs` | **Pass** |
| No “corporation” in JSON-LD | **Pass** |
| City `Service.provider` → `#organization` | **Pass** |
| No `ProfessionalService` anywhere | **Pass** (deprecated type rejected) |
| No org `address` / partial PostalAddress | **Pass** |
| Schema.org type URLs resolve | **Pass** — Organization / LocalBusiness HTTP 200 |
| Logo + live site URLs resolve | **Pass** — logo CDN 200; sparklean.co `/`, `/about`, `/house-cleaning-naples` 200 |
| `npm run build` | **Pass** |
| Schema.org Validator (live fetch) | **Deferred** — no Netlify preview URL used; local HTTP preview instead |
| Local preview JSON-LD (representative pages) | **Pass** — `/`, `/about`, `/residential-cleaning`, `/commercial-cleaning`, `/house-cleaning-naples`: one full org `@id`, no `ProfessionalService`, no org address, no `aggregateRating`, city `Service.provider` → org, canonical tags present |
| Google Rich Results Test | **Not run on this pass** — lack of rich-result eligibility is **not** a failure; LocalBusiness eligibility may be limited without a public address |

### Suggested manual validator steps (after preview deploy)

1. [Schema Markup Validator](https://validator.schema.org/) — Fetch URL on preview homepage / About / Naples  
2. [Google Rich Results Test](https://search.google.com/test/rich-results) — homepage FAQ + Naples FAQ (warnings OK; no rich-result entitlement claimed)  
3. Confirm no competing LocalBusiness entities in the parsed graph

---

## Factual claims review (2026-08-05)

Authoritative copy was tightened so Google/AI systems are not fed unsupported credentials.

| Claim | Finding | Action |
|--------|---------|--------|
| “Fully licensed in Florida” / “Licensed · State of Florida” | No specific Florida occupational cleaning license identified; Sunbiz LLC registration is not an occupational license | Replaced with **registered Florida business** + bonding / GL insurance / Workers’ Comp wording |
| “20,000+ clients” / “20K+ Clients Served” | No internal source documenting unique customers vs visits/history | **Removed** from meta, visible copy, FAQs, and tests |
| “9+ Years in Business / Serving SW FL” | No substantiated founding-year source in repo | **Removed** / replaced with non-numeric trust (e.g. Workers’ Comp, 24h guarantee) |
| Visible “4.9★ Google Rating” | Marketing link to live Google reviews; not a hard-coded review count in schema | **Kept visible**; schema `aggregateRating` remains omitted until founder verifies live count |
| 24-Hour Happiness Guarantee | Stated company policy with matching FAQ | **Kept** |
| Same-day response / 24–48h scheduling | Operational claims on homepage FAQ | **Kept** as service promise; not elevated into schema |
| Contact page hours (Mon–Sat 8–6) | Visible on `/contact` | Schema still omits `openingHoursSpecification` pending founder confirm that published hours match operations |

No rich-result eligibility is claimed from these corrections.

---

## Unresolved founder-verification items

Do **not** guess these in code:

1. Direct `sameAs` profile URLs (Facebook, Instagram, LinkedIn, GBP canonical URL, Bing, Apple, BBB, Chamber) — worksheet in `SPARKLEAN_CITATION_CONSISTENCY_CHECKLIST.md`
2. Live Google review **count** for optional future `aggregateRating` (visible “4.9” marketing may remain; schema rating omitted)
3. Confirm Contact-page hours before adding `openingHoursSpecification` to schema
4. Preferred public GBP link that does **not** rely on Maps search query strings (visible “Google reviews” CTAs still use Maps search URLs — replace when founder provides canonical GBP URL)
5. Confirm Spanish (or other) as `availableLanguage` if desired beyond English
6. Whether Bonita Springs should ever appear as `addressLocality` without street (currently omitted)
7. Optional: if a true unique-customer count is later documented, it may be restored with a cited internal source

---

## Sitemap `lastmod` policy

`scripts/generate-sitemap.mjs` uses **git last-commit date** per source file (or today only if that file has local uncommitted changes). Routine builds must not refresh every URL’s `lastmod` from filesystem mtime. Dates should move only when the underlying page/schema content actually changes.

## How to maintain

1. Edit facts only in `data/sparklean-entity.mjs`
2. Run `node scripts/sync-entity-schema.mjs`
3. Run `npm run test:schema`
4. Update this audit if identity fields change
