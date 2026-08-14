/**
 * Redesign paid-match + local coverage on all 5 city house-cleaning pages.
 * Bounded visual/copy fix — preserves #paid-match, H1, schema, conversion hooks.
 */
import fs from "fs";

const CSS = `/* Paid-match + local coverage — premium two-column (city LPs) */
.paid-match{padding:80px 40px;background:var(--dark3);border-bottom:1px solid rgba(201,168,76,.07);}
.paid-match-inner{max-width:1180px;margin:0 auto;}
.paid-match-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px 56px;align-items:center;}
.paid-match .eyebrow{margin-bottom:18px;}
.paid-match-h{font-family:var(--serif);font-size:clamp(2rem,3.2vw,3.1rem);font-weight:400;line-height:1.15;color:var(--white);margin:0 0 18px;max-width:22ch;}
.paid-match-h em{font-style:italic;color:var(--gold);}
.paid-match-body{font-size:1rem;line-height:1.7;color:var(--w70);margin:0 0 28px;max-width:38rem;}
.paid-match-ctas{display:flex;flex-wrap:wrap;gap:14px;}
.paid-match-ctas .btn-gold,.paid-match-ctas .btn-outline{font-size:.72rem;letter-spacing:.14em;padding:18px 28px;min-height:52px;box-sizing:border-box;}
.paid-match-trust{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.pm-card{border:1px solid rgba(201,168,76,.28);background:rgba(14,14,14,.35);padding:22px 20px;min-height:108px;display:flex;flex-direction:column;gap:10px;justify-content:center;}
.pm-card-mark{width:18px;height:1px;background:var(--gold);display:block;}
.pm-card-title{font-family:var(--serif);font-size:1.05rem;line-height:1.35;color:var(--white);font-weight:400;margin:0;}
.pm-card-sub{font-size:.88rem;line-height:1.5;color:var(--w70);margin:0;}
.local-xp{padding:80px 40px;background:var(--dark);border-bottom:1px solid rgba(201,168,76,.07);}
.local-xp-inner{max-width:1180px;margin:0 auto;}
.local-xp .eyebrow{margin-bottom:18px;}
.local-xp-h{font-family:var(--serif);font-size:clamp(2rem,3.2vw,3.1rem);font-weight:400;line-height:1.15;color:var(--white);margin:0 0 22px;max-width:28ch;}
.local-xp-h em{font-style:italic;color:var(--gold);}
.local-xp-copy{max-width:46rem;}
.local-xp-copy p{font-size:1rem;line-height:1.75;color:var(--w70);margin:0 0 16px;}
.local-xp-links{display:flex;flex-wrap:wrap;gap:12px 18px;margin-top:28px;padding-top:28px;border-top:1px solid rgba(201,168,76,.12);}
.local-xp-links a{font-size:.78rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-lt);text-decoration:none;border-bottom:1px solid rgba(201,168,76,.35);padding-bottom:3px;transition:color .2s,border-color .2s;}
.local-xp-links a:hover{color:var(--gold);border-color:var(--gold);}
.city-guides{padding:48px 40px 56px;background:var(--dark3);border-bottom:1px solid rgba(201,168,76,.07);}
.city-guides-inner{max-width:1180px;margin:0 auto;}
.city-guides .eyebrow{margin-bottom:16px;}
.city-guides-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.city-guides-card{display:block;border:1px solid rgba(201,168,76,.22);padding:22px 20px;text-decoration:none;color:inherit;transition:border-color .2s,background .2s;}
.city-guides-card:hover{border-color:rgba(201,168,76,.5);background:rgba(201,168,76,.04);}
.city-guides-card span{display:block;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;}
.city-guides-card strong{display:block;font-family:var(--serif);font-size:1.05rem;font-weight:400;line-height:1.35;color:var(--white);}
@media(max-width:960px){
  .paid-match,.local-xp{padding:64px 24px;}
  .paid-match-grid{grid-template-columns:1fr;gap:36px;}
  .paid-match-h,.local-xp-h{font-size:clamp(2rem,6vw,2.35rem);max-width:none;}
  .paid-match-ctas{flex-direction:column;align-items:stretch;}
  .paid-match-ctas .btn-gold,.paid-match-ctas .btn-outline{justify-content:center;text-align:center;width:100%;}
  .city-guides{padding:40px 24px 48px;}
  .city-guides-grid{grid-template-columns:1fr;}
}
@media(max-width:560px){
  .paid-match-trust{grid-template-columns:1fr;}
  .pm-card{min-height:0;}
}
`;

const CITIES = {
  naples: {
    file: "pages/house-cleaning-naples.html",
    city: "Naples",
    eyebrow: "House cleaning in Naples",
    localEyebrow: "Local Naples experience",
    headline: "Cleaning designed around how Naples homes are actually lived in.",
    p1: "From full-time residences and waterfront homes to seasonal properties and condominiums, Sparklean provides professionally supervised cleaning throughout Naples. Service is coordinated around property access, household preferences and the recurring schedule selected by each client.",
    p2: "Our Naples service area includes Port Royal, Pelican Bay, Park Shore, Old Naples, The Moorings, Aqualane Shores, Bay Colony, Coquina Sands, North Naples and East Naples.",
    commercialLabel: "Commercial Cleaning in Naples",
    guides: [
      {
        href: "/blog/naples-house-cleaning-when-to-hire-a-pro",
        label: "Guide",
        title: "When to hire a house cleaning pro in Naples",
      },
      {
        href: "/blog/naples-post-construction-cleaning-before-move-in",
        label: "Guide",
        title: "Post-construction cleaning before move-in",
      },
      {
        href: "/blog/naples-office-cleaning-medical-law-firms",
        label: "Guide",
        title: "Office & medical cleaning in Naples",
      },
    ],
  },
  "bonita-springs": {
    file: "pages/house-cleaning-bonita-springs.html",
    city: "Bonita Springs",
    eyebrow: "House cleaning in Bonita Springs",
    localEyebrow: "Local Bonita Springs experience",
    headline: "Cleaning designed around how Bonita Springs homes are actually lived in.",
    p1: "From golf-community residences and beachside homes to seasonal properties inland, Sparklean provides professionally supervised cleaning throughout Bonita Springs — our home market. Service is coordinated around property access, household preferences and the recurring schedule selected by each client.",
    p2: "Our Bonita Springs service area includes Bonita Bay, The Colony, Barefoot Beach, Pelican Landing, Spanish Wells and Shadow Wood.",
    commercialLabel: "Commercial Cleaning in Bonita Springs",
    guides: [
      {
        href: "/blog/bonita-springs-house-cleaning-when-to-hire-a-pro",
        label: "Guide",
        title: "When to hire a house cleaning pro in Bonita Springs",
      },
      {
        href: "/blog/bonita-springs-post-construction-cleaning-remodel-new-build",
        label: "Guide",
        title: "Post-construction for remodels & new builds",
      },
      {
        href: "/blog",
        label: "Knowledge Center",
        title: "Browse all Sparklean guides",
      },
    ],
  },
  estero: {
    file: "pages/house-cleaning-estero.html",
    city: "Estero",
    eyebrow: "House cleaning in Estero",
    localEyebrow: "Local Estero experience",
    headline: "Cleaning designed around how Estero homes are actually lived in.",
    p1: "From gated golf residences and clubhouse communities to season-ready homes along the corridor, Sparklean provides professionally supervised cleaning throughout Estero. Service is coordinated around gate access, household preferences and the recurring schedule selected by each client.",
    p2: "Our Estero service area includes West Bay Club, Grandezza, The Brooks, Pelican Sound and the Corkscrew communities.",
    commercialLabel: "Commercial Cleaning in Estero",
    guides: [
      {
        href: "/blog/estero-house-cleaning-when-to-hire-a-pro",
        label: "Guide",
        title: "When to hire a house cleaning pro in Estero",
      },
      {
        href: "/blog/estero-residential-move-out-deep-cleaning",
        label: "Guide",
        title: "Move-out and deep cleaning in Estero",
      },
      {
        href: "/blog",
        label: "Knowledge Center",
        title: "Browse all Sparklean guides",
      },
    ],
  },
  "fort-myers": {
    file: "pages/house-cleaning-fort-myers.html",
    city: "Fort Myers",
    eyebrow: "House cleaning in Fort Myers",
    localEyebrow: "Local Fort Myers experience",
    headline: "Cleaning designed around how Fort Myers homes are actually lived in.",
    p1: "From yacht-club residences and golf communities to historic McGregor corridors and newer Gateway neighborhoods, Sparklean provides professionally supervised cleaning throughout Fort Myers. Service is coordinated around property access, household preferences and the recurring schedule selected by each client.",
    p2: "Our Fort Myers service area includes Gulf Harbour, Crown Colony, Heritage Palms, Colonial, McGregor and Gateway.",
    commercialLabel: "Commercial Cleaning in Fort Myers",
    guides: [
      {
        href: "/blog/fort-myers-house-cleaning-when-to-hire-a-pro",
        label: "Guide",
        title: "When to hire a house cleaning pro in Fort Myers",
      },
      {
        href: "/blog/fort-myers-commercial-office-cleaning",
        label: "Guide",
        title: "Commercial office cleaning in Fort Myers",
      },
      {
        href: "/blog",
        label: "Knowledge Center",
        title: "Browse all Sparklean guides",
      },
    ],
  },
  "cape-coral": {
    file: "pages/house-cleaning-cape-coral.html",
    city: "Cape Coral",
    eyebrow: "House cleaning in Cape Coral",
    localEyebrow: "Local Cape Coral experience",
    headline: "Cleaning designed around how Cape Coral homes are actually lived in.",
    p1: "From canal-front residences and open lanais to seasonal waterfront properties, Sparklean provides professionally supervised cleaning throughout Cape Coral. Service is coordinated around property access, household preferences and the recurring schedule selected by each client.",
    p2: "Our Cape Coral service area includes Cape Harbour, Tarpon Point, The Hermitage, Sandoval, Cape Royal and Coral Lakes.",
    commercialLabel: "Commercial Cleaning in Cape Coral",
    guides: [
      {
        href: "/blog/cape-coral-house-cleaning-when-to-hire-a-pro",
        label: "Guide",
        title: "When to hire a house cleaning pro in Cape Coral",
      },
      {
        href: "/blog/cape-coral-post-construction-cleaning-remodel-new-build",
        label: "Guide",
        title: "Post-construction for remodels & new builds",
      },
      {
        href: "/blog",
        label: "Knowledge Center",
        title: "Browse all Sparklean guides",
      },
    ],
  },
};

function htmlFor(cfg) {
  const guides = cfg.guides
    .map(
      (g) => `      <a class="city-guides-card" href="${g.href}"><span>${g.label}</span><strong>${g.title}</strong></a>`
    )
    .join("\n");

  return `<!-- PAID-SEARCH MESSAGE MATCH -->
<section class="paid-match" id="paid-match" aria-label="House cleaning in ${cfg.city}">
  <div class="paid-match-inner">
    <div class="paid-match-grid">
      <div class="paid-match-copy">
        <div class="eyebrow"><div class="ey-line"></div><span>${cfg.eyebrow}</span></div>
        <h2 class="paid-match-h">A professionally managed clean—<em>without the uncertainty.</em></h2>
        <p class="paid-match-body">Sparklean provides recurring house cleaning throughout ${cfg.city} with uniformed teams, active supervision and consistent standards. Choose weekly, biweekly or monthly service built around your home.</p>
        <div class="paid-match-ctas">
          <a href="/contact" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Get My Cleaning Plan</a>
          <a href="tel:2398883588" class="btn-outline">Call (239) 888-3588</a>
        </div>
      </div>
      <div class="paid-match-trust" aria-label="Why homeowners choose Sparklean">
        <div class="pm-card"><span class="pm-card-mark" aria-hidden="true"></span><p class="pm-card-title">Uniformed, supervised teams</p><p class="pm-card-sub">Direct employees — not a gig marketplace</p></div>
        <div class="pm-card"><span class="pm-card-mark" aria-hidden="true"></span><p class="pm-card-title">Bonded and insured</p><p class="pm-card-sub">Including Workers&apos; Comp coverage</p></div>
        <div class="pm-card"><span class="pm-card-mark" aria-hidden="true"></span><p class="pm-card-title">Weekly, biweekly &amp; monthly</p><p class="pm-card-sub">Recurring plans sized to your home</p></div>
        <div class="pm-card"><span class="pm-card-mark" aria-hidden="true"></span><p class="pm-card-title">24-hour satisfaction guarantee</p><p class="pm-card-sub">We make it right — quickly</p></div>
      </div>
    </div>
  </div>
</section>

<section class="local-xp" id="local-coverage" aria-label="Local ${cfg.city} experience">
  <div class="local-xp-inner">
    <div class="eyebrow"><div class="ey-line"></div><span>${cfg.localEyebrow}</span></div>
    <h2 class="local-xp-h">${cfg.headline}</h2>
    <div class="local-xp-copy">
      <p>${cfg.p1}</p>
      <p>${cfg.p2}</p>
    </div>
    <div class="local-xp-links">
      <a href="/residential-cleaning">Explore Residential Cleaning</a>
      <a href="/commercial-cleaning">${cfg.commercialLabel}</a>
      <a href="/post-construction-cleaning">Post-Construction Cleaning</a>
    </div>
  </div>
</section>

<section class="city-guides" aria-label="Related guides">
  <div class="city-guides-inner">
    <div class="eyebrow"><div class="ey-line"></div><span>Related reading</span></div>
    <div class="city-guides-grid">
${guides}
    </div>
  </div>
</section>
`;
}

function patchFile(cfg) {
  let html = fs.readFileSync(cfg.file, "utf8");

  // Remove obsolete city-band CSS rules
  html = html.replace(
    /\/\* SEO CITY BAND \*\/\s*\.city-band\{[^}]+\}[\s\S]*?\.city-band a\{[^}]+\}\n?/g,
    ""
  );
  html = html.replace(/\.city-band\{[^}]+\}\n?/g, "");
  html = html.replace(/\.city-band p\{[^}]+\}\n?/g, "");
  html = html.replace(/\.city-band strong\{[^}]+\}\n?/g, "");
  html = html.replace(/\.city-band a\{[^}]+\}\n?/g, "");
  // Media query refs that only paired breadcrumb with city-band — keep breadcrumb
  html = html.replace(/\.breadcrumb,\.city-band\{/g, ".breadcrumb{");

  // Replace old paid-match CSS block
  const cssRe =
    /\/\* Paid-search message match[\s\S]*?@media\(max-width:900px\)\{[\s\S]*?\}\n?/;
  if (!cssRe.test(html)) {
    throw new Error(`paid-match CSS not found in ${cfg.file}`);
  }
  html = html.replace(cssRe, CSS);

  // Replace paid-match through city-band (and optional marquee between on some pages)
  // Match from PAID-SEARCH comment through end of city-band div, preserving any marquee that sits BETWEEN paid-match and city-band by absorbing it and re-emitting after local sections? 
  // Bonita/Cape/Estero/FM have: paid-match -> marquee -> city-band -> intro
  // Naples has: paid-match -> city-band -> intro (marquee already above breadcrumb)

  const blockRe =
    /<!-- PAID-SEARCH MESSAGE MATCH -->[\s\S]*?<div class="city-band">[\s\S]*?<\/div>\s*/;
  if (!blockRe.test(html)) {
    throw new Error(`paid-match/city-band HTML not found in ${cfg.file}`);
  }

  // Extract marquee if it sits between paid-match and city-band
  const between = html.match(
    /<!-- PAID-SEARCH MESSAGE MATCH -->[\s\S]*?<div class="city-band">/
  )[0];
  const marqueeMatch = between.match(
    /<div class="marquee">[\s\S]*?<\/div><\/div>\s*/
  );
  const marquee = marqueeMatch ? marqueeMatch[0] : "";

  // Keep city marquee (if it sat between paid-match and city-band) between paid-match and local coverage
  const built = htmlFor(cfg);
  const withMarquee = marquee
    ? built.replace(
        "</section>\n\n<section class=\"local-xp\"",
        `</section>\n\n${marquee}<section class="local-xp"`
      )
    : built;
  html = html.replace(blockRe, withMarquee);

  // Fix headline em wrapping — only wrap "homes" once if present
  // Already handled in htmlFor

  fs.writeFileSync(cfg.file, html);
  console.log("OK", cfg.file);
}

for (const cfg of Object.values(CITIES)) {
  patchFile(cfg);
}
console.log("Done.");
