/**
 * Live verification crawl for https://www.sparklean.co — read-only, no design changes.
 * Usage: node _crawl-verify.js
 */
const ORIGIN = 'https://www.sparklean.co';
const APEX = 'https://sparklean.co';

/** Crawl + link checks: completed pages only (unfinished routes ignored per deploy plan). */
const SEEDS = [
  '/',
  '/blog',
  '/residential-cleaning',
  '/commercial-cleaning',
  '/post-construction-cleaning',
  '/house-cleaning-naples',
  '/house-cleaning-fort-myers',
  '/house-cleaning-bonita-springs',
  '/house-cleaning-estero',
  '/house-cleaning-cape-coral',
];

const UNFINISHED_PATHS = new Set([
  '/contact',
  '/about',
  '/specialized-cleaning',
  '/locations',
  '/services',
]);

function isUnfinishedPath(pathname) {
  if (!pathname) return false;
  const p = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return UNFINISHED_PATHS.has(p);
}

const suspiciousHrefPatterns = [
  { name: 'Brizy', re: /brizy/i },
  { name: 'Webflow designer URL', re: /webflow\.io\/design/i },
  { name: 'webflow.io subdomain (non-CDN)', re: /https?:\/\/[^/]+\.webflow\.io\//i },
  { name: 'Old /pages/*.html in href', re: /href=["'][^"']*\/pages\/[^"']*\.html/i },
];

function absUrl(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function isInternal(u) {
  try {
    const x = new URL(u);
    return x.hostname === 'www.sparklean.co' || x.hostname === 'sparklean.co';
  } catch {
    return false;
  }
}

function normalizeInternal(u) {
  const x = new URL(u);
  x.hash = '';
  // trailing slash only for root
  if (x.pathname !== '/' && x.pathname.endsWith('/')) x.pathname = x.pathname.slice(0, -1);
  return x.href;
}

async function checkUrlGet(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(25000) });
    const ok = r.ok;
    const fu = new URL(r.url);
    const wrongHost = fu.hostname !== 'www.sparklean.co';
    return { ok, status: r.status, finalUrl: r.url, wrongHost };
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e) };
  }
}

function extractHrefs(html) {
  const out = new Set();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
}

function extractCanonical(html) {
  const m = html.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]*>/i);
  if (!m) return null;
  const h = m[0].match(/href\s*=\s*["']([^"']+)["']/i);
  return h ? h[1] : null;
}

function checkBlogSignals(html, pageUrl) {
  if (!pageUrl.includes('/blog')) return null;
  return {
    hasBlogGrid: /class=["'][^"']*blog-grid/i.test(html),
    hasBlogCards: /class=["'][^"']*blog-card/i.test(html),
    hasDataArticle: /data-article=/i.test(html),
    hasMain: /<main[^>]*id=["']main-content["']/i.test(html),
  };
}

function checkMobileNav(html) {
  const hasHamburger = /nav-hamburger|id=["']hamburger["']/i.test(html);
  const hasMobileMenu = /nav-mobile-menu|id=["']mobileMenu["']/i.test(html);
  const mobileBlock = html.match(/nav-mobile-menu[\s\S]{0,12000}/i);
  const snippet = mobileBlock ? mobileBlock[0] : '';
  const hrefsInMobile = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(snippet))) hrefsInMobile.push(m[1]);
  return { hasHamburger, hasMobileMenu, mobileHrefCount: hrefsInMobile.length, mobileHrefs: hrefsInMobile };
}

function checkFooter(html) {
  const ft = html.match(/<footer[\s\S]*?<\/footer>/i);
  if (!ft) return { hasFooter: false };
  const block = ft[0];
  const hrefs = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(block))) hrefs.push(m[1]);
  return { hasFooter: true, footerHrefCount: hrefs.length, footerHrefs: hrefs };
}

function cityCrossLinks(html, pagePath) {
  const cities = [
    '/house-cleaning-naples',
    '/house-cleaning-fort-myers',
    '/house-cleaning-bonita-springs',
    '/house-cleaning-estero',
    '/house-cleaning-cape-coral',
  ];
  if (!cities.some((c) => pagePath.startsWith(c))) return null;
  const found = cities.filter((c) => {
    if (c === pagePath) return false;
    const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`href=["']${esc}["']`).test(html);
  });
  return {
    pagePath,
    cityLinksToOthers: found,
    missingToOthers: cities.filter((c) => c !== pagePath && !found.includes(c)),
  };
}

function contactIntent(html) {
  const issues = [];
  const navLinks = html.match(/<nav[\s\S]*?<\/nav>/i);
  if (navLinks) {
    const n = navLinks[0];
    if (/>contact</i.test(n) && /href=["']#quote["']/i.test(n)) issues.push('Contact label may point to #quote in nav');
    if (/>contact</i.test(n) && /href=["']\/contact["']/i.test(n)) issues.push('Contact label points to /contact in nav');
  }
  const mob = html.match(/nav-mobile-menu[\s\S]*?<\/div>/i);
  if (mob) {
    const m = mob[0];
    if (/>contact</i.test(m) && /href=["']#quote["']/i.test(m)) issues.push('Mobile menu: Contact -> #quote');
    if (/>contact</i.test(m) && /href=["']\/contact["']/i.test(m)) issues.push('Mobile menu: Contact -> /contact');
  }
  return issues;
}

(async () => {
  const results = {};
  const allTargets = new Set();
  const pageBodies = {};

  console.log('=== Fetching seed pages (GET, follow redirects) ===\n');
  for (const path of SEEDS) {
    const url = path === '/' ? ORIGIN + '/' : ORIGIN + path;
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const text = await r.text();
    results[path] = { status: r.status, finalUrl: r.url, bytes: text.length };
    if (r.status !== 200) {
      console.log(path, 'STATUS', r.status, 'final', r.url);
      continue;
    }
    pageBodies[path] = text;
    extractHrefs(text).forEach((h) => {
      const a = absUrl(h, url);
      if (a && isInternal(a)) allTargets.add(normalizeInternal(a));
    });
  }

  console.log('\n=== Seed status summary ===');
  for (const p of SEEDS) {
    const u = p === '/' ? ORIGIN + '/' : ORIGIN + p;
    const st = results[p]?.status;
    console.log(st === 200 ? 'OK  ' : 'BAD ', st, p);
  }

  console.log('\n=== Unique internal link targets (from seeds) ===', allTargets.size);

  console.log('\n=== GET check internal targets (follow redirects; unfinished paths skipped) ===');
  const bad = [];
  const hostWarn = [];
  for (const u of [...allTargets].sort()) {
    let path;
    try {
      path = new URL(u).pathname;
    } catch {
      continue;
    }
    if (isUnfinishedPath(path)) {
      console.log('SKIP (unfinished)', u);
      continue;
    }
    const res = await checkUrlGet(u);
    if (res.wrongHost) hostWarn.push({ u, ...res });
    if (!res.ok || res.status === 404) {
      bad.push({ u, ...res });
      console.log('FAIL', u, '->', res.status, res.finalUrl || '', res.error || '');
    }
  }
  if (hostWarn.length) {
    console.log('\n=== Host note (expect none after apex→www redirect is live) ===');
    hostWarn.forEach((w) => console.log('HOST', w.u, '->', w.finalUrl));
  }
  if (bad.length === 0) console.log('All checked internal targets: 2xx on completed pages.');

  console.log('\n=== Canonical check (seed pages only) ===');
  for (const p of SEEDS) {
    const html = pageBodies[p];
    if (!html) {
      console.log('SKIP', p, '(no body)');
      continue;
    }
    const c = extractCanonical(html);
    const apex = c && c.startsWith(APEX);
    const okCanon = c && (c === ORIGIN || c === ORIGIN + '/' || c.startsWith(ORIGIN + '/'));
    console.log(okCanon && !apex ? 'OK  ' : 'WARN', p, '|', c || '(missing)', apex ? '[APEX]' : !c ? '[MISSING]' : !okCanon ? '[NON-WWW HOST?]' : '');
  }

  console.log('\n=== Apex host in absolute URLs (seed pages; excludes https://www.) ===');
  let apexCount = 0;
  const apexAbsRe = /https:\/\/sparklean\.co\//g;
  for (const p of SEEDS) {
    const html = pageBodies[p];
    if (!html) continue;
    const n = (html.match(apexAbsRe) || []).length;
    if (n > 0) {
      apexCount += n;
      console.log('FOUND apex https://sparklean.co/... in HTML:', p, 'count', n);
    }
  }
  if (apexCount === 0) console.log('No https://sparklean.co/... absolute URLs in seed HTML.');

  console.log('\n=== Suspicious patterns in seed HTML ===');
  for (const p of SEEDS) {
    const html = pageBodies[p];
    if (!html) continue;
    for (const { name, re } of suspiciousHrefPatterns) {
      if (re.test(html)) console.log(p, '->', name);
    }
  }

  console.log('\n=== Footer presence (seeds with 200) ===');
  for (const p of SEEDS) {
    const html = pageBodies[p];
    if (!html) continue;
    const f = checkFooter(html);
    console.log(p, f.hasFooter ? `footer links: ${f.footerHrefCount}` : 'NO FOOTER');
  }

  console.log('\n=== City cross-link check (city pages only) ===');
  for (const p of SEEDS) {
    if (!p.includes('house-cleaning')) continue;
    const html = pageBodies[p];
    if (!html) continue;
    console.log(JSON.stringify(cityCrossLinks(html, p)));
  }

  console.log('\n=== Mobile nav structure ===');
  for (const p of ['/', '/blog', '/residential-cleaning', '/commercial-cleaning']) {
    const html = pageBodies[p];
    if (!html) continue;
    console.log(p, JSON.stringify(checkMobileNav(html)));
  }

  console.log('\n=== Blog page signals ===');
  const bh = pageBodies['/blog'];
  if (bh) console.log(JSON.stringify(checkBlogSignals(bh, '/blog'), null, 2));
  else console.log('Blog seed not 200 — skip');

  console.log('\n=== Nav / mobile Contact routing ===');
  for (const p of SEEDS) {
    const html = pageBodies[p];
    if (!html) continue;
    const ci = contactIntent(html);
    if (ci.length) console.log(p, ci.join(' | '));
  }

  console.log('\n=== #quote vs /contact (counts in full page) ===');
  for (const p of SEEDS) {
    const html = pageBodies[p];
    if (!html) continue;
    const toQuote = (html.match(/href=["']#quote["']/gi) || []).length;
    const toContact = (html.match(/href=["']\/contact["']/gi) || []).length;
    console.log(p, 'href=#quote:', toQuote, '| href=/contact:', toContact);
  }

  console.log('\nDone.');
  if (hostWarn.length && process.env.CRAWL_FAIL_ON_HOST === '1') {
    console.error('CRAWL_FAIL_ON_HOST=1: final URL host is not www.sparklean.co for some requests.');
    process.exit(1);
  }
  process.exit(bad.length > 0 ? 1 : 0);
})();
