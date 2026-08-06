# Sparklean citation consistency checklist

**Purpose:** Founder worksheet only — verify NAP + identity facts across directories.  
**Do not** create profiles, submit listings, or paste identical promo paragraphs from this doc.  
**Date prepared:** 2026-08-05  

This file is documentation. Completing rows is a **manual** founder task outside the website deploy.

---

## Canonical facts to keep identical everywhere

| Fact | Canonical value | Verified? (Y/N) | Notes |
|------|-----------------|-----------------|-------|
| Public name | Sparklean Cleaning | ☐ | |
| Legal name | Sparklean Cleaning LLC | ☐ | Never “corporation” |
| Website | https://www.sparklean.co/ | ☐ | Prefer www canonical |
| Phone | (239) 888-3588 / +1-239-888-3588 | ☐ | |
| Email | info@sparklean.co | ☐ | |
| Positioning | Sparklean Cleaning is a professionally managed and supervised residential and commercial cleaning company serving Southwest Florida. | ☐ | Adapt tone; keep facts |
| Service territory | Naples · Bonita Springs · Estero · Fort Myers · Cape Coral · Marco Island | ☐ | All six |
| Street address on marketing site | **Intentionally unpublished** (service-area business) | ☐ | Do not invent for directories that require it without founder decision. Site schema has **no** `address` object (including no region-only stub). LocalBusiness rich results may be limited without a complete public address — accepted. |
| Founders | Tony Giuliano; Roxana “Roxy” Tellez | ☐ | |

---

## Direct profile URL worksheet

Enter **only** direct profile URLs you own/control.  
Do **not** use Google Maps **search-result** URLs (`google.com/maps/search/?api=1&query=...`) as `sameAs` or primary citations.

| Platform | Direct profile URL (paste) | Name matches? | Phone matches? | Website matches? | Territory matches? | Status |
|----------|----------------------------|---------------|----------------|------------------|--------------------|--------|
| Google Business Profile | | ☐ | ☐ | ☐ | ☐ | ☐ Pending |
| Bing Places | | ☐ | ☐ | ☐ | ☐ | ☐ Pending |
| Apple Business Connect | | ☐ | ☐ | ☐ | ☐ | ☐ Pending |
| Facebook | | ☐ | ☐ | ☐ | ☐ | ☐ Pending |
| Instagram | | ☐ | ☐ | ☐ | ☐ | ☐ Pending |
| LinkedIn (company) | | ☐ | ☐ | ☐ | ☐ | ☐ Pending |
| BBB (only if real) | | ☐ | ☐ | ☐ | ☐ | ☐ N/A or Pending |
| Local chamber / registry (only if real) | | ☐ | ☐ | ☐ | ☐ | ☐ N/A or Pending |
| Other (Yelp, etc. — only if real) | | ☐ | ☐ | ☐ | ☐ | ☐ Pending |

When a row is verified, add that URL to `SAME_AS` in `data/sparklean-entity.mjs`, run `node scripts/sync-entity-schema.mjs`, then `npm run test:schema`.

---

## GBP / Maps notes

- Visible site CTAs may still link to a Maps search URL until a cleaner GBP link is chosen.
- Schema `sameAs` must stay free of Maps search URLs.
- Review **count** for any future schema `aggregateRating` must match the live GBP number on the day it is added.

---

## Hours (optional schema later)

| Day | Hours (if published) | Source page / GBP | Verified? |
|-----|----------------------|-------------------|-----------|
| Mon–Sun | _not published on site as of 2026-08-05_ | | ☐ |

Do not add `openingHoursSpecification` until hours are visible and accurate.

---

## Sign-off

| Role | Name | Date | Initials |
|------|------|------|----------|
| Founder review | | | |
| Schema `sameAs` update authorized | | | |
