/**
 * Static conversion-preservation checks for city + vacation landing pages.
 * Does NOT create production leads.
 */
import fs from "fs";

const PAGES = [
  "pages/house-cleaning-naples.html",
  "pages/house-cleaning-bonita-springs.html",
  "pages/house-cleaning-estero.html",
  "pages/house-cleaning-fort-myers.html",
  "pages/house-cleaning-cape-coral.html",
  "pages/vacation-rental-cleaning.html",
  "pages/residential-cleaning.html",
];

const REQUIRED = [
  { id: "gtag-aw", re: /AW-17027441328/ },
  { id: "sparklean-ads.js", re: /\/js\/sparklean-ads\.js/ },
  { id: "sparklean-attribution.js", re: /\/js\/sparklean-attribution\.js/ },
  { id: "sparklean-events.js", re: /\/js\/sparklean-events\.js/ },
  { id: "quote-intake.js", re: /\/js\/quote-intake\.js/ },
  { id: "tel-cta", re: /tel:2398883588/ },
  { id: "intake-cta", re: /data-sparklean-intake/ },
  { id: "sticky-cta", re: /sparklean-mobile-sticky-cta\.js/ },
];

let fail = 0;
for (const f of PAGES) {
  const t = fs.readFileSync(f, "utf8");
  const missing = REQUIRED.filter((r) => !r.re.test(t)).map((r) => r.id);
  if (missing.length) {
    console.log("FAIL", f, missing.join(","));
    fail++;
  } else {
    console.log("OK  ", f);
  }
}

// Conversion label still only in sparklean-ads.js (not duplicated incorrectly)
const ads = fs.readFileSync("js/sparklean-ads.js", "utf8");
if (!/HnWnCJPRt9kcELDFqLc_/.test(ads)) {
  console.log("FAIL sparklean-ads.js missing conversion label");
  fail++;
} else {
  console.log("OK   conversion label present in sparklean-ads.js");
}

// Email Reply-To rule preserved in functions
const contact = fs.readFileSync("netlify/functions/contact-submit.mjs", "utf8");
const quote = fs.readFileSync("netlify/functions/quote-submit.mjs", "utf8");
if (!/replyTo/i.test(contact) || !/replyTo/i.test(quote)) {
  console.log("FAIL replyTo missing in submit functions");
  fail++;
} else {
  console.log("OK   Reply-To paths present in contact/quote submit");
}

if (fail) {
  console.log(`FAILED ${fail}`);
  process.exit(1);
}
console.log("ALL CONVERSION-PRESERVATION STATIC CHECKS PASSED");
