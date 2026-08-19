/**
 * Harden city-page Google reviews + pricing clarity:
 * - editorial cost rows (can't smash labels)
 * - inline CSS so styles don't depend on cached shared sheet alone
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GOOGLE_REVIEWS_HREF } from "../data/sparklean-testimonials.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const pages = [
  {
    file: "pages/house-cleaning-naples.html",
    cityLine:
      "Naples homeowners in Port Royal, Pelican Bay, and Park Shore trust Sparklean for supervised house cleaning.",
    costEm: "house cleaning in Naples?",
  },
  {
    file: "pages/house-cleaning-bonita-springs.html",
    cityLine:
      "Bonita Springs homeowners in Bonita Bay, Barefoot Beach, and Pelican Landing trust Sparklean for supervised house cleaning.",
    costEm: "house cleaning in Bonita Springs?",
  },
  {
    file: "pages/house-cleaning-estero.html",
    cityLine:
      "Estero homeowners in West Bay Club, Grandezza, and The Brooks trust Sparklean for supervised house cleaning.",
    costEm: "house cleaning in Estero?",
  },
  {
    file: "pages/house-cleaning-fort-myers.html",
    cityLine:
      "Fort Myers homeowners in Gulf Harbour, Crown Colony, and Heritage Palms trust Sparklean for supervised house cleaning.",
    costEm: "house cleaning in Fort Myers?",
  },
  {
    file: "pages/house-cleaning-cape-coral.html",
    cityLine:
      "Cape Coral homeowners in Cape Harbour, Sandoval, and Tarpon Point trust Sparklean for supervised house cleaning.",
    costEm: "house cleaning in Cape Coral?",
  },
];

const googleHref = GOOGLE_REVIEWS_HREF.replace(/&/g, "&amp;");

const INLINE_CSS = `/* Reviews + cost factors — editorial (city pages) */
.reviews.reviews--google{text-align:center;padding:88px 80px;}
.reviews-google-inner{max-width:520px;margin:0 auto;}
.reviews--google .eyebrow{justify-content:center;margin-bottom:18px;}
.reviews--google .sec-h{margin:0 0 16px;}
.reviews--google .rev-sub{margin:0 auto 28px;max-width:34em;font-family:var(--serif);font-size:.96rem;line-height:1.85;color:var(--w70);font-style:italic;}
.reviews--google .reviews-google-cta{display:inline-flex;}
.cost-factors{padding:88px 80px;background:var(--dark2);}
.cost-factors-inner{max-width:720px;margin:0 auto;}
.cost-factors .sec-h{margin-bottom:12px;}
.cost-factors-lead{font-family:var(--serif);font-size:.98rem;line-height:1.85;color:var(--w70);margin:0 0 8px;}
.cost-list{list-style:none;margin:28px 0 32px;padding:0;border-top:1px solid rgba(184,164,122,.16);}
.cost-list li{display:grid;grid-template-columns:minmax(132px,190px) minmax(0,1fr);gap:12px 28px;padding:18px 0;border-bottom:1px solid rgba(184,164,122,.12);align-items:start;}
.cost-label{margin:0;font-size:.62rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);line-height:1.45;padding-top:3px;}
.cost-desc{margin:0;font-family:var(--serif);font-size:.92rem;line-height:1.7;color:var(--w70);}
@media(max-width:1024px){
  .reviews.reviews--google,.cost-factors{padding:72px 32px;}
}
@media(max-width:640px){
  .reviews.reviews--google,.cost-factors{padding:64px 20px;}
  .cost-list li{grid-template-columns:1fr;gap:6px;padding:16px 0;}
}
`;

function costBlock(costEm) {
  return `<section class="cost-factors" id="cost-factors">
  <div class="cost-factors-inner">
    <div class="eyebrow"><div class="ey-line"></div><span>Pricing clarity</span></div>
    <h2 class="sec-h">What affects the cost of<br><em>${costEm}</em></h2>
    <div class="gold-line"></div>
    <p class="cost-factors-lead">There is no honest one-price answer for every home. Sparklean quotes from the details that actually change the work — then you choose weekly, biweekly, or another recurring rhythm that fits.</p>
    <ul class="cost-list">
      <li><p class="cost-label">Home size</p><p class="cost-desc">Square footage and how many bathrooms drive time on site.</p></li>
      <li><p class="cost-label">Cleaning frequency</p><p class="cost-desc">Weekly and biweekly visits usually cost less per visit than rare deep resets.</p></li>
      <li><p class="cost-label">Current condition</p><p class="cost-desc">First cleans and neglected areas may need extra detail before recurring care begins.</p></li>
      <li><p class="cost-label">Occupancy &amp; pets</p><p class="cost-desc">Busy households and pets change hair, floors, and high-touch surfaces.</p></li>
      <li><p class="cost-label">Rooms &amp; scope</p><p class="cost-desc">Add-ons like ovens, insides of cabinets, or windows change the plan.</p></li>
      <li><p class="cost-label">Special instructions</p><p class="cost-desc">Gate codes, preferred products, and fragile finishes are built into your quote.</p></li>
    </ul>
    <a href="/contact?quote=1&preset=recurringResidential#quote-intake" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Request a personalized quote →</a>
  </div>
</section>`;
}

function reviewsBlock(cityLine) {
  return `<section class="reviews reviews--google" id="reviews">
  <div class="reviews-google-inner">
    <div class="eyebrow"><div class="ey-line"></div><span>Google Reviews</span></div>
    <h2 class="sec-h">4.9★ on <em>Google</em></h2>
    <p class="rev-sub">${cityLine}</p>
    <a href="${googleHref}" target="_blank" rel="noopener noreferrer" class="btn-outline reviews-google-cta">Read live Google reviews ↗</a>
  </div>
</section>`;
}

for (const page of pages) {
  const full = path.join(root, page.file);
  let html = fs.readFileSync(full, "utf8");

  if (html.includes("/* Reviews + cost factors — editorial (city pages) */")) {
    html = html.replace(
      /\/\* Reviews \+ cost factors — editorial \(city pages\) \*\/[\s\S]*?@media\(max-width:640px\)\{[\s\S]*?\}\n/,
      INLINE_CSS
    );
  } else if (html.includes(".reviews{padding:100px 80px;}")) {
    html = html.replace(
      ".reviews{padding:100px 80px;}",
      INLINE_CSS + ".reviews{padding:100px 80px;}"
    );
  } else {
    throw new Error(`No reviews CSS anchor in ${page.file}`);
  }

  const reviewsRe =
    /<section class="reviews(?: reviews--google)?" id="reviews">[\s\S]*?<\/section>/;
  if (!reviewsRe.test(html)) throw new Error(`No reviews section in ${page.file}`);
  html = html.replace(reviewsRe, reviewsBlock(page.cityLine));

  const costRe =
    /<section class="cost-factors" id="cost-factors">[\s\S]*?<\/section>/;
  if (!costRe.test(html)) throw new Error(`No cost-factors in ${page.file}`);
  html = html.replace(costRe, costBlock(page.costEm));

  fs.writeFileSync(full, html);
  console.log("patched", page.file);
}
