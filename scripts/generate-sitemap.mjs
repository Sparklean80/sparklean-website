/**
 * Build-time sitemap generator for Netlify deploys.
 * Source of truth: netlify.toml [[redirects]] with status 200 → /pages/*.html
 * Plus the homepage. Re-run on every deploy; add a redirect + page to pick up new URLs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SITE_ORIGIN = "https://www.sparklean.co";
const NETLIFY_TOML = path.join(ROOT, "netlify.toml");
const OUT_FILE = path.join(ROOT, "sitemap.xml");

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizePath(from) {
  if (!from || from === "/") return "/";
  return from.replace(/\/+$/, "") || "/";
}

function parseRedirects(tomlText) {
  /** @type {{ from: string, to: string, status: number }[]} */
  const blocks = [];
  /** @type {{ from?: string, to?: string, status?: number }} */
  let cur = {};
  for (const line of tomlText.split(/\r?\n/)) {
    if (line.trim() === "[[redirects]]") {
      if (cur.from && cur.to != null && cur.status != null) blocks.push(/** @type {any} */ ({ ...cur }));
      cur = {};
      continue;
    }
    const mf = line.match(/^\s*from\s*=\s*"([^"]*)"/);
    const mt = line.match(/^\s*to\s*=\s*"([^"]*)"/);
    const ms = line.match(/^\s*status\s*=\s*(\d+)/);
    if (mf) cur.from = mf[1];
    if (mt) cur.to = mt[1];
    if (ms) cur.status = Number(ms[1], 10);
  }
  if (cur.from && cur.to != null && cur.status != null) blocks.push(/** @type {any} */ ({ ...cur }));
  return blocks;
}

function metaForPath(p) {
  if (p === "/") return { changefreq: "weekly", priority: "1.0" };
  if (p === "/blog") return { changefreq: "weekly", priority: "0.9" };
  if (p === "/inner-circle") return { changefreq: "monthly", priority: "0.75" };
  if (p.startsWith("/house-cleaning")) return { changefreq: "monthly", priority: "0.85" };
  if (["/residential-cleaning", "/commercial-cleaning", "/post-construction-cleaning"].includes(p))
    return { changefreq: "monthly", priority: "0.9" };
  if (p === "/specialized-cleaning") return { changefreq: "monthly", priority: "0.85" };
  if (p === "/about" || p === "/contact") return { changefreq: "monthly", priority: "0.7" };
  return { changefreq: "monthly", priority: "0.65" };
}

function lastmodYmd(filePath) {
  try {
    const st = fs.statSync(filePath);
    return st.mtime.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function main() {
  const toml = fs.readFileSync(NETLIFY_TOML, "utf8");
  const redirects = parseRedirects(toml);

  /** @type {Map<string, { file: string, lastmod: string | null }>} */
  const urlMap = new Map();

  urlMap.set("/", {
    file: path.join(ROOT, "index.html"),
    lastmod: lastmodYmd(path.join(ROOT, "index.html")),
  });

  for (const r of redirects) {
    if (r.status !== 200) continue;
    if (!r.to || !r.to.startsWith("/pages/") || !r.to.endsWith(".html")) continue;
    const key = normalizePath(r.from);
    const diskPath = path.join(ROOT, r.to.replace(/^\//, ""));
    if (!fs.existsSync(diskPath)) {
      console.warn(`[sitemap] missing file for redirect: ${r.from} → ${r.to}`);
      continue;
    }
    const lm = lastmodYmd(diskPath);
    const prev = urlMap.get(key);
    if (!prev || (lm && prev.lastmod && lm > prev.lastmod) || (lm && !prev.lastmod)) {
      urlMap.set(key, { file: diskPath, lastmod: lm });
    }
  }

  const pagesDir = path.join(ROOT, "pages");
  const htmlFiles = fs.existsSync(pagesDir)
    ? fs.readdirSync(pagesDir).filter((f) => f.endsWith(".html"))
    : [];
  const targets = new Set(
    [...urlMap.values()].map((e) => path.basename(e.file)).filter(Boolean)
  );
  for (const f of htmlFiles) {
    if (!targets.has(f)) {
      console.warn(`[sitemap] orphan page (no 200 rewrite in netlify.toml): pages/${f}`);
    }
  }

  const entries = [...urlMap.entries()]
    .map(([pathname, { lastmod }]) => {
      const loc = pathname === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${pathname}`;
      const meta = metaForPath(pathname);
      return { pathname, loc, lastmod, ...meta };
    })
    .sort((a, b) => {
      if (a.pathname === "/") return -1;
      if (b.pathname === "/") return 1;
      return a.pathname.localeCompare(b.pathname);
    });

  const body = entries
    .map((e) => {
      const lm = e.lastmod ? `<lastmod>${escapeXml(e.lastmod)}</lastmod>` : "";
      return `  <url><loc>${escapeXml(e.loc)}</loc>${lm}<changefreq>${escapeXml(e.changefreq)}</changefreq><priority>${escapeXml(e.priority)}</priority></url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  fs.writeFileSync(OUT_FILE, xml, "utf8");
  console.log(`[sitemap] wrote ${OUT_FILE} (${entries.length} URLs)`);
}

main();
