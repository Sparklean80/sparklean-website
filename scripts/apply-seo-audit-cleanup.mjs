/**
 * Apply SEO audit cleanup batch (2026-08-24):
 * - Shorten titles/meta descriptions
 * - Inject footer Privacy / Terms / Accessibility links
 *
 * Run: node scripts/apply-seo-audit-cleanup.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {Record<string, { title?: string; description?: string }>} */
const META = {
  "index.html": {
    description:
      "Supervised house, commercial and post-construction cleaning in Naples, Bonita Springs, Estero, Fort Myers and Cape Coral. Bonded, insured, 24-hour guarantee.",
  },
  "pages/about.html": {
    description:
      "Meet founders Tony Giuliano and Roxana Tellez—operations discipline and physician-led standards behind Sparklean Cleaning for homes and businesses from Naples to Cape Coral.",
  },
  "pages/blog.html": {
    title: "Cleaning Advice &amp; Local Guides | Sparklean",
    description:
      "Guides to help you choose and manage professional cleaning—recurring care, accountability, post-construction, and partner expectations.",
  },
  "pages/commercial-cleaning.html": {
    description:
      "Commercial and janitorial cleaning for offices, dealerships, medical suites, and schools in Naples, Fort Myers, Estero, Bonita Springs and Cape Coral.",
  },
  "pages/contact.html": {
    description:
      "Request a cleaning quote in Naples, Fort Myers, Bonita Springs, Estero, or Cape Coral. Call (239) 888-3588. Bonded, insured, Workers’ Comp.",
  },
  "pages/post-construction-cleaning.html": {
    description:
      "Post-construction and remodel cleaning for new builds and renovations in Naples, Fort Myers, Estero, Bonita Springs and Cape Coral.",
  },
  "pages/vacation-rental-cleaning.html": {
    title: "Vacation Rental Cleaning Naples FL | Sparklean",
    description:
      "Guest-ready vacation rental and Airbnb turnover cleaning in Naples, Fort Myers, Bonita Springs, Estero and Cape Coral. Lockbox access. Bonded and insured.",
  },
  "pages/specialized-cleaning.html": {
    title: "Add-On Cleaning Services Naples FL | Sparklean",
    description:
      "Premium add-on cleaning—tile and grout, windows, kitchen detailing, and concierge extras—in Naples, Bonita Springs, Estero, Fort Myers and Cape Coral.",
  },
  "pages/inner-circle.html": {
    title: "Sparklean Inner Circle | Recurring Membership",
    description:
      "Private recurring household membership with continuity, priority scheduling, and elevated care in Naples, Bonita Springs, Estero, Fort Myers and Cape Coral.",
  },
  "pages/partners.html": {
    title: "Referral Partners | Sparklean Cleaning",
  },
  "pages/why-sparklean.html": {
    title: "Why Sparklean | Accountable Cleaning",
  },
  "pages/customer-portal.html": {
    description:
      "Sparklean client app for existing customers—pay invoices, request service, and manage your account. For current clients only.",
  },
  "pages/residential-cleaning.html": {
    description:
      "Recurring, deep, move-in/out, and one-time residential cleaning from supervised Sparklean teams in Naples, Bonita Springs, Estero, Fort Myers and Cape Coral.",
  },
  "pages/house-cleaning-bonita-springs.html": {
    title: "House Cleaning Bonita Springs FL | Sparklean",
    description:
      "House cleaning in Bonita Springs—Bonita Bay, Barefoot Beach, Pelican Landing, and gated communities. Supervised teams, bonded and insured.",
  },
  "pages/house-cleaning-cape-coral.html": {
    description:
      "House cleaning in Cape Coral—Cape Harbour, Tarpon Point, Sandoval, and canal homes. Supervised teams, bonded and insured.",
  },
  "pages/house-cleaning-estero.html": {
    description:
      "House cleaning in Estero—West Bay Club, Grandezza, The Brooks, Pelican Sound, and golf communities. Supervised teams, bonded and insured.",
  },
  "pages/house-cleaning-fort-myers.html": {
    description:
      "House cleaning in Fort Myers—Gulf Harbour, McGregor, Heritage Palms, Gateway, and nearby neighborhoods. Supervised teams, bonded and insured.",
  },
  "pages/blog/naples-house-cleaning-when-to-hire-a-pro.html": {
    title: "When to Hire House Cleaning in Naples | Sparklean",
    description:
      "Decide when professional house cleaning makes sense in Naples—humidity, sand, schedules, and what managed care looks like.",
  },
  "pages/blog/bonita-springs-house-cleaning-when-to-hire-a-pro.html": {
    title: "When to Hire House Cleaning in Bonita Springs",
    description:
      "Decide when professional house cleaning makes sense in Bonita Springs—gated communities, seasonal homes, and busy schedules.",
  },
  "pages/blog/estero-house-cleaning-when-to-hire-a-pro.html": {
    title: "When to Hire House Cleaning in Estero | Sparklean",
    description:
      "Decide when professional house cleaning makes sense in Estero—golf communities, family homes, and busy schedules.",
  },
  "pages/blog/fort-myers-house-cleaning-when-to-hire-a-pro.html": {
    title: "When to Hire House Cleaning in Fort Myers | Sparklean",
    description:
      "Decide when professional house cleaning makes sense in Fort Myers—humidity, sand, and busy household schedules.",
  },
  "pages/blog/cape-coral-house-cleaning-when-to-hire-a-pro.html": {
    title: "When to Hire House Cleaning in Cape Coral | Sparklean",
    description:
      "Decide when professional house cleaning makes sense in Cape Coral—humidity, sand, canal homes, and busy schedules.",
  },
  "pages/blog/naples-post-construction-cleaning-before-move-in.html": {
    title: "Post-Construction Cleaning Before Move-In | Sparklean",
    description:
      "How post-construction cleaning prepares a Naples remodel or new build for move-in—and when to schedule Sparklean.",
  },
  "pages/blog/bonita-springs-post-construction-cleaning-remodel-new-build.html": {
    title: "Post-Construction Cleaning Bonita Springs | Sparklean",
    description:
      "Post-construction cleaning in Bonita Springs for remodels and new builds—Bonita Bay, Pelican Landing, Barefoot Beach.",
  },
  "pages/blog/cape-coral-post-construction-cleaning-remodel-new-build.html": {
    title: "Post-Construction Cleaning Cape Coral | Sparklean",
    description:
      "Post-construction cleaning in Cape Coral for remodels and new builds—builder’s clean, final clean, and dust removal.",
  },
  "pages/blog/naples-office-cleaning-medical-law-firms.html": {
    title: "Naples Office Cleaning | Medical &amp; Legal | Sparklean",
    description:
      "Office cleaning guidance for medical practices, law firms, and professional suites in Naples—waiting rooms, glass, and restrooms.",
  },
  "pages/blog/fort-myers-commercial-office-cleaning.html": {
    title: "Commercial Office Cleaning Fort Myers | Sparklean",
    description:
      "Commercial cleaning in Fort Myers for offices, medical practices, law firms, and retail—Gulf Harbour, Gateway, McGregor.",
  },
  "pages/blog/naples-commercial-cleaning-high-traffic-venues.html": {
    title: "Naples High-Traffic Commercial Cleaning | Sparklean",
    description:
      "Cleaning for Naples dealerships, schools, and theaters—high-traffic venues that need reliable supervised commercial care.",
  },
  "pages/blog/estero-residential-move-out-deep-cleaning.html": {
    title: "Move-Out &amp; Deep Cleaning Estero FL | Sparklean",
    description:
      "Move-out and deep house cleaning in Estero—West Bay Club, Grandezza, The Brooks, Pelican Sound. Bonded and insured.",
  },
};

const LEGAL_NAV = `<nav class="footer-legal" aria-label="Legal">
 <a href="/privacy">Privacy Policy</a>
 <span aria-hidden="true">·</span>
 <a href="/terms">Terms of Service</a>
 <span aria-hidden="true">·</span>
 <a href="/accessibility">Accessibility</a>
</nav>`;

function setMeta(html, { title, description }) {
  let next = html;
  if (title) {
    next = next.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
    next = next.replace(
      /(<meta property="og:title" content=")[^"]*(")/i,
      `$1${title.replace(/&amp;/g, "&")}$2`
    );
    // Keep HTML entities in og if title had them — use raw title string as provided
    next = next.replace(
      /(<meta property="og:title" content=")[^"]*(")/i,
      `$1${title}$2`
    );
    next = next.replace(
      /(<meta name="twitter:title" content=")[^"]*(")/i,
      `$1${title}$2`
    );
  }
  if (description) {
    next = next.replace(
      /(<meta name="description" content=")[^"]*(")/i,
      `$1${description}$2`
    );
    next = next.replace(
      /(<meta property="og:description" content=")[^"]*(")/i,
      `$1${description}$2`
    );
    next = next.replace(
      /(<meta name="twitter:description" content=")[^"]*(")/i,
      `$1${description}$2`
    );
  }
  return next;
}

function injectLegalFooter(html) {
  if (html.includes('class="footer-legal"') || html.includes("href=\"/privacy\"")) {
    // Still allow if privacy exists elsewhere without footer-legal
    if (html.includes('class="footer-legal"')) return html;
  }

  const patterns = [
    // footer-btm with two spans (common luxury footer)
    /(<div class="footer-btm">\s*)([\s\S]*?)(<\/div>\s*<\/footer>)/i,
    /(<div class="footer-bottom">\s*)([\s\S]*?)(<\/div>\s*<\/footer>)/i,
  ];

  for (const re of patterns) {
    if (!re.test(html)) continue;
    return html.replace(re, (full, open, inner, close) => {
      if (inner.includes("footer-legal")) return full;
      const trimmed = inner.trimEnd();
      return `${open}${trimmed}\n${LEGAL_NAV}\n ${close}`;
    });
  }
  return html;
}

let metaCount = 0;
let footerCount = 0;

for (const [rel, meta] of Object.entries(META)) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.warn("missing", rel);
    continue;
  }
  let html = fs.readFileSync(abs, "utf8");
  const before = html;
  html = setMeta(html, meta);
  if (html !== before) {
    fs.writeFileSync(abs, html);
    metaCount++;
    console.log("meta", rel);
  }
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", ".git", "signalhouse", ".netlify", "evidence"].includes(ent.name)) continue;
      walk(p, out);
    } else if (ent.name.endsWith(".html")) out.push(p);
  }
  return out;
}

for (const abs of walk(ROOT)) {
  let html = fs.readFileSync(abs, "utf8");
  if (!html.includes("footer-btm") && !html.includes("footer-bottom")) continue;
  const next = injectLegalFooter(html);
  if (next !== html) {
    fs.writeFileSync(abs, next);
    footerCount++;
    console.log("footer", path.relative(ROOT, abs));
  }
}

console.log(`Done. meta files: ${metaCount}, footer files: ${footerCount}`);
