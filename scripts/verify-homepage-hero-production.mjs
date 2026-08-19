/**
 * Production homepage hero acceptance — Playwright.
 * Usage: node scripts/verify-homepage-hero-production.mjs [sha]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const sha = process.argv[2] || "local";
const outDir = path.resolve("evidence/homepage-hero-mobile-2026-08-18");
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
];

const url = `https://www.sparklean.co/?v=${encodeURIComponent(sha)}`;

async function measure(page) {
  return page.evaluate(() => {
    const image = document.querySelector(".homepage-hero__media img");
    const media = document.querySelector(".homepage-hero__media");
    const content = document.querySelector(".homepage-hero__content");
    const quote = document.querySelector(".site-header .nav-btn");
    if (!image || !media || !content || !quote) {
      return { error: "missing elements", hasImage: !!image, hasMedia: !!media };
    }
    const box = image.getBoundingClientRect();
    const mediaBox = media.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    const quoteBox = quote.getBoundingClientRect();
    const cs = getComputedStyle(image);
    const mcs = getComputedStyle(media);
    const ratio = box.width / box.height;
    const target = 2048 / 1365;
    return {
      src: image.currentSrc || image.src,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      renderedWidth: box.width,
      renderedHeight: box.height,
      objectFit: cs.objectFit,
      position: cs.position,
      mediaHeight: mediaBox.height,
      mediaMinHeight: mcs.minHeight,
      mediaHeightCss: mcs.height,
      mediaPosition: mcs.position,
      aspectRatioCss: mcs.aspectRatio,
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      noHorizontalScroll: document.documentElement.scrollWidth === window.innerWidth,
      ratioOk: Math.abs(ratio - target) < 0.02,
      ratio,
      target,
      objectFitNotCover: cs.objectFit !== "cover",
      mediaNotViewportHeight:
        !mcs.height.includes("vh") &&
        !mcs.minHeight.includes("vh") &&
        !mcs.minHeight.includes("svh") &&
        parseFloat(mcs.minHeight) === 0,
      imageNotAbsolute: cs.position !== "absolute",
      quoteInside:
        quoteBox.left >= 0 &&
        quoteBox.right <= window.innerWidth + 0.5,
      textBelowImage: contentBox.top >= box.bottom - 1,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".homepage-hero__media img", { timeout: 30000 });
  await page.waitForFunction(() => {
    const img = document.querySelector(".homepage-hero__media img");
    return img && img.naturalWidth > 0;
  });
  const metrics = await measure(page);
  const shotPath = path.join(outDir, `prod-${vp.name}-${sha.slice(0, 7)}.png`);
  await page.screenshot({ path: shotPath, fullPage: false });
  results.push({ vp: vp.name, shotPath, metrics });
  await context.close();
}

await browser.close();

const reportPath = path.join(outDir, `report-${sha.slice(0, 7)}.json`);
fs.writeFileSync(reportPath, JSON.stringify({ url, sha, results }, null, 2));

let allPass = true;
for (const r of results) {
  const m = r.metrics;
  const checks = {
    noHorizontalScroll: m.noHorizontalScroll,
    ratioOk: m.ratioOk,
    objectFitNotCover: m.objectFitNotCover,
    mediaNotViewportHeight: m.mediaNotViewportHeight,
    imageNotAbsolute: m.imageNotAbsolute,
    quoteInside: m.quoteInside,
    textBelowImage: m.textBelowImage,
  };
  const pass = Object.values(checks).every(Boolean);
  allPass = allPass && pass && !m.error;
  console.log("\n===", r.vp, pass ? "PASS" : "FAIL", "===");
  console.log("screenshot", r.shotPath);
  console.log(JSON.stringify({ ...m, checks }, null, 2));
}

console.log("\nALL_PASS", allPass);
console.log("REPORT", reportPath);
process.exit(allPass ? 0 : 1);
