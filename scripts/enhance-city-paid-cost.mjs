/**
 * Enhance city + residential pages for paid-search match + cost-intent sections.
 * Also: Naples 5★→4.9★, mobile H1→styled p, weekly/biweekly + uniformed gaps.
 */
import fs from "fs";
import path from "path";

const CITIES = [
  {
    file: "pages/house-cleaning-naples.html",
    city: "Naples",
    cityShort: "Naples",
  },
  {
    file: "pages/house-cleaning-bonita-springs.html",
    city: "Bonita Springs",
    cityShort: "Bonita Springs",
  },
  {
    file: "pages/house-cleaning-estero.html",
    city: "Estero",
    cityShort: "Estero",
  },
  {
    file: "pages/house-cleaning-fort-myers.html",
    city: "Fort Myers",
    cityShort: "Fort Myers",
  },
  {
    file: "pages/house-cleaning-cape-coral.html",
    city: "Cape Coral",
    cityShort: "Cape Coral",
  },
];

const CSS = `
/* Paid-search message match + cost factors (Phase 1 local SEO) */
.paid-match{background:linear-gradient(180deg,rgba(184,164,122,.12),rgba(14,14,14,0));border-bottom:1px solid rgba(184,164,122,.18);padding:28px 80px 32px;}
.paid-match-inner{max-width:1100px;margin:0 auto;}
.paid-match-kicker{font-family:var(--serif);font-size:clamp(1.15rem,2.4vw,1.55rem);color:var(--white);margin-bottom:14px;line-height:1.25;}
.paid-match-kicker em{font-style:italic;color:var(--gold);}
.paid-match-list{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px 18px;margin:0 0 18px;}
.paid-match-list li{font-size:.72rem;letter-spacing:.04em;color:var(--w70);display:flex;gap:8px;align-items:flex-start;line-height:1.45;}
.paid-match-list li::before{content:"✦";color:var(--gold);flex-shrink:0;margin-top:1px;}
.paid-match-ctas{display:flex;flex-wrap:wrap;gap:12px;}
.cost-factors{padding:88px 80px;background:var(--dark2);}
.cost-factors-inner{max-width:920px;margin:0 auto;}
.cost-factors .sec-h{margin-bottom:12px;}
.cost-factors-lead{font-family:var(--serif);font-size:.98rem;line-height:1.85;color:var(--w70);margin:0 0 28px;}
.cost-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:28px;}
.cost-card{border:1px solid rgba(184,164,122,.14);background:rgba(14,14,14,.45);padding:18px 16px;}
.cost-card strong{display:block;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-bottom:6px;}
.cost-card span{font-size:.78rem;color:var(--w70);line-height:1.55;display:block;}
.hero-mobile-body .hero-mobile-h{font-family:var(--serif);font-size:2rem;font-weight:400;line-height:1.12;margin-bottom:14px;color:var(--white);}
.hero-mobile-body .hero-mobile-h em{font-style:italic;color:var(--gold);}
@media(max-width:900px){
  .paid-match{padding:22px 20px 26px;}
  .cost-factors{padding:64px 20px;}
  .paid-match-ctas{flex-direction:column;align-items:stretch;}
  .paid-match-ctas .btn-gold,.paid-match-ctas .btn-outline{justify-content:center;text-align:center;}
}
`;

function paidMatch(city) {
  return `
<!-- PAID-SEARCH MESSAGE MATCH -->
<section class="paid-match" id="paid-match" aria-label="House cleaning in ${city}">
  <div class="paid-match-inner">
    <p class="paid-match-kicker">Looking for <em>house cleaning in ${city}</em>?</p>
    <ul class="paid-match-list">
      <li>House cleaning in ${city} — local teams who know the area</li>
      <li>Weekly and biweekly recurring service available</li>
      <li>Uniformed, supervised cleaning teams</li>
      <li>Bonded and insured (with Workers' Comp)</li>
      <li>24-hour satisfaction guarantee</li>
    </ul>
    <div class="paid-match-ctas">
      <a href="tel:2398883588" class="btn-gold">Call (239) 888-3588</a>
      <a href="/contact" class="btn-outline" data-sparklean-intake-preset="recurringResidential">Request a personalized recurring-cleaning quote</a>
    </div>
  </div>
</section>
`;
}

function costSection(city) {
  return `
<!-- PRICE-INTENT SUPPORT -->
<section class="cost-factors" id="cost-factors">
  <div class="cost-factors-inner">
    <div class="eyebrow"><div class="ey-line"></div><span>Pricing clarity</span></div>
    <h2 class="sec-h">What affects the cost of<br><em>house cleaning in ${city}?</em></h2>
    <div class="gold-line"></div>
    <p class="cost-factors-lead">There is no honest one-price answer for every home. Sparklean quotes from the details that actually change the work — then you choose weekly, biweekly, or another recurring rhythm that fits.</p>
    <div class="cost-grid">
      <div class="cost-card"><strong>Home size</strong><span>Square footage and how many bathrooms drive time on site.</span></div>
      <div class="cost-card"><strong>Cleaning frequency</strong><span>Weekly and biweekly visits usually cost less per visit than rare deep resets.</span></div>
      <div class="cost-card"><strong>Current condition</strong><span>First cleans and neglected areas may need extra detail before recurring care begins.</span></div>
      <div class="cost-card"><strong>Occupancy &amp; pets</strong><span>Busy households and pets change hair, floors, and high-touch surfaces.</span></div>
      <div class="cost-card"><strong>Rooms &amp; scope</strong><span>Add-ons like ovens, insides of cabinets, or windows change the plan.</span></div>
      <div class="cost-card"><strong>Special instructions</strong><span>Gate codes, preferred products, and fragile finishes are built into your quote.</span></div>
    </div>
    <a href="/contact" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Request a personalized recurring-cleaning quote →</a>
  </div>
</section>
`;
}

function injectCss(html) {
  if (html.includes(".paid-match{")) return html;
  if (html.includes("</style>")) {
    return html.replace("</style>", `${CSS}\n</style>`);
  }
  return html;
}

function enhanceCity(cfg) {
  let html = fs.readFileSync(cfg.file, "utf8");
  let changes = [];

  html = injectCss(html);

  // Naples hero rating fix
  if (cfg.city === "Naples" && html.includes(">5★<")) {
    html = html.replace(/>5★</g, ">4.9★<");
    changes.push("5star→4.9");
  }

  // Mobile H1 → styled paragraph (keep one document H1 in desktop hero)
  if (html.includes("hero-mobile-body") && /<div class="hero-mobile-body">[\s\S]*?<h1>/.test(html)) {
    html = html.replace(
      /(<div class="hero-mobile-body">[\s\S]*?)<h1>([\s\S]*?)<\/h1>/,
      "$1<p class=\"hero-mobile-h\">$2</p>"
    );
    changes.push("mobile-h1→p");
  }

  // Paid match strip after trust bar
  if (!html.includes('id="paid-match"')) {
    if (html.includes("<!-- MARQUEE -->")) {
      html = html.replace("<!-- MARQUEE -->", `${paidMatch(cfg.city)}\n<!-- MARQUEE -->`);
      changes.push("paid-match");
    } else if (html.includes('<div class="marquee">')) {
      html = html.replace('<div class="marquee">', `${paidMatch(cfg.city)}\n<div class="marquee">`);
      changes.push("paid-match");
    }
  }

  // Cost section before FAQ
  if (!html.includes('id="cost-factors"')) {
    if (html.includes('<section class="faq"')) {
      html = html.replace('<section class="faq"', `${costSection(cfg.city)}\n<section class="faq"`);
      changes.push("cost-factors");
    } else if (html.includes('class="faq"')) {
      html = html.replace(/<section class="faq"/, `${costSection(cfg.city)}\n<section class="faq"`);
      changes.push("cost-factors");
    }
  }

  // Fort Myers / Cape Coral — surface weekly/biweekly on recurring card if only "Recurring"
  if (cfg.city === "Fort Myers" || cfg.city === "Cape Coral") {
    if (
      html.includes("Recurring Cleaning") &&
      !html.includes("Weekly, bi-weekly, or monthly")
    ) {
      html = html.replace(
        /(<div class="ss-title">Recurring Cleaning<\/div>\s*<p class="ss-desc">)([^<]+)/,
        `$1Weekly, bi-weekly, or monthly care for ${cfg.city} homes — supervised teams so the standard stays consistent between visits.`
      );
      changes.push("weekly-biweekly-card");
    }
  }

  // Uniformed language for pages missing it
  if (!/uniformed/i.test(html)) {
    html = html.replace(
      /supervised teams/i,
      "uniformed, supervised teams"
    );
    if (/uniformed/i.test(html)) changes.push("uniformed");
  }

  // Mobile hero: ensure Call CTA visible early (add call outline if missing in mobile hero-btns)
  if (
    html.includes("hero-mobile-body") &&
    !/hero-mobile-body[\s\S]{0,800}tel:2398883588/.test(html)
  ) {
    html = html.replace(
      /(<div class="hero-mobile-body">[\s\S]*?<div class="hero-btns">\s*)(<a href="\/contact"[^>]*>)/,
      `$1<a href="tel:2398883588" class="btn-outline">Call (239) 888-3588</a>\n      $2`
    );
    changes.push("mobile-call-cta");
  }

  fs.writeFileSync(cfg.file, html);
  return changes;
}

function enhanceResidential() {
  const file = "pages/residential-cleaning.html";
  let html = fs.readFileSync(file, "utf8");
  const changes = [];
  html = injectCss(html);
  if (!html.includes('id="paid-match"')) {
    // After trust if present, else after hero-mobile
    if (html.includes('<div class="trust">')) {
      html = html.replace(
        /(<div class="trust">[\s\S]*?<\/div>\s*<\/div>\s*)/,
        `$1${paidMatch("Southwest Florida")}`
      );
      changes.push("paid-match");
    }
  }
  if (!html.includes('id="cost-factors"')) {
    if (html.includes('<section class="faq"') || html.includes('id="faq"')) {
      const marker = html.includes('<section class="faq"')
        ? '<section class="faq"'
        : html.match(/<section[^>]*id="faq"[^>]*>/)?.[0];
      if (marker) {
        html = html.replace(marker, `${costSection("Southwest Florida")}\n${marker}`);
        changes.push("cost-factors");
      }
    } else if (html.includes('<section class="tiers"')) {
      // insert before tiers end / before a late section
      html = html.replace(
        /(<section class="cta"|<footer)/,
        `${costSection("Southwest Florida")}\n$1`
      );
      changes.push("cost-factors-fallback");
    }
  }
  fs.writeFileSync(file, html);
  return changes;
}

const report = {};
for (const c of CITIES) {
  report[c.file] = enhanceCity(c);
}
report["pages/residential-cleaning.html"] = enhanceResidential();
console.log(JSON.stringify(report, null, 2));
