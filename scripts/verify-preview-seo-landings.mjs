const urls = [
  '/house-cleaning-naples',
  '/house-cleaning-fort-myers',
  '/house-cleaning-bonita-springs',
  '/house-cleaning-estero',
  '/house-cleaning-cape-coral',
  '/vacation-rental-cleaning',
  '/residential-cleaning',
];
const base = process.argv[2] || 'https://6a7f5ea0315c536f6bf99651--sparklean-website.netlify.app';

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

for (const u of urls) {
  const res = await fetch(base + u, { redirect: 'manual' });
  const html = await res.text();
  const title = pick(html, /<title>([^<]*)<\/title>/i);
  const canon =
    pick(html, /rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    pick(html, /href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const desc =
    pick(html, /name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    pick(html, /content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  );
  const robots = pick(html, /name=["']robots["'][^>]*content=["']([^"']*)["']/i) || '(none)';
  const row = {
    u,
    status: res.status,
    title,
    canon,
    desc: desc ? desc.slice(0, 90) : null,
    h1Count: h1s.length,
    h1: h1s[0] || null,
    robots,
    paid: /id=["']paid-match["']/.test(html),
    cost: /id=["']cost-factors["']/.test(html),
    ads: html.includes('sparklean-ads.js'),
    tel: html.includes('tel:2398883588'),
  };
  console.log(JSON.stringify(row));
}
