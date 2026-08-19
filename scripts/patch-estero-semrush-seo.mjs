/**
 * Apply Naples Semrush city-ownership SEO pattern to Estero.
 * Keeps Estero golf-community angle; does not copy Naples/Bonita body copy.
 */
import fs from "node:fs";

const path = "pages/house-cleaning-estero.html";
let html = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const title = "House Cleaning Services in Estero, Florida | Sparklean";
const desc =
  "House cleaning services in Estero, Florida — West Bay Club, Grandezza, The Brooks, Pelican Sound, and golf communities. Supervised teams, bonded and insured. Call (239) 888-3588.";
const ogDesc =
  "House cleaning services in Estero, Florida — West Bay, Grandezza, The Brooks, Pelican Sound & golf communities. Bonded, insured, Workers' Comp. Supervised Sparklean teams.";
const twDesc =
  "House cleaning services in Estero, Florida — West Bay, Grandezza, The Brooks, Pelican Sound & more. Bonded, insured, supervised. (239) 888-3588.";
const ownership = "House Cleaning Services in Estero, Florida";
const citySlug = "house-cleaning-estero";
const cityLabel = "Estero, FL";

function mustReplace(label, from, to) {
  if (!html.includes(from)) {
    throw new Error(`MISSING (${label}): ${from.slice(0, 160)}`);
  }
  html = html.split(from).join(to);
}

mustReplace("title", "<title>House Cleaning Estero FL | Sparklean Cleaning</title>", `<title>${title}</title>`);
mustReplace(
  "meta-desc",
  '<meta name="description" content="House cleaning for Estero golf and master-planned communities. Supervised teams from a registered Florida operating company that is bonded and insured. Request a tailored quote.">',
  `<meta name="description" content="${desc.replace(/&/g, "&amp;")}">`
);
mustReplace(
  "og-title",
  '<meta property="og:title" content="House Cleaning Estero FL | Sparklean Cleaning">',
  `<meta property="og:title" content="${title}">`
);
mustReplace(
  "og-desc",
  '<meta property="og:description" content="Refined house cleaning for Estero golf communities, with supervised crews and a registered Florida operating company — bonded and insured — behind every visit.">',
  `<meta property="og:description" content="${ogDesc.replace(/&/g, "&amp;")}">`
);
mustReplace(
  "tw-title",
  '<meta name="twitter:title" content="House Cleaning Estero FL | Sparklean Cleaning">',
  `<meta name="twitter:title" content="${title}">`
);
mustReplace(
  "tw-desc",
  `<meta name="twitter:description" content="Consistent, supervised house cleaning for West Bay, Grandezza, The Brooks, Pelican Sound and Estero's private communities.">`,
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
  "<span>Luxury Cleaning · Estero, Florida</span>",
  "<span>House Cleaning · Estero, Florida</span>"
);
mustReplace(
  "hero-tag-mobile",
  "<span>Luxury Cleaning · Estero, FL</span>",
  "<span>House Cleaning · Estero, Florida</span>"
);
mustReplace(
  "h1",
  "<h1>Estero House Cleaning<br>for <em>Golf Communities</em></h1>",
  "<h1>House Cleaning Services<br>in <em>Estero, Florida</em></h1>"
);
mustReplace(
  "h1-mobile",
  '<p class="hero-mobile-h">Estero House Cleaning<br>for <em>Golf Communities</em></p>',
  '<p class="hero-mobile-h">House Cleaning Services<br>in <em>Estero, Florida</em></p>'
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
    <span>House Cleaning Estero FL</span>
  </div>
</div>`,
  `<div class="breadcrumb">
  <div class="bc-inner">
    <a href="/">Home</a>
    <span class="bc-sep">›</span>
    <a href="/residential-cleaning">Residential Cleaning</a>
    <span class="bc-sep">›</span>
    <span>Estero, FL</span>
  </div>
</div>`
);

mustReplace(
  "marquee-lead",
  "House Cleaning Estero FL",
  "House Cleaning Services in Estero"
);
mustReplace(
  "marquee-maid",
  "Recurring Maid Service Estero",
  "Recurring Residential Cleaning"
);

if (!html.includes('id="estero-mobile-photo-fit"')) {
  const photoFit = `<style id="estero-mobile-photo-fit">
/* Mobile only: same full-frame photo fit as homepage / Naples / Bonita. */
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
      h1: html.includes("House Cleaning Services<br>in <em>Estero, Florida</em>"),
      photoFit: html.includes("estero-mobile-photo-fit"),
      golfKept: html.includes("West Bay") && html.includes("Grandezza"),
    },
    null,
    2
  )
);
