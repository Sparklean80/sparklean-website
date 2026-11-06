/**
 * Viewport evidence for Homepage Master Bible 2.0 review.
 * Usage: node scripts/capture-homepage-bible-2026-11.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:4173/";
const outDir = path.resolve("evidence/homepage-master-bible-2026-11-06");
fs.mkdirSync(outDir, { recursive: true });

const shots = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-430", width: 430, height: 932 },
];

const browser = await chromium.launch();

async function capture(label, width, height, extra = {}) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: extra.deviceScaleFactor || 1,
  });
  if (extra.zoom) {
    await page.evaluateOnNewDocument((z) => {
      document.documentElement.style.zoom = String(z);
    }, extra.zoom);
  }
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".homepage-hero__media img", { timeout: 20000 });
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  const topPath = path.join(outDir, `${label}-top.png`);
  await page.screenshot({ path: topPath, fullPage: false });
  const fullPath = path.join(outDir, `${label}-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  await page.close();
  const overflowPx = overflow.scrollWidth - overflow.clientWidth;
  console.log(
    JSON.stringify({
      label,
      overflowPx,
      top: path.basename(topPath),
      full: path.basename(fullPath),
    }),
  );
  return overflowPx;
}

let worstOverflow = 0;
for (const s of shots) {
  worstOverflow = Math.max(worstOverflow, await capture(s.name, s.width, s.height));
}
worstOverflow = Math.max(
  worstOverflow,
  await capture("desktop-1440-zoom125", 1440, 900, { zoom: 1.25 }),
);

await browser.close();
console.log(JSON.stringify({ ok: true, worstOverflow, outDir }));
if (worstOverflow > 8) process.exit(2);
