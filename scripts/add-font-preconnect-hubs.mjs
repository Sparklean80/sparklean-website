/**
 * Insert Google Fonts preconnect hints before fonts stylesheet on hub pages.
 * Skips signalhouse (private) and pages that already have both preconnects.
 */
import fs from "fs";
import path from "path";

const TARGETS = [
  "index.html",
  "pages/about.html",
  "pages/commercial-cleaning.html",
  "pages/contact.html",
  "pages/house-cleaning-bonita-springs.html",
  "pages/house-cleaning-cape-coral.html",
  "pages/house-cleaning-estero.html",
  "pages/house-cleaning-fort-myers.html",
  "pages/house-cleaning-naples.html",
  "pages/inner-circle.html",
  "pages/partners.html",
  "pages/post-construction-cleaning.html",
  "pages/refer.html",
  "pages/residential-cleaning.html",
  "pages/specialized-cleaning.html",
  "pages/why-sparklean.html",
];

const PRE = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
`;

const changed = [];
const skipped = [];

for (const rel of TARGETS) {
  const p = path.resolve(rel);
  if (!fs.existsSync(p)) {
    skipped.push({ rel, reason: "missing" });
    continue;
  }
  let t = fs.readFileSync(p, "utf8");
  const preG = t.includes('rel="preconnect" href="https://fonts.googleapis.com"');
  const preS = t.includes('rel="preconnect" href="https://fonts.gstatic.com"');
  if (preG && preS) {
    skipped.push({ rel, reason: "already" });
    continue;
  }
  // Prefer insert immediately before first Google Fonts stylesheet link
  const re = /<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"[^>]*>/;
  const m = t.match(re);
  if (!m) {
    skipped.push({ rel, reason: "no_fonts_stylesheet" });
    continue;
  }
  // Remove partial preconnects if only one present to avoid duplicates
  t = t.replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/g, "");
  t = t.replace(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*/g, "");
  t = t.replace(re, PRE + m[0]);
  fs.writeFileSync(p, t);
  changed.push(rel);
}

console.log(JSON.stringify({ changed, skipped }, null, 2));
