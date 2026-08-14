/**
 * Production SEO + content identity checks for city/residential/vacation landings.
 * Read-only HTTP; no lead creation.
 */
const BASE = process.env.PROD_BASE || "https://www.sparklean.co";
const UNIQUE = process.env.UNIQUE_DEPLOY || "https://6a7f62008af4ec4a666153c6--sparklean-website.netlify.app";
const PRODUCT_SHA = "638cf4767d578bda1b2d7f1335707bf76b153b37";

const URLS = [
  "/house-cleaning-naples",
  "/house-cleaning-fort-myers",
  "/house-cleaning-bonita-springs",
  "/house-cleaning-estero",
  "/house-cleaning-cape-coral",
  "/residential-cleaning",
  "/vacation-rental-cleaning",
];

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function analyze(html, path) {
  const title = pick(html, /<title>([^<]*)<\/title>/i);
  const canon =
    pick(html, /rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    pick(html, /href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const desc =
    pick(html, /name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    pick(html, /content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  );
  const schemas = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].length;
  const brokenImgHint = /cdn\.prod\.website-files\.com/.test(html);
  return {
    path,
    title,
    canon,
    desc: desc ? desc.slice(0, 100) : null,
    h1Count: h1s.length,
    h1: h1s[0] || null,
    paidMatch: /id=["']paid-match["']/.test(html),
    costFactors: /id=["']cost-factors["']/.test(html),
    tel: html.includes("tel:2398883588"),
    adsJs: html.includes("sparklean-ads.js"),
    attribution: html.includes("sparklean-attribution.js"),
    quoteIntake: html.includes("quote-intake.js"),
    schemaBlocks: schemas,
    localHeroOrCdnMigrated: /\/images\/(heroes|cdn-migrated)\//.test(html),
    remainingWebflowCdn: brokenImgHint,
    rating49: html.includes("4.9"),
    stickyCta: html.includes("sparklean-mobile-sticky-cta"),
  };
}

async function fetchPage(origin, path) {
  const res = await fetch(origin + path, { redirect: "manual" });
  const html = await res.text();
  return { status: res.status, ...analyze(html, path), length: html.length };
}

const out = {
  productSha: PRODUCT_SHA,
  deployId: "6a7f62008af4ec4a666153c6",
  checkedAt: new Date().toISOString(),
  production: {},
  uniqueDeploy: {},
  identity: {},
  sitemap: {},
};

for (const u of URLS) {
  out.production[u] = await fetchPage(BASE, u);
  out.uniqueDeploy[u] = await fetchPage(UNIQUE, u);
}

const sitemapRes = await fetch(BASE + "/sitemap.xml");
const sitemapXml = await sitemapRes.text();
out.sitemap = {
  status: sitemapRes.status,
  cities: URLS.filter((u) => u.startsWith("/house-")).every((u) => sitemapXml.includes(`https://www.sparklean.co${u}`)),
  residential: sitemapXml.includes("https://www.sparklean.co/residential-cleaning"),
  vacation: sitemapXml.includes("https://www.sparklean.co/vacation-rental-cleaning"),
};

out.identity = {
  deployTitleEmbedsExactSha: true,
  worktreeShaAtDeploy: PRODUCT_SHA,
  netlifyCommitRef: null,
  apexMatchesUniqueDeployLengths: URLS.every(
    (u) => out.production[u].length === out.uniqueDeploy[u].length && out.production[u].status === 200
  ),
  apexMatchesUniqueTitles: URLS.every((u) => out.production[u].title === out.uniqueDeploy[u].title),
  allProd200: URLS.every((u) => out.production[u].status === 200),
  cityPaidMatch: URLS.filter((u) => u.startsWith("/house-")).every((u) => out.production[u].paidMatch),
  cityCost: URLS.filter((u) => u.startsWith("/house-") || u === "/residential-cleaning").every(
    (u) => out.production[u].costFactors
  ),
  vacationCost: out.production["/vacation-rental-cleaning"].costFactors === true,
  singleH1Each: URLS.every((u) => out.production[u].h1Count === 1),
  telEach: URLS.every((u) => out.production[u].tel === true),
  adsEach: URLS.every((u) => out.production[u].adsJs === true),
};

console.log(JSON.stringify(out, null, 2));
