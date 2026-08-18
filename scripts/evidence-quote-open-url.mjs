/**
 * Local browser evidence for durable quote URL (no lead submit, no Ads fire).
 * Run: node scripts/evidence-quote-open-url.mjs
 */
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "evidence", "quote-open-url-2026-08-17");
fs.mkdirSync(outDir, { recursive: true });

const MAP = {
  "/": "index.html",
  "/contact": "pages/contact.html",
  "/residential-cleaning": "pages/residential-cleaning.html",
  "/commercial-cleaning": "pages/commercial-cleaning.html",
  "/house-cleaning-naples": "pages/house-cleaning-naples.html",
};

function contentType(p) {
  if (p.endsWith(".css")) return "text/css";
  if (p.endsWith(".js")) return "application/javascript";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".svg")) return "image/svg+xml";
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
    res.end("not found");
    return;
  }
  const abs = path.join(root, rel);
  if (!abs.startsWith(root) || !fs.existsSync(abs)) {
    res.writeHead(404);
    res.end("missing");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType(abs) });
  res.end(fs.readFileSync(abs));
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });
const notes = [];

async function shot(name, page) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  notes.push(`screenshot ${name}`);
}

try {
  // Desktop: direct durable URL opens intake
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${base}/contact?quote=1#quote-intake`, { waitUntil: "networkidle" });
    await page.waitForSelector("#sparklean-quote-intake.is-open", { timeout: 8000 });
    const conv = await page.evaluate(() => {
      const hits = [];
      const g = window.gtag;
      // cannot easily intercept prior; check overlay open only
      return {
        open: !!(document.getElementById("sparklean-quote-intake") && document.getElementById("sparklean-quote-intake").classList.contains("is-open")),
        landmark: !!document.getElementById("quote-intake"),
        form: !!document.getElementById("sparklean-contact-form"),
      };
    });
    notes.push(`desktop direct open=${conv.open} landmark=${conv.landmark} form=${conv.form}`);
    await shot("desktop-contact-quote1-open.png", page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#sparklean-quote-intake.is-open", { timeout: 8000 });
    notes.push("desktop refresh reopens intake");
    await shot("desktop-contact-quote1-refresh.png", page);
    await page.close();
  }

  // Mobile: residential CTA href is durable
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${base}/residential-cleaning`, { waitUntil: "networkidle" });
    const href = await page.locator('a.btn-gold[data-sparklean-intake-preset="recurringResidential"]').first().getAttribute("href");
    notes.push(`mobile residential CTA href=${href}`);
    if (!href || !href.includes("quote=1")) throw new Error("residential CTA missing durable URL: " + href);
    await shot("mobile-residential-cta.png", page);
    await page.goto(`${base}${href.startsWith("http") ? new URL(href).pathname + new URL(href).search + new URL(href).hash : href}`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector("#sparklean-quote-intake.is-open", { timeout: 8000 });
    notes.push("mobile residential CTA → contact opens intake");
    await shot("mobile-residential-to-contact-open.png", page);
    await page.close();
  }

  // JS-delayed: landmark + form visible before intake scripts
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.route("**/js/quote-intake.js", (route) => route.abort());
    await page.goto(`${base}/contact?quote=1#quote-intake`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#quote-intake", { timeout: 5000 });
    await page.waitForSelector("#sparklean-contact-form", { timeout: 5000 });
    const open = await page.locator("#sparklean-quote-intake.is-open").count();
    notes.push(`js-blocked: landmark+form visible; overlay open count=${open}`);
    await shot("desktop-js-blocked-fallback.png", page);
    await page.close();
  }

  // Naples CTA sample
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`${base}/house-cleaning-naples`, { waitUntil: "networkidle" });
    const href = await page.locator("a.nav-btn[data-sparklean-intake]").getAttribute("href");
    notes.push(`naples nav quote href=${href}`);
    await shot("desktop-naples-nav-quote.png", page);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(path.join(outDir, "NOTES.txt"), notes.join("\n") + "\n");
console.log(notes.join("\n"));
console.log("Wrote evidence to", outDir);
