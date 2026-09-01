/**
 * PNG evidence for lead email templates (desktop 600px + mobile 390px).
 * Run after: node scripts/test-lead-email-templates.mjs
 */
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = join(root, "evidence", "lead-email-regression-2026-09-01");

const shots = [
  ["quote-desktop-600.html", "quote-desktop-600.png", 600, 900],
  ["quote-mobile-390.html", "quote-mobile-390.png", 390, 844],
  ["contact-desktop-600.html", "contact-desktop-600.png", 600, 900],
  ["contact-mobile-390.html", "contact-mobile-390.png", 390, 844],
];

async function main() {
  if (!existsSync(evidenceDir)) {
    console.error("Missing evidence dir — run test-lead-email-templates.mjs first");
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [html, png, width, height] of shots) {
    const file = join(evidenceDir, html);
    if (!existsSync(file)) {
      console.error("Missing", file);
      process.exit(1);
    }
    await page.setViewportSize({ width, height });
    await page.goto(`file:///${file.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(evidenceDir, png), fullPage: true });
    console.log("OK", png);
  }
  await browser.close();
}

try {
  await main();
} catch (e) {
  if (String(e.message || e).includes("Executable doesn't exist")) {
    console.warn("SKIP PNG capture — run: npx playwright install chromium && npm run test:lead-emails:evidence");
    process.exit(0);
  }
  console.error("FAIL screenshot capture:", e.message || e);
  process.exit(1);
}
