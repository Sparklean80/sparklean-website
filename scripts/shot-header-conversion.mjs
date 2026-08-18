import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { createReadStream, existsSync, statSync } from "fs";
import { extname, join, normalize } from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "evidence", "sparklean-header-conversion-2026-08-18");
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function serve(root) {
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = normalize(join(root, urlPath.replace(/^\//, "")));
    if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  });
}

const server = serve(ROOT);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
const sizes = [
  { name: "desktop-1920", w: 1920, h: 1080, scroll: false },
  { name: "desktop-1440", w: 1440, h: 900, scroll: false },
  { name: "desktop-1280", w: 1280, h: 800, scroll: false },
  { name: "desktop-1920-scrolled", w: 1920, h: 1080, scroll: true },
  { name: "desktop-1280-scrolled", w: 1280, h: 800, scroll: true },
  { name: "tablet-768", w: 768, h: 1024, scroll: false },
  { name: "mobile-390", w: 390, h: 844, scroll: false },
];

for (const s of sizes) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  if (s.scroll) {
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(400);
  }
  await page.screenshot({
    path: path.join(OUT, `${s.name}.png`),
    clip: { x: 0, y: 0, width: s.w, height: Math.min(220, s.h) },
  });
  await page.close();
}

// Open Services menu + rewards panel at 1440
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.locator('#nav-menu-services').evaluate(() => {});
  await page.locator('button[aria-controls="nav-menu-services"]').click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(OUT, "desktop-1440-services-open.png"),
    clip: { x: 0, y: 0, width: 1440, height: 420 },
  });
  await page.locator(".rewards-topbar").click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(OUT, "desktop-1440-rewards-open.png"),
    clip: { x: 0, y: 0, width: 1440, height: 520 },
  });
  await page.close();
}

await browser.close();
server.close();
console.log("Wrote evidence to", OUT);
