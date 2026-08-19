/**
 * Desktop hero sharpness: use higher-quality JPG + kill zoom soft-scale.
 * Mobile keeps existing webp/contain paths.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = [
  "index.html",
  "pages/house-cleaning-naples.html",
  "pages/house-cleaning-bonita-springs.html",
  "pages/house-cleaning-estero.html",
  "pages/house-cleaning-fort-myers.html",
  "pages/house-cleaning-cape-coral.html",
  "pages/residential-cleaning.html",
  "pages/commercial-cleaning.html",
  "pages/post-construction-cleaning.html",
  "pages/vacation-rental-cleaning.html",
  "pages/specialized-cleaning.html",
  "pages/contact.html",
  "pages/about.html",
  "css/contact-page.css",
  "css/home-hero-mobile.css",
];

const sharpCss = `/**
 * Desktop heroes: no soft zoom / scale (keeps JPG backgrounds crisp).
 */
@media (min-width: 768px) {
  .hero-bg,
  .homepage-hero__media img,
  #residential-hero.hero .hero-bg img {
    animation: none !important;
    transform: none !important;
  }
}
`;

fs.writeFileSync(path.join(root, "css/hero-desktop-sharp.css"), sharpCss);

function jpgExists(webpPath) {
  // webpPath like /images/heroes/foo-1400.webp
  const rel = webpPath.replace(/^\//, "").replace(/\.webp$/i, ".jpg");
  return fs.existsSync(path.join(root, rel));
}

function sharpenContent(filePath, content) {
  let html = content;
  let changes = [];

  // 1) hero-bg background urls: 1400.webp → 1400.jpg when jpg exists
  html = html.replace(
    /url\((['"]?)(\/images\/heroes\/[^)'"]+-1400)\.webp\1\)/gi,
    (full, q, base) => {
      if (jpgExists(`${base}.webp`)) {
        changes.push(`bg ${base}.jpg`);
        return `url(${q}${base}.jpg${q})`;
      }
      return full;
    }
  );

  // contact-page style
  html = html.replace(
    /url\((["'])(\/images\/heroes\/[^'"]+-1400)\.webp\1\)/gi,
    (full, q, base) => {
      if (jpgExists(`${base}.webp`)) {
        changes.push(`css-bg ${base}.jpg`);
        return `url(${q}${base}.jpg${q})`;
      }
      return full;
    }
  );

  // 2) Kill zoomIn on .hero-bg rules
  const beforeZoom = html;
  html = html.replace(
    /(\.hero-bg\{[^}]*?)animation:\s*zoomIn[^;!}]+;?/gi,
    "$1animation:none;transform:none;"
  );
  if (html !== beforeZoom) changes.push("kill-zoom");

  // Bonita soft 75% size → cover for sharper desktop fill
  if (html.includes("center center / 75% auto")) {
    html = html.replace(
      "center center / 75% auto no-repeat",
      "center center / cover no-repeat"
    );
    changes.push("bonita-cover");
  }

  // 3) Homepage: prefer JPG img for desktop; webp only narrow screens
  if (filePath.endsWith("index.html")) {
    const oldPic = `<picture>
      <source type="image/webp" srcset="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp 1400w" sizes="100vw">
      <img src="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp" alt="Sparklean cleaner detailing framed artwork in a Naples home" width="2048" height="1365" fetchpriority="high" decoding="async">
    </picture>`;
    const newPic = `<picture>
      <source media="(max-width: 767px)" type="image/webp" srcset="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp 1400w" sizes="100vw">
      <img src="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.jpg" alt="Sparklean cleaner detailing framed artwork in a Naples home" width="2048" height="1365" fetchpriority="high" decoding="async">
    </picture>`;
    if (html.includes(oldPic)) {
      html = html.replace(oldPic, newPic);
      changes.push("homepage-jpg");
    } else {
      // looser
      html = html.replace(
        'src="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp" alt="Sparklean cleaner detailing framed artwork',
        'src="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.jpg" alt="Sparklean cleaner detailing framed artwork'
      );
      html = html.replace(
        '<source type="image/webp" srcset="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp 1400w" sizes="100vw">',
        '<source media="(max-width: 767px)" type="image/webp" srcset="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp 1400w" sizes="100vw">'
      );
      changes.push("homepage-jpg-loose");
    }
    html = html.replace(
      'href="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp" type="image/webp"',
      'href="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.jpg" type="image/jpeg"'
    );
  }

  // 4) Residential desktop img → jpg
  if (filePath.includes("residential-cleaning.html")) {
    const before = html;
    html = html.replace(
      'src="/images/heroes/69b21cae1dbe6ede803ef701_1000051474-0fcae9d8-1400.webp"',
      'src="/images/heroes/69b21cae1dbe6ede803ef701_1000051474-0fcae9d8-1400.jpg"'
    );
    if (html !== before) changes.push("residential-jpg");
  }

  // 5) About: local JPG instead of CDN WEBP
  if (filePath.includes("about.html")) {
    const before = html;
    html = html.replace(
      'url("https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21c8b4a74322eaf0b5148_1000051954.WEBP")',
      "url('/images/heroes/69b21c8b4a74322eaf0b5148_1000051954-6f5aa8b3-1400.jpg')"
    );
    html = html.replace(
      "url('https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b3279517a241efe0394bba_1000051456.JPG')",
      "url('/images/heroes/69b3279517a241efe0394bba_1000051456-87df2f7a-1400.jpg')"
    );
    if (html !== before) changes.push("about-local-jpg");
  }

  // 6) Link sharp CSS (once) after site-header or before </head>
  if (filePath.endsWith(".html") && !html.includes("hero-desktop-sharp.css")) {
    if (html.includes('href="/css/sparklean-site-header.css"')) {
      html = html.replace(
        '<link rel="stylesheet" href="/css/sparklean-site-header.css">',
        '<link rel="stylesheet" href="/css/sparklean-site-header.css">\n<link rel="stylesheet" href="/css/hero-desktop-sharp.css">'
      );
      changes.push("link-css");
    } else if (html.includes("</head>")) {
      html = html.replace(
        "</head>",
        '<link rel="stylesheet" href="/css/hero-desktop-sharp.css">\n</head>'
      );
      changes.push("link-css-head");
    }
  }

  // home-hero-mobile: ensure desktop img has no soft filter
  if (filePath.includes("home-hero-mobile.css")) {
    if (!html.includes("image-rendering")) {
      html = html.replace(
        `@media (min-width: 768px) {
  .homepage-hero.hero {`,
        `@media (min-width: 768px) {
  .homepage-hero__media img {
    image-rendering: auto;
  }
  .homepage-hero.hero {`
      );
      changes.push("home-css-render");
    }
  }

  return { html, changes };
}

const report = {};
for (const rel of files) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    report[rel] = ["MISSING_FILE"];
    continue;
  }
  const raw = fs.readFileSync(full, "utf8");
  const { html, changes } = sharpenContent(rel, raw.replace(/\r\n/g, "\n"));
  if (changes.length) {
    fs.writeFileSync(full, html);
  }
  report[rel] = changes.length ? changes : ["no-op"];
}

console.log(JSON.stringify(report, null, 2));
