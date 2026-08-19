# Sparklean project reference

**Read this first** in any new Cursor chat about Sparklean Cleaning (`https://www.sparklean.co/`).

Last updated: **2026-08-19** (Cape Coral Semrush city-ownership SEO — all 5 cities done)

---

## Performance + conversion roadmap

**North star:** Click → instant trust → booking → app install → relationship → retention → upsell → referral

**CWV targets:** LCP &lt; 2.0s · INP &lt; 200ms · CLS &lt; 0.1 · TTFB &lt; 500ms

### Repo ownership

| Layer | Owner | URL |
|-------|--------|-----|
| Public SEO, leads, service/location pages | **This repo** (`sparklean-website`) | `sparklean.co` |
| Auth, scheduling, payments, proof, retention | **Workforce Vision** | `portal.sparklean.co` (interim DO host until DNS) |

**Rule:** Never put indexable SEO content behind login. Portal = product; marketing site = acquisition + trust.

### Priority 1 — Core Web Vitals (marketing site)

| Action | Status |
|--------|--------|
| Long-cache headers on `/css`, `/js`, `/images`, favicons | **Done** — `netlify.toml` `[[headers]]` |
| Lazy-load below-fold images | **Partial** — most pages use `loading="lazy"` |
| Defer non-critical JS | **Partial** — quote intake + sticky CTA use `defer` |
| Prefetch likely next pages | **Done** — hover prefetch in `js/sparklean-mobile-sticky-cta.js` |
| Preconnect + preload LCP hero image (homepage) | **Done** — local `/images/heroes/` WebP + `rel=preload` (2026-08-14) |
| Font preconnect sitewide | **Done** — marketing hubs + homepage (2026-08-14); signalhouse private pages optional |
| Migrate Webflow CDN images → `/images/` + WebP/AVIF | **Money pages done** — heroes + remaining marketing CDN → `/images/heroes/` + `/images/cdn-migrated/` (2026-08-14 `638cf47`); non-money pages may still use CDN |
| Minify inline CSS on hub pages | **TODO** — optional build step |
| Remove unused JS | **Low priority** — bundles are small (~3 JS files) |
| Third-party trackers | **None** — keep it that way |

Measure: PageSpeed Insights + GSC Core Web Vitals after each deploy.

### Priority 2 — PWA (portal only)

Service worker, offline shell, post-login asset cache, push notifications → **Workforce Vision repo**, not this site. Marketing `/customer-portal` is a landing page only.

### Priority 3 — Public vs private split

| Public (`sparklean.co`) | Private (`portal.sparklean.co`) |
|-------------------------|----------------------------------|
| SEO, sitemap, blogs | Scheduling, payments |
| Service + city pages | Messaging, history |
| Quote / contact intake | Proof reports, rebook |
| Client App landing (`/customer-portal`) | Upsells, push/SMS |

### Priority 4 — Local SEO pages

| Page | Status |
|------|--------|
| Naples / Bonita / Estero / Fort Myers / Cape Coral house cleaning | **Live** — `/house-cleaning-{city}` · unique luxury wording + paid-match strip + cost-factors + conversion CTAs (**2026-08-14** product `638cf47`) |
| Post-construction cleaning | **Live** — `/post-construction-cleaning` |
| Vacation rental cleaning | **Live** — `/vacation-rental-cleaning` (2026-08-14; turnover + inspection/issue notes + cost factors) |
| Luxury home cleaning | **Partial** — covered in residential + city copy |
| Office / dealership / school / janitorial | **Draft local only** — generated, **not pushed** (freeze until city rankings recover) |

**City priority order (business):** Bonita (home base) → Naples → Estero → Fort Myers → Cape Coral (last growth city).

**Wording rules for city pages:** trust + supervision + named communities — not price-led (`$/hr`), not synonym spam; each city gets a unique H1/angle (do not city-swap the same paragraphs).

Each new page: unique copy, local refs, FAQs, internal links, CTA to quote intake.

### Priority 5 — Conversion (marketing site)

| Flow | Status |
|------|--------|
| Structured quote intake (`js/quote-intake.js`, `serviceFlows.js`) | **Live** on contact + preset CTAs |
| Recurring residential primary journey | **Branch** — preset `recurringResidential`; home/residential/city CTAs |
| Why Sparklean checklist | **Branch** — `/why-sparklean` |
| Referral intake | **Branch** — `/refer` + preset `referral` (Brevo via `quote-submit`; tags `REFERRAL`) |
| Partner hub | **Branch** — `/partners` → `/refer?type=…` |
| One-click call (mobile sticky bar) | **Live** |
| SMS conversations | **TODO** — Twilio or portal handoff |
| Fast booking without quote | **Portal** — after first client relationship |

### Priority 6 — Install growth

| Trigger | Owner |
|---------|--------|
| Post-booking install prompt + benefits copy | **Portal** (WV deploy) |
| Marketing explainers (Safari Share, no App Store) | **Done** — `/customer-portal` |
| Push notifications; SMS fallback | **Portal** |

### Priority 7 — Retention engine

Dashboard features (visits, invoices, photos, rebook, add-ons) → **Portal**. Marketing site links to portal; does not duplicate authenticated UI.

Suggested upsell copy can appear on `/specialized-cleaning` and portal add-on flows.

### Priority 8 — Reuse Workforce Vision

Do **not** rebuild in marketing site: notifications, audit trail, evidence reports, scheduling, document delivery, AI onboarding, proof artifacts. Surface **trust signals** on commercial pages only (Trust Shield — Phase 1).

### Priority 9 — Measurement

Track in portal + analytics (not yet wired on marketing site):

- Page load / CWV (PSI, GSC)
- Quote submit → book rate (`netlify/functions` quote endpoint)
- Install rate (portal events)
- Repeat booking + upsell acceptance (portal)
- Review conversion (GBP manual + UTM if added)

**Dashboard question:** Which channel produces clients who rebook and upsell? → needs portal CRM + UTM discipline on marketing CTAs.

### Suggested execution order

1. **Now (marketing):** CWV headers, preload, prefetch — shipped; migrate hero/CDN images to local WebP
2. **Next (marketing):** 1–2 commercial geo pages (Phase 2); vacation rental page if search demand
3. **Parallel (portal):** PWA shell, post-login cache, install prompt after first booking, push/SMS
4. **Then:** UTM + conversion events; GSC CWV monitoring loop

---

## Quick start for agents

| Item | Value |
|------|--------|
| Repo | `sparklean-website` |
| Live site | https://www.sparklean.co/ |
| Host | **Netlify** (static publish root = repo root) |
| Branch | `main` |
| Contact | (239) 888-3588 · info@sparklean.co |
| Related product | **Workforce Vision** (field proof / ops — Tony’s company, Sparklean = customer zero) |

**When you finish significant work:** update this file (date + what changed).

---

## Hard rules (do not break)

1. **Do not publish home address** on the marketing site.
2. **Do not commit or push** unless Tony asks (he often wants push after deploy-ready SEO changes — ask if unclear).
3. **Do not rewrite the homepage H1** or do broad UI redesigns unless agreed. (Authorized homepage rebuild 2026-08-17 on branch `homepage-rebuild-2026-08-17` — see `evidence/homepage-rebuild-2026-08-17/`.)
4. **No snowbird-only / thin / duplicate city blog scatter** — high-intent local SEO only.
5. **No paid ads / LSA** unless Tony asks.
6. **30-day URL freeze** on core paths during SEO recovery (no renames on `/`, city pages, service hubs without explicit approval).
7. **Marketing site ≠ software pitch** — Workforce Vision belongs on commercial/footer, not homepage residential copy.
8. **Review asks:** neutral only — never script “mention city + service type” in Google reviews (Google 2026 policy).

---

## Tech stack

- **Static HTML** — no React/Vue on marketing site
- **`index.html`** — homepage (large inline CSS block + sections)
- **`pages/*.html`** — all other public pages (served via Netlify **200 rewrites**)
- **`netlify.toml`** — all redirects (301 legacy + 200 clean-url rewrites)
- **`sitemap.xml`** — generated at build by `scripts/generate-sitemap.mjs` from `netlify.toml` 200 rules
- **`robots.txt`** — disallows `/pages/` and `/signalhouse/`
- **`js/serviceFlows.js`** — structured quote intake flows on contact/home
- **`netlify/functions/`** — quote submit etc.
- **Images:** mix of `/images/` local + Webflow CDN `cdn.prod.website-files.com/...`

---

## URL architecture

### Public clean URLs (in sitemap)

| Path | File |
|------|------|
| `/` | `index.html` |
| `/about` | `pages/about.html` |
| `/blog` | `pages/blog.html` |
| `/contact` | `pages/contact.html` |
| `/residential-cleaning` | `pages/residential-cleaning.html` |
| `/commercial-cleaning` | `pages/commercial-cleaning.html` |
| `/post-construction-cleaning` | `pages/post-construction-cleaning.html` |
| `/specialized-cleaning` | `pages/specialized-cleaning.html` |
| `/inner-circle` | `pages/inner-circle.html` |
| `/customer-portal` | `pages/customer-portal.html` |
| `/house-cleaning-{city}` | `pages/house-cleaning-{city}.html` |

Cities: `naples`, `fort-myers`, `bonita-springs`, `estero`, `cape-coral`

### Blog / Knowledge Center

**Strategy:** `docs/seo/SPARKLEAN_BLOG_KNOWLEDGE_CENTER.md` — decision/problem articles, not city-swapped tips; city pages own “cleaning service in [city]”.

Pattern: `/blog/{slug}` → `pages/blog/{slug}.html` (200 rewrite in `netlify.toml`)

**Hub wording:** Knowledge Center (choose / manage / verify). UI unchanged. Residential CTAs → recurring intake; partner path → `/partners` / `/refer`.

**All 12 posts (keep `pages/blog.html` cards + JSON-LD `blogPost` array in sync):**

| Slug | Cluster |
|------|--------|
| `naples-house-cleaning-when-to-hire-a-pro` | Recurring-home decisions |
| `fort-myers-house-cleaning-when-to-hire-a-pro` | Recurring-home decisions |
| `estero-house-cleaning-when-to-hire-a-pro` | Recurring-home decisions |
| `bonita-springs-house-cleaning-when-to-hire-a-pro` | Recurring-home decisions |
| `cape-coral-house-cleaning-when-to-hire-a-pro` | Recurring-home decisions |
| `naples-post-construction-cleaning-before-move-in` | High-intent problems |
| `cape-coral-post-construction-cleaning-remodel-new-build` | High-intent problems |
| `bonita-springs-post-construction-cleaning-remodel-new-build` | High-intent problems |
| `estero-residential-move-out-deep-cleaning` | High-intent problems |
| `naples-office-cleaning-medical-law-firms` | High-intent problems |
| `fort-myers-commercial-office-cleaning` | Trust & accountability |
| `naples-commercial-cleaning-high-traffic-venues` | High-intent problems |

**Claim scrub:** `node scripts/scrub-blog-claims.mjs` — no franchise digs, “healthier home,” or “luxury-grade products” without evidence; 20 future cluster titles are roadmap only (do not auto-generate).

### Redirects (`netlify.toml`)

- **301** — old Webflow/neighborhood URLs → city or service hubs (extensive list; GSC-driven batches Jul 2026)
- **301** — `/pages/*.html` → clean URLs (no indexable duplicates)
- **301** — `/sparkleanvision` → `https://workforcevisionai.com`
- **200** — clean URL → `pages/*.html` (internal rewrite, URL bar unchanged)

**Adding a new public page:** create `pages/foo.html`, add 200 rewrite in `netlify.toml`, run `npm run sitemap`, bump `lastmod`.

**Adding a legacy URL fix:** add **301** rules (with and without trailing slash) in `netlify.toml` before the 200 rewrite block.

---

## Brand & design tokens

```css
--gold: #B8A47A;
--gold-lt: #D4BF96;
--dark: #0E0E0E;
--dark2: #161616;
--white: #F9F7F3;
--serif: 'Playfair Display', Georgia, serif;
--sans: 'Montserrat', sans-serif;
```

- **Tone:** luxury, supervised crews, discretion, 24-hour happiness guarantee
- **Logo (CDN):** `https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21b5c7958824a1f172b0f_sparklean-logo-transparent.png`
- **Favicons:** `/favicon.ico`, `/favicon-32x32.png`, `/favicon-16x16.png`, `/apple-touch-icon.png` — every HTML page should include all four in `<head>`

---

## CSS files (when to use what)

| File | Use |
|------|-----|
| `sparklean-mobile-first.css` | Base responsive + nav on most pages |
| `sparklean-luxury-flow.css` | Service/city page layout, founder video patterns on some pages |
| `sparklean-nav-logo.css` | Nav logo sizing |
| `sparklean-site-header.css` | **Sitewide** header chrome — Rewards bar + Services/Service Areas menus + scroll state (load after `sparklean-nav-logo.css`) |
| `quote-intake.css` | Quote/contact intake UI |
| `sparklean-blog-article-page.css` | **Blog article template** |
| `sparklean-blog-index-mobile.css` | Blog index mobile grid |
| `contact-page.css` | Contact page specifics |
| `signalhouse-magazine.css` | Signal House only (private) |

Homepage uses **large inline `<style>`** in `index.html` (including `#founder-message` founder video block).

---

## Blog article template (copy this pattern)

Reference: `pages/blog/fort-myers-commercial-office-cleaning.html`

**Required on every new post:**

1. Favicon block (4 tags)
2. `<title>` + meta description + **canonical** `https://www.sparklean.co/blog/{slug}`
3. OG/Twitter tags
4. JSON-LD `@graph`: Organization + **BlogPosting** + BreadcrumbList
5. CSS: `sparklean-blog-article-page.css`, `sparklean-mobile-first.css`, `quote-intake.css`, `sparklean-luxury-flow.css`, `sparklean-nav-logo.css`, `sparklean-site-header.css`
6. Standard `#site-header` chrome + mobile menu (match any marketing page; include `js/sparklean-site-header.js`)
7. `<main id="main-content">` → `.article-shell` → breadcrumb → `<article class="article-inner">`
8. `.article-cat` · `.article-title` · `.article-byline` · `.article-body` (H2s, lists, internal links)
9. `.article-cta` with phone + **recurring** CTA (`data-sparklean-intake-preset="recurringResidential"`) for residential; walkthrough/partner CTA for commercial/post-con
10. `.article-tags` + `.related-card` grid (3 related posts)
11. Footer matching other pages
12. Add **200 redirect** in `netlify.toml` for `/blog/{slug}`
13. Add card to `pages/blog.html` + extend JSON-LD `blogPost` array
14. Run `npm run sitemap`
15. Follow `docs/seo/SPARKLEAN_BLOG_KNOWLEDGE_CENTER.md` (question title, direct answer, no unsupported claims)

**Internal linking rules:** every post links to relevant service page, city page, and 1–2 sibling blogs. Prefer decision/problem siblings over city-template twins.

---

## Entity / JSON-LD (canonical business)

| Item | Value |
|------|--------|
| Canonical `@id` | `https://www.sparklean.co/#organization` |
| `@type` | `Organization` + `LocalBusiness` only (not deprecated `ProfessionalService`) |
| Legal name | Sparklean Cleaning LLC (never “corporation”) |
| Locked description | Professionally managed and supervised residential and commercial cleaning company serving Southwest Florida |
| Address in schema | **None** — service-area business; no partial PostalAddress |
| Source module | `data/sparklean-entity.mjs` |
| Sync | `npm run schema:sync` |
| Tests | `npm run test:schema` |
| Audit + citation worksheet | `docs/seo/SPARKLEAN_ENTITY_SCHEMA_AUDIT.md`, `docs/seo/SPARKLEAN_CITATION_CONSISTENCY_CHECKLIST.md` |

Rules: one business entity sitewide; city pages are service areas (not branches); no street/partial address in schema; offerings via `Service` + `OfferCatalog`; no Maps search URLs in `sameAs`; no invented ratings/hours/profiles; no rich-result eligibility claims. After editing entity facts, sync + test.

**Factual claims (do not reintroduce):** not “fully licensed” / occupational Florida cleaning license — use registered Florida business + bonding / GL / Workers’ Comp; no “20,000+ clients” unless founder documents the metric; no schema `aggregateRating` / hard-coded review count; no attributed testimonials unless listed in `data/sparklean-testimonials.mjs` with a documented source; never place “Verified on Google” next to private quotes. Sync: `npm run testimonials:sync` · test: `npm run test:testimonials`. Details in `docs/seo/SPARKLEAN_ENTITY_SCHEMA_AUDIT.md`.

### Referral / recurring machine (branch)

| Route | File |
|-------|------|
| `/why-sparklean` | `pages/why-sparklean.html` |
| `/refer` | `pages/refer.html` |
| `/partners` | `pages/partners.html` |

| Tooling | Command |
|---------|---------|
| Regenerate trust pages | `npm run gen:trust-pages` then `npm run schema:sync` |
| Tests | `npm run test:referral` (+ schema + testimonials) |
| Case-study manifest | `data/sparklean-case-studies.mjs` (empty = no public stories) |
| Privacy-safe events | `js/sparklean-events.js` |
| External authority worksheet | `docs/seo/SPARKLEAN_EXTERNAL_AUTHORITY_CHECKLIST.md` |

Intake presets: `recurringResidential`, `referral`, `innerCircle`. Referral payload uses existing `quote-submit` with `leadSource=referral`, `referralType`, referrer/referred contacts, permission/consent — PII stays in email/lead record, not analytics/schema.

## SEO work completed (summary)

### Internal linking + FAQ schema (`81b779f`)
- City pages → relevant high-intent blogs
- `residential-cleaning.html` → all 5 city guides + Estero move-out post
- `post-construction-cleaning.html` + `commercial-cleaning.html` — deep blog links + **5 FAQs + FAQPage schema each**

### Blog batch (`eb22ce4`)
- Cape Coral post-con, Fort Myers commercial, Estero move-out, Bonita post-con

### Local SEO / schema fixes (`5b5b42f`, `7d01c7c`, etc.)
- Naples blog expansion, Estero byline fix, Cape Coral area signals

### GSC redirect recovery (Jul 2026 — `99ae529`, `c03fe44`, `3010fda`)
- ~50+ missing neighborhood Webflow 301s
- `/pages/*.html` → clean URL 301s
- Tony validated **404** + **redirect error** in GSC (pending recrawl)

### `/pages/*.html` force redirect fix (2026-07-30)
- Live check found `/pages/*.html` still returning **200** (static file shadowing)
- Netlify cannot use mid-path splats (`/pages/*.html`); named `:slug.html` placeholders also failed
- **Working fix:** root `_redirects` with explicit `301!` per tracked page (generated by `scripts/generate-pages-redirects.mjs`, run in `npm run build`)
- Legacy Webflow slug 301s (e.g. `*-residential-cleaning`) were already working live
- Money pages stay **200** via clean-URL rewrites; do not add speculative neighborhood 301s unless they appear in GSC Not found

### City money-page wording pass (2026-07-14 — `660c6f4`)
- Unique title/meta/H1/intro/FAQ for all 5 city pages — **no UI redesign**
- Angles: Bonita = home base trust · Naples = discretion/estates · Estero = golf communities · Fort Myers = across the city · Cape Coral = canal homes
- Removed leading `$/hr` from city service cards + cost FAQs; custom-quote language instead
- Fixed Fort Myers desktop hero communities (was wrongly listing Estero neighborhoods)

### Known GSC state (2026-07-14)
- **Sitemap view (truth for money pages):** ~**26 indexed** / **1 not indexed** = `/customer-portal` (Client App landing — low SEO urgency; optional Request indexing)
- **All Pages view (~61 not indexed):** includes legacy 404s/redirects Google hasn’t recrawled since ~April — **not** 61 missing money pages
- Use **Sitemaps → sitemap.xml → See page indexing**, not the global 61, as the KPI
- Avg position ~40–60 + ~0.2% CTR on non-brand = **ranking problem**, not indexing problem
- **Do not** keep renaming URLs during recovery; **do not** push commercial vertical drafts yet

### SEO recovery playbook (active)
1. GBP + reviews (Bonita home base first)
2. Request indexing on city URLs after wording deploy
3. Measure GSC positions for Bonita → Naples → Estero → Fort Myers in 2–3 weeks
4. Then deepen hubs or carefully add commercial geo — not a page spray

### Marketing email asset library (2026-07-20)
- Stable public folder: `/email-assets/*.jpg` → `https://www.sparklean.co/email-assets/...`
- Index + usage rules: [`docs/EMAIL_ASSETS.md`](EMAIL_ASSETS.md)
- Long-cache headers on `/email-assets/*` in `netlify.toml`
- Do **not** rename deployed filenames (hard-coded into HTML emails / ChatGPT prompts)
- Prefer Sparklean originals; replace stand-ins noted in `EMAIL_ASSETS.md` when better photos exist

---

## Homepage founder video (`#founder-message`)

- YouTube (nocookie): `l59cKJ9JhLo`
- Poster: `/images/branding/roxy-welcome-poster.png`
- **Desktop:** split layout — copy left, photo + play ring right
- **Mobile:** photo top (4:5), copy + “Watch now” below; drops 16:9 until play
- **Copy (current):** Founder story · 2 min — Cuban doctor, starting over, giving everything, care at center of every home
- JS at bottom of `index.html` loads iframe on click, adds `founder-cinematic__ratio--playing`

---

## Quote / intake (`js/serviceFlows.js`)

Categories: residential, condo, luxury estate, move-in/out, airbnb, commercial office, medical, facility/janitorial, retail, HOA, post-construction, windows, specialized add-ons.

Contact page + homepage `#quote` use these flows → `netlify/functions/quote-submit.mjs` → Brevo transactional → `SPARKLEAN_LEAD_TO` (default `info@sparklean.co`).

**Sitewide header conversion (2026-08-18):** Sticky champagne Rewards bar — “SPARKLEAN REWARDS · Earn $5 in cleaning credit for every $100 spent. Learn More →” (cleaning credit, not cash back; no coin medallion). Consolidated crawlable `SERVICES` + `SERVICE AREAS` menus. Conversion hierarchy: Request a Quote (only filled primary) → phone always visible on desktop (incl. scrolled) → quiet Client Login → Rewards info bar. Scrolled desktop: Services · Service Areas · Why Sparklean · Earn $5 Credit · phone · Request a Quote (About/Partners/Blog + Client Login hidden). Tablet/mobile: compact Call + Quote in header/sticky CTA. Homepage hero proof card: 4.9★ Google Rating + 24-Hour Happiness Guarantee (cities stay in copy + Service Areas nav). Assets: `css/sparklean-site-header.css`, `js/sparklean-site-header.js`. Signal House excluded.

**Naples city page SEO ownership (2026-08-18):** `/house-cleaning-naples` now owns the city query. Title/H1/schema: `House Cleaning Services in Naples, Florida`. Discretion/estates kept in supporting copy (Port Royal, Pelican Bay, Park Shore, Old Naples). Removed SWFL trust-card dilution and “maid service” marquee wording. Breadcrumb: Home → Residential Cleaning → Naples. CTA aligned to Build My Cleaning Plan. No UI redesign.

**Bonita Springs city page SEO ownership (2026-08-19):** Same Semrush city-ownership pattern as Naples. Title/H1/schema: `House Cleaning Services in Bonita Springs, Florida`. Home-base angle kept (Bonita Bay, The Colony, Barefoot Beach, Pelican Landing). Breadcrumb: Home → Residential Cleaning → Bonita Springs. Marquee “maid service” → recurring residential. Hero CTA: Build My Cleaning Plan. Mobile photo fit matches Naples/homepage. No UI redesign.

**Estero city page SEO ownership (2026-08-19):** Same Semrush pattern. Title/H1/schema: `House Cleaning Services in Estero, Florida`. Golf-community angle kept (West Bay, Grandezza, The Brooks, Pelican Sound). Breadcrumb: Home → Residential Cleaning → Estero. Marquee maid wording removed. Hero CTA: Build My Cleaning Plan. Mobile photo fit matches sibling city pages. No UI redesign.

**Estero hero full-frame (2026-08-19):** Replaced short cropped `Untitled-design--4` banner (1200×630) with residential’s full team scene `1000051474` (1400×933). Mobile `.hero-mobile-img` uses `height:auto` + `object-fit:contain` + `aspect-ratio:1400/933` so heads/artwork stay visible like homepage/Naples.

**Fort Myers city page SEO ownership (2026-08-19):** Same Semrush pattern. Title/H1/schema: `House Cleaning Services in Fort Myers, Florida`. Across-the-city angle kept (Gulf Harbour, McGregor, Heritage Palms, Gateway). Breadcrumb: Home → Residential Cleaning → Fort Myers. Marquee maid wording removed. Hero CTA: Build My Cleaning Plan. Full-frame mobile hero fit + header clearance. No UI redesign.

**Cape Coral city page SEO ownership (2026-08-19):** Same Semrush pattern. Title/H1/schema: `House Cleaning Services in Cape Coral, Florida`. Canal-homes angle kept (Cape Harbour, Tarpon Point, Sandoval, Cape Royal). Breadcrumb: Home → Residential Cleaning → Cape Coral. Marquee maid wording removed. Hero CTA: Build My Cleaning Plan. Full-frame mobile hero + desktop photo below header + mobile 24h badge bottom-right. **All five city money pages now on this pattern.**

**Desktop hero sharpness (2026-08-19):** All photo-hero pages use **1400 JPG** (not heavily compressed WebP) for desktop `.hero-bg` / homepage `<img>` / residential hero `<img>` / contact CSS / About local JPGs. Desktop `zoomIn` / scale animation removed (`css/hero-desktop-sharp.css`). Mobile still uses WebP sources + existing contain layout. Pages: `/`, `/house-cleaning-{naples,bonita-springs,estero,fort-myers,cape-coral}`, `/residential-cleaning`, `/commercial-cleaning`, `/post-construction-cleaning`, `/vacation-rental-cleaning`, `/specialized-cleaning`, `/contact`, `/about`. No larger-than-1400 originals in repo.

**City reviews + cost-factors UI (2026-08-18):** Pricing clarity rebuilt as an editorial label/description list (not smashed inline text). Styles inlined on city pages + shared `sparklean-luxury-flow.css`. Google Reviews simplified to centered rating + one city line + one CTA. All five city pages.

**Mobile hero + breadcrumb (2026-08-18):** City pages had a CSS typo grouping `.breadcrumb` with `.pp-img{height:220px}` — created a tall empty black band with Home › Residential › City. Fixed on all five city LPs; mobile heroes taller with `object-position:center 20%`.

**Homepage mobile hero structure (2026-08-18/19):** One authoritative `<picture>`/`<img>` in `.homepage-hero__media` — **not** CSS background, **not** a second overlaid mobile image. Asset: `69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp` (Roxy + two team members; ratio 1400×933 ≡ 2048/1365). At `max-width:767px`: `.homepage-hero` block/`height:auto`; media `aspect-ratio:2048/1365`; img `object-fit:contain` (never cover); content stacks below the full frame. Header Request a Quote kept inside the viewport. CSS: `css/home-hero-mobile.css`.

**Naples mobile photo fit (2026-08-19):** `/house-cleaning-naples` only — at `max-width:767px`, hero + body photos (`.hero-mobile-img`, `.ni-img`, `.pp-img`, `.sb-img`) use the same full-frame fit as homepage: `width:100%`, `height:auto`, `object-fit:contain`, no fixed crop heights. Desktop unchanged.

**Residential LP (2026-08-18 SEO correction):** Service-category hub — **not** SWFL and **not** a five-city H1. Eyebrow `Residential Cleaning`. H1 `Professionally Managed Residential Cleaning`. Title/meta match category positioning (no city list). Lower H2 `Residential Cleaning Service Areas` + five crawlable city cards. City pages exclusively own `House Cleaning Services in [City], Florida`. Homepage H1 stays Naples-primary. Trust strip + tablet/mobile photo-on-top stack unchanged. Evidence: `evidence/residential-service-hub-seo-2026-08-18/`.

**Residential LP (2026-08-18 earlier SWFL draft — superseded):** Had Title/H1 “Residential Cleaning Southwest Florida.” Corrected same day after Google doorway/keyword-stuffing review.

**Residential LP positioning (2026-08-10, copy-only on `/residential-cleaning`):** Professional accountability — not “expensive luxury.” Protected lines: “Local care. Large-company discipline.” / “House cleaning you don’t have to manage.” / “Anyone can start a cleaning company. Sparklean built a system to deliver cleaning consistently.” Hero CTA: Build My Cleaning Plan + Call. Trust strip leads with visible **4.9★ Google** (live reviews link; no invented review count). Homepage + city pages adapt later after paid LP performance.

**Contact form → Ads (2026-08-12 baseline `76633d0`):** Browser `?sent=1` + pending `contact-*` only — no Blobs, no `BROWSER_SENT` vs Google confirmation.

**Lead / conversion reconciliation boundary (2026-08-12→08-14, review `review/lead-conversion-boundary`):** Real claim leases (no reclaim before expiry; in-flight 503); outbox `sendLeaseOwner`+`sendFence` fencing; Brevo send without durable DELIVERED → `RECONCILIATION_REQUIRED` (not completed success; at-least-once-ambiguous); full quote material hash + outbox payload bind; attribution keys excluded/documented. **2026-08-14 Blobs durability:** production store uses strong consistency + etag-cache wrap; `writeCas` does not treat missing write ETag as CAS conflict; `ensureOutboxPending` waits for durable seal (fixes Deploy Preview `OUTBOX_MISSING`). Proofs: `test:idempotency-lease`, `test:blob-concurrency`, `test:funnel`. Evidence work notes pin product SHAs. Exact-SHA preview browser Google proof still required before any “fixed” claim.

**Paid Ads intake (2026-08-10, review branch):** `js/quote-intake.js` paid mode activates on `?quote=1`, `gclid`/`gbraid`/`wbraid`, paid `utm_medium` (cpc/ppc/paid/…), or stored click ids. **Do not** auto-open the full-screen intake for `gclid`/paid UTM — after 10s or 35% scroll, show a small non-blocking prompt (“Ready for a personalized cleaning plan?”). `?quote=1` may still open immediately. Hero/nav/sticky quote CTAs open the five-field paid flow immediately. Analytics (not Ads conversions): `paid_quote_prompt_shown`, `paid_quote_started`, `paid_quote_submitted`, `phone_click`. Google Ads conversion still fires only after Brevo success + `leadId`. Confirmation includes Call Sparklean (no invented SLA). Tests: `npm run test:funnel`. Preferred paid LP: `/residential-cleaning?gclid=…` (soft prompt) or `?quote=1` (force open).

### Dual lead paths (2026-08-17) — durable quote URL

Two separate paths; **do not merge** and **do not double-submit**.

| Path | Entry | Backend | Ads conversion |
|------|--------|---------|----------------|
| **Guided quote** | `/contact?quote=1#quote-intake` (also `&preset=recurringResidential` from residential/city CTAs). Opens overlay on load/refresh/new tab. Landmark `#quote-intake` + simple form remain if JS is delayed/off. | `POST /.netlify/functions/quote-submit` | Only after server returns `leadId` + `reportToken`, then `SparkleanAds.fireAndReportConversion` (exactly once per leadId) |
| **Simple contact form** | Visible form on `/contact` (`#sparklean-contact-form`) | `POST /.netlify/functions/contact-submit` | Same gate: server `leadId` + `reportToken` → `fireAndReportConversion` |

**Never** fire a Google Ads conversion from: loading `?quote=1`, opening the intake, viewing thank-you/`?sent=1`, or analytics events like `paid_quote_started`.

Primary service + city CTAs use the durable href (not bare `/contact` self-links). Homepage left unchanged in this change. Sticky mobile quote button still opens in place (no href). Attribution: `gclid`/`gbraid`/`wbraid` via `sparklean-attribution.js` on both paths. Evidence: `evidence/quote-open-url-2026-08-17/`. Verify: `node scripts/verify-quote-open-url.mjs` + `npm run test:paid-intake`.

**Lead inbox / spam (2026-08-14):** From stays authenticated Sparklean (`SPARKLEAN_FROM_EMAIL`). **Reply-To = customer email only** (never From). No JSON attachment. **DNS (applied + Gmail-proven 2026-08-14):** Brevo verification TXT + DKIM CNAMEs (`brevo1`/`brevo2` → `b1`/`b2.sparklean-co.dkim.brevo.com`) + DMARC `p=none` `rua@dmarc.brevo.com`. **SPF unchanged** (`v=spf1 include:_spf.google.com ~all` — do not add `include:spf.brevo.com`). Brevo authenticated; Gmail headers: `dkim=pass` (`@sparklean.co`, selector `brevo2`), `dmarc=pass`, no impersonation warning. Evidence: `docs/work-notes/2026-08-14-brevo-domain-auth/`.

---

## Signal House (private — not SEO)

- Paths: `/signalhouse`, `/signalhouse/{slug}` → `pages/signalhouse/`
- **Not in sitemap** · **robots disallow**
- Client magazine flipbook — separate from marketing SEO

---

## Workforce Vision relationship

- Tony’s **proof infrastructure** product; Sparklean is **customer zero**
- **Customer portal (live on marketing site):** `/customer-portal` → luxury landing page; CTAs open interim app URL until DNS is live
  - **Interim app URL (all CTAs today):** `https://workforce-visionai-qrdpa.ondigitalocean.app/cx/sparklean`
  - **Branded app URL (when DNS live):** `https://portal.sparklean.co` — Namecheap CNAME → DO app, then `CX_PORTAL_HOST_LIVE=1` on DO; swap CTAs + JSON-LD `WebApplication.url` in `pages/customer-portal.html`
  - PWA via Add to Home Screen — **not** App Store; existing customers only (magic link)
  - **iPhone install:** no Download button (Apple restriction) — Safari → Share (bottom bar) → Add to Home Screen; if link opened in Gmail, Open in Safari first
  - **DNS (Tony/Namecheap):** CNAME `portal.sparklean.co` → `workforce-visionai-qrdpa.ondigitalocean.app`, then `CX_PORTAL_HOST_LIVE=1` on DO
  - **Asset TODO:** export **512×512 PNG** app icon (gold Sparklean mark on square) for sharper PWA home screen icon — portal uses logo from CDN today
  - **Brand tokens:** gold `#B8A47A`, cream `#F9F7F3`, Playfair Display + Montserrat (matches site)
- Planned: commercial **Trust Shield** section on `/commercial-cleaning` + `/proof` links on commercial invoices
- Planned: subtle footer link to workforcevisionai.com
- **Do not** software-ify homepage or residential pages

---

## Deferred / next (approved direction, not built)

### Phase 0 SEO (ongoing)
- GSC: prefer **sitemap indexing** dashboard over global “61 not indexed”
- No URL churn 30 days
- City wording live (`660c6f4`); next levers = GBP/reviews + recrawl, not more URLs

### Phase 1 — Commercial Trust Shield
- Mid-page section on `/commercial-cleaning` only — **Live 2026-08-14** (`#trust-shield`)
- Proof framed as supervised commercial accountability (not a software pitch); links to existing commercial blogs + contact
- Vertical index money pages still **held** until Phase 0 city rankings stabilize

### Phase 2 — Commercial money pages (~6–14 max)
- Hub drafts exist locally (`office-cleaning`, `dealership-cleaning`, `school-cleaning`, `janitorial-services`) — **hold push** until Phase 0 city rankings stabilize
- Then `/commercial-cleaning-{city}` and selective vertical+city combos only
- **Not** 40 pages at once; **not** duplicate city-swapped copy

### Phase 3 — Reviews + GBP
- 7–8 real reviews over 2 weeks; neutral ask; target 100+
- **Now priority** alongside city page recovery

### Commercial content expansion (Tony deferred)
- Large Tier 1–5 commercial plan discussed — do **Phase 1 geo commercial only** when resumed

---

## Common tasks cheat sheet

### New blog post
1. Copy `pages/blog/fort-myers-commercial-office-cleaning.html` → new slug file
2. Update content, canonical, JSON-LD dates
3. `netlify.toml` 200 rule for `/blog/{slug}`
4. Card + JSON-LD on `pages/blog.html`
5. `npm run sitemap`
6. Internal links from city/service pages if relevant

### Fix 404 from GSC
1. Tony exports URL from Search Console
2. Add 301 in `netlify.toml` (both slash variants)
3. Push → Validate fix in GSC

### Verify live links
- `node _crawl-verify.js` (read-only crawl script in repo root)

### Deploy
- Push to `main` → Netlify auto-deploys → `npm run build` regenerates sitemap

---

## Files to know

| File | Purpose |
|------|---------|
| `index.html` | Homepage + founder video CSS/HTML |
| `netlify.toml` | **Source of truth for URLs** |
| `email-assets/` | Permanent marketing email images (stable public URLs) |
| `docs/EMAIL_ASSETS.md` | Email image URL index for ChatGPT / campaigns |
| `sitemap.xml` | Generated — don’t hand-edit without running build script |
| `pages/blog.html` | Blog index + blogPost schema |
| `data/sparklean-entity.mjs` | Canonical Organization JSON-LD source of truth |
| `docs/seo/SPARKLEAN_ENTITY_SCHEMA_AUDIT.md` | Entity audit + before/after matrix |
| `docs/seo/SPARKLEAN_CITATION_CONSISTENCY_CHECKLIST.md` | Founder NAP / sameAs worksheet |
| `pages/commercial-cleaning.html` | Commercial hub (Trust Shield goes here) |
| `pages/house-cleaning-*.html` | City money pages |
| `scripts/generate-sitemap.mjs` | Sitemap generator |
| `_crawl-verify.js` | Live link checker |

---

## What NOT to build without approval

- Homepage rewrite for software
- Snowbird / low-intent blog posts
- Duplicate thin city/commercial pages
- New URL scheme during SEO recovery
- Publishing physical home address

---

*End of reference — update after each major SEO, content, or redirect batch.*
