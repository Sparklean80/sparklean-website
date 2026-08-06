# Sparklean external authority checklist

Founder-facing worksheet for identity consistency across directories. **Do not guess or auto-change live profiles from the website repo.**

Last updated: 2026-08-05

## Canonical identity (site source of truth)

| Field | Value |
|--------|--------|
| Public name | Sparklean Cleaning |
| Legal name | Sparklean Cleaning LLC |
| Positioning | Sparklean Cleaning is a professionally managed and supervised residential and commercial cleaning company serving Southwest Florida. |
| Phone | (239) 888-3588 / `+1-239-888-3588` |
| Email | info@sparklean.co |
| Website | https://www.sparklean.co/ |
| Schema `@id` | `https://www.sparklean.co/#organization` |

## Channels to keep consistent

| Channel | URL / ID (founder to fill) | Name match | Phone match | Hours match | Description match | Notes |
|---------|----------------------------|------------|-------------|-------------|-------------------|-------|
| Google Business Profile | ☐ | ☐ | ☐ | ☐ | ☐ | Prefer direct GBP/reviews URL (not Maps search) |
| BBB | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Facebook | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Instagram | ☐ | ☐ | ☐ | ☐ | ☐ | |
| LinkedIn company page | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Sunbiz / legal identity | ☐ | ☐ | — | — | — | LLC registration ≠ occupational cleaning license |
| Legitimate local directories | ☐ | ☐ | ☐ | ☐ | ☐ | Only claim listings that exist |
| Partner websites / local press | ☐ | ☐ | ☐ | ☐ | ☐ | Do not invent partnerships |

## Flagged inconsistencies (do not auto-fix)

| Item | Status |
|------|--------|
| **Brink Circle vs Bernwood Drive** public-address inconsistency | Flagged — founder must decide which public address (if any) appears on GBP/directories. Marketing site schema omits street address. |
| Official direct GBP / profile / review URL | Unresolved — site uses interim Maps search link |
| Authoritative opening hours (Mon–Fri vs Mon–Sat) | Unresolved — Contact page shows hours; schema omits until confirmed |
| Verified social profile URLs for `sameAs` | Unresolved |
| Product safety / proprietary formula claims evidence | Unresolved — do not strengthen without SDS/attestation |
| Spanish-language support (`availableLanguage`) | Unresolved |

## Referral & recurring measurement (marketing site)

Privacy-safe events (no names/phones/emails/notes/addresses):

- `why_sparklean_view`
- `referral_started` / `referral_submitted`
- `partner_type_selected`
- `recurring_quote_started` / `recurring_quote_submitted`
- `google_reviews_clicked`

Implemented in `js/sparklean-events.js`. Ads conversion remains leadId-only via `js/sparklean-ads.js`.

## Case studies

Use `data/sparklean-case-studies.mjs`. Empty published set = no public case-study section. Do not copy third-party Google review text onto the site until verified + permissioned.
