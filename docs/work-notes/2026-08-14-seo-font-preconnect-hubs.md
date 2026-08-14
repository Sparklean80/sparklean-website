# SEO evidence — Font preconnect on marketing hubs

**Date:** 2026-08-14  
**Product SHA:** 765a68f7b78476d6e580ec73b16049b538475545  
**Scope:** Approved CWV leftover — Google Fonts `preconnect` on money/marketing hubs. No Ads, no Phase 2 URL spray, no GSC bulk indexing, no homepage H1 change.

## What shipped

- Added before the Google Fonts stylesheet on 16 pages:
  - `index.html`
  - Service hubs: residential, commercial, post-construction, specialized
  - City pages: Naples, Fort Myers, Bonita, Estero, Cape Coral
  - Contact, about, why-sparklean, partners, refer, inner-circle
- Hints:
  - `rel=preconnect` → `https://fonts.googleapis.com`
  - `rel=preconnect` → `https://fonts.gstatic.com` (`crossorigin`)

## Explicitly not done

- Signalhouse private pages (optional; not SEO)
- Webflow CDN → `/images/` WebP migration (larger LCP follow-up)
- Vacation rental page
- Phase 2 commercial vertical hubs
- Blog auto-generation
