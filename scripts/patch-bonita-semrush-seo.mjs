/**
 * Apply Naples Semrush city-ownership SEO pattern to Bonita Springs.
 * Keeps Bonita home-base communities; does not copy Naples estate copy.
 */
import fs from "node:fs";

const path = "pages/house-cleaning-bonita-springs.html";
let html = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const title = "House Cleaning Services in Bonita Springs, Florida | Sparklean";
const desc =
  "House cleaning services in Bonita Springs, Florida — Bonita Bay, Barefoot Beach, Pelican Landing, and gated communities. Supervised teams, bonded and insured. Call (239) 888-3588.";
const ogDesc =
  "House cleaning services in Bonita Springs, Florida — Bonita Bay, Barefoot Beach, Pelican Landing & gated communities. Bonded, insured, Workers' Comp. Supervised Sparklean teams.";
const twDesc =
  "House cleaning services in Bonita Springs, Florida — Bonita Bay, Barefoot Beach, Pelican Landing & more. Bonded, insured, supervised. (239) 888-3588.";
const ownership = "House Cleaning Services in Bonita Springs, Florida";

function mustReplace(label, from, to) {
  if (!html.includes(from)) {
    throw new Error(`MISSING (${label}): ${from.slice(0, 160)}`);
  }
  html = html.split(from).join(to);
}

// —— Head / social ——
mustReplace("title", "<title>House Cleaning Bonita Springs FL | Sparklean Cleaning</title>", `<title>${title}</title>`);
mustReplace(
  "meta-desc",
  '<meta name="description" content="House cleaning in Bonita Springs for Bonita Bay, Barefoot Beach, Pelican Landing &amp; gated communities. Bonded, insured, supervised teams. Call (239) 888-3588.">',
  `<meta name="description" content="${desc.replace(/&/g, "&amp;")}">`
);
mustReplace(
  "og-title",
  '<meta property="og:title" content="House Cleaning Bonita Springs FL | Sparklean Cleaning">',
  `<meta property="og:title" content="${title}">`
);
mustReplace(
  "og-desc",
  '<meta property="og:description" content="Residential house cleaning in Bonita Springs — Bonita Bay, Barefoot Beach, Pelican Landing &amp; gated communities. Bonded, insured, Workers\' Comp. Supervised Sparklean teams.">',
  `<meta property="og:description" content="${ogDesc.replace(/&/g, "&amp;")}">`
);
mustReplace(
  "tw-title",
  '<meta name="twitter:title" content="House Cleaning Bonita Springs FL | Sparklean Cleaning">',
  `<meta name="twitter:title" content="${title}">`
);
mustReplace(
  "tw-desc",
  '<meta name="twitter:description" content="House cleaning in Bonita Springs — Bonita Bay, Barefoot Beach, Pelican Landing &amp; more. Bonded, insured, supervised. (239) 888-3588.">',
  `<meta name="twitter:description" content="${twDesc.replace(/&/g, "&amp;")}">`
);

// —— Schema JSON-LD ——
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
  if (t === "Service" && node["@id"]?.includes("house-cleaning-bonita-springs")) {
    node.name = ownership;
    node.description = desc;
  }
  if (t === "BreadcrumbList") {
    node.itemListElement = [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.sparklean.co/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Residential Cleaning",
        item: "https://www.sparklean.co/residential-cleaning",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Bonita Springs, FL",
        item: "https://www.sparklean.co/house-cleaning-bonita-springs",
      },
    ];
  }
}
html = html.replace(
  ldMatch[0],
  `<script type="application/ld+json">\n${JSON.stringify(graphDoc)}\n</script>`
);

// —— Hero ——
mustReplace(
  "hero-tag",
  "<span>Luxury Cleaning · Bonita Springs, Florida</span>",
  "<span>House Cleaning · Bonita Springs, Florida</span>"
);
mustReplace(
  "hero-tag-mobile",
  "<span>Luxury Cleaning · Bonita Springs, FL</span>",
  "<span>House Cleaning · Bonita Springs, Florida</span>"
);
mustReplace(
  "h1",
  "<h1>Bonita Springs<br><em>House Cleaning</em><br>You Can Trust</h1>",
  "<h1>House Cleaning Services<br>in <em>Bonita Springs, Florida</em></h1>"
);
mustReplace(
  "h1-mobile",
  '<p class="hero-mobile-h">Bonita Springs<br><em>House Cleaning</em><br>You Can Trust</p>',
  '<p class="hero-mobile-h">House Cleaning Services<br>in <em>Bonita Springs, Florida</em></p>'
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
mustReplace(
  "intro-cta",
  "Begin recurring residential care →",
  "Build My Cleaning Plan"
);

// —— Breadcrumb HTML ——
mustReplace(
  "breadcrumb",
  `<div class="breadcrumb">
  <div class="bc-inner">
    <a href="/">Home</a><span class="bc-sep">/</span>
    <a href="/residential-cleaning">Service Areas</a><span class="bc-sep">/</span>
    <span>House Cleaning Bonita Springs FL</span>
  </div>
</div>`,
  `<div class="breadcrumb">
  <div class="bc-inner">
    <a href="/">Home</a>
    <span class="bc-sep">›</span>
    <a href="/residential-cleaning">Residential Cleaning</a>
    <span class="bc-sep">›</span>
    <span>Bonita Springs, FL</span>
  </div>
</div>`
);

// —— Marquee ——
mustReplace(
  "marquee-lead",
  "House Cleaning Bonita Springs FL",
  "House Cleaning Services in Bonita Springs"
);
mustReplace(
  "marquee-maid",
  "Recurring Maid Service Bonita Springs",
  "Recurring Residential Cleaning"
);

// —— Mobile photo fit (match Naples) ——
if (!html.includes('id="bonita-mobile-photo-fit"')) {
  const photoFit = `<style id="bonita-mobile-photo-fit">
/* Mobile only: same full-frame photo fit as homepage / Naples. */
@media (max-width: 767px) {
  .hero-mobile-img,
  .ni-img,
  .pp-img,
  .sb-img {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    aspect-ratio: auto !important;
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
      ownershipInSchema: html.includes(`"name":"${ownership}"`),
      maid: html.includes("Maid Service"),
      begin: html.includes("Begin recurring"),
      buildCount: (html.match(/Build My Cleaning Plan/g) || []).length,
      breadcrumb: html.includes(">Residential Cleaning</a>"),
      h1: html.includes(
        "House Cleaning Services<br>in <em>Bonita Springs, Florida</em>"
      ),
      photoFit: html.includes("bonita-mobile-photo-fit"),
    },
    null,
    2
  )
);
