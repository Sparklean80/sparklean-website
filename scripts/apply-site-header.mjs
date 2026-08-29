/**
 * Apply sitewide Sparklean header (rewards bar + Services/Service Areas menus).
 * Skips Signal House private pages and non-marketing HTML.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const HEADER_BLOCK = `<header class="site-header" id="site-header">
  <button type="button" class="rewards-topbar" aria-expanded="false" aria-controls="rewards-panel">
    <span class="rewards-topbar-inner">
      <strong>Sparklean Rewards</strong>
      <span class="rewards-topbar-sep" aria-hidden="true">·</span>
      <span>Earn $5 in cleaning credit for every $100 spent.</span>
      <span class="rewards-topbar-more">Learn More →</span>
    </span>
  </button>
  <nav aria-label="Primary">
    <a href="/" class="nav-logo">
      <img src="https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21b5c7958824a1f172b0f_sparklean-logo-transparent.png" alt="Sparklean Cleaning">
    </a>
    <ul class="nav-links">
      <li class="nav-dd">
        <button type="button" class="nav-dd-toggle" aria-expanded="false" aria-haspopup="true" aria-controls="nav-menu-services">Services <span class="nav-dd-arrow" aria-hidden="true">▾</span></button>
        <ul class="nav-dd-menu" id="nav-menu-services">
          <li><a href="/residential-cleaning">Residential Cleaning</a></li>
          <li><a href="/commercial-cleaning">Commercial &amp; Janitorial</a></li>
          <li><a href="/post-construction-cleaning">Post-Construction</a></li>
          <li><a href="/vacation-rental-cleaning">Vacation Rental &amp; Property Care</a></li>
          <li><a href="/specialized-cleaning">Specialized &amp; One-Time Cleaning</a></li>
          <li><a href="/specialized-cleaning">Add-Ons</a></li>
        </ul>
      </li>
      <li class="nav-dd">
        <button type="button" class="nav-dd-toggle" aria-expanded="false" aria-haspopup="true" aria-controls="nav-menu-areas">Service Areas <span class="nav-dd-arrow" aria-hidden="true">▾</span></button>
        <ul class="nav-dd-menu" id="nav-menu-areas">
          <li><a href="/house-cleaning-naples">Naples</a></li>
          <li><a href="/house-cleaning-bonita-springs">Bonita Springs</a></li>
          <li><a href="/house-cleaning-estero">Estero</a></li>
          <li><a href="/house-cleaning-fort-myers">Fort Myers</a></li>
          <li><a href="/house-cleaning-cape-coral">Cape Coral</a></li>
        </ul>
      </li>
      <li><a href="/why-sparklean">Why Sparklean</a></li>
      <li><a href="/careers">Careers</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/partners">Partners</a></li>
      <li><a href="/blog">Blog</a></li>
    </ul>
    <div class="nav-right">
      <button type="button" class="nav-earn" aria-expanded="false" aria-controls="rewards-panel">Earn $5 Credit</button>
      <a href="tel:2398883588" class="nav-phone">(239) 888-3588</a>
      <a href="tel:2398883588" class="nav-call" aria-label="Call Sparklean at (239) 888-3588"><svg class="nav-call-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1l-2.2 2.2z"/></svg><span>Call</span></a>
      <a href="/customer-portal" class="nav-portal">Client Login</a>
      <button class="nav-hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="mobileMenu">
        <span></span><span></span><span></span>
      </button>
      <a href="/contact" class="nav-btn" data-sparklean-intake>Request a Quote</a>
    </div>
  </nav>
  <div class="rewards-panel" id="rewards-panel" role="region" aria-label="Sparklean Rewards">
    <div class="rewards-panel-title">Sparklean Rewards</div>
    <p>Earn $5 in Sparklean cleaning credit for every $100 you spend.</p>
    <p class="rewards-panel-example">Spend $500 → Earn $25 Credit</p>
    <p>Use your cleaning credit toward future residential, commercial, construction, remodeling or vacation-rental cleaning.</p>
    <div class="rewards-panel-actions">
      <a class="rewards-panel-cta" href="/contact" data-sparklean-intake>Request a Quote</a>
      <a class="rewards-panel-cta-outline" href="/customer-portal">View Rewards in Client App</a>
    </div>
  </div>
</header>
<div class="nav-mobile-menu" id="mobileMenu">
  <a href="/contact" class="nav-mobile-quote" data-sparklean-intake>Request a Quote</a>
  <a href="tel:2398883588">(239) 888-3588</a>
  <a href="/customer-portal">Client Login</a>
  <a href="/residential-cleaning" class="mob-sub">Residential Cleaning</a>
  <a href="/commercial-cleaning" class="mob-sub">Commercial &amp; Janitorial</a>
  <a href="/post-construction-cleaning" class="mob-sub">Post-Construction</a>
  <a href="/vacation-rental-cleaning" class="mob-sub">Vacation Rental &amp; Property Care</a>
  <a href="/specialized-cleaning" class="mob-sub">Specialized &amp; One-Time / Add-Ons</a>
  <a href="/house-cleaning-naples" class="mob-sub">Naples</a>
  <a href="/house-cleaning-bonita-springs" class="mob-sub">Bonita Springs</a>
  <a href="/house-cleaning-estero" class="mob-sub">Estero</a>
  <a href="/house-cleaning-fort-myers" class="mob-sub">Fort Myers</a>
  <a href="/house-cleaning-cape-coral" class="mob-sub">Cape Coral</a>
  <a href="/why-sparklean">Why Sparklean</a>
  <a href="/careers">Careers</a>
  <a href="/partners">Partners</a>
  <a href="/about">About Us</a>
  <a href="/blog">Blog</a>
  <a href="/contact">Contact</a>
  <a href="/refer">Refer Someone</a>
</div>`;

const CSS_LINK = `<link rel="stylesheet" href="/css/sparklean-site-header.css">`;
const JS_TAG = `<script src="/js/sparklean-site-header.js" defer></script>`;

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "signalhouse" || ent.name === ".netlify") continue;
      walk(p, out);
    } else if (ent.name.endsWith(".html")) {
      out.push(p);
    }
  }
  return out;
}

function shouldSkip(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel.startsWith("pages/signalhouse/")) return true;
  if (rel.startsWith("google")) return true;
  if (rel.includes("evidence/")) return true;
  return false;
}

function ensureAssets(html) {
  let next = html;
  next = next.replace(/\s*<link rel="stylesheet" href="\/css\/sparklean-header-home\.css">/g, "");
  next = next.replace(/\s*<script src="\/js\/sparklean-header-home\.js"[^>]*><\/script>/g, "");
  next = next.replace(/\s*<link rel="stylesheet" href="\/css\/sparklean-rewards\.css">/g, "");
  next = next.replace(/\s*<script src="\/js\/sparklean-rewards\.js"[^>]*><\/script>/g, "");
  next = next.replace(/\s*<link rel="stylesheet" href="\/css\/sparklean-site-header\.css">/g, "");
  next = next.replace(/\s*<script src="\/js\/sparklean-site-header\.js"[^>]*><\/script>/g, "");

  if (next.includes("sparklean-nav-logo.css")) {
    next = next.replace(
      /(<link rel="stylesheet" href="\/css\/sparklean-nav-logo\.css">)/,
      `$1\n${CSS_LINK}`
    );
  } else if (next.includes("</head>")) {
    next = next.replace("</head>", `${CSS_LINK}\n</head>`);
  }

  if (next.includes("sparklean-mobile-sticky-cta.js")) {
    next = next.replace(
      /(<script src="\/js\/sparklean-mobile-sticky-cta\.js"[^>]*><\/script>)/,
      `${JS_TAG}\n$1`
    );
  } else if (next.includes("</body>")) {
    next = next.replace("</body>", `${JS_TAG}\n</body>`);
  }

  return next;
}

function replaceHeader(html) {
  // Already converted
  if (html.includes('id="site-header"')) {
    // Replace from site-header through mobileMenu to keep in sync
    const re = /<header class="site-header" id="site-header">[\s\S]*?<div class="nav-mobile-menu" id="mobileMenu"[^>]*>[\s\S]*?<\/div>/;
    if (re.test(html)) return html.replace(re, HEADER_BLOCK);
  }

  // Primary nav + mobile menu (most pages)
  const reNav = /<nav(?:\s[^>]*)?>[\s\S]*?<\/nav>\s*<div class="nav-mobile-menu" id="mobileMenu"[^>]*>[\s\S]*?<\/div>/;
  if (reNav.test(html)) return html.replace(reNav, HEADER_BLOCK);

  // Nav only (rare)
  const reNavOnly = /<nav(?:\s[^>]*)?>[\s\S]*?<\/nav>/;
  if (reNavOnly.test(html)) {
    return html.replace(reNavOnly, HEADER_BLOCK);
  }

  return null;
}

const files = walk(ROOT).filter((f) => !shouldSkip(f));
let ok = 0;
let fail = [];

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("nav-logo") && !html.includes('id="site-header"')) {
    continue; // not a marketing chrome page
  }
  const replaced = replaceHeader(html);
  if (!replaced) {
    fail.push(path.relative(ROOT, file));
    continue;
  }
  const finalHtml = ensureAssets(replaced);
  fs.writeFileSync(file, finalHtml);
  ok++;
  console.log("updated", path.relative(ROOT, file));
}

console.log(`\nDone. Updated ${ok} files. Failed: ${fail.length}`);
if (fail.length) console.log(fail.join("\n"));
