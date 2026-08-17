# Homepage rebuild verification — 2026-08-17

## Scope confirmation

| Item | Status |
|------|--------|
| Product file changed | `index.html` only |
| Location / service / blog / portal pages | Unchanged |
| `js/quote-intake.js` / `serviceFlows.js` / Netlify functions | Unchanged |
| Global nav structure / destinations | Preserved (CTA label → Request a Quote) |
| Global footer structure | Preserved (city anchor text softened on homepage footer only) |
| Analytics / conversion libraries | Unchanged |
| Production leads created | **None** |

## Shared components

Homepage uses shared CSS/JS by reference only (`quote-intake.css`, `quote-intake.js`, `serviceFlows.js`, sticky CTA, attribution/events). No shared files were edited.

## Quote handoff

Compact `#start-quote` form:

1. Does **not** POST a lead
2. Stores non-PII hints in `sessionStorage.sparklean_home_quote_hint`
3. Opens existing `SparkleanQuoteIntake.open({ sourceUrl: …#start-quote })`
4. Falls back to `/contact` if intake JS missing
5. Does not put ZIP/service in the URL
6. Does not fire completed-lead conversion events

## Title / meta

- Title: `Luxury Cleaning Services in Naples & Southwest Florida | Sparklean`
- Meta: luxury residential/commercial/post-construction/vacation-rental + five cities
- Canonical: `https://www.sparklean.co/`
- H1: `Luxury Cleaning Services in Naples & Across Southwest Florida`

## City URLs (each present ≥3× on homepage)

- `/house-cleaning-naples`
- `/house-cleaning-bonita-springs`
- `/house-cleaning-estero`
- `/house-cleaning-fort-myers`
- `/house-cleaning-cape-coral`

No Marco Island primary card. No Google city-search links for SEO.

## Claim safety

Removed / avoided on homepage: proprietary formula, eco-friendly badges, invented review totals, years-in-business, recurring-client counts, affordable/cheap language, absolute same-team promises.

Retained (existing operational claims): 4.9★ Google (linked live), direct employees, supervised teams, bonded & insured + Workers’ Comp, 24-Hour Happiness Guarantee.

## Screenshots

- `before/desktop-prod.png`, `tablet-prod.png`, `mobile-prod.png` (production)
- `after/desktop.png`, `tablet.png`, `mobile.png`, `hero-desktop.png` (local rebuild)

## Lighthouse

Not run in this pass (no CI lighthouse harness). Recommend PSI after Netlify preview deploy.

## Build

Static HTML — no compile step. Local preview via `npx serve -l 4173`.
