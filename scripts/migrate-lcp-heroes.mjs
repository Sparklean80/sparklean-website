/**
 * Download money-page LCP/hero Webflow CDN images → local WebP (+ JPG fallback)
 * and rewrite HTML/CSS references. Also copies logo to consistent local path.
 *
 * Scope: hero backgrounds + hero-mobile/mob imgs on money pages + homepage LCP.
 * Does not rewrite every below-fold decorative image (larger follow-up).
 */
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "images", "heroes");
fs.mkdirSync(outDir, { recursive: true });

const MONEY_PAGES = [
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

const LOGO_CDN =
  "https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21b5c7958824a1f172b0f_sparklean-logo-transparent.png";
const LOGO_LOCAL = "/images/branding/Sparklean_Logo_Transparent.png";

function slugFromUrl(url) {
  try {
    const u = new URL(url);
    const base = path.basename(decodeURIComponent(u.pathname)).replace(/\s+/g, "-");
    const stem = base.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60);
    const hash = createHash("sha1").update(url).digest("hex").slice(0, 8);
    return `${stem}-${hash}`;
  } catch {
    return createHash("sha1").update(url).digest("hex").slice(0, 16);
  }
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function materialize(url) {
  const slug = slugFromUrl(url);
  const webp1400 = path.join(outDir, `${slug}-1400.webp`);
  const webp800 = path.join(outDir, `${slug}-800.webp`);
  const jpg1400 = path.join(outDir, `${slug}-1400.jpg`);
  if (fs.existsSync(webp1400) && fs.existsSync(webp800) && fs.existsSync(jpg1400)) {
    return {
      slug,
      webp1400: `/images/heroes/${slug}-1400.webp`,
      webp800: `/images/heroes/${slug}-800.webp`,
      jpg1400: `/images/heroes/${slug}-1400.jpg`,
    };
  }
  const buf = await download(url);
  const img = sharp(buf).rotate();
  const meta = await img.metadata();
  await sharp(buf).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 78 }).toFile(webp1400);
  await sharp(buf).rotate().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 76 }).toFile(webp800);
  await sharp(buf).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(jpg1400);
  return {
    slug,
    width: meta.width || null,
    height: meta.height || null,
    webp1400: `/images/heroes/${slug}-1400.webp`,
    webp800: `/images/heroes/${slug}-800.webp`,
    jpg1400: `/images/heroes/${slug}-1400.jpg`,
  };
}

function extractHeroUrls(html) {
  const urls = new Set();
  // Any url('https://cdn...') inside .hero-bg rules (quoted — handles spaces/parens)
  for (const m of html.matchAll(/\.hero-bg\{[^}]*url\(['"](https:\/\/cdn\.prod\.website-files\.com\/[^'"]+)['"]\)/gi)) {
    urls.add(m[1].replace(/&amp;/g, "&"));
  }
  // background:url in combined .hero rules
  for (const m of html.matchAll(/\.hero[^{]*\{[^}]*url\(['"](https:\/\/cdn\.prod\.website-files\.com\/[^'"]+)['"]\)/gi)) {
    urls.add(m[1].replace(/&amp;/g, "&"));
  }
  for (const m of html.matchAll(/class=["'][^"']*hero-(?:mobile|mob)-img[^"']*["'][^>]*src=["'](https:\/\/cdn\.prod\.website-files\.com\/[^"']+)["']/gi)) {
    urls.add(m[1].replace(/&amp;/g, "&"));
  }
  for (const m of html.matchAll(/src=["'](https:\/\/cdn\.prod\.website-files\.com\/[^"']+)["'][^>]*class=["'][^"']*hero-(?:mobile|mob)-img/gi)) {
    urls.add(m[1].replace(/&amp;/g, "&"));
  }
  return [...urls];
}

function imageSetCss(local) {
  return `image-set(url('${local.webp800}') type('image/webp') 1x, url('${local.webp1400}') type('image/webp') 2x, url('${local.jpg1400}') type('image/jpeg') 1x)`;
}

function rewritePage(rel, map) {
  let html = fs.readFileSync(path.join(root, rel), "utf8");
  let changed = 0;

  // Logo → local
  if (html.includes(LOGO_CDN)) {
    html = html.split(LOGO_CDN).join(LOGO_LOCAL);
    changed++;
  }

  for (const [cdn, local] of Object.entries(map)) {
    const variants = [cdn, cdn.replace(/ /g, "%20"), cdn.replace(/%20/g, " ")];
    for (const v of variants) {
      if (!html.includes(v) && !html.includes(v.replace(/&/g, "&amp;"))) continue;
      // Replace url('CDN') in CSS with image-set for hero backgrounds
      const urlRe = new RegExp(
        `url\\(['"]?${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]?\\)`,
        "g"
      );
      const ampRe = new RegExp(
        `url\\(['"]?${v.replace(/&/g, "&amp;").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]?\\)`,
        "g"
      );
      if (urlRe.test(html) || ampRe.test(html)) {
        html = html.replace(urlRe, `url('${local.webp1400}')`).replace(ampRe, `url('${local.webp1400}')`);
        // Prefer image-set on .hero-bg declarations: post-pass simpler — keep single webp1400 for CSS bg
        changed++;
      }
      // img src
      if (html.includes(v) || html.includes(v.replace(/&/g, "&amp;"))) {
        html = html.split(v).join(local.webp1400);
        html = html.split(v.replace(/&/g, "&amp;")).join(local.webp1400);
        changed++;
      }
    }
  }

  // Homepage: ensure preload for LCP webp if hero local path present
  if (rel === "index.html") {
    const heroMatch = html.match(/\.hero-bg\{[^}]*url\(['"]([^'"]+)['"]\)/);
    // also check image after rewrite - first hero-bg background
    const bgUrls = [...html.matchAll(/\.hero-bg\{[^}]*url\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
    const desktop = bgUrls.find((u) => u.startsWith("/images/heroes/")) || bgUrls[0];
    if (desktop && desktop.startsWith("/images/")) {
      html = html.replace(/<link rel="preload"[^>]*as="image"[^>]*>\s*/gi, "");
      const preload = `<link rel="preload" as="image" href="${desktop}" type="image/webp" fetchpriority="high">\n`;
      if (html.includes("</title>")) {
        html = html.replace("</title>", `</title>\n${preload}`);
      }
      changed++;
    }
  }

  // Upgrade hero-mobile img tags to picture+srcset when pointing at our heroes
  html = html.replace(
    /<(img)([^>]*class="[^"]*hero-(?:mobile|mob)-img[^"]*"[^>]*)>/gi,
    (full, _tag, attrs) => {
      const srcM = attrs.match(/src=["']([^"']+)["']/);
      if (!srcM) return full;
      const src = srcM[1];
      if (!src.includes("/images/heroes/")) return full;
      const base = src.replace(/-1400\.(webp|jpg)$/, "");
      const w800 = `${base}-800.webp`;
      const w1400 = `${base}-1400.webp`;
      const j1400 = `${base}-1400.jpg`;
      const altM = attrs.match(/alt=["']([^"']*)["']/);
      const alt = altM ? altM[1] : "";
      const width = ' width="1400" height="900"';
      return `<picture><source type="image/webp" srcset="${w800} 800w, ${w1400} 1400w" sizes="100vw"><img class="hero-mobile-img" src="${j1400}" srcset="${j1400} 1400w" sizes="100vw" alt="${alt}"${width} decoding="async" fetchpriority="high"></picture>`;
    }
  );

  // Also handle residential hero-mob-img without picture yet - class may be hero-mob-img
  html = html.replace(
    /<img([^>]*class="[^"]*hero-mob-img[^"]*"[^>]*)\/?>/gi,
    (full, attrs) => {
      const srcM = attrs.match(/src=["']([^"']+)["']/);
      if (!srcM || !srcM[1].includes("/images/heroes/")) return full;
      const src = srcM[1];
      const base = src.replace(/-1400\.(webp|jpg)$/, "");
      const w800 = `${base}-800.webp`;
      const w1400 = `${base}-1400.webp`;
      const j1400 = `${base}-1400.jpg`;
      const altM = attrs.match(/alt=["']([^"']*)["']/);
      const alt = altM ? altM[1] : "";
      return `<picture><source type="image/webp" srcset="${w800} 800w, ${w1400} 1400w" sizes="100vw"><img class="hero-mob-img" src="${j1400}" srcset="${j1400} 1400w" sizes="100vw" alt="${alt}" width="1400" height="900" decoding="async" fetchpriority="high"></picture>`;
    }
  );

  fs.writeFileSync(path.join(root, rel), html);
  return changed;
}

// Also rewrite contact-page.css if it has CDN hero
function rewriteCss(rel, map) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return 0;
  let css = fs.readFileSync(p, "utf8");
  let n = 0;
  for (const [cdn, local] of Object.entries(map)) {
    if (css.includes(cdn) || css.includes(cdn.replace(/ /g, "%20"))) {
      css = css.split(cdn).join(local.webp1400);
      css = css.split(cdn.replace(/ /g, "%20")).join(local.webp1400);
      n++;
    }
  }
  if (n) fs.writeFileSync(p, css);
  return n;
}

const allHeroUrls = new Set();
for (const rel of MONEY_PAGES) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  for (const u of extractHeroUrls(html)) allHeroUrls.add(u);
}
const contactCss = path.join(root, "css", "contact-page.css");
if (fs.existsSync(contactCss)) {
  const css = fs.readFileSync(contactCss, "utf8");
  for (const m of css.matchAll(/https:\/\/cdn\.prod\.website-files\.com\/[^'")\s]+/g)) {
    allHeroUrls.add(m[0].replace(/&amp;/g, "&"));
  }
}

console.log(JSON.stringify({ heroUrlCount: allHeroUrls.size, urls: [...allHeroUrls] }, null, 2));

const map = {};
for (const url of allHeroUrls) {
  try {
    const local = await materialize(url);
    map[url] = local;
    console.log("OK", local.slug);
  } catch (e) {
    console.error("FAIL", url, e.message);
  }
}

// Also materialize vacation-rental email asset as page hero
const vrSrc = path.join(root, "email-assets", "vacation-rental.jpg");
if (fs.existsSync(vrSrc)) {
  const slug = "vacation-rental-hero";
  const buf = fs.readFileSync(vrSrc);
  await sharp(buf).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(outDir, `${slug}-1400.webp`));
  await sharp(buf).rotate().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 76 }).toFile(path.join(outDir, `${slug}-800.webp`));
  await sharp(buf).rotate().resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(outDir, `${slug}-1400.jpg`));
  console.log("OK vacation-rental-hero from email-assets");
}

let total = 0;
for (const rel of MONEY_PAGES) {
  total += rewritePage(rel, map);
}
total += rewriteCss("css/contact-page.css", map);

const noteDir = path.join(root, "docs/work-notes/2026-08-14-phase1-seo-batch");
fs.mkdirSync(noteDir, { recursive: true });
fs.writeFileSync(
  path.join(noteDir, "lcp-hero-map.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), map }, null, 2)
);
console.log(JSON.stringify({ rewrittenTouches: total, mapped: Object.keys(map).length }, null, 2));
