/**
 * Create Privacy / Terms / Accessibility pages + wire Netlify 200 rewrites.
 * Run: node scripts/create-legal-pages.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getCanonicalOrganization, getWebsiteNode, ldJsonScript, ORG_ID, WEBSITE_ID } from "../data/sparklean-entity.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function pageShell({ slug, title, description, h1, bodyHtml }) {
  const graph = [
    getCanonicalOrganization(),
    getWebsiteNode(),
    {
      "@type": "WebPage",
      "@id": `https://www.sparklean.co/${slug}#webpage`,
      url: `https://www.sparklean.co/${slug}`,
      name: title.replace(/ \| Sparklean$/, ""),
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORG_ID },
      publisher: { "@id": ORG_ID },
      inLanguage: "en-US",
    },
  ];
  const ld = ldJsonScript(graph);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<title>${title}</title>
<meta name="robots" content="noindex, follow">
<meta name="description" content="${description}">
${ld}
<link rel="canonical" href="https://www.sparklean.co/${slug}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sparklean Cleaning">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="https://www.sparklean.co/${slug}">
<meta property="og:image" content="/images/branding/Sparklean_Logo_Transparent.png">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/sparklean-site-header.css">
<link rel="stylesheet" href="/css/sparklean-footer.css">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{--gold:#B8A47A;--gold-lt:#D4BF96;--dark:#0E0E0E;--dark2:#161616;--nav-bg:#131313;--white:#F9F7F3;--w70:rgba(249,247,243,.7);--serif:'Playfair Display',Georgia,serif;--sans:'Montserrat',sans-serif;--nav-h:120px;}
body{background:var(--dark);color:var(--white);font-family:var(--sans);font-weight:300;line-height:1.7}
.legal{padding:calc(var(--nav-h) + 48px) clamp(20px,5vw,80px) 80px;max-width:720px;margin:0 auto}
.legal h1{font-family:var(--serif);font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:400;margin-bottom:12px;line-height:1.15}
.legal .updated{font-size:.55rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:28px}
.legal h2{font-family:var(--serif);font-size:1.25rem;font-weight:400;margin:32px 0 12px;color:var(--white)}
.legal p,.legal li{font-family:var(--serif);font-size:.95rem;color:var(--w70);margin-bottom:14px}
.legal ul{padding-left:1.2em;margin-bottom:16px}
.legal a{color:var(--gold-lt)}
.footer-legal{display:flex;flex-wrap:wrap;gap:8px 10px;justify-content:center;align-items:center;margin-top:10px}
.footer-legal a{font-size:.58rem;color:rgba(249,247,243,.35);text-decoration:none;letter-spacing:.04em}
.footer-legal a:hover{color:var(--gold-lt)}
.footer-legal span{color:rgba(249,247,243,.2);font-size:.58rem}
footer{background:#0A0A0A;border-top:1px solid rgba(184,164,122,.12)}
.footer-top{padding:48px 80px 40px;display:flex;flex-direction:column;align-items:center}
.footer-logo-wrap img{height:140px;width:auto;display:block}
.footer-btm{padding:18px 80px 28px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.footer-copy{font-size:.58rem;color:rgba(249,247,243,.28);letter-spacing:.06em}
@media(max-width:1024px){:root{--nav-h:96px}.footer-top,.footer-btm{padding-left:20px;padding-right:20px}}
</style>
</head>
<body>
<header class="site-header">
 <nav class="site-nav" aria-label="Primary">
 <a class="nav-logo" href="/"><img src="/images/branding/Sparklean_Logo_Transparent.png" alt="Sparklean Cleaning" width="200" height="80"></a>
 <div class="nav-right">
 <a href="tel:2398883588" class="nav-phone">(239) 888-3588</a>
 <a href="/contact" class="nav-btn" data-sparklean-intake>Request a Quote</a>
 </div>
 </nav>
</header>
<main class="legal">
 <h1>${h1}</h1>
 <p class="updated">Last updated: August 24, 2026</p>
 ${bodyHtml}
</main>
<footer>
 <div class="footer-top">
 <div class="footer-logo-wrap"><a href="/"><img src="/images/branding/Sparklean_Logo_Transparent.png" alt="Sparklean Cleaning" width="200" height="140"></a></div>
 </div>
 <div class="footer-btm">
 <span class="footer-copy">© 2026 Sparklean Cleaning. All rights reserved.</span>
 <span class="footer-copy">Bonded · Insured · Workers' Comp</span>
 <nav class="footer-legal" aria-label="Legal">
 <a href="/privacy">Privacy Policy</a>
 <span aria-hidden="true">·</span>
 <a href="/terms">Terms of Service</a>
 <span aria-hidden="true">·</span>
 <a href="/accessibility">Accessibility</a>
 </nav>
 </div>
</footer>
<script src="/js/sparklean-site-header.js" defer></script>
</body>
</html>
`;
}

const privacy = pageShell({
  slug: "privacy",
  title: "Privacy Policy | Sparklean",
  description:
    "How Sparklean Cleaning collects, uses, and protects personal information from quote requests, contact forms, and related communications.",
  h1: "Privacy Policy",
  bodyHtml: `
<p>Sparklean Cleaning LLC (“Sparklean,” “we,” “us”) respects your privacy. This policy explains how we handle information collected through sparklean.co and related communications.</p>
<h2>Information we collect</h2>
<p>When you request a quote, contact us, or opt into updates, we may collect your name, phone number, email address, service location details, message content, and your consent preferences (including SMS and marketing consent).</p>
<h2>How we use information</h2>
<ul>
<li>To respond to inquiries and prepare quotes</li>
<li>To schedule and deliver cleaning services</li>
<li>To send service-related messages you request or consent to</li>
<li>To improve our website and customer experience</li>
<li>To comply with legal obligations</li>
</ul>
<h2>SMS and marketing</h2>
<p>If you consent to SMS or marketing messages, you may receive appointment updates, service follow-ups, or occasional offers. Message and data rates may apply. You can unsubscribe at any time by following the instructions in a message or contacting us.</p>
<h2>Sharing</h2>
<p>We do not sell your personal information. We may share information with service providers who help us operate (for example, email or form delivery), or when required by law.</p>
<h2>Retention and security</h2>
<p>We retain information as needed for business, legal, and service purposes, and use reasonable safeguards to protect it.</p>
<h2>Contact</h2>
<p>Questions about this policy: <a href="mailto:info@sparklean.co">info@sparklean.co</a> or <a href="tel:2398883588">(239) 888-3588</a>. Service areas: Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.</p>
`,
});

const terms = pageShell({
  slug: "terms",
  title: "Terms of Service | Sparklean",
  description:
    "Terms for using sparklean.co and requesting Sparklean Cleaning services in Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
  h1: "Terms of Service",
  bodyHtml: `
<p>By using sparklean.co or submitting a quote or contact request, you agree to these terms.</p>
<h2>Services</h2>
<p>Sparklean Cleaning LLC provides residential, commercial, post-construction, vacation-rental, and related cleaning services in Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral. Quotes and schedules are confirmed separately; website content is informational and not a binding contract until accepted in writing or by confirmed booking.</p>
<h2>Website use</h2>
<p>Do not misuse the site, attempt unauthorized access, or submit false information. Content on this site is owned by Sparklean or its licensors and may not be copied for commercial use without permission.</p>
<h2>Quotes and communications</h2>
<p>Submitting a form authorizes Sparklean to contact you about your request by phone, email, or SMS as indicated by your consent choices.</p>
<h2>Limitation</h2>
<p>To the fullest extent permitted by law, Sparklean is not liable for indirect or consequential damages arising from website use. Service warranties are those stated in your service agreement or guarantee materials.</p>
<h2>Contact</h2>
<p><a href="mailto:info@sparklean.co">info@sparklean.co</a> · <a href="tel:2398883588">(239) 888-3588</a></p>
`,
});

const accessibility = pageShell({
  slug: "accessibility",
  title: "Accessibility Statement | Sparklean",
  description:
    "Sparklean’s commitment to an accessible website experience and how to request assistance.",
  h1: "Accessibility Statement",
  bodyHtml: `
<p>Sparklean Cleaning is committed to making sparklean.co usable for as many people as possible. We aim to follow widely recognized accessibility practices for structure, contrast, keyboard use, and alternative text.</p>
<h2>Ongoing improvements</h2>
<p>We continue to review pages for clarity, readable text, focus states, and meaningful image descriptions. Some third-party embeds (such as video) may have their own accessibility limitations.</p>
<h2>Need help?</h2>
<p>If you encounter a barrier or need information in an alternative format, contact us at <a href="mailto:info@sparklean.co">info@sparklean.co</a> or <a href="tel:2398883588">(239) 888-3588</a>. We will work with you to provide the information or assistance you need.</p>
`,
});

for (const [file, html] of [
  ["pages/privacy.html", privacy],
  ["pages/terms.html", terms],
  ["pages/accessibility.html", accessibility],
]) {
  fs.writeFileSync(path.join(ROOT, file), html);
  console.log("wrote", file);
}

// Patch netlify.toml: privacy-policy → /privacy; add 200 rewrites for legal pages
const tomlPath = path.join(ROOT, "netlify.toml");
let toml = fs.readFileSync(tomlPath, "utf8");

toml = toml.replace(
  /\[\[redirects\]\]\s*\n\s*from = "\/privacy-policy"\s*\n\s*to = "\/contact"\s*\n\s*status = 301/,
  `[[redirects]]
  from = "/privacy-policy"
  to = "/privacy"
  status = 301`
);
toml = toml.replace(
  /\[\[redirects\]\]\s*\n\s*from = "\/privacy-policy\/"\s*\n\s*to = "\/contact"\s*\n\s*status = 301/,
  `[[redirects]]
  from = "/privacy-policy/"
  to = "/privacy"
  status = 301`
);

const LEGAL_REWRITES = `
[[redirects]]
  from = "/privacy"
  to = "/pages/privacy.html"
  status = 200
[[redirects]]
  from = "/privacy/"
  to = "/pages/privacy.html"
  status = 200
[[redirects]]
  from = "/terms"
  to = "/pages/terms.html"
  status = 200
[[redirects]]
  from = "/terms/"
  to = "/pages/terms.html"
  status = 200
[[redirects]]
  from = "/accessibility"
  to = "/pages/accessibility.html"
  status = 200
[[redirects]]
  from = "/accessibility/"
  to = "/pages/accessibility.html"
  status = 200
`;

if (!toml.includes('from = "/privacy"\n  to = "/pages/privacy.html"')) {
  // Insert after customer-portal rewrites block
  const marker = `[[redirects]]
  from = "/customer-portal/"
  to = "/pages/customer-portal.html"
  status = 200`;
  if (toml.includes(marker)) {
    toml = toml.replace(marker, marker + LEGAL_REWRITES);
  } else {
    toml += "\n" + LEGAL_REWRITES;
  }
}

fs.writeFileSync(tomlPath, toml);
console.log("updated netlify.toml");
