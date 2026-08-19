/**
 * Apply Semrush city-ownership SEO + full-frame mobile hero UI to Fort Myers.
 * Keeps Fort Myers “across the city” communities; does not swap body copy.
 */
import fs from "node:fs";

const path = "pages/house-cleaning-fort-myers.html";
let html = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const title = "House Cleaning Services in Fort Myers, Florida | Sparklean";
const desc =
  "House cleaning services in Fort Myers, Florida — Gulf Harbour, McGregor, Heritage Palms, Gateway, and neighborhoods across the city. Supervised teams, bonded and insured. Call (239) 888-3588.";
const ogDesc =
  "House cleaning services in Fort Myers, Florida — Gulf Harbour, McGregor, Heritage Palms & neighborhoods across the city. Bonded, insured, Workers' Comp. Supervised Sparklean teams.";
const twDesc =
  "House cleaning services in Fort Myers, Florida — citywide supervised teams, bonded and insured. Call (239) 888-3588.";
const ownership = "House Cleaning Services in Fort Myers, Florida";
const citySlug = "house-cleaning-fort-myers";
const cityLabel = "Fort Myers, FL";

function mustReplace(label, from, to) {
  if (!html.includes(from)) {
    throw new Error(`MISSING (${label}): ${from.slice(0, 160)}`);
  }
  html = html.split(from).join(to);
}

mustReplace(
  "title",
  "<title>House Cleaning Fort Myers FL | Sparklean Cleaning</title>",
  `<title>${title}</title>`
);
mustReplace(
  "meta-desc",
  '<meta name="description" content="House cleaning across Fort Myers, from Gulf Harbour and McGregor to Heritage Palms and Gateway. Supervised, bonded, insured teams.">',
  `<meta name="description" content="${desc.replace(/&/g, "&amp;")}">`
);
mustReplace(
  "og-title",
  '<meta property="og:title" content="House Cleaning Fort Myers FL | Sparklean Cleaning">',
  `<meta property="og:title" content="${title}">`
);
mustReplace(
  "og-desc",
  '<meta property="og:description" content="Citywide Fort Myers house cleaning with supervised teams serving yacht-club residences, golf communities, historic homes, and growing neighborhoods.">',
  `<meta property="og:description" content="${ogDesc.replace(/&/g, "&amp;")}">`
);
mustReplace(
  "tw-title",
  '<meta name="twitter:title" content="House Cleaning Fort Myers FL | Sparklean Cleaning">',
  `<meta name="twitter:title" content="${title}">`
);
mustReplace(
  "tw-desc",
  '<meta name="twitter:description" content="Supervised house cleaning across Fort Myers, backed by a registered Florida operating company that is bonded and insured and a 24-hour guarantee.">',
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
  "<span>Luxury Cleaning · Fort Myers, Florida</span>",
  "<span>House Cleaning · Fort Myers, Florida</span>"
);
mustReplace(
  "hero-tag-mobile",
  "<span>Luxury Cleaning · Fort Myers, FL</span>",
  "<span>House Cleaning · Fort Myers, Florida</span>"
);
mustReplace(
  "h1",
  "<h1>Fort Myers House Cleaning<br><em>Across the City</em></h1>",
  "<h1>House Cleaning Services<br>in <em>Fort Myers, Florida</em></h1>"
);
mustReplace(
  "h1-mobile",
  '<p class="hero-mobile-h">Fort Myers House Cleaning<br><em>Across the City</em></p>',
  '<p class="hero-mobile-h">House Cleaning Services<br>in <em>Fort Myers, Florida</em></p>'
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
    <span>House Cleaning Fort Myers FL</span>
  </div>
</div>`,
  `<div class="breadcrumb">
  <div class="bc-inner">
    <a href="/">Home</a>
    <span class="bc-sep">›</span>
    <a href="/residential-cleaning">Residential Cleaning</a>
    <span class="bc-sep">›</span>
    <span>Fort Myers, FL</span>
  </div>
</div>`
);

mustReplace(
  "marquee-lead",
  "House Cleaning Fort Myers FL",
  "House Cleaning Services in Fort Myers"
);
mustReplace(
  "marquee-maid",
  "Recurring Maid Service Fort Myers",
  "Recurring Residential Cleaning"
);

// Full-frame mobile hero CSS (asset 1679 is already 1400×933)
mustReplace(
  "base-img",
  ".hero-mobile-img{width:100%;height:min(78vw,460px);min-height:300px;max-height:480px;object-fit:cover;object-position:center 20%;display:block;}",
  ".hero-mobile-img{width:100%;height:auto;min-height:0;max-height:none;object-fit:contain;object-position:center center;display:block;}"
);

html = html.replace(
  'alt="Sparklean luxury home cleaning Fort Myers FL" width="1400" height="900"',
  'alt="House cleaning services in Fort Myers, Florida" width="1400" height="933"'
);

if (!html.includes('id="fort-myers-mobile-photo-fit"')) {
  const photoFit = `<style id="fort-myers-mobile-photo-fit">
/* Mobile: same full-frame fit as homepage / Naples / Estero (1400×933). */
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
    aspect-ratio: 1400 / 933 !important;
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
      h1: html.includes("House Cleaning Services<br>in <em>Fort Myers, Florida</em>"),
      photoFit: html.includes("fort-myers-mobile-photo-fit"),
      contain: html.includes("object-fit:contain;object-position:center center"),
      cityKept: html.includes("Gulf Harbour") && html.includes("Heritage Palms"),
    },
    null,
    2
  )
);
