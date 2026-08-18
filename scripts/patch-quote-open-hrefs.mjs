/**
 * Point data-sparklean-intake* CTAs at the durable guided-intake URL.
 * Does not touch index.html. Skips plain Contact nav (no intake attrs).
 * Run: node scripts/patch-quote-open-hrefs.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUOTE = "/contact?quote=1#quote-intake";
const QUOTE_REC = "/contact?quote=1&preset=recurringResidential#quote-intake";

const files = [
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

function patch(html) {
  let out = html;
  let n = 0;

  out = out.replace(/<a\b[^>]*>/g, (tag) => {
    if (!/\bdata-sparklean-intake(-preset)?\b/.test(tag)) return tag;
    if (/href="\/contact\?quote=1/.test(tag)) return tag;
    if (!/href="\/contact"/.test(tag)) return tag;
    const isRec = /data-sparklean-intake-preset="recurringResidential"/.test(tag);
    n += 1;
    return tag.replace(/href="\/contact"/, `href="${isRec ? QUOTE_REC : QUOTE}"`);
  });

  return { out, n };
}

let total = 0;
for (const rel of files) {
  const abs = path.join(root, rel);
  const before = fs.readFileSync(abs, "utf8");
  const { out, n } = patch(before);
  if (out !== before) {
    fs.writeFileSync(abs, out);
    console.log(`patched ${rel} (${n})`);
    total += n;
  } else {
    console.log(`unchanged ${rel}`);
  }
}
console.log(`done — ${total} tags`);
