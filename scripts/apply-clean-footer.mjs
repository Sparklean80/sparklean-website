/**
 * Clean footer columns sitewide — keep logo + city row, drop duplicate Service Areas column.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GOOGLE_REVIEWS_HREF } from "../data/sparklean-testimonials.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const GOOGLE_REVIEWS_HREF_HTML = GOOGLE_REVIEWS_HREF.replace(/&/g, "&amp;");

const COLS = `    <div class="footer-cols">
      <div>
        <div class="fcol-t">Explore</div>
        <ul class="fcol-links">
          <li><a href="/why-sparklean">Why Sparklean</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/partners">Partners</a></li>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/refer">Refer Someone</a></li>
        </ul>
      </div>
      <div>
        <div class="fcol-t">Services</div>
        <ul class="fcol-links">
          <li><a href="/residential-cleaning">Residential Cleaning</a></li>
          <li><a href="/commercial-cleaning">Commercial &amp; Janitorial</a></li>
          <li><a href="/post-construction-cleaning">Post-Construction</a></li>
          <li><a href="/vacation-rental-cleaning">Vacation Rental &amp; Property Care</a></li>
          <li><a href="/specialized-cleaning">Specialized &amp; Add-Ons</a></li>
        </ul>
      </div>
      <div>
        <div class="fcol-t">Contact</div>
        <div class="fcol-contact">
          <a href="tel:2398883588">(239) 888-3588</a>
          <a href="mailto:info@sparklean.co">info@sparklean.co</a>
          <a href="/contact" data-sparklean-intake>Request a Quote</a>
          <a href="/customer-portal">Client Login</a>
          <a href="${GOOGLE_REVIEWS_HREF_HTML}" target="_blank" rel="noopener noreferrer">Google Reviews</a>
        </div>
      </div>
    </div>`;

const COLS_ALT = `    <div class="footer-cols">
      <div class="footer-col">
        <div class="footer-col-title">Explore</div>
        <a href="/why-sparklean">Why Sparklean</a>
        <a href="/about">About</a>
        <a href="/partners">Partners</a>
        <a href="/blog">Blog</a>
        <a href="/refer">Refer Someone</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Services</div>
        <a href="/residential-cleaning">Residential Cleaning</a>
        <a href="/commercial-cleaning">Commercial &amp; Janitorial</a>
        <a href="/post-construction-cleaning">Post-Construction</a>
        <a href="/vacation-rental-cleaning">Vacation Rental &amp; Property Care</a>
        <a href="/specialized-cleaning">Specialized &amp; Add-Ons</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Contact</div>
        <a href="tel:2398883588">(239) 888-3588</a>
        <a href="mailto:info@sparklean.co">info@sparklean.co</a>
        <a href="/contact" data-sparklean-intake>Request a Quote</a>
        <a href="/customer-portal">Client Login</a>
      </div>
    </div>`;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", ".git", "signalhouse", ".netlify"].includes(ent.name)) continue;
      walk(p, out);
    } else if (ent.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const CSS = `<link rel="stylesheet" href="/css/sparklean-footer.css">`;

let n = 0;
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel.startsWith("google") || rel.includes("signalhouse")) continue;
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("footer-cols") && !html.includes("footer-col-title")) continue;

  let next = html;
  const reFcol = /<div class="footer-cols">[\s\S]*?<\/div>\s*<\/div>\s*(<\/div>\s*)?(?=<div class="footer-btm"|<div class="footer-bottom")/;
  if (reFcol.test(next)) {
    next = next.replace(reFcol, `${COLS}\n  </div>\n  `);
  } else {
    const reAlt = /<div class="footer-cols">[\s\S]*?<\/div>\s*(?=<div class="footer-bottom")/;
    if (reAlt.test(next)) {
      next = next.replace(reAlt, `${COLS_ALT}\n  `);
    } else continue;
  }

  if (!next.includes("sparklean-footer.css")) {
    if (next.includes("sparklean-site-header.css")) {
      next = next.replace(
        /(<link rel="stylesheet" href="\/css\/sparklean-site-header\.css">)/,
        `$1\n${CSS}`
      );
    } else if (next.includes("sparklean-nav-logo.css")) {
      next = next.replace(
        /(<link rel="stylesheet" href="\/css\/sparklean-nav-logo\.css">)/,
        `$1\n${CSS}`
      );
    } else {
      next = next.replace("</head>", `${CSS}\n</head>`);
    }
  }

  if (next !== html) {
    fs.writeFileSync(file, next);
    n++;
    console.log("updated", rel);
  }
}
console.log("Done", n);
