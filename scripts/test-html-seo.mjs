/**
 * HTML SEO regression: doctype, no UTF-8 BOM, single H1 on indexable pages.
 * Run: node scripts/test-html-seo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GOOGLE_REVIEWS_HREF } from "../data/sparklean-testimonials.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  ", msg);
  }
}

function listPublicHtml() {
  return execSync('git ls-files "*.html" "pages/**/*.html"', {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(
      (f) =>
        !f.includes("pages/signalhouse/") && f !== "googleb2e0bc4648b22d1e.html"
    );
}

/** Count document H1s; ignore those inside <template> if any. */
function countH1(html) {
  const withoutTemplates = html.replace(/<template[\s\S]*?<\/template>/gi, "");
  return (withoutTemplates.match(/<h1\b/gi) || []).length;
}

function isIndexable(html, rel) {
  if (rel === "pages/customer-portal.html") return false;
  if (/<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) {
    return false;
  }
  return true;
}

const files = listPublicHtml();
assert(files.length > 10, `found ${files.length} public HTML files`);

for (const rel of files) {
  const abs = path.join(root, rel);
  const buf = fs.readFileSync(abs);
  const html = buf.toString("utf8");

  // BOM: UTF-8 EF BB BF must not precede content
  const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  assert(!hasBom, `${rel} has no UTF-8 BOM`);

  const start = html.replace(/^\uFEFF/, "").trimStart();
  assert(
    /^<!DOCTYPE html>/i.test(start),
    `${rel} starts with <!DOCTYPE html>`
  );

  if (!isIndexable(html, rel)) {
    const h1 = countH1(html);
    assert(h1 >= 1, `${rel} (noindex) still has at least one H1 for a11y`);
    continue;
  }

  const h1 = countH1(html);
  assert(h1 === 1, `${rel} has exactly one H1 (found ${h1})`);
}

// Portal indexing decision
const portal = fs.readFileSync(path.join(root, "pages/customer-portal.html"), "utf8");
assert(
  /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(portal),
  "customer-portal has robots noindex"
);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
assert(
  !sitemap.includes("/customer-portal"),
  "sitemap.xml excludes /customer-portal"
);

const MOJIBAKE = /â€|Â·|Â©|Â®|Â†|â€™|â€œ|â€|â€“|â€”|â†/;
const blogDir = path.join(root, "pages/blog");
const blogFiles = fs.readdirSync(blogDir).filter((f) => f.endsWith(".html"));
assert(blogFiles.length === 12, `expected 12 blog HTML files (found ${blogFiles.length})`);
for (const name of blogFiles) {
  const html = fs.readFileSync(path.join(blogDir, name), "utf8");
  assert(!MOJIBAKE.test(html), `pages/blog/${name} has no visible UTF-8 mojibake`);
}

const about = fs.readFileSync(path.join(root, "pages/about.html"), "utf8");
const aboutDesc = about.match(/<meta name="description" content="([^"]*)"/)?.[1] || "";
assert(
  !/Cape Coral, and Naples/.test(aboutDesc),
  "about meta description does not repeat the five-city list"
);
assert(
  (aboutDesc.match(/Cape Coral/g) || []).length === 1,
  "about meta description names Cape Coral once"
);

const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(
  /<a href="\/contact\?quote=1#quote-intake"[^>]*data-sparklean-event-type="hero_primary"/.test(
    home
  ),
  "homepage hero personalized-quote CTA href is /contact?quote=1#quote-intake"
);

const aboutQuoteCtas = [
  ...about.matchAll(
    /<a\b([^>]*)>[^<]*Request Your Personalized Quote/gi
  ),
];
assert(aboutQuoteCtas.length === 3, "about has three Personalized Quote CTAs");
for (const m of aboutQuoteCtas) {
  assert(
    /href="\/contact\?quote=1#quote-intake"/.test(m[1]),
    "about Personalized Quote CTA uses durable quote URL"
  );
}

for (const rel of files) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  assert(
    !/Bernwood|24221|Brink\s*Cir/i.test(html),
    `${rel} does not publish a street address`
  );
  if (/google\.com\/maps/i.test(html)) {
    assert(
      html.includes(GOOGLE_REVIEWS_HREF) ||
        html.includes(GOOGLE_REVIEWS_HREF.replace(/&/g, "&amp;")),
      `${rel} Google Maps links use name+city search (not a street place URL)`
    );
  }
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll HTML SEO tests passed.");
