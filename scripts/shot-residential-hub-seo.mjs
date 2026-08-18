import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = "evidence/residential-service-hub-seo-2026-08-18";
const URL = "http://127.0.0.1:4177/pages/residential-cleaning.html";
fs.mkdirSync(OUT, { recursive: true });

const shots = [
  { name: "desktop-hero", width: 1440, height: 900 },
  { name: "tablet-hero", width: 768, height: 1024 },
  { name: "mobile-hero", width: 390, height: 844 },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT, `${s.name}.png`), fullPage: false });
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.locator("#service-areas").scrollIntoViewIfNeeded();
await page.locator("#service-areas").screenshot({ path: path.join(OUT, "desktop-service-areas.png") });
await browser.close();
console.log("wrote", OUT);
