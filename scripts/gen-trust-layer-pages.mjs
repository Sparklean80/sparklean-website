/**
 * Generates Why Sparklean / Refer / Partners pages from shared chrome.
 * Run: node scripts/gen-trust-layer-pages.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOGO =
 "https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21b5c7958824a1f172b0f_sparklean-logo-transparent.png";
const IMG_TEAM =
 "https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b3054cb0f376b3a2fc6522_1000052028.JPG";
const IMG_REVIEW =
 "https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21c8b4a74322eaf0b5148_1000051954.WEBP";
const IMG_LEAD =
 "https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21cae1dbe6ede803ef701_1000051474.JPG";
const LOCKED =
 "Sparklean Cleaning is a professionally managed and supervised residential and commercial cleaning company serving Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.";

function chrome({ title, description, canonical, ogTitle, activeNav, mainHtml, pageScript = "" }) {
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
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sparklean Cleaning">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${LOGO}">
<meta property="og:image:alt" content="Sparklean Cleaning">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${LOGO}">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{--gold:#B8A47A;--gold-lt:#D4BF96;--dark:#0E0E0E;--dark2:#161616;--dark3:#1C1C1C;--nav-bg:#131313;--white:#F9F7F3;--w70:rgba(,,,.);--w30:rgba(,,,.);--serif:'Playfair Display',Georgia,serif;--sans:'Montserrat',sans-serif;--nav-h:120px;}
html{scroll-behavior:smooth}
body{background:var(--dark);color:var(--white);font-family:var(--sans);font-weight:300;overflow-x:hidden}
nav{position:fixed;top:0;left:0;right:0;z-index:900;height:var(--nav-h);background:var(--nav-bg);border-bottom:1px solid rgba(,,,.);display:flex;align-items:center;justify-content:space-between;padding:0 52px;}
.nav-logo{display:flex;align-items:center;text-decoration:none;height:100%;padding:8px 0;}
.nav-logo img{height:104px;width:auto;display:block;}
.nav-links{display:flex;gap:30px;list-style:none}
.nav-links a{font-size:.6rem;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--w70);text-decoration:none;transition:color .25s;position:relative;padding-bottom:3px}
.nav-links a::after{content:'';position:absolute;bottom:0;left:0;width:0;height:1px;background:var(--gold);transition:width .3s}
.nav-links a:hover.nav-links a.active{color:var(--white)}
.nav-links a:hover::after.nav-links a.active::after{width:100%}
.nav-right{display:flex;align-items:center;gap:16px}
.nav-phone{font-size:.68rem;color:var(--w70);text-decoration:none;transition:color .25s;letter-spacing:.04em}.nav-phone:hover{color:var(--gold-lt)}
.nav-btn{font-size:.57rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#0E0E0E;background:var(--gold);padding:11px 22px;text-decoration:none;transition:background .25s}.nav-btn:hover{background:var(--gold-lt)}
.btn-gold{display:inline-flex;align-items:center;justify-content:center;gap:9px;font-size:.58rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#0E0E0E;background:var(--gold);padding:15px 32px;text-decoration:none;transition:background .25s,transform .2s,box-shadow .3s}
.btn-gold:hover{background:var(--gold-lt);transform:translateY(-2px);box-shadow:0 12px 36px rgba(,,,.)}
.btn-outline{display:inline-flex;align-items:center;justify-content:center;gap:9px;font-size:.56rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--white);border:1px solid rgba(,,,.);padding:14px 28px;text-decoration:none;transition:border-color .25s,color .25s}
.btn-outline:hover{border-color:var(--gold);color:var(--gold-lt)}
footer{background:#0A0A0A;border-top:1px solid rgba(,,,.);}
.footer-top{padding:72px 80px 60px;display:flex;flex-direction:column;align-items:center;border-bottom:1px solid rgba(,,,.);}
.footer-logo-wrap img{height:200px;width:auto;display:block;}
.footer-divider{width:48px;height:1px;background:var(--gold);margin:20px auto 18px;opacity:.5;}
.footer-cities{font-size:.55rem;letter-spacing:.26em;text-transform:uppercase;color:rgba(,,,.);text-align:center;line-height:2.4;}.footer-cities a{color:inherit;text-decoration:none;}
.footer-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:52px;width:100%;max-width:800px;margin-top:52px;}
.footer-col-title{font-size:.56rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:20px;}
.footer-col a{display:block;font-size:.7rem;color:rgba(,,,.);text-decoration:none;line-height:1;margin-bottom:14px;transition:color .25s;letter-spacing:.03em;}
.footer-col a:hover{color:var(--gold-lt);}
.footer-bottom{padding:22px 80px;display:flex;justify-content:space-between;align-items:center;}
.footer-copy{font-size:.58rem;color:rgba(,,,.);letter-spacing:.06em;}
.nav-hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;padding:8px;background:none;border:none;}
.nav-hamburger span{display:block;width:22px;height:1px;background:var(--w70);transition:transform .3s,opacity .3s;}
.nav-hamburger.open span:nth-child(1){transform:translateY(6px) rotate(45deg);}
.nav-hamburger.open span:nth-child(2){opacity:0;}
.nav-hamburger.open span:nth-child(3){transform:translateY(-6px) rotate(-45deg);}
.nav-mobile-menu{display:none;position:fixed;top:var(--nav-h);left:0;right:0;background:var(--nav-bg);border-top:1px solid rgba(,,,.);z-index:899;padding:20px 0;flex-direction:column;}
.nav-mobile-menu.open{display:flex;}
.nav-mobile-menu a{font-size:.62rem;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--w70);text-decoration:none;padding:14px 28px;border-bottom:1px solid rgba(,,,.);}
@media(max-width:1024px){
 nav{padding:0 24px;}
 .nav-links.nav-phone{display:none !important;}
 .nav-logo img{height:76px;}
 .nav-hamburger{display:flex !important;}
 .footer-top{padding:52px 20px 40px;}
 .footer-bottom{padding:18px 20px;flex-direction:column;gap:10px;text-align:center;}
 .footer-cols{grid-template-columns:1fr;gap:30px;}
}
@media(max-width:640px){
 :root{--nav-h:70px;}
 nav{height:70px;padding:0 16px;}
 .nav-logo img{height:54px;}
 .footer-logo-wrap img{height:120px !important;}
 .tl-hero-actions{flex-direction:column;align-items:stretch;}
 .btn-gold.btn-outline{width:100%;justify-content:center;}
}
</style>
<link rel="stylesheet" href="/css/sparklean-mobile-first.css">
<link rel="stylesheet" href="/css/quote-intake.css">
<link rel="stylesheet" href="/css/sparklean-luxury-flow.css">
<link rel="stylesheet" href="/css/sparklean-nav-logo.css">
<link rel="stylesheet" href="/css/sparklean-trust-layer.css">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17027441328"></script>
<script>
 window.dataLayer = window.dataLayer || [];
 function gtag(){dataLayer.push(arguments);}
 gtag('js', new Date());
 gtag('config', 'AW-17027441328');
</script>
<script src="/js/sparklean-ads.js"></script>
<script src="/js/sparklean-events.js"></script>
</head>
<body>
<nav aria-label="Primary">
 <a href="/" class="nav-logo"><img src="${LOGO}" alt="Sparklean Cleaning"></a>
 <ul class="nav-links">
 <li><a href="/">Home</a></li>
 <li><a href="/residential-cleaning"${activeNav === "residential" ? ' class="active"' : ""}>Residential</a></li>
 <li><a href="/commercial-cleaning">Commercial</a></li>
 <li><a href="/why-sparklean"${activeNav === "why" ? ' class="active"' : ""}>Why Sparklean</a></li>
 <li><a href="/about">About Us</a></li>
 <li><a href="/partners"${activeNav === "partners" ? ' class="active"' : ""}>Partners</a></li>
 <li><a href="/blog">Blog</a></li>
 <li><a href="/contact">Contact</a></li>
 </ul>
 <div class="nav-right">
 <a href="tel:2398883588" class="nav-phone">(239) 888-3588</a>
 <a href="/customer-portal" class="nav-portal">Client App</a>
 <button class="nav-hamburger" id="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
 <a href="/contact" class="nav-btn">Get a Quote</a>
 </div>
</nav>
<div class="nav-mobile-menu" id="mobileMenu">
 <a href="/contact" class="nav-mobile-quote">Get a Quote</a>
 <a href="/">Home</a>
 <a href="/residential-cleaning">Residential Cleaning</a>
 <a href="/commercial-cleaning">Commercial &amp; Janitorial</a>
 <a href="/why-sparklean">Why Sparklean</a>
 <a href="/partners">Partners</a>
 <a href="/refer">Refer Someone</a>
 <a href="/about">About Us</a>
 <a href="/blog">Blog</a>
 <a href="/contact">Contact</a>
 <a href="/customer-portal">Download Client App</a>
 <a href="tel:2398883588">(239) 888-3588</a>
</div>
<main>
${mainHtml}
</main>
<footer>
 <div class="footer-top">
 <div class="footer-logo-wrap"><img src="${LOGO}" alt="Sparklean Cleaning"></div>
 <div class="footer-divider"></div>
 <div class="footer-cities"><a href="/house-cleaning-naples">Naples</a> &nbsp;·&nbsp; <a href="/house-cleaning-estero">Estero</a> &nbsp;·&nbsp; <a href="/house-cleaning-fort-myers">Fort Myers</a> &nbsp;·&nbsp; <a href="/house-cleaning-bonita-springs">Bonita Springs</a> &nbsp;·&nbsp; <a href="/house-cleaning-cape-coral">Cape Coral</a></div>
 <div class="footer-cols">
 <div class="footer-col">
 <div class="footer-col-title">Our Services</div>
 <a href="/residential-cleaning">Residential Cleaning</a>
 <a href="/commercial-cleaning">Commercial &amp; Janitorial</a>
 <a href="/post-construction-cleaning">Post-Construction</a>
 <a href="/why-sparklean">Why Sparklean</a>
 <a href="/partners">Referral Partners</a>
 <a href="/refer">Refer Someone</a>
 <a href="/inner-circle">Inner Circle</a>
 </div>
 <div class="footer-col">
 <div class="footer-col-title">Cities</div>
 <a href="/house-cleaning-naples">Naples, FL</a>
 <a href="/house-cleaning-fort-myers">Fort Myers, FL</a>
 <a href="/house-cleaning-bonita-springs">Bonita Springs, FL</a>
 <a href="/house-cleaning-estero">Estero, FL</a>
 <a href="/house-cleaning-cape-coral">Cape Coral, FL</a>
 </div>
 <div class="footer-col">
 <div class="footer-col-title">Contact</div>
 <a href="tel:2398883588">(239) 888-3588</a>
 <a href="mailto:info@sparklean.co">info@sparklean.co</a>
 <a href="https://www.sparklean.co/">sparklean.co</a>
 </div>
 </div>
 </div>
 <div class="footer-bottom">
 <span class="footer-copy">© 2026 Sparklean Cleaning. All rights reserved.</span>
 <span class="footer-copy">Bonded · Insured · Workers' Comp</span>
 </div>
</footer>
<script>
var hb=document.getElementById("hamburger");
var mm=document.getElementById("mobileMenu");
if(hb&&mm){
 hb.addEventListener("click",function(){hb.classList.toggle("open");mm.classList.toggle("open");});
 mm.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){hb.classList.remove("open");mm.classList.remove("open");});});
}
</script>
${pageScript}
<script src="/js/serviceFlows.js"></script>
<script src="/js/quote-intake.js" defer></script>
<script src="/js/sparklean-mobile-sticky-cta.js" defer></script>
</body>
</html>
`;
}

const whyMain = `
 <header class="tl-hero">
 <div class="tl-hero-inner">
 <p class="tl-eyebrow">Why Sparklean</p>
 <h1>You are placing your home in the care of a company built to remain <em>accountable.</em></h1>
 <p class="tl-lede">You are not simply hiring someone to clean. Before anyone enters your home, know who employs the team, who carries insurance, who supervises the visit, and who answers when something is missed.</p>
 <div class="tl-hero-actions">
 <a href="/contact" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Start recurring residential care →</a>
 <a href="#checklist" class="btn-outline">See the checklist</a>
 </div>
 </div>
 </header>

 <section class="tl-section tl-section--panel">
 <div class="tl-wrap">
 <div class="tl-label"><div class="tl-label-line"></div><span>The standard</span></div>
 <h2 class="tl-h2">Professionally managed. <em>Supervised.</em> Accountable.</h2>
 <div class="tl-prose">
 <p>${LOCKED}</p>
 <p>The difference is not a slogan. It is an operating model: known teams, clear communication, management oversight, and a path back to the company when a detail needs correction.</p>
 </div>
 <div class="tl-pillars">
 <span class="tl-pillar">Direct employees</span>
 <span class="tl-pillar">Workers' Comp</span>
 <span class="tl-pillar">General liability</span>
 <span class="tl-pillar">Bonding</span>
 <span class="tl-pillar">Background-checked</span>
 <span class="tl-pillar">Supervised visits</span>
 <span class="tl-pillar">24-hour guarantee</span>
 </div>
 </div>
 </section>

 <section class="tl-section" id="checklist" aria-labelledby="checklist-h">
 <div class="tl-wrap">
 <div class="tl-label"><div class="tl-label-line"></div><span>Consumer checklist</span></div>
 <h2 class="tl-h2" id="checklist-h">What to verify before a cleaning provider enters your <em>home</em></h2>
 <p class="tl-prose" style="margin-bottom:8px;">Ask calmly. Compare answers. This checklist is not about criticizing an industry—it is about protecting your household.</p>
 <ul class="tl-check">
 <li>
 <div class="tl-check-q">Who employs the team?</div>
 <div class="tl-check-a"><strong>Ask:</strong> Employees or marketplace subcontractors?<br><strong>Sparklean:</strong> Directly employed teams—not uncontrolled marketplace labor—with company oversight behind every route.</div>
 </li>
 <li>
 <div class="tl-check-q">Workers' Comp?</div>
 <div class="tl-check-a"><strong>Ask:</strong> Is Workers' Compensation coverage active for the people in your home?<br><strong>Sparklean:</strong> Active Workers' Compensation coverage for team members. Documentation available upon request.</div>
 </li>
 <li>
 <div class="tl-check-q">Liability &amp; bonding?</div>
 <div class="tl-check-a"><strong>Ask:</strong> General liability insurance and bonding?<br><strong>Sparklean:</strong> General liability insurance and bonding are part of how the company operates.</div>
 </li>
 <li>
 <div class="tl-check-q">Background checks?</div>
 <div class="tl-check-a"><strong>Ask:</strong> Are personnel background-checked before client homes?<br><strong>Sparklean:</strong> Background-checked personnel, with supervised execution standards.</div>
 </li>
 <li>
 <div class="tl-check-q">Who supervises?</div>
 <div class="tl-check-a"><strong>Ask:</strong> Who reviews the visit before and after it happens?<br><strong>Sparklean:</strong> Supervised visits with management accountability—not an unsupervised drop-off.</div>
 </li>
 <li>
 <div class="tl-check-q">Who is accountable?</div>
 <div class="tl-check-a"><strong>Ask:</strong> Who remains responsible after the team leaves?<br><strong>Sparklean:</strong> A registered Florida business remains accountable—not an anonymous marketplace profile.</div>
 </li>
 <li>
 <div class="tl-check-q">Recurring continuity?</div>
 <div class="tl-check-a"><strong>Ask:</strong> Can the same operating standard continue weekly, biweekly, or monthly?<br><strong>Sparklean:</strong> Recurring residential care is the primary journey—continuity with known teams and clear communication.</div>
 </li>
 <li>
 <div class="tl-check-q">If something is missed?</div>
 <div class="tl-check-a"><strong>Ask:</strong> What happens when a detail needs correction?<br><strong>Sparklean:</strong> 24-hour happiness guarantee—contact us within 24 hours and we return to make it right.</div>
 </li>
 </ul>
 </div>
 </section>

 <section class="tl-section tl-section--panel" id="how-accountable" aria-labelledby="ops-h">
 <div class="tl-wrap-wide">
 <div class="tl-label"><div class="tl-label-line"></div><span>Operating model</span></div>
 <h2 class="tl-h2" id="ops-h">How Sparklean remains <em>accountable</em></h2>
 <div class="tl-ops">
 <div class="tl-ops-media">
 <img src="${IMG_TEAM}" alt="Sparklean supervisor directing a cleaning team" loading="lazy" decoding="async">
 <div class="tl-ops-float">
 <img src="${IMG_LEAD}" alt="Sparklean team lead coordinating on site" loading="lazy" decoding="async">
 </div>
 </div>
 <div>
 <div class="tl-steps">
 <div class="tl-step">
 <div class="tl-step-n">01</div>
 <div>
 <h4>Understand</h4>
 <p>We learn the property, access needs, and service expectations before the first visit is routed.</p>
 </div>
 </div>
 <div class="tl-step">
 <div class="tl-step-n">02</div>
 <div>
 <h4>Assign</h4>
 <p>We assign and coordinate the appropriate supervised team—not an open marketplace bid.</p>
 </div>
 </div>
 <div class="tl-step">
 <div class="tl-step-n">03</div>
 <div>
 <h4>Supervise</h4>
 <p>Execution and communication stay under company oversight so standards do not depend on chance.</p>
 </div>
 </div>
 <div class="tl-step">
 <div class="tl-step-n">04</div>
 <div>
 <h4>Remain accountable</h4>
 <p>After the visit, Sparklean remains reachable. If something is missed, the 24-hour guarantee is the path back.</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 <section class="tl-section">
 <div class="tl-wrap">
 <div class="tl-label"><div class="tl-label-line"></div><span>Recurring care</span></div>
 <h2 class="tl-h2">Start with a first visit. Continue with a managed <em>plan.</em></h2>
 <div class="tl-prose">
 <p>Most households begin with a personalized first visit—often a thorough reset—then continue weekly, biweekly, or monthly with a professionally managed recurring plan.</p>
 <p>Deep cleans, move-in/out, and one-time services remain valid entry paths. After a one-time inquiry, we can discuss continuing care when it fits—without pressure.</p>
 </div>
 <div class="tl-hero-actions" style="justify-content:flex-start;margin-top:28px;">
 <a href="/residential-cleaning#recurring" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Begin recurring residential care →</a>
 <a href="/refer" class="btn-outline">Introduce someone →</a>
 </div>
 </div>
 </section>

 <section class="tl-cta">
 <p>Compare the checklist. Then decide who you want accountable for your home.</p>
 <a href="/contact" class="btn-gold" data-sparklean-intake-preset="recurringResidential">Request your personalized first visit →</a>
 <p class="tl-note">Prefer voice? <a href="tel:2398883588" style="color:var(--gold-lt);text-decoration:none;">(239) 888-3588</a> · <a href="/partners" style="color:var(--gold-lt);text-decoration:none;">Partner with Sparklean</a></p>
 </section>
`;

const referMain = `
 <header class="tl-hero">
 <div class="tl-hero-inner">
 <p class="tl-eyebrow">Referrals</p>
 <h1>Introduce someone to the Sparklean <em>standard.</em></h1>
 <p class="tl-lede">When a homeowner, realtor, builder, property manager, or home-watch professional needs accountable cleaning, make a clear introduction. Separate from Inner Circle membership.</p>
 <div class="tl-hero-actions">
 <a href="#referral-start" class="btn-gold" id="referral-start-cta" data-sparklean-intake-preset="referral">Start a referral →</a>
 <a href="/partners" class="btn-outline">Partner overview</a>
 </div>
 </div>
 </header>

 <section class="tl-section tl-section--panel" id="referral-start">
 <div class="tl-wrap">
 <div class="tl-label"><div class="tl-label-line"></div><span>How referrals work</span></div>
 <h2 class="tl-h2">A short introduction. Clear follow-up. <em>No marketplace noise.</em></h2>
 <div class="tl-prose">
 <p>Tell us who you are, who you are introducing, and how they prefer to be reached. Sparklean follows up with the same professionally managed standard used for every client relationship.</p>
 <p>Your referral details are used only to make the introduction and coordinate follow-up. They are not published on the website, placed in structured data, or sent to advertising analytics.</p>
 </div>
 <div class="tl-steps">
 <div class="tl-step">
 <div class="tl-step-n">01</div>
 <div><h4>Share the introduction</h4><p>Referrer contact, referred contact, relationship type, and permission to introduce.</p></div>
 </div>
 <div class="tl-step">
 <div class="tl-step-n">02</div>
 <div><h4>Sparklean reaches out</h4><p>Our team contacts the referred party with context—never inventing claims about partnerships that do not exist.</p></div>
 </div>
 <div class="tl-step">
 <div class="tl-step-n">03</div>
 <div><h4>Accountable service begins</h4><p>If they proceed, they receive supervised residential, commercial, or post-construction care under company management.</p></div>
 </div>
 </div>
 <div class="tl-hero-actions" style="justify-content:flex-start;margin-top:36px;">
 <a href="/contact" class="btn-gold" data-sparklean-intake-preset="referral" data-sparklean-event="referral_started">Open referral form →</a>
 </div>
 <p class="tl-note">By submitting a referral you confirm you have a relationship with the person or business you are introducing and permission to share their contact details with Sparklean for follow-up. See also our contact consent practices on the <a href="/contact" style="color:var(--gold-lt);">contact page</a>.</p>
 </div>
 </section>

 <section class="tl-section">
 <div class="tl-wrap-wide">
 <div class="tl-label"><div class="tl-label-line"></div><span>Who refers</span></div>
 <h2 class="tl-h2">Choose the relationship that fits <em>best</em></h2>
 <div class="tl-grid">
 <a class="tl-card" href="/refer?type=homeowner" data-sparklean-intake-preset="referral" data-sparklean-referral-type="homeowner" data-sparklean-event="partner_type_selected" data-sparklean-event-type="homeowner"><h3>Homeowner</h3><p>Introduce a neighbor, friend, or family member who wants supervised residential care.</p><div class="tl-card-cta">Refer a homeowner →</div></a>
 <a class="tl-card" href="/refer?type=realtor" data-sparklean-intake-preset="referral" data-sparklean-referral-type="realtor" data-sparklean-event="partner_type_selected" data-sparklean-event-type="realtor"><h3>Realtor</h3><p>Protect closings and showings with accountable move-in, move-out, and recurring care.</p><div class="tl-card-cta">Refer as a realtor →</div></a>
 <a class="tl-card" href="/refer?type=builder" data-sparklean-intake-preset="referral" data-sparklean-referral-type="builder" data-sparklean-event="partner_type_selected" data-sparklean-event-type="builder"><h3>Builder / remodeler</h3><p>Introduce post-construction and final-clean needs with supervised punch-list discipline.</p><div class="tl-card-cta">Refer a project →</div></a>
 <a class="tl-card" href="/refer?type=property_manager" data-sparklean-intake-preset="referral" data-sparklean-referral-type="property_manager" data-sparklean-event="partner_type_selected" data-sparklean-event-type="property_manager"><h3>Property manager / HOA</h3><p>Keep communities and units consistent with insured, Workers' Comp–covered teams.</p><div class="tl-card-cta">Refer a property →</div></a>
 <a class="tl-card" href="/refer?type=home_watch" data-sparklean-intake-preset="referral" data-sparklean-referral-type="home_watch" data-sparklean-event="partner_type_selected" data-sparklean-event-type="home_watch"><h3>Home-watch professional</h3><p>Extend your care with a cleaning partner that remains accountable between visits.</p><div class="tl-card-cta">Refer a client home →</div></a>
 <a class="tl-card" href="/refer?type=commercial" data-sparklean-intake-preset="referral" data-sparklean-referral-type="commercial" data-sparklean-event="partner_type_selected" data-sparklean-event-type="commercial"><h3>Commercial business</h3><p>Introduce offices and facilities that need reliable janitorial or commercial cleaning.</p><div class="tl-card-cta">Refer a business →</div></a>
 </div>
 </div>
 </section>

 <section class="tl-cta">
 <p>Ready when you are. The form takes about a minute.</p>
 <a href="/contact" class="btn-gold" data-sparklean-intake-preset="referral" data-sparklean-event="referral_started">Start a referral →</a>
 </section>
`;

const partnersMain = `
 <header class="tl-hero">
 <div class="tl-hero-inner">
 <p class="tl-eyebrow">Referral partners</p>
 <h1>Protect your reputation with a cleaning partner that stays <em>accountable.</em></h1>
 <p class="tl-lede">Realtors, builders, home-watch companies, property managers, designers, and commercial professionals introduce Sparklean when their clients need supervised residential, commercial, or post-construction cleaning.</p>
 <div class="tl-hero-actions">
 <a href="/refer" class="btn-gold">Make a referral →</a>
 <a href="/why-sparklean" class="btn-outline">Why clients choose Sparklean</a>
 </div>
 <p class="tl-note">We do not claim existing partnerships on this page. Introductions are made case by case.</p>
 </div>
 </header>

 <section class="tl-section tl-section--panel">
 <div class="tl-wrap">
 <div class="tl-label"><div class="tl-label-line"></div><span>Why partners refer Sparklean</span></div>
 <h2 class="tl-h2">Your name is on the introduction. Ours is on the <em>accountability.</em></h2>
 <div class="tl-prose">
 <p>${LOCKED}</p>
 <p>Referring cleaning is rarely about the lowest hourly rate. It is about whether the people who enter a client’s property are supervised, insured, Workers’ Comp covered, and reachable when a detail needs correction.</p>
 </div>
 <ul class="tl-check">
 <li><div class="tl-check-q">Management</div><div class="tl-check-a">Accountable company management behind every visit—not an unsupervised marketplace handoff.</div></li>
 <li><div class="tl-check-q">Communication</div><div class="tl-check-a">Clear scheduling and follow-up so your client is not left guessing who is coming or when.</div></li>
 <li><div class="tl-check-q">Reliability</div><div class="tl-check-a">Routing and coordination designed for punctual, supervised execution.</div></li>
 <li><div class="tl-check-q">Protection</div><div class="tl-check-a">Bonding, general liability insurance, and Workers’ Compensation coverage for the teams in the property.</div></li>
 <li><div class="tl-check-q">Continuity</div><div class="tl-check-a">Recurring residential care when the relationship should continue after the first visit.</div></li>
 <li><div class="tl-check-q">Capability</div><div class="tl-check-a">Residential, commercial, and post-construction paths under one operating company.</div></li>
 </ul>
 </div>
 </section>

 <section class="tl-section" aria-labelledby="segments-h">
 <div class="tl-wrap-wide">
 <div class="tl-label"><div class="tl-label-line"></div><span>Partner segments</span></div>
 <h2 class="tl-h2" id="segments-h">Choose your path into the referral <em>form</em></h2>
 <div class="tl-grid">
 <a class="tl-card" href="/refer?type=realtor" data-sparklean-intake-preset="referral" data-sparklean-referral-type="realtor" data-sparklean-event="partner_type_selected" data-sparklean-event-type="realtor"><h3>Realtors</h3><p>Move-ready presentation, discreet access, and follow-through that protects closings.</p><div class="tl-card-cta">Refer as a realtor →</div></a>
 <a class="tl-card" href="/refer?type=builder" data-sparklean-intake-preset="referral" data-sparklean-referral-type="builder" data-sparklean-event="partner_type_selected" data-sparklean-event-type="builder"><h3>Builders &amp; remodelers</h3><p>Post-construction and final cleans with checklist discipline and site communication.</p><div class="tl-card-cta">Refer a project →</div></a>
 <a class="tl-card" href="/refer?type=home_watch" data-sparklean-intake-preset="referral" data-sparklean-referral-type="home_watch" data-sparklean-event="partner_type_selected" data-sparklean-event-type="home_watch"><h3>Home-watch companies</h3><p>A supervised cleaning partner for seasonal and vacant homes under your watch.</p><div class="tl-card-cta">Refer a home →</div></a>
 <a class="tl-card" href="/refer?type=property_manager" data-sparklean-intake-preset="referral" data-sparklean-referral-type="property_manager" data-sparklean-event="partner_type_selected" data-sparklean-event-type="property_manager"><h3>Property managers &amp; HOAs</h3><p>Unit turns, common-area needs, and recurring standards with company accountability.</p><div class="tl-card-cta">Refer a community →</div></a>
 <a class="tl-card" href="/refer?type=interior_designer" data-sparklean-intake-preset="referral" data-sparklean-referral-type="interior_designer" data-sparklean-event="partner_type_selected" data-sparklean-event-type="interior_designer"><h3>Interior designers</h3><p>Careful handling of finished spaces before reveals, photography, or owner move-in.</p><div class="tl-card-cta">Refer a project →</div></a>
 <a class="tl-card" href="/refer?type=commercial" data-sparklean-intake-preset="referral" data-sparklean-referral-type="commercial" data-sparklean-event="partner_type_selected" data-sparklean-event-type="commercial"><h3>Commercial / property professionals</h3><p>Offices and facilities that need reliable commercial cleaning with clear ownership.</p><div class="tl-card-cta">Refer a business →</div></a>
 </div>
 </div>
 </section>

 <section class="tl-section tl-section--panel">
 <div class="tl-wrap-wide">
 <div class="tl-ops">
 <div class="tl-ops-media">
 <img src="${IMG_REVIEW}" alt="Sparklean team reviewing A local home" loading="lazy" decoding="async">
 </div>
 <div>
 <div class="tl-label"><div class="tl-label-line"></div><span>What happens next</span></div>
 <h2 class="tl-h2">One hub. One referral path. No thin <em>micro-sites.</em></h2>
 <div class="tl-prose">
 <p>Use the referral form with your category preserved. Sparklean follows up with the introduced contact and keeps the relationship professional—so your introduction remains a credit to your judgment.</p>
 </div>
 <div class="tl-hero-actions" style="justify-content:flex-start;margin-top:24px;">
 <a href="/refer" class="btn-gold" data-sparklean-event="referral_started">Open the referral form →</a>
 <a href="/why-sparklean" class="btn-outline">Consumer checklist</a>
 </div>
 </div>
 </div>
 </div>
 </section>

 <section class="tl-cta">
 <p>Introduce someone to supervised, insured, Workers’ Comp–covered care.</p>
 <a href="/refer" class="btn-gold">Make a referral →</a>
 </section>
`;

const referScript = `<script>
document.addEventListener("DOMContentLoaded", function () {
 if (window.SparkleanEvents && typeof SparkleanEvents.track === "function") {
 /* page-level referral view is optional; started fires on CTA */
 }
 try {
 var params = new URLSearchParams(window.location.search);
 var type = (params.get("type") || "").trim();
 var allowed = ["homeowner","realtor","builder","property_manager","home_watch","commercial","interior_designer"];
 if (type && allowed.indexOf(type) !== -1) {
 var openWhenReady = function () {
 if (window.SparkleanQuoteIntake && typeof SparkleanQuoteIntake.open === "function") {
 if (window.SparkleanEvents) SparkleanEvents.track("referral_started", { referral_type: type });
 SparkleanQuoteIntake.open({
 sourceUrl: window.location.href,
 preset: "referral",
 referralType: type,
 });
 return true;
 }
 return false;
 };
 if (!openWhenReady()) {
 var tries = 0;
 var t = setInterval(function () {
 tries += 1;
 if (openWhenReady() || tries > 40) clearInterval(t);
 }, 50);
 }
 }
 } catch (e) {}
});
</script>`;

const whyScript = `<script>
document.addEventListener("DOMContentLoaded", function () {
 if (window.SparkleanEvents) SparkleanEvents.track("why_sparklean_view");
});
</script>`;

const pages = [
 {
 file: "pages/why-sparklean.html",
 title: "Why Sparklean | Professionally Managed Cleaning Accountability ",
 description:
 "What to verify before a cleaning company enters your home—and how Sparklean operates with supervised teams, Workers’ Comp, bonding, and a 24-hour guarantee.",
 canonical: "https://www.sparklean.co/why-sparklean",
 ogTitle: "Why Sparklean | Accountable Cleaning in Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral",
 activeNav: "why",
 mainHtml: whyMain,
 pageScript: whyScript,
 },
 {
 file: "pages/refer.html",
 title: "Refer Sparklean | Introduce Someone to Accountable Cleaning ",
 description:
 "Introduce a homeowner, realtor client, builder, property manager, or business to Sparklean’s professionally managed cleaning standard.",
 canonical: "https://www.sparklean.co/refer",
 ogTitle: "Refer Sparklean Cleaning",
 activeNav: "partners",
 mainHtml: referMain,
 pageScript: referScript,
 },
 {
 file: "pages/partners.html",
 title: "Sparklean Referral Partners | Realtors, Builders, Home Watch, HOAs ",
 description:
 "How referring Sparklean protects your reputation—accountable management, supervised teams, insurance and Workers’ Comp, and recurring continuity.",
 canonical: "https://www.sparklean.co/partners",
 ogTitle: "Sparklean Referral Partners",
 activeNav: "partners",
 mainHtml: partnersMain,
 pageScript: "",
 },
];

for (const p of pages) {
 const html = chrome(p);
 fs.writeFileSync(path.join(root, p.file), html);
 console.log("wrote", p.file);
}
