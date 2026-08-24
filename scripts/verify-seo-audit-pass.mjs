/**
 * Verification pass for SEO audit cleanup.
 * Checks the 30 original indexable marketing URLs (excludes legal + portal).
 * Run: node scripts/verify-seo-audit-pass.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const ORIGINAL_30 = [
  ["/", "index.html"],
  ["/about", "pages/about.html"],
  ["/blog", "pages/blog.html"],
  ["/blog/bonita-springs-house-cleaning-when-to-hire-a-pro", "pages/blog/bonita-springs-house-cleaning-when-to-hire-a-pro.html"],
  ["/blog/bonita-springs-post-construction-cleaning-remodel-new-build", "pages/blog/bonita-springs-post-construction-cleaning-remodel-new-build.html"],
  ["/blog/cape-coral-house-cleaning-when-to-hire-a-pro", "pages/blog/cape-coral-house-cleaning-when-to-hire-a-pro.html"],
  ["/blog/cape-coral-post-construction-cleaning-remodel-new-build", "pages/blog/cape-coral-post-construction-cleaning-remodel-new-build.html"],
  ["/blog/estero-house-cleaning-when-to-hire-a-pro", "pages/blog/estero-house-cleaning-when-to-hire-a-pro.html"],
  ["/blog/estero-residential-move-out-deep-cleaning", "pages/blog/estero-residential-move-out-deep-cleaning.html"],
  ["/blog/fort-myers-commercial-office-cleaning", "pages/blog/fort-myers-commercial-office-cleaning.html"],
  ["/blog/fort-myers-house-cleaning-when-to-hire-a-pro", "pages/blog/fort-myers-house-cleaning-when-to-hire-a-pro.html"],
  ["/blog/naples-commercial-cleaning-high-traffic-venues", "pages/blog/naples-commercial-cleaning-high-traffic-venues.html"],
  ["/blog/naples-house-cleaning-when-to-hire-a-pro", "pages/blog/naples-house-cleaning-when-to-hire-a-pro.html"],
  ["/blog/naples-office-cleaning-medical-law-firms", "pages/blog/naples-office-cleaning-medical-law-firms.html"],
  ["/blog/naples-post-construction-cleaning-before-move-in", "pages/blog/naples-post-construction-cleaning-before-move-in.html"],
  ["/commercial-cleaning", "pages/commercial-cleaning.html"],
  ["/contact", "pages/contact.html"],
  ["/house-cleaning-bonita-springs", "pages/house-cleaning-bonita-springs.html"],
  ["/house-cleaning-cape-coral", "pages/house-cleaning-cape-coral.html"],
  ["/house-cleaning-estero", "pages/house-cleaning-estero.html"],
  ["/house-cleaning-fort-myers", "pages/house-cleaning-fort-myers.html"],
  ["/house-cleaning-naples", "pages/house-cleaning-naples.html"],
  ["/inner-circle", "pages/inner-circle.html"],
  ["/partners", "pages/partners.html"],
  ["/post-construction-cleaning", "pages/post-construction-cleaning.html"],
  ["/refer", "pages/refer.html"],
  ["/residential-cleaning", "pages/residential-cleaning.html"],
  ["/specialized-cleaning", "pages/specialized-cleaning.html"],
  ["/vacation-rental-cleaning", "pages/vacation-rental-cleaning.html"],
  ["/why-sparklean", "pages/why-sparklean.html"],
];

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

let fails = 0;
const metas = [];

console.log("=== 30 original pages: H1 / canonical / title / description / robots ===\n");

for (const [url, rel] of ORIGINAL_30) {
  const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const h1 = (html.match(/<h1\b/gi) || []).length;
  const title = decode((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "").trim();
  const desc = decode(
    (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1] || ""
  ).trim();
  const canon = (html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i) || [])[1] || "";
  const expectedCanon =
    url === "/" ? "https://www.sparklean.co/" : `https://www.sparklean.co${url}`;
  const robots = (html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i) || [])[1] || "(default index)";
  const noindex = /noindex/i.test(robots);
  const hasCleaningService = /"CleaningService"/.test(html);
  const hasLocalBusiness = /"LocalBusiness"/.test(html);
  const hasService = /"@type"\s*:\s*"Service"/.test(html) || /"@type":"Service"/.test(html);

  const issues = [];
  if (h1 !== 1) issues.push(`H1 count=${h1}`);
  if (!title) issues.push("empty title");
  if (!desc) issues.push("empty description");
  if (canon !== expectedCanon) issues.push(`canonical=${canon} expected=${expectedCanon}`);
  if (noindex) issues.push(`unexpected noindex (${robots})`);
  if (hasCleaningService) issues.push("CleaningService still present");
  if (!hasLocalBusiness) issues.push("missing LocalBusiness");

  const status = issues.length ? "FAIL" : "OK";
  if (issues.length) fails++;
  console.log(
    `${status} ${url}\n  title[${title.length}]: ${title}\n  desc[${desc.length}]: ${desc}\n  canon: ${canon}\n  robots: ${robots}\n  schema: LB=${hasLocalBusiness} Service=${hasService} CleaningService=${hasCleaningService}${issues.length ? `\n  issues: ${issues.join("; ")}` : ""}\n`
  );
  metas.push({ url, title, titleLen: title.length, desc, descLen: desc.length, status, issues });
}

console.log("=== Legal pages (expect noindex,follow; not in original 30) ===\n");
for (const [url, rel] of [
  ["/privacy", "pages/privacy.html"],
  ["/terms", "pages/terms.html"],
  ["/accessibility", "pages/accessibility.html"],
]) {
  const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const robots = (html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i) || [])[1] || "";
  const ok = /noindex/i.test(robots) && /follow/i.test(robots);
  if (!ok) fails++;
  console.log(`${ok ? "OK" : "FAIL"} ${url} robots="${robots}"`);
}

const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const smCount = (sitemap.match(/<loc>/g) || []).length;
const legalInSm = ["/privacy", "/terms", "/accessibility"].filter((p) =>
  sitemap.includes(`https://www.sparklean.co${p}`)
);
const missing30 = ORIGINAL_30.filter(
  ([url]) =>
    !sitemap.includes(
      url === "/" ? "https://www.sparklean.co/</loc>" : `https://www.sparklean.co${url}</loc>`
    )
);
console.log(`\n=== Sitemap ===`);
console.log(`URLs: ${smCount} (expect 30)`);
console.log(`Legal in sitemap: ${legalInSm.length ? legalInSm.join(", ") : "none (good)"}`);
console.log(`Missing from original 30: ${missing30.length ? missing30.map((x) => x[0]).join(", ") : "none"}`);
if (smCount !== 30 || legalInSm.length || missing30.length) fails++;

console.log(`\n=== Summary: ${fails ? fails + " failure(s)" : "ALL CHECKS PASSED"} ===`);
process.exit(fails ? 1 : 0);
