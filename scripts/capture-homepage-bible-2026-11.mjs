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
  // 1440 CSS px at 125% browser zoom ≈ 1152×720 layout viewport.
  { name: "desktop-1440-zoom125", width: 1152, height: 720 },
];

const browser = await chromium.launch();
let quoteClipFails = 0;

async function capture(label, width, height) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector(".homepage-hero__media img", { timeout: 20000 });
  const metrics = await page.evaluate((vw) => {
    const doc = document.documentElement;
    const btn = document.querySelector(".site-header .nav-btn");
    const r = btn ? btn.getBoundingClientRect() : null;
    const hamburger = document.querySelector(".nav-hamburger");
    const quoteVisible = !!(btn && getComputedStyle(btn).display !== "none");
    const quoteClip = !r
      ? true
      : r.right > vw + 1 || r.left < -1 || r.width < 72;
    return {
      overflowPx: doc.scrollWidth - doc.clientWidth,
      quoteText: btn ? btn.textContent.replace(/\s+/g, " ").trim() : "",
      quoteRight: r ? Math.round(r.right) : null,
      quoteWidth: r ? Math.round(r.width) : null,
      quoteVisible,
      quoteClip,
      hamburgerDisplay: hamburger ? getComputedStyle(hamburger).display : "",
    };
  }, width);
  const topPath = path.join(outDir, `${label}-top.png`);
  await page.screenshot({ path: topPath, fullPage: false });
  const fullPath = path.join(outDir, `${label}-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  await page.close();
  if (metrics.quoteClip || !metrics.quoteVisible) quoteClipFails += 1;
  console.log(
    JSON.stringify({
      label,
      overflowPx: metrics.overflowPx,
      quoteText: metrics.quoteText,
      quoteRight: metrics.quoteRight,
      quoteWidth: metrics.quoteWidth,
      quoteVisible: metrics.quoteVisible,
      quoteClip: metrics.quoteClip,
      hamburgerDisplay: metrics.hamburgerDisplay,
      top: path.basename(topPath),
      full: path.basename(fullPath),
    }),
  );
  return metrics.overflowPx;
}

async function checkIntake() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  const hrefs = await page.evaluate(() => {
    const sel = (type) => {
      const el = document.querySelector(
        `.svc-card--feature[data-sparklean-event-type="${type}"]`,
      );
      return {
        href: el ? el.getAttribute("href") : null,
        intake: el ? el.hasAttribute("data-sparklean-intake") : false,
      };
    };
    return { porter: sel("day_porter"), hospitality: sel("hospitality_program") };
  });
  const durable =
    hrefs.porter.href === "/contact?quote=1#quote-intake" &&
    hrefs.porter.intake &&
    hrefs.hospitality.href === "/contact?quote=1#quote-intake" &&
    hrefs.hospitality.intake;
  const origin = new URL(BASE).origin;
  await page.goto(`${origin}/pages/contact.html?quote=1#quote-intake`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector(".sq-intake.is-open") ||
        document.body.classList.contains("sq-intake-open")
      ),
    { timeout: 15000 },
  );
  const contactOpen = await page.evaluate(() => ({
    path: location.pathname,
    search: location.search,
    hash: location.hash,
    open: !!(
      document.querySelector(".sq-intake.is-open") ||
      document.body.classList.contains("sq-intake-open")
    ),
  }));
  await page.close();
  console.log(JSON.stringify({ hrefs, durable, contactOpen }));
  return durable && contactOpen.open;
}

let worstOverflow = 0;
for (const s of shots) {
  worstOverflow = Math.max(worstOverflow, await capture(s.name, s.width, s.height));
}
const intakeOk = await checkIntake();

await browser.close();
console.log(
  JSON.stringify({
    ok: worstOverflow <= 8 && quoteClipFails === 0 && intakeOk,
    worstOverflow,
    quoteClipFails,
    intakeOk,
    outDir,
  }),
);
if (worstOverflow > 8 || quoteClipFails > 0 || !intakeOk) process.exit(2);
