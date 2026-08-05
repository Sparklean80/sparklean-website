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
| Types | `Organization` + `LocalBusiness` + `ProfessionalService` |
| Code module | `data/sparklean-entity.mjs` |
| Sync | `node scripts/sync-entity-schema.mjs` |
| Tests | `npm run test:schema` |

`ProfessionalService` is included because it accurately describes a supervised professional cleaning company on Schema.org. It is **not** presented as a Google ranking feature.

---

## Street address decision (documented)

Sparklean operates as a **service-area business**. The marketing site intentionally **does not publish a street address** (home/office privacy). Schema therefore:

- Omits `streetAddress` / full PostalAddress locality lines that would expose a private address
- Uses region-level `addressRegion: FL` + `addressCountry: US` only
- Relies on `areaServed` (six markets) instead of fake branch `LocalBusiness` entities

Do **not** invent an address to satisfy a schema linter recommendation.

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
#organization  (Organization + LocalBusiness + ProfessionalService)
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
| Schema.org type URLs resolve | **Pass** — Organization / LocalBusiness / ProfessionalService HTTP 200 |
| Logo + live site URLs resolve | **Pass** — logo CDN 200; sparklean.co `/`, `/about`, `/house-cleaning-naples` 200 |
| `npm run build` | **Pass** |
| Schema.org Validator (live fetch) | **Deferred** — branch not deployed; fetch URL test cannot see unmerged HTML. Paste JSON-LD from this branch or use Netlify preview after push. |
| Google Rich Results Test | **Deferred to preview/prod** — entity work does **not** guarantee rich results |

### Suggested manual validator steps (after preview deploy)

1. [Schema Markup Validator](https://validator.schema.org/) — Fetch URL on preview homepage / About / Naples  
2. [Google Rich Results Test](https://search.google.com/test/rich-results) — homepage FAQ + Naples FAQ  
3. Confirm no competing LocalBusiness entities in the parsed graph

---

## Unresolved founder-verification items

Do **not** guess these in code:

1. Direct `sameAs` profile URLs (Facebook, Instagram, LinkedIn, GBP canonical URL, Bing, Apple, BBB, Chamber) — worksheet in `SPARKLEAN_CITATION_CONSISTENCY_CHECKLIST.md`
2. Live Google review **count** for optional future `aggregateRating` (visible “4.9” marketing may remain; schema rating omitted)
3. Published **opening hours** for `openingHoursSpecification` (none confirmed on Contact page)
4. Preferred public GBP link that does **not** rely on Maps search query strings (visible “Google reviews” CTAs still use Maps search URLs — replace when founder provides canonical GBP URL)
5. Confirm Spanish (or other) as `availableLanguage` if desired beyond English
6. Whether Bonita Springs should ever appear as `addressLocality` without street (currently omitted)

---

## How to maintain

1. Edit facts only in `data/sparklean-entity.mjs`
2. Run `node scripts/sync-entity-schema.mjs`
3. Run `npm run test:schema`
4. Update this audit if identity fields change
