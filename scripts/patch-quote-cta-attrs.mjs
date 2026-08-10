/**
 * Add data-sparklean-intake to sitewide Get a Quote CTAs (idempotent).
 * Run: node scripts/patch-quote-cta-attrs.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = execSync('git ls-files "*.html" "pages/**/*.html"', { cwd: root, encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((f) => !f.includes("pages/signalhouse/"));

let changed = 0;
for (const rel of files) {
  const fp = path.join(root, rel);
  let html = fs.readFileSync(fp, "utf8");
  const before = html;

  // nav Get a Quote
  html = html.replace(
    /<a href="\/contact" class="nav-btn"(?! data-sparklean-intake)>Get a Quote<\/a>/g,
    '<a href="/contact" class="nav-btn" data-sparklean-intake>Get a Quote</a>'
  );
  html = html.replace(
    /<a href="\/contact" class="nav-mobile-quote"(?! data-sparklean-intake)>Get a Quote<\/a>/g,
    '<a href="/contact" class="nav-mobile-quote" data-sparklean-intake>Get a Quote</a>'
  );

  // footer / loose Get a Quote links to contact
  html = html.replace(
    /<a href="\/contact"(?! [^>]*data-sparklean-intake)([^>]*)>Get a Quote<\/a>/g,
    (m, attrs) => {
      if (/data-sparklean-intake/.test(attrs) || /data-sparklean-intake-preset/.test(attrs)) return m;
      return `<a href="/contact"${attrs} data-sparklean-intake>Get a Quote</a>`;
    }
  );

  // Contact page personalized quote CTAs
  html = html.replace(
    /<a href="\/contact" class="btn-gold"(?! [^>]*data-sparklean-intake)([^>]*)>Request Your Personalized Quote →<\/a>/g,
    '<a href="/contact" class="btn-gold"$1 data-sparklean-intake>Request Your Personalized Quote →</a>'
  );
  html = html.replace(
    /<a href="\/contact" class="btn-gold" style="width:100%;box-sizing:border-box;"(?! [^>]*data-sparklean-intake)>Request Your Personalized Quote →<\/a>/g,
    '<a href="/contact" class="btn-gold" style="width:100%;box-sizing:border-box;" data-sparklean-intake>Request Your Personalized Quote →</a>'
  );

  if (html !== before) {
    fs.writeFileSync(fp, html);
    changed += 1;
    console.log("patched", rel);
  }
}
console.log("files changed:", changed);
