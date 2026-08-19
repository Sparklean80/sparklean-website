/**
 * Estero hero: match homepage/residential/Naples full-frame UI.
 * Replace short cropped Untitled-design banner with full 1474 scene (1400×933).
 */
import fs from "node:fs";

const path = "pages/house-cleaning-estero.html";
let html = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");

const OLD = "69b6ffece6d9b95323fd5590_Untitled-design--4--93670d1a";
const NEW = "69b21cae1dbe6ede803ef701_1000051474-0fcae9d8";

if (!html.includes(OLD)) throw new Error("old Estero hero asset not found");
html = html.split(OLD).join(NEW);

// Base mobile hero rule: no fixed crop box (match Naples/homepage behavior)
const oldImgRule =
  ".hero-mobile-img{width:100%;height:min(78vw,460px);min-height:300px;max-height:480px;object-fit:cover;object-position:center 20%;display:block;}";
const newImgRule =
  ".hero-mobile-img{width:100%;height:auto;min-height:0;max-height:none;object-fit:contain;object-position:center center;display:block;}";
if (!html.includes(oldImgRule)) throw new Error("hero-mobile-img rule missing");
html = html.replace(oldImgRule, newImgRule);

// Desktop background: prefer faces/upper scene like residential
html = html.replace(
  `background:url('/images/heroes/${NEW}-1400.webp') center center / cover no-repeat`,
  `background:url('/images/heroes/${NEW}-1400.webp') center 18% / cover no-repeat`
);

// Correct intrinsic size attrs (1474 is 1400×933)
html = html.replace(
  'alt="Sparklean luxury home cleaning Estero FL" width="1400" height="900"',
  'alt="House cleaning services in Estero, Florida" width="1400" height="933"'
);

// Strengthen mobile fit block to lock landscape ratio like homepage
const oldFit = `<style id="estero-mobile-photo-fit">
/* Mobile only: same full-frame photo fit as homepage / Naples / Bonita. */
@media (max-width: 767px) {
  .hero-mobile-img,
  .ni-img,
  .pp-img,
  .sb-img {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    aspect-ratio: auto !important;
    object-fit: contain !important;
    object-position: center center !important;
    display: block !important;
    transform: none !important;
  }
  .ni-img-wrap,
  .sb-img-wrap,
  .pp-item {
    height: auto !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }
  .pp-item:hover .pp-img {
    transform: none !important;
  }
}
</style>`;

const newFit = `<style id="estero-mobile-photo-fit">
/* Mobile: same full-frame fit as homepage / residential / Naples (1400×933). */
@media (max-width: 767px) {
  .hero-mobile {
    display: flex !important;
    flex-direction: column !important;
  }
  .hero-mobile picture {
    display: block !important;
    width: 100% !important;
    line-height: 0 !important;
  }
  .hero-mobile-img,
  .ni-img,
  .pp-img,
  .sb-img {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    aspect-ratio: 1400 / 933 !important;
    object-fit: contain !important;
    object-position: center center !important;
    display: block !important;
    transform: none !important;
  }
  .ni-img-wrap,
  .sb-img-wrap,
  .pp-item {
    height: auto !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }
  .pp-item:hover .pp-img {
    transform: none !important;
  }
}
</style>`;

if (!html.includes('id="estero-mobile-photo-fit"')) {
  throw new Error("estero-mobile-photo-fit block missing");
}
if (!html.includes(oldFit)) {
  // fallback: replace by id block loosely
  html = html.replace(
    /<style id="estero-mobile-photo-fit">[\s\S]*?<\/style>/,
    newFit
  );
} else {
  html = html.replace(oldFit, newFit);
}

fs.writeFileSync(path, html);
console.log(
  JSON.stringify(
    {
      asset: html.includes(NEW) && !html.includes(OLD),
      baseContain: html.includes(
        ".hero-mobile-img{width:100%;height:auto;min-height:0;max-height:none;object-fit:contain"
      ),
      ratioLock: html.includes("aspect-ratio: 1400 / 933"),
      desktopPos: html.includes("center 18% / cover"),
    },
    null,
    2
  )
);
