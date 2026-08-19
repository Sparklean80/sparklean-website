/**
 * SEO correction batch: doctype, BOM strip, single H1, portal noindex prep.
 * Homepage entity copy restored separately.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const DOCTYPE_PAGES = [
  "index.html",
  "pages/residential-cleaning.html",
  "pages/commercial-cleaning.html",
  "pages/post-construction-cleaning.html",
  "pages/house-cleaning-naples.html",
  "pages/house-cleaning-bonita-springs.html",
  "pages/house-cleaning-estero.html",
  "pages/house-cleaning-fort-myers.html",
  "pages/house-cleaning-cape-coral.html",
];

const BLOG_DIR = path.join(root, "pages/blog");

const DUAL_H1_PAGES = [
  "pages/about.html",
  "pages/commercial-cleaning.html",
  "pages/contact.html",
  "pages/post-construction-cleaning.html",
  "pages/specialized-cleaning.html",
];

const report = {};

function read(rel) {
  return fs.readFileSync(path.join(root, rel));
}

function write(rel, bufOrStr) {
  fs.writeFileSync(path.join(root, rel), bufOrStr);
}

// 1) Doctype
for (const rel of DOCTYPE_PAGES) {
  let text = read(rel).toString("utf8");
  if (/^\uFEFF?<!DOCTYPE html>/i.test(text) || /^<!doctype html>/i.test(text)) {
    report[rel] = [...(report[rel] || []), "doctype-already"];
    continue;
  }
  if (!/^<html\b/i.test(text.trimStart())) {
    report[rel] = [...(report[rel] || []), "doctype-unexpected-start"];
    continue;
  }
  text = text.replace(/^\uFEFF?/, "");
  text = "<!DOCTYPE html>\n" + text;
  write(rel, text);
  report[rel] = [...(report[rel] || []), "doctype-added"];
}

// 2) BOM strip on blogs
for (const name of fs.readdirSync(BLOG_DIR)) {
  if (!name.endsWith(".html")) continue;
  const rel = `pages/blog/${name}`;
  const buf = read(rel);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    write(rel, buf.subarray(3));
    report[rel] = [...(report[rel] || []), "bom-stripped"];
  } else {
    report[rel] = [...(report[rel] || []), "bom-none"];
  }
}

// 3) Dual H1 → mobile uses <p class="hero-mobile-h">
for (const rel of DUAL_H1_PAGES) {
  let html = read(rel).toString("utf8");
  const before = html;

  // Prefer replacing the second/mobile <h1> inside .hero-mobile
  const mobileBlockRe =
    /(<div class="hero-mobile[^"]*"[^>]*>[\s\S]*?<div class="hero-mobile-body">[\s\S]*?)(<h1\b[^>]*>)([\s\S]*?)(<\/h1>)/i;
  if (mobileBlockRe.test(html)) {
    html = html.replace(mobileBlockRe, "$1<p class=\"hero-mobile-h\">$3</p>");
  } else {
    // Fallback: replace second h1 only
    let n = 0;
    html = html.replace(/<h1(\b[^>]*)>([\s\S]*?)<\/h1>/gi, (full, attrs, inner) => {
      n += 1;
      if (n === 2) return `<p class="hero-mobile-h"${attrs.replace(/^h1/i, "") || ""}>${inner}</p>`.replace(
        'class="hero-mobile-h""',
        'class="hero-mobile-h"'
      );
      return full;
    });
    // Clean botched attrs if empty
    html = html.replace(/<p class="hero-mobile-h"\s*>/g, '<p class="hero-mobile-h">');
  }

  // Ensure CSS covers .hero-mobile-h where only .hero-mobile h1 existed
  if (html.includes(".hero-mobile h1") && !html.includes(".hero-mobile-h{") && !html.includes(".hero-mobile h1,.hero-mobile-h")) {
    html = html.replace(/\.hero-mobile h1\{/g, ".hero-mobile h1,.hero-mobile-h{");
    html = html.replace(/\.hero-mobile h1 em\{/g, ".hero-mobile h1 em,.hero-mobile-h em{");
  }

  if (html !== before) {
    write(rel, html);
    report[rel] = [...(report[rel] || []), "h1-mobile-demoted"];
  } else {
    report[rel] = [...(report[rel] || []), "h1-no-change"];
  }
}

console.log(JSON.stringify(report, null, 2));
