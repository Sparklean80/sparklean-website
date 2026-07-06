# Sparklean project reference

**Read this first** in any new Cursor chat about Sparklean Cleaning (`https://www.sparklean.co/`).

Last updated: **2026-07-05**

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
3. **Do not rewrite the homepage H1** or do broad UI redesigns unless agreed.
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

### Blog URLs

Pattern: `/blog/{slug}` → `pages/blog/{slug}.html` (200 rewrite in `netlify.toml`)

**All 12 posts (keep `pages/blog.html` cards + JSON-LD `blogPost` array in sync):**

| Slug | Focus |
|------|--------|
| `naples-house-cleaning-when-to-hire-a-pro` | Naples residential |
| `fort-myers-house-cleaning-when-to-hire-a-pro` | Fort Myers residential |
| `estero-house-cleaning-when-to-hire-a-pro` | Estero residential |
| `bonita-springs-house-cleaning-when-to-hire-a-pro` | Bonita residential |
| `cape-coral-house-cleaning-when-to-hire-a-pro` | Cape Coral residential |
| `naples-post-construction-cleaning-before-move-in` | Naples post-con |
| `cape-coral-post-construction-cleaning-remodel-new-build` | Cape Coral post-con |
| `bonita-springs-post-construction-cleaning-remodel-new-build` | Bonita post-con |
| `estero-residential-move-out-deep-cleaning` | Estero move-out/deep |
| `naples-office-cleaning-medical-law-firms` | Naples commercial office |
| `fort-myers-commercial-office-cleaning` | Fort Myers commercial |
| `naples-commercial-cleaning-high-traffic-venues` | Naples commercial venues |

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
5. CSS: `sparklean-blog-article-page.css`, `sparklean-mobile-first.css`, `quote-intake.css`, `sparklean-luxury-flow.css`, `sparklean-nav-logo.css`
6. Standard nav + mobile menu (match any blog page)
7. `<main id="main-content">` → `.article-shell` → breadcrumb → `<article class="article-inner">`
8. `.article-cat` · `.article-title` · `.article-byline` · `.article-body` (H2s, lists, internal links)
9. `.article-cta` with `/contact` + phone
10. `.article-tags` + `.related-card` grid (3 related posts)
11. Footer matching other pages
12. Add **200 redirect** in `netlify.toml` for `/blog/{slug}`
13. Add card to `pages/blog.html` + extend JSON-LD `blogPost` array
14. Run `npm run sitemap`

**Internal linking rules:** every post links to relevant service page, city page, and 1–2 sibling blogs. City “when to hire” posts link to high-intent commercial/post-con posts where relevant.

---

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

### Known GSC state (Jul 2026)
- Many old URLs show **PENDING** — redirects live; waiting on Google recrawl
- **Crawled not indexed** — often old neighborhoods + sitemap.xml (normal)
- **Do not** keep renaming URLs during recovery

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

Contact page + homepage `#quote` use these flows → `netlify/functions/quote-submit.mjs`.

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
- Planned: commercial **Trust Shield** section on `/commercial-cleaning` + `/proof` links on commercial invoices
- Planned: subtle footer link to workforcevisionai.com
- **Do not** software-ify homepage or residential pages

---

## Deferred / next (approved direction, not built)

### Phase 0 SEO (ongoing)
- GSC validate fix on 404 + redirect error
- No URL churn 30 days

### Phase 1 — Commercial Trust Shield
- Mid-page section on `/commercial-cleaning` only
- Proof link screenshot, vertical index grid (medical, dealerships, schools, HOA, etc.)

### Phase 2 — Commercial money pages (~6–14 max)
- `/commercial-cleaning-naples`, `/office-cleaning-naples`, `/medical-office-cleaning-naples`, `/dealership-cleaning-naples`, `/school-cleaning-naples`, Fort Myers mirrors, etc.
- **Not** 40 pages at once

### Phase 3 — Reviews + GBP
- 7–8 real reviews over 2 weeks; neutral ask; target 100+

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
| `sitemap.xml` | Generated — don’t hand-edit without running build script |
| `pages/blog.html` | Blog index + blogPost schema |
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
