/**
 * Migrate remaining important marketing CDN images on money pages to /images/cdn-migrated/
 */
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "images", "cdn-migrated");
fs.mkdirSync(outDir, { recursive: true });

const FILES = [
  "index.html",
  "pages/residential-cleaning.html",
  "pages/commercial-cleaning.html",
  "pages/specialized-cleaning.html",
  "pages/post-construction-cleaning.html",
  "pages/house-cleaning-naples.html",
  "pages/house-cleaning-bonita-springs.html",
  "pages/house-cleaning-estero.html",
  "pages/house-cleaning-fort-myers.html",
  "pages/house-cleaning-cape-coral.html",
];

function slugFromUrl(url) {
  const u = new URL(url);
  const base = path
    .basename(decodeURIComponent(u.pathname))
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 50);
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 8);
  return `${base}-${hash}`;
}

async function materialize(url) {
  const slug = slugFromUrl(url);
  const webp = path.join(outDir, `${slug}-1200.webp`);
  const jpg = path.join(outDir, `${slug}-1200.jpg`);
  if (!fs.existsSync(webp) || !fs.existsSync(jpg)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 76 }).toFile(webp);
    await sharp(buf).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(jpg);
  }
  return { webp: `/images/cdn-migrated/${slug}-1200.webp`, jpg: `/images/cdn-migrated/${slug}-1200.jpg` };
}

const urls = new Set();
for (const f of FILES) {
  const t = fs.readFileSync(path.join(root, f), "utf8");
  for (const m of t.matchAll(/https:\/\/cdn\.prod\.website-files\.com\/[^"'\)\s]+/g)) {
    let u = m[0].replace(/&amp;/g, "&");
    // repair truncated paren URLs by reading quoted forms
    urls.add(u);
  }
  for (const m of t.matchAll(/url\(['"](https:\/\/cdn\.prod\.website-files\.com\/[^'"]+)['"]\)/g)) {
    urls.add(m[1].replace(/&amp;/g, "&"));
  }
  for (const m of t.matchAll(/src=["'](https:\/\/cdn\.prod\.website-files\.com\/[^"']+)['"]/g)) {
    urls.add(m[1].replace(/&amp;/g, "&"));
  }
}

// Drop logo if any leftover
const list = [...urls].filter((u) => !/sparklean-logo/i.test(u));
console.log("cdn_count", list.length);

const map = {};
for (const url of list) {
  try {
    map[url] = await materialize(url);
    console.log("OK", map[url].webp);
  } catch (e) {
    console.error("FAIL", url, e.message);
  }
}

let touches = 0;
for (const f of FILES) {
  let t = fs.readFileSync(path.join(root, f), "utf8");
  let before = t;
  for (const [cdn, local] of Object.entries(map)) {
    const variants = [cdn, cdn.replace(/&/g, "&amp;")];
    for (const v of variants) {
      if (!t.includes(v)) continue;
      // Prefer webp in src/url
      t = t.split(v).join(local.webp);
    }
  }
  // Add width/height to img tags missing them that point to cdn-migrated
  t = t.replace(/<img([^>]*src="\/images\/cdn-migrated\/[^"]+"[^>]*)>/gi, (full, attrs) => {
    if (/\bwidth=/.test(attrs) && /\bheight=/.test(attrs)) return full;
    let a = attrs;
    if (!/\bwidth=/.test(a)) a += ' width="1200"';
    if (!/\bheight=/.test(a)) a += ' height="800"';
    if (!/\bloading=/.test(a) && !/fetchpriority="high"/.test(a)) a += ' loading="lazy"';
    if (!/\bdecoding=/.test(a)) a += ' decoding="async"';
    return `<img${a}>`;
  });
  if (t !== before) {
    fs.writeFileSync(path.join(root, f), t);
    touches++;
  }
}
console.log(JSON.stringify({ filesTouched: touches, mapped: Object.keys(map).length }, null, 2));
