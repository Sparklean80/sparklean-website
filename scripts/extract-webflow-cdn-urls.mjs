/**
 * Extract unique Webflow CDN URLs from money-page HTML (heroes + LCP-relevant).
 */
import fs from "fs";

const FILES = [
  "index.html",
  "pages/residential-cleaning.html",
  "pages/commercial-cleaning.html",
  "pages/contact.html",
  "pages/specialized-cleaning.html",
  "pages/post-construction-cleaning.html",
  "pages/house-cleaning-naples.html",
  "pages/house-cleaning-bonita-springs.html",
  "pages/house-cleaning-estero.html",
  "pages/house-cleaning-fort-myers.html",
  "pages/house-cleaning-cape-coral.html",
];

const urls = new Set();
const byFile = {};
for (const f of FILES) {
  const t = fs.readFileSync(f, "utf8");
  const found = [];
  for (const m of t.matchAll(/https:\/\/cdn\.prod\.website-files\.com\/[^"'\)\s]+/g)) {
    const u = m[0].replace(/&amp;/g, "&");
    urls.add(u);
    found.push(u);
  }
  byFile[f] = [...new Set(found)];
}
console.log(JSON.stringify({ count: urls.size, urls: [...urls], byFile }, null, 2));
