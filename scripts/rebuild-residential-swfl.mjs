/**
 * Rebuild /residential-cleaning to match homepage chrome + SWFL hub SEO.
 * City pages own Naples — this page does not.
 * Run: node scripts/rebuild-residential-swfl.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "pages/residential-cleaning.html");
let html = fs.readFileSync(file, "utf8");

const GBP =
  "https://www.google.com/maps/search/?api=1&query=Sparklean%20Cleaning%2024221%20Bernwood%20Dr%20Suite%202%20Bonita%20Springs%20FL%2034135";

// --- Meta / OG ---
html = html.replace(
  /<title>[\s\S]*?<\/title>/,
  "<title>Residential Cleaning Southwest Florida | Sparklean</title>"
);
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  `<meta name="description" content="Residential cleaning across Southwest Florida — recurring, deep, move-in/out, and white-glove care. Supervised teams serving Naples, Bonita Springs, Estero, Fort Myers & Cape Coral. Call (239) 888-3588.">`
);
html = html.replace(
  /<meta property="og:title" content="[^"]*">/,
  `<meta property="og:title" content="Residential Cleaning Southwest Florida | Sparklean">`
);
html = html.replace(
  /<meta property="og:description" content="[^"]*">/,
  `<meta property="og:description" content="Professionally managed residential cleaning across Southwest Florida. City pages cover local communities — this hub covers recurring, deep, move-in/out, and white-glove care.">`
);
html = html.replace(
  /<meta name="twitter:title" content="[^"]*">/,
  `<meta name="twitter:title" content="Residential Cleaning Southwest Florida | Sparklean">`
);
html = html.replace(
  /<meta name="twitter:description" content="[^"]*">/,
  `<meta name="twitter:description" content="Residential cleaning hub for Southwest Florida — supervised teams, clear communication, dependable recurring care. City pages own local community intent.">`
);

// Schema: WebPage name/description + drop Marco from residential service areaServed arrays (keep five cities)
html = html.replace(
  /"@id":"https:\/\/www\.sparklean\.co\/residential-cleaning#webpage","url":"https:\/\/www\.sparklean\.co\/residential-cleaning","name":"[^"]*","description":"[^"]*"/,
  `"@id":"https://www.sparklean.co/residential-cleaning#webpage","url":"https://www.sparklean.co/residential-cleaning","name":"Residential Cleaning Southwest Florida | Sparklean","description":"Professionally managed residential cleaning across Southwest Florida. Recurring, deep, move-in/move-out, and white-glove care. City pages cover Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral."`
);
html = html.replace(
  /,"@type":"City","name":"Marco Island","containedInPlace":\{"@type":"State","name":"Florida"\}/g,
  ""
);

const extraCss = `
/* Residential hub — homepage-matching hero stack @ ≤1024 */
#residential-hero.hero{align-items:flex-end;}
#residential-hero.hero .hero-bg{background:none;overflow:hidden;}
#residential-hero.hero .hero-bg img{width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block;animation:zoomIn 14s ease-out forwards;}
#residential-hero.hero .hero-guar{font-size:.56rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:28px;opacity:0;animation:up 1s .72s forwards;}
.areas-pills a.pill{text-decoration:none;color:inherit;display:inline-block;}
.areas-pills a.pill:hover{border-color:var(--gold);color:var(--gold);}
.paid-match-cities{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 18px;}
.paid-match-cities a{font-size:.58rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-lt);text-decoration:underline;text-underline-offset:3px;}
@media(max-width:1024px){
#residential-hero.hero{
  display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;
  min-height:0;height:auto;overflow:visible;
}
#residential-hero.hero .hero-bg{
  position:relative;inset:auto;width:100%;
  height:min(52vw,420px);min-height:260px;max-height:440px;flex:0 0 auto;
}
#residential-hero.hero .hero-bg img{object-position:center 18%;animation:none;transform:none;}
#residential-hero.hero .hero-ov{display:none;}
#residential-hero.hero .hero-content{
  position:relative;z-index:2;width:100%;max-width:100%;margin:0;
  padding:40px 28px 56px;background:#11100e;box-sizing:border-box;
}
#residential-hero.hero .hero-tag,#residential-hero.hero h1,#residential-hero.hero .hero-sub,#residential-hero.hero .hero-guar,#residential-hero.hero .hero-btns{
  opacity:1;animation:none;
}
#residential-hero.hero h1{font-size:clamp(1.85rem,4.2vw,2.55rem);}
#residential-hero.hero .hero-btns{flex-direction:column;align-items:stretch;}
#residential-hero.hero .btn-gold,#residential-hero.hero .btn-outline{width:100%;justify-content:center;}
}
@media(max-width:640px){
#residential-hero.hero .hero-bg{height:68vw;min-height:280px;max-height:380px;display:block!important;}
#residential-hero.hero .hero-bg img{object-position:center 14%;}
#residential-hero.hero .hero-content{padding:32px 20px 44px!important;background:#11100e!important;}
#residential-hero.hero h1{font-size:clamp(1.7rem,7vw,2.15rem)!important;}
.hero-mob-img,.hero-mobile-img{display:none!important;}
}
`;

if (!html.includes("#residential-hero.hero")) {
  html = html.replace(
    "@media(max-width:900px){\n  .paid-match{padding:22px 20px 26px;}",
    extraCss + "\n@media(max-width:900px){\n  .paid-match{padding:22px 20px 26px;}"
  );
}

const heroBlock = `<section class="hero" id="residential-hero">
  <div class="hero-bg">
    <img src="/images/heroes/69b21cae1dbe6ede803ef701_1000051474-0fcae9d8-1400.webp" alt="Sparklean supervised residential cleaning team serving homes across Southwest Florida" width="1400" height="900" fetchpriority="high" decoding="async">
  </div>
  <div class="hero-ov"></div>
  <div class="hero-content">
    <div class="hero-tag"><div class="hero-tag-line"></div><span>Residential Cleaning · Southwest Florida</span></div>
    <h1>Residential Cleaning in<br><em>Southwest Florida</em></h1>
    <p class="hero-sub">Recurring, deep, move-in/move-out, and white-glove home care from supervised teams — with city pages for <a href="/house-cleaning-naples" style="color:var(--gold-lt)">Naples</a>, <a href="/house-cleaning-bonita-springs" style="color:var(--gold-lt)">Bonita Springs</a>, <a href="/house-cleaning-estero" style="color:var(--gold-lt)">Estero</a>, <a href="/house-cleaning-fort-myers" style="color:var(--gold-lt)">Fort Myers</a>, and <a href="/house-cleaning-cape-coral" style="color:var(--gold-lt)">Cape Coral</a>.</p>
    <div class="hero-guar">✦ 24-Hour Happiness Guarantee</div>
    <div class="hero-btns">
      <a href="/contact?quote=1&preset=recurringResidential#quote-intake" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Build My Cleaning Plan</a>
      <a href="tel:2398883588" class="btn-outline">Call (239) 888-3588</a>
    </div>
  </div>
</section>`;

html = html.replace(/<section class="hero">[\s\S]*?<\/section>\s*\n\s*<div class="trust">/, heroBlock + "\n\n<section class=\"trust\" id=\"trust\" aria-label=\"Trust and proof\">");

const trustAndPaid = `<div class="trust-inner">
    <a class="trust-item" href="${GBP}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;" data-sparklean-event="google_review_click" data-sparklean-event-type="trust_strip">
      <span class="t-icon">★</span>
      <div><span class="t-title">4.9★ Google Rating</span><span class="t-sub">Live reviews</span></div>
    </a>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Direct Employees</span><span class="t-sub">Our team</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Supervised Teams</span><span class="t-sub">Team-lead oversight</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Bonded &amp; Insured</span><span class="t-sub">Workers’ Comp</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">24-Hour Guarantee</span><span class="t-sub">Happiness protected</span></div></div>
  </div>
</section>

<section class="paid-match" id="paid-match" aria-label="Residential cleaning across Southwest Florida">
  <div class="paid-match-inner">
    <p class="paid-match-kicker">Looking for <em>residential cleaning in Southwest Florida</em>?</p>
    <p class="paid-match-cities">
      <a href="/house-cleaning-naples">Naples</a>
      <a href="/house-cleaning-bonita-springs">Bonita Springs</a>
      <a href="/house-cleaning-estero">Estero</a>
      <a href="/house-cleaning-fort-myers">Fort Myers</a>
      <a href="/house-cleaning-cape-coral">Cape Coral</a>
    </p>
    <ul class="paid-match-list">
      <li>Weekly and biweekly recurring residential plans</li>
      <li>Deep clean and move-in / move-out service</li>
      <li>Supervised teams — direct employees</li>
      <li>Bonded, insured, and Workers’ Comp</li>
      <li>24-hour happiness guarantee</li>
    </ul>
    <div class="paid-match-ctas">
      <a href="tel:2398883588" class="btn-gold">Call (239) 888-3588</a>
      <a href="/contact?quote=1&preset=recurringResidential#quote-intake" class="btn-outline" data-sparklean-intake-preset="recurringResidential">Request a personalized recurring-cleaning quote</a>
    </div>
  </div>
</section>

`;

// Replace from first trust-inner through end of broken trust (before breadcrumb)
html = html.replace(
  /<div class="trust-inner">[\s\S]*?<\/div>\s*\n\s*<\/div>\s*\n\s*<div class="breadcrumb">/,
  trustAndPaid + '<div class="breadcrumb">'
);

// Remove marquee block
html = html.replace(/<div class="marquee">[\s\S]*?<\/div>\s*\n\s*<\/div>\s*\n/, "");

// Areas: five linked cities only
html = html.replace(
  /<div class="areas-pills">[\s\S]*?<\/div>\s*\n\s*<\/section>/,
  `<div class="areas-pills">
<a class="pill" href="/house-cleaning-naples">Naples</a>
<a class="pill" href="/house-cleaning-bonita-springs">Bonita Springs</a>
<a class="pill" href="/house-cleaning-estero">Estero</a>
<a class="pill" href="/house-cleaning-fort-myers">Fort Myers</a>
<a class="pill" href="/house-cleaning-cape-coral">Cape Coral</a>
</div>

</section>`
);

// FAQ service areas — five cities, no Marco as peer
html = html.replace(
  /We provide residential cleaning services in <a href="\/house-cleaning-naples">Naples<\/a>, <a href="\/house-cleaning-fort-myers">Fort Myers<\/a>, <a href="\/house-cleaning-bonita-springs">Bonita Springs<\/a>, <a href="\/house-cleaning-estero">Estero<\/a>, <a href="\/house-cleaning-cape-coral">Cape Coral<\/a>, Marco Island, North Naples, and East Naples FL\./,
  `We provide residential cleaning across Southwest Florida — with dedicated pages for <a href="/house-cleaning-naples">Naples</a>, <a href="/house-cleaning-fort-myers">Fort Myers</a>, <a href="/house-cleaning-bonita-springs">Bonita Springs</a>, <a href="/house-cleaning-estero">Estero</a>, and <a href="/house-cleaning-cape-coral">Cape Coral</a>.`
);

// First FAQ title can stay Naples-cost as long as answer points to quote — soften H if needed
html = html.replace(
  /How much does house cleaning cost in Naples FL\?/,
  "How much does residential house cleaning cost in Southwest Florida?"
);
html = html.replace(
  /Pricing depends on home size, service level, and cleaning frequency\. Sparklean offers recurring maintenance cleaning, deep cleaning, and move-in\/move-out services across Naples and Southwest Florida\./,
  "Pricing depends on home size, service level, and cleaning frequency. Sparklean offers recurring maintenance cleaning, deep cleaning, and move-in/move-out services across Southwest Florida — with city pages for local communities."
);

// Nav CTA label align with homepage
html = html.replace(
  /class="nav-btn" data-sparklean-intake>Get a Quote<\/a>/,
  'class="nav-btn" data-sparklean-intake>Request a Quote</a>'
);
html = html.replace(
  /class="nav-mobile-quote" data-sparklean-intake>Get a Quote<\/a>/,
  'class="nav-mobile-quote" data-sparklean-intake>Request a Quote</a>'
);

fs.writeFileSync(file, html);
console.log("Rebuilt pages/residential-cleaning.html");
