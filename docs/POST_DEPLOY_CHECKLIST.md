# Post-deploy checklist (#10)

**Production SHA:** `d7d482f0175c7a5f9f514ce4f133a5f525d1be0a`  
**Deploy ID:** `6a8dc01a4e971213d193b087`  
**Verified:** 2026-08-25

Do **not** request bulk GSC indexing. Focus on validation and field vitals.

## 1. Confirm production deploy
- [x] Live tip fingerprint matches approved SHA (Safety-Conscious / Cape Coral ownership / no OSHA)
- [x] `/privacy`, `/terms`, `/accessibility` return **200**
- [x] Footer legal links work on homepage + contact
- [x] Contact attribution smoke (Inner Circle + UTMs)

## 2. Rich Results / structured data
- [x] Live JSON-LD parses on `/`, `/residential-cleaning`, `/house-cleaning-naples`, Naples hire-a-pro blog, `/contact`, `/post-construction-cleaning`
- [ ] Optional manual [Rich Results Test](https://search.google.com/test/rich-results) click-through in GSC/browser (UI confirmation)

## 3. Search Console — Tony
- [ ] Sitemaps: confirm/submit `https://www.sparklean.co/sitemap.xml` (30 URLs live)
- [ ] Coverage / Page indexing: watch soft-404s over coming days
- [ ] Enhancements: FAQ / Breadcrumb / Review snippets as data refreshes
- [ ] Core Web Vitals (field): wait for new deploy data; targets LCP ≤ 2.5s, INP < 200ms, CLS < 0.1
- [x] Do **not** request indexing for legacy residential redirect URLs

## 4. PageSpeed (lab)
- [ ] PSI mobile on `/`, `/residential-cleaning`, `/contact` — **blocked 2026-08-25 by Google API daily quota (429)**; retry tomorrow or run in browser

## 5. Conversion smoke
- [x] Guided quote presets: `recurringResidential`, `airbnbRental`, `innerCircle`
- [x] Attribution fields populate
- [ ] Full contact submit success path (manual — avoid test lead spam)
- [ ] Analytics event spot-check in Tag Assistant / GA4 DebugView (manual)

## Next (not website code)
Legitimate local/industry backlinks to Naples, Bonita Springs, Cape Coral, commercial, and post-construction pages. Freeze core page rewrites unless a real defect appears.
