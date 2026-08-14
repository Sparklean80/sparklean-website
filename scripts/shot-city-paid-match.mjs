import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const BASE =
  process.argv[2] || "https://city-paid-match-ui--sparklean-website.netlify.app";
const OUT =
  "docs/work-notes/2026-08-14-city-paid-match-redesign/screenshots";
const CITIES = [
  "naples",
  "bonita-springs",
  "estero",
  "fort-myers",
  "cape-coral",
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function shoot(viewport, suffix) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  for (const city of CITIES) {
    await page.goto(`${BASE}/house-cleaning-${city}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector("#paid-match", { state: "visible" });
    await page.evaluate(() => {
      const el = document.querySelector("#paid-match");
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo(0, Math.max(0, top));
    });
    await page.waitForTimeout(600);
    const paidPath = path.join(OUT, `${city}-${suffix}-paid-match.png`);
    await page.locator("#paid-match").screenshot({ path: paidPath });
    console.log("wrote", paidPath);

    await page.evaluate(() => {
      const el = document.querySelector("#local-coverage");
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo(0, Math.max(0, top));
    });
    await page.waitForTimeout(500);
    const localPath = path.join(OUT, `${city}-${suffix}-local.png`);
    await page.locator("#local-coverage").screenshot({ path: localPath });
    console.log("wrote", localPath);
  }
  await context.close();
}

await shoot({ width: 1440, height: 1200 }, "desktop");
await shoot({ width: 390, height: 900 }, "mobile");
await browser.close();
console.log("done");
