/**
 * HTML SEO regression: doctype, no UTF-8 BOM, single H1 on indexable pages.
 * Run: node scripts/test-html-seo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll HTML SEO tests passed.");
