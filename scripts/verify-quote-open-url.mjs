/**
 * Static evidence checks for durable quote URL + dual lead paths.
 * Does not submit leads or fire Ads conversions.
 * Run: node scripts/verify-quote-open-url.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
function assert(c, m) {
  if (!c) {
    failed += 1;
    console.error("FAIL:", m);
  } else console.log("OK  ", m);
}

const contact = fs.readFileSync(path.join(root, "pages/contact.html"), "utf8");
const intake = fs.readFileSync(path.join(root, "js/quote-intake.js"), "utf8");

assert(contact.includes('id="quote-intake"'), "contact landmark #quote-intake");
assert(contact.includes('id="sparklean-contact-form"'), "simple contact form preserved");
assert(contact.includes("contact-submit"), "simple form → contact-submit");
assert(contact.includes('href="/contact?quote=1#quote-intake"'), "guided CTAs use durable URL");
assert(!/href="\/contact" class="btn-gold" data-sparklean-intake>Request Your Personalized Quote/.test(contact), "no self-link gold CTA");
assert(intake.includes("forceOpenDoneThisLoad"), "refresh-safe force open");
assert(intake.includes("isQuoteOpenHref"), "durable href helper");
assert(/fireAndReportConversion/.test(intake) && /leadId/.test(intake), "guided conversion after server leadId");
assert(contact.includes("fireAndReportConversion"), "simple form conversion after server leadId");
assert(!intake.includes("sparklean_paid_force_open"), "no session once-only force open");

const pages = [
  "pages/residential-cleaning.html",
  "pages/commercial-cleaning.html",
  "pages/post-construction-cleaning.html",
  "pages/vacation-rental-cleaning.html",
  "pages/specialized-cleaning.html",
  "pages/house-cleaning-naples.html",
  "pages/house-cleaning-bonita-springs.html",
  "pages/house-cleaning-estero.html",
  "pages/house-cleaning-fort-myers.html",
  "pages/house-cleaning-cape-coral.html",
];

for (const rel of pages) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  assert(html.includes("/contact?quote=1"), `${rel} has durable quote URL`);
  assert(!/href="\/contact" class="nav-btn" data-sparklean-intake/.test(html), `${rel} nav quote not bare /contact`);
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(true, "homepage left untouched by this verify script (no CTA rewrite asserted)");
void index;

if (failed) {
  console.error("\n" + failed + " FAILED");
  process.exit(1);
}
console.log("\nALL QUOTE-OPEN URL CHECKS PASSED");
