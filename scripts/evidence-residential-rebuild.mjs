/**
 * Screenshots for residential rebuild (local static server).
 * Run: node scripts/evidence-residential-rebuild.mjs
 */
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "evidence", "residential-rebuild-2026-08-18");
fs.mkdirSync(outDir, { recursive: true });

const MAP = {
  "/residential-cleaning": "pages/residential-cleaning.html",
};
function ctype(p) {
  if (p.endsWith(".css")) return "text/css";
  if (p.endsWith(".js")) return "application/javascript";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  return "text/html; charset=utf-8";
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || "/", "http://127.0.0.1");
  let rel = MAP[u.pathname];
  if (!rel) {
    const clean = u.pathname.replace(/^\//, "");
    if (clean.startsWith("css/") || clean.startsWith("js/") || clean.startsWith("images/")) rel = clean;
  }
  if (!rel) {
    res.writeHead(404);
    res.end("nf");
    return;
  }
  const abs = path.join(root, rel);
  if (!abs.startsWith(root) || !fs.existsSync(abs)) {
    res.writeHead(404);
    res.end("miss");
    return;
  }
  res.writeHead(200, { "Content-Type": ctype(abs) });
  res.end(fs.readFileSync(abs));
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const notes = [];

try {
  for (const [name, size] of [
    ["desktop", { width: 1280, height: 800 }],
    ["tablet", { width: 834, height: 1112 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport: size });
    await page.goto(`${base}/residential-cleaning`, { waitUntil: "networkidle" });
    const h1 = await page.locator("#residential-hero h1").innerText();
    const trust = await page.locator("#trust .t-title").allTextContents();
    const marco = await page.locator("text=Marco Island").count();
    const stacked = await page.evaluate(() => {
      const hero = document.getElementById("residential-hero");
      const bg = hero && hero.querySelector(".hero-bg");
      const cs = bg && getComputedStyle(bg);
      return {
        display: cs && cs.display,
        position: cs && cs.position,
        h1Left: hero && hero.querySelector("h1") && hero.querySelector("h1").getBoundingClientRect().left,
      };
    });
    notes.push(`${name}: h1=${JSON.stringify(h1.replace(/\s+/g, " ").trim())}`);
    notes.push(`${name}: trust=${trust.join(" | ")}`);
    notes.push(`${name}: marcoCount=${marco} heroBg=${stacked.display}/${stacked.position} h1Left=${Math.round(stacked.h1Left || 0)}`);
    await page.screenshot({ path: path.join(outDir, `${name}-hero.png`), fullPage: false });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(path.join(outDir, "NOTES.txt"), notes.join("\n") + "\n");
console.log(notes.join("\n"));
console.log("Wrote", outDir);
