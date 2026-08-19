/**
 * Apply Semrush city-ownership SEO + full-frame mobile UI to Cape Coral.
 * Keeps canal-homes angle; includes desktop header clearance + mobile 24h badge.
 */
import fs from "node:fs";
import { chromium } from "playwright";

const path = "pages/house-cleaning-cape-coral.html";
let html = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const heroFile =
  "images/heroes/69b432ed7f788ef8b631d3ba_IMG_1466-f7c19d91-1400.webp";
const browser = await chromium.launch();
const page = await browser.newPage();
const b64 = fs.readFileSync(heroFile).toString("base64");
await page.setContent(`<img id="i" src="data:image/webp;base64,${b64}">`);
await page.waitForFunction(() => document.getElementById("i").naturalWidth > 0);
const dims = await page.evaluate(() => {
  const i = document.getElementById("i");
  return { w: i.naturalWidth, h: i.naturalHeight };
});
await browser.close();
console.log("hero dims", dims);

const title = "House Cleaning Services in Cape Coral, Florida | Sparklean";
const desc =
  "House cleaning services in Cape Coral, Florida — Cape Harbour, Tarpon Point, Sandoval, and canal homes. Supervised teams, bonded and insured. Call (239) 888-3588.";
const ogDesc =
  "House cleaning services in Cape Coral, Florida — canal homes, waterfront estates & marina communities. Bonded, insured, Workers' Comp. Supervised Sparklean teams.";
const twDesc =
  "House cleaning services in Cape Coral, Florida — Cape Harbour, Tarpon Point, Sandoval & canal neighborhoods. Bonded, insured, supervised. (239) 888-3588.";
const ownership = "House Cleaning Services in Cape Coral, Florida";
const citySlug = "house-cleaning-cape-coral";
const cityLabel = "Cape Coral, FL";

function mustReplace(label, from, to) {
  if (!html.includes(from)) {
    throw new Error(`MISSING (${label}): ${from.slice(0, 160)}`);
  }
  html = html.split(from).join(to);
}

mustReplace(
  "title",
  "<title>House Cleaning Cape Coral FL | Sparklean Cleaning</title>",
  `<title>${title}</title>`
);
mustReplace(
  "meta-desc",
  '<meta name="description" content="House cleaning for Cape Coral canal and waterfront homes. Supervised, bonded, insured teams attentive to salt air, humidity, and fine finishes.">',
  `<meta name="description" content="${desc.replace(/&/g, "&amp;")}">`
);
mustReplace(
  "og-title",
  '<meta property="og:title" content="House Cleaning Cape Coral FL | Sparklean Cleaning">',
  `<meta property="og:title" content="${title}">`
);
mustReplace(
  "og-desc",
  '<meta property="og:description" content="Polished house cleaning for Cape Coral canal homes, waterfront estates, and marina communities, delivered by supervised professional teams.">',
  `<meta property="og:description" content="${ogDesc.replace(/&/g, "&amp;")}">`
);
mustReplace(
  "tw-title",
  '<meta name="twitter:title" content="House Cleaning Cape Coral FL | Sparklean Cleaning">',
  `<meta name="twitter:title" content="${title}">`
);
mustReplace(
  "tw-desc",
  '<meta name="twitter:description" content="Supervised canal-home cleaning for Cape Harbour, Tarpon Point, Sandoval, and waterfront neighborhoods across Cape Coral.">',
  `<meta name="twitter:description" content="${twDesc.replace(/&/g, "&amp;")}">`
);

const ldMatch = html.match(
  /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/
);
if (!ldMatch) throw new Error("No JSON-LD");
const graphDoc = JSON.parse(ldMatch[1]);
for (const node of graphDoc["@graph"]) {
  const t = node["@type"];
  if (t === "WebPage") {
    node.name = ownership;
    node.description = desc;
  }
  if (t === "Service" && node["@id"]?.includes(citySlug)) {
    node.name = ownership;
    node.description = desc;
  }
  if (t === "BreadcrumbList") {
    node.itemListElement = [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.sparklean.co/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Residential Cleaning",
        item: "https://www.sparklean.co/residential-cleaning",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cityLabel,
        item: `https://www.sparklean.co/${citySlug}`,
      },
    ];
  }
}
html = html.replace(
  ldMatch[0],
  `<script type="application/ld+json">\n${JSON.stringify(graphDoc)}\n</script>`
);

mustReplace(
  "hero-tag",
  "<span>Luxury Cleaning · Cape Coral, Florida</span>",
  "<span>House Cleaning · Cape Coral, Florida</span>"
);
mustReplace(
  "hero-tag-mobile",
  "<span>Luxury Cleaning · Cape Coral, FL</span>",
  "<span>House Cleaning · Cape Coral, Florida</span>"
);
mustReplace(
  "h1",
  "<h1>Cape Coral House Cleaning<br>for <em>Canal Homes</em></h1>",
  "<h1>House Cleaning Services<br>in <em>Cape Coral, Florida</em></h1>"
);
mustReplace(
  "h1-mobile",
  '<p class="hero-mobile-h">Cape Coral House Cleaning<br>for <em>Canal Homes</em></p>',
  '<p class="hero-mobile-h">House Cleaning Services<br>in <em>Cape Coral, Florida</em></p>'
);
mustReplace(
  "desktop-ctas",
  `<div class="hero-btns">
      <a href="/contact?quote=1&preset=recurringResidential#quote-intake" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Begin recurring residential care →</a>
      <a href="#services" class="btn-outline">Our Services</a>
    </div>`,
  `<div class="hero-btns">
      <a href="/contact?quote=1&preset=recurringResidential#quote-intake" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Build My Cleaning Plan</a>
      <a href="tel:2398883588" class="btn-outline">Call (239) 888-3588</a>
    </div>`
);
mustReplace(
  "mobile-ctas",
  `<div class="hero-btns">
      <a href="tel:2398883588" class="btn-outline">Call (239) 888-3588</a>
      <a href="/contact?quote=1&preset=recurringResidential#quote-intake" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Begin recurring residential care →</a>
      <a href="#services" class="btn-outline">Our Services</a>
    </div>`,
  `<div class="hero-btns">
      <a href="/contact?quote=1&preset=recurringResidential#quote-intake" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Build My Cleaning Plan</a>
      <a href="tel:2398883588" class="btn-outline">Call (239) 888-3588</a>
    </div>`
);
mustReplace("intro-cta", "Begin recurring residential care →", "Build My Cleaning Plan");

mustReplace(
  "breadcrumb",
  `<div class="breadcrumb">
  <div class="bc-inner">
    <a href="/">Home</a><span class="bc-sep">/</span>
    <a href="/residential-cleaning">Service Areas</a><span class="bc-sep">/</span>
    <span>House Cleaning Cape Coral FL</span>
  </div>
</div>`,
  `<div class="breadcrumb">
  <div class="bc-inner">
    <a href="/">Home</a>
    <span class="bc-sep">›</span>
    <a href="/residential-cleaning">Residential Cleaning</a>
    <span class="bc-sep">›</span>
    <span>Cape Coral, FL</span>
  </div>
</div>`
);

mustReplace(
  "marquee-lead",
  "House Cleaning Cape Coral FL",
  "House Cleaning Services in Cape Coral"
);
mustReplace(
  "marquee-maid",
  "Recurring Maid Service Cape Coral",
  "Recurring Residential Cleaning"
);

mustReplace(
  "base-img",
  ".hero-mobile-img{width:100%;height:min(78vw,460px);min-height:300px;max-height:480px;object-fit:cover;object-position:center 20%;display:block;}",
  ".hero-mobile-img{width:100%;height:auto;min-height:0;max-height:none;object-fit:contain;object-position:center center;display:block;}"
);

html = html.replace(
  'alt="Sparklean luxury home cleaning Cape Coral FL" width="1400" height="900"',
  `alt="House cleaning services in Cape Coral, Florida" width="${dims.w}" height="${dims.h}"`
);

// Desktop hero: start below header (Fort Myers pattern)
mustReplace(
  "hero-bg-base",
  ".hero-bg{position:absolute;inset:-2px;background:url('/images/heroes/69b432ed7f788ef8b631d3ba_IMG_1466-f7c19d91-1400.webp') center center / cover no-repeat;animation:zoomIn 14s ease-out forwards;}",
  ".hero-bg{position:absolute;inset:0;background:url('/images/heroes/69b432ed7f788ef8b631d3ba_IMG_1466-f7c19d91-1400.webp') center 18% / cover no-repeat;animation:none;transform:none;}"
);

const desktopClear = `
/* Desktop: photo starts below fixed header */
@media (min-width: 641px) {
  .hero {
    padding-top: var(--header-total, var(--nav-h));
    box-sizing: border-box;
  }
  .hero-bg,
  .hero-ov {
    top: var(--header-total, var(--nav-h)) !important;
    right: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
  }
  .hero-bg {
    background-position: center 18% !important;
  }
  .hero-content {
    padding: 60px 80px 80px !important;
  }
}
`;

if (!html.includes("photo starts below fixed header")) {
  mustReplace(
    "desktop-clear-insert",
    ".hero-content{position:relative;z-index:2;padding:calc(var(--nav-h) + 60px) 80px 80px;max-width:800px}",
    `.hero-content{position:relative;z-index:2;padding:calc(var(--nav-h) + 60px) 80px 80px;max-width:800px}${desktopClear}`
  );
}

const ratio = `${dims.w} / ${dims.h}`;
if (!html.includes('id="cape-coral-mobile-photo-fit"')) {
  const photoFit = `<style id="cape-coral-mobile-photo-fit">
/* Mobile: full-frame fit + badge clear of faces */
@media (max-width: 767px) {
  .hero-mobile {
    display: flex !important;
    flex-direction: column !important;
    padding-top: var(--header-total, 104px) !important;
    background: #0e0e0e !important;
  }
  .hero-mobile picture {
    display: block !important;
    width: 100% !important;
    line-height: 0 !important;
  }
  .hero-mobile-img,
  .ni-img,
  .pp-img,
  .sb-img {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    aspect-ratio: ${ratio} !important;
    object-fit: contain !important;
    object-position: center center !important;
    display: block !important;
    transform: none !important;
  }
  .ni-img-wrap,
  .sb-img-wrap,
  .pp-item {
    height: auto !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }
  .pp-item:hover .pp-img {
    transform: none !important;
  }
  .ni-badge {
    top: auto !important;
    bottom: 16px !important;
    left: auto !important;
    right: 16px !important;
  }
}
</style>
`;
  mustReplace(
    "photo-fit-insert",
    '<link rel="stylesheet" href="/css/sparklean-footer.css">\n<!-- Google tag (gtag.js) -->',
    `<link rel="stylesheet" href="/css/sparklean-footer.css">\n${photoFit}<!-- Google tag (gtag.js) -->`
  );
}

fs.writeFileSync(path, html);
console.log(
  JSON.stringify(
    {
      title: html.includes(title),
      ownership: html.includes(`"name":"${ownership}"`),
      maid: html.includes("Maid Service"),
      begin: html.includes("Begin recurring"),
      build: (html.match(/Build My Cleaning Plan/g) || []).length,
      h1: html.includes("House Cleaning Services<br>in <em>Cape Coral, Florida</em>"),
      photoFit: html.includes("cape-coral-mobile-photo-fit"),
      desktopClear: html.includes("photo starts below fixed header"),
      canalKept: html.includes("Cape Harbour") && html.includes("canal"),
      dims,
    },
    null,
    2
  )
);
