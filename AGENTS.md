# Sparklean website — agent instructions

**Before any Sparklean task, read:** [`docs/SPARKLEAN_REFERENCE.md`](docs/SPARKLEAN_REFERENCE.md)

That doc has URL architecture, all 12 blog slugs, brand tokens, CSS patterns, SEO history, redirect rules, founder video, deferred roadmap, and hard constraints.

## One-line context

Static luxury cleaning marketing site on **Netlify** (`sparklean.co`) — Naples/Fort Myers/Bonita/Estero/Cape Coral — with **Workforce Vision** as separate ops/proof product (Sparklean = customer zero).

## Non-negotiables

- No home address on site
- No commit/push unless Tony asks
- No homepage H1 redesign unless agreed
- Redirects live in **`netlify.toml`** (301 legacy, 200 clean URLs)
- New blog posts: follow template in `pages/blog/fort-myers-commercial-office-cleaning.html` + update `pages/blog.html` + sitemap

## After significant changes

Update `docs/SPARKLEAN_REFERENCE.md` (date + summary).
