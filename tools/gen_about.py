# -*- coding: utf-8 -*-
"""One-off generator: merges shared inline CSS from specialized-cleaning + about layout."""
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
base = ROOT / "pages" / "specialized-cleaning.html"
text = base.read_text(encoding="utf-8")
m = re.search(r"<style>(.*?)</style>", text, re.S)
if not m:
    raise SystemExit("no <style> in specialized-cleaning.html")
css = m.group(1).strip()
css = css.replace(
    ".pc-intro,.project-types,.svc-list,.why-builders,.community,.cta{padding:60px 20px;}",
    ".pc-intro,.project-types,.svc-list,.why-builders,.community,.cta,.ab-origin,.ab-tony,.ab-roxy,.ab-together,.ab-today,.ab-outro{padding:60px 20px;}",
)
css = css.replace(
    ".pc-intro,.project-types,.svc-list,.why-builders,.community,.cta,.photo-pair{padding:52px 20px !important;}",
    ".pc-intro,.project-types,.svc-list,.why-builders,.community,.cta,.photo-pair,.ab-origin,.ab-tony,.ab-roxy,.ab-together,.ab-today,.ab-outro{padding:52px 20px !important;}",
)
extra = r"""
.hero--about .hero-bg{background-image:url("https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21c8b4a74322eaf0b5148_1000051954.WEBP");background-position:center 38%;}
.hero-mobile--about .hero-mobile-img{object-position:center 38%;}
.ab-founder-split .ci-img{object-position:center 28%;}
.ab-roxy .sl-img{object-position:center 22%;}
.ab-story-photos .pp-img:first-child{object-position:center 32%;}
.ab-story-photos .pp-img:last-child{object-position:center 48%;}
.ab-origin,.ab-tony,.ab-roxy,.ab-together,.ab-today{padding:clamp(96px,11vw,132px) 80px;}
.ab-origin{background:linear-gradient(180deg,#0f0f0d 0%,#12110e 48%,#0e0e0e 100%);}
.ab-tony{background:#151412;border-top:1px solid rgba(201,168,76,.1);}
.ab-roxy{background:linear-gradient(180deg,#12110f 0%,#0e0e0e 100%);border-top:1px solid rgba(201,168,76,.08);}
.ab-together{background:#131210;border-top:1px solid rgba(201,168,76,.07);}
.ab-today{background:var(--dark2);border-top:1px solid rgba(201,168,76,.07);}
.ab-outro{padding:clamp(88px,10vw,120px) 80px clamp(100px,12vw,140px);text-align:center;background:radial-gradient(ellipse 70% 45% at 50% 0%,rgba(201,168,76,.07) 0%,transparent 55%),#0c0c0c;border-top:1px solid rgba(201,168,76,.12);}
.ab-inner{max-width:44rem;margin:0 auto;}
.ab-inner-wide{max-width:52rem;margin:0 auto;}
.ab-prose p{font-family:var(--serif);font-size:1.02rem;line-height:1.92;color:rgba(249,247,243,.78);margin-bottom:1.15em;}
.ab-prose p:last-child{margin-bottom:0;}
.ab-prose strong{color:var(--white);font-weight:500;}
.ab-pull{font-family:var(--serif);font-size:1.06rem;line-height:1.78;font-style:italic;color:rgba(249,247,243,.84);border-left:2px solid var(--gold);padding:1.15rem 1.35rem 1.15rem 1.5rem;margin:2rem 0;background:linear-gradient(90deg,rgba(201,168,76,.1) 0%,transparent 100%);}
.ab-list{list-style:none;margin:0;padding:0;}
.ab-list li{font-family:var(--serif);font-size:.98rem;line-height:1.78;color:rgba(249,247,243,.76);padding:.55rem 0 .55rem 1.15rem;border-bottom:1px solid rgba(201,168,76,.08);position:relative;}
.ab-list li:last-child{border-bottom:0;}
.ab-list li::before{content:"";position:absolute;left:0;top:.95rem;width:5px;height:5px;background:var(--gold);opacity:.75;border-radius:50%;}
.ab-lux-intro{font-family:var(--serif);font-size:1.02rem;line-height:1.9;color:rgba(249,247,243,.78);text-align:center;max-width:40rem;margin:0 auto 40px;}
.ab-lux-stack{max-width:38rem;margin:0 auto;text-align:center;}
.ab-lux-stack p{font-family:var(--serif);font-size:clamp(1.05rem,2.1vw,1.32rem);line-height:1.5;color:rgba(249,247,243,.88);margin:0;padding:1.05rem 1rem;border-bottom:1px solid rgba(201,168,76,.16);}
.ab-lux-stack p:last-child{border-bottom:0;}
.ab-quote{font-family:var(--serif);font-size:clamp(1.25rem,2.8vw,1.75rem);font-style:italic;line-height:1.45;color:var(--gold-lt);max-width:34rem;margin:0 auto 22px;}
.ab-outro .ab-prose p{text-align:center;}
.ab-roxy .sl-grid{max-width:1200px;margin:0 auto;}
"""
full_css = css + extra
ld = (
    '{"@context":"https://schema.org","@type":"AboutPage","name":"About Sparklean Cleaning",'
    '"url":"https://www.sparklean.co/about",'
    '"description":"Founded by Tony Giuliano and Roxana Tellez, Sparklean Cleaning delivers elevated residential cleaning across Southwest Florida.",'
    '"mainEntity":{"@type":"LocalBusiness","name":"Sparklean Cleaning","url":"https://www.sparklean.co/",'
    '"telephone":"+1-239-888-3588","email":"info@sparklean.co",'
    '"founder":[{"@type":"Person","name":"Tony Giuliano"},{"@type":"Person","name":"Roxana Tellez"}],'
    '"areaServed":["Naples FL","Bonita Springs FL","Estero FL","Fort Myers FL","Southwest Florida"]}}'
)

html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<title>About Sparklean Cleaning | Founders, Story &amp; SW Florida</title>
<meta name="description" content="Meet founders Tony Giuliano and Roxana Tellez. Learn how national-scale operations and a physician's discipline shaped Sparklean's luxury residential cleaning across Naples, Bonita Springs, Estero, Fort Myers, and Southwest Florida.">
<link rel="canonical" href="https://www.sparklean.co/about">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sparklean Cleaning">
<meta property="og:title" content="About Sparklean Cleaning | Sparklean">
<meta property="og:description" content="Two founders, one standard: elevated residential cleaning, discretion, and consistency across Southwest Florida.">
<meta property="og:url" content="https://www.sparklean.co/about">
<meta property="og:image" content="https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21c8b4a74322eaf0b5148_1000051954.WEBP">
<meta property="og:image:alt" content="Sparklean team planning service in a luxury Southwest Florida home">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="About Sparklean Cleaning">
<meta name="twitter:description" content="The Sparklean story — operational excellence meets genuine care in Naples, Fort Myers, and surrounding communities.">
<meta name="twitter:image" content="https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21c8b4a74322eaf0b5148_1000051954.WEBP">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">
__JSONLD__
</script>
<style>
__INLINE_CSS__
</style>
<link rel="stylesheet" href="/css/sparklean-mobile-first.css">
<link rel="stylesheet" href="/css/sparklean-luxury-flow.css">
</head>
<body>

<nav>
  <a href="/" class="nav-logo">
    <img src="https://www.sparklean.co/images/branding/Sparklean_Logo_Transparent.png" alt="Sparklean Cleaning">
  </a>
  <ul class="nav-links">
    <li><a href="/">Home</a></li>
    <li><a href="/residential-cleaning">Residential</a></li>
    <li><a href="/commercial-cleaning">Commercial</a></li>
    <li><a href="/post-construction-cleaning">Post-Construction</a></li>
    <li><a href="/specialized-cleaning">Add-Ons</a></li>
    <li><a href="/about" class="active">About Us</a></li>
    <li><a href="/blog">Blog</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
  <div class="nav-right">
    <a href="tel:2398883588" class="nav-phone">(239) 888-3588</a>
    <button class="nav-hamburger" id="hamburger" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <a href="/contact" class="nav-btn">Get a Quote</a>
  </div>
</nav>
<div class="nav-mobile-menu" id="mobileMenu">
  <a href="/">Home</a>
  <a href="/residential-cleaning">Residential Cleaning</a>
  <a href="/commercial-cleaning">Commercial &amp; Janitorial</a>
  <a href="/post-construction-cleaning">Post-Construction</a>
  <a href="/specialized-cleaning">Add-Ons</a>
  <a href="/about">About Us</a>
  <a href="/blog">Blog</a>
  <a href="/contact">Contact</a>
  <a href="tel:2398883588">(239) 888-3588</a>
</div>

<section class="hero hero--about">
  <div class="hero-bg"></div>
  <div class="hero-ov"></div>
  <div class="hero-content">
    <div class="hero-tag"><div class="hero-tag-line"></div><span>About Sparklean · Southwest Florida</span></div>
    <h1>About<br><em>Sparklean Cleaning</em></h1>
    <p class="hero-sub">Built from two professional journeys — one belief: people deserve a higher standard of care, professionalism, and trust inside their homes.</p>
    <p class="hero-guar">✦ Licensed &nbsp;·&nbsp; Bonded &nbsp;·&nbsp; Insured &nbsp;·&nbsp; Supervised Teams</p>
    <div class="hero-btns">
      <a href="/contact" class="btn-gold">Request Your Personalized Quote →</a>
      <a href="#our-story" class="btn-outline">Read our story</a>
    </div>
  </div>
  <div class="hero-stats">
    <div><div class="hs-n">4.9★</div><div class="hs-l">Google Rating</div></div>
    <div><div class="hs-n">20K+</div><div class="hs-l">Clients Served</div></div>
    <div><div class="hs-n">✦</div><div class="hs-l">24-Hour Happiness Guarantee</div></div>
  </div>
</section>

<div class="hero-mobile hero-mobile--about">
  <img class="hero-mobile-img" src="https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21c8b4a74322eaf0b5148_1000051954.WEBP" alt="Sparklean team planning care in a luxury Naples-area home" loading="eager" decoding="async">
  <div class="hero-mobile-body">
    <div class="hero-mobile-tag"><div class="hero-mobile-tag-line"></div><span>About Sparklean · Southwest Florida</span></div>
    <h1>About<br><em>Sparklean Cleaning</em></h1>
    <p class="hero-sub">Built from two professional journeys — one belief: people deserve a higher standard of care, professionalism, and trust inside their homes.</p>
    <p class="hero-guar">✦ Licensed · Bonded · Insured · Supervised Teams</p>
    <div class="hero-btns">
      <a href="/contact" class="btn-gold">Request Your Personalized Quote →</a>
      <a href="tel:2398883588" class="btn-outline">Call (239) 888-3588</a>
    </div>
  </div>
</div>

<div class="trust">
  <div class="trust-inner">
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Licensed</span><span class="t-sub">State of Florida</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Bonded</span><span class="t-sub">Fully Protected</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Insured</span><span class="t-sub">Liability + W. Comp</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Workers' Comp</span><span class="t-sub">Full Coverage</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">★</span><div><span class="t-title">20,000+ Clients</span><span class="t-sub">SW Florida Trusted</span></div></div>
  </div>
</div>

<div class="marquee">
  <div class="marquee-track">
    <span class="m-item"><span class="m-dot"></span>Operational leadership · Genuine care</span>
    <span class="m-item"><span class="m-dot"></span>Elevated residential cleaning</span>
    <span class="m-item"><span class="m-dot"></span>Recurring maintenance &amp; detailing</span>
    <span class="m-item"><span class="m-dot"></span>Post-construction finishing</span>
    <span class="m-item"><span class="m-dot"></span>Curated add-on services</span>
    <span class="m-item"><span class="m-dot"></span>Naples · Bonita Springs · Estero · Fort Myers</span>
    <span class="m-item"><span class="m-dot"></span>Discretion · Presentation · Consistency</span>
    <span class="m-item"><span class="m-dot"></span>Licensed · Bonded · Insured</span>
    <span class="m-item"><span class="m-dot"></span>Operational leadership · Genuine care</span>
    <span class="m-item"><span class="m-dot"></span>Elevated residential cleaning</span>
    <span class="m-item"><span class="m-dot"></span>Recurring maintenance &amp; detailing</span>
    <span class="m-item"><span class="m-dot"></span>Post-construction finishing</span>
    <span class="m-item"><span class="m-dot"></span>Curated add-on services</span>
    <span class="m-item"><span class="m-dot"></span>Naples · Bonita Springs · Estero · Fort Myers</span>
    <span class="m-item"><span class="m-dot"></span>Discretion · Presentation · Consistency</span>
    <span class="m-item"><span class="m-dot"></span>Licensed · Bonded · Insured</span>
  </div>
</div>

<section class="ab-origin" id="our-story">
  <div class="ab-inner ab-prose">
    <div class="eyebrow"><div class="ey-line"></div><span>Our story</span></div>
    <h2 class="sec-h">Two journeys,<br><em>one standard</em></h2>
    <div class="gold-line"></div>
    <p><strong>Sparklean Cleaning</strong> was built from two very different professional journeys that shared one belief: people deserve a higher standard of care, professionalism, and trust inside their homes.</p>
    <p>Founded by <strong>Tony Giuliano</strong> and <strong>Roxana “Roxy” Tellez</strong>, Sparklean was created to redefine what residential cleaning should feel like — not rushed, transactional, or inconsistent, but intentional, refined, and deeply service-oriented.</p>
  </div>
</section>

<section class="pc-intro ab-founder-split">
  <div class="ci-grid">
    <div class="ci-img-wrap">
      <img class="ci-img" src="/images/IMG_0456.jpg" alt="Tony Giuliano, Sparklean Cleaning co-founder" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b3054cb0f376b3a2fc6522_1000052028.JPG';">
      <div class="ci-badge"><div class="ci-badge-n">✦</div><div class="ci-badge-t">Leadership &amp; care</div></div>
    </div>
    <div>
      <div class="eyebrow"><div class="ey-line"></div><span>The operational foundation</span></div>
      <h2 class="sec-h">National-scale leadership,<br><em>applied at home</em></h2>
      <div class="gold-line"></div>
      <p class="ci-body">Before founding Sparklean, <strong>Tony Giuliano</strong> earned his Master’s Degree from the University of Maryland and built his career in operations, leadership, and client experience at a national level. As a Regional Vice President for CORT Trade Show &amp; Event Furnishings, he oversaw large-scale operations, logistics, client relationships, and service execution across demanding luxury and corporate environments.</p>
      <p class="ci-body">That experience shaped the foundation of Sparklean.</p>
    </div>
  </div>
</section>

<section class="ab-tony">
  <div class="ab-inner-wide ab-prose">
    <div class="eyebrow"><div class="ey-line"></div><span>What homeowners were missing</span></div>
    <h2 class="sec-h">The problem was rarely<br><em>just “cleaning.”</em></h2>
    <div class="gold-line"></div>
    <p>Tony saw that the cleaning industry often lacked what luxury homeowners truly value most:</p>
    <ul class="ab-list">
      <li>Professionalism</li>
      <li>Communication</li>
      <li>Accountability</li>
      <li>Presentation</li>
      <li>Consistency</li>
    </ul>
    <p class="ab-pull">The problem was rarely just “cleaning.” It was the experience surrounding it.</p>
    <p>Clients were forced to manage unreliable scheduling, inconsistent quality, poor communication, rushed visits, and companies that treated homes like transactions instead of personal spaces.</p>
    <p><strong>Sparklean was built to change that.</strong></p>
  </div>
</section>

<section class="ab-roxy">
  <div class="sl-grid">
    <div>
      <div class="eyebrow"><div class="ey-line"></div><span>A different kind of discipline</span></div>
      <h2 class="sec-h">Care shaped by<br><em>service under pressure</em></h2>
      <div class="gold-line"></div>
      <p class="ci-body">At the same time, Roxy brought a completely different level of care and discipline to the company. Before coming to the United States, she worked as a doctor in Cuba — a background that shaped her attention to detail, composure under pressure, and deep respect for serving people.</p>
      <p class="ci-body">That mindset became part of Sparklean’s culture.</p>
      <p class="ci-body">To Roxy, caring for someone’s home is personal. It requires trust, responsibility, precision, and pride in the details others overlook.</p>
    </div>
    <div class="sl-img-wrap">
      <img class="sl-img" src="/images/IMG_1847.jpg" alt="Roxana “Roxy” Tellez, Sparklean Cleaning co-founder" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b313b10e917717507d2c8e_1000051684.jpeg';">
      <div class="sl-corner"></div>
    </div>
  </div>
</section>

<div class="photo-pair ab-story-photos">
  <img class="pp-img" src="https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b313b5c748d7c5ee1533b1_1000051463.jpeg" alt="Sparklean team members representing the company’s people-first culture" loading="lazy">
  <img class="pp-img" src="https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b305580e7ebd68fa993f21_1000062969.jpeg" alt="Meticulous residential detailing reflecting Sparklean’s precision standards" loading="lazy">
</div>

<section class="ab-together">
  <div class="eyebrow"><div class="ey-line"></div><span>Together</span></div>
  <h2 class="sec-h" style="text-align:center;max-width:48rem;margin-left:auto;margin-right:auto;">Operational leadership meets<br><em>genuine human care</em></h2>
  <p class="ab-lux-intro">Together, Tony and Roxy combined operational leadership with genuine human care to build a company centered around one core idea:</p>
  <div class="ab-lux-stack">
    <p>Luxury is not just appearance.</p>
    <p>Luxury is consistency.</p>
    <p>Luxury is feeling cared for.</p>
    <p>Luxury is knowing every detail was handled intentionally.</p>
  </div>
</section>

<section class="ab-today">
  <div class="eyebrow"><div class="ey-line"></div><span>Today</span></div>
  <h2 class="sec-h" style="margin-bottom:52px;">Southwest Florida homes,<br><em>the same intentional standard</em></h2>
  <div class="comm-grid">
    <div class="comm-card">
      <div class="comm-city">Where we serve</div>
      <div class="comm-desc">Today, Sparklean Cleaning serves homeowners across <strong>Naples</strong>, <strong>Bonita Springs</strong>, <strong>Estero</strong>, <strong>Fort Myers</strong>, and surrounding Southwest Florida communities with a focus on elevated residential cleaning, recurring maintenance, post-construction detailing, and curated add-on services designed for high-standard homes.</div>
    </div>
    <div class="comm-card">
      <div class="comm-city">Built around people</div>
      <div class="comm-desc">Beyond the services themselves, Sparklean is built around people. Many members of the Sparklean team come from hardworking backgrounds and understand the value of opportunity, discipline, and pride in their work. Every team member is trained not only in cleaning standards, but in professionalism, discretion, presentation, and respect for the homes they enter.</div>
    </div>
  </div>
  <div class="ab-inner ab-prose" style="margin-top:56px;">
    <p>From luxury kitchens and waterfront estates to family homes preparing for guests, every visit is approached with the same mindset: show up professionally, communicate clearly, care deeply, and leave the space better than you found it.</p>
    <p style="text-align:center;margin-top:2rem;">Questions about how we work in your home? <a href="/contact" style="color:var(--gold-lt);">Reach our estimating team</a> or call <a href="tel:2398883588" style="color:var(--gold-lt);">(239) 888-3588</a>.</p>
  </div>
</section>

<section class="ab-outro">
  <p class="ab-quote">“When you come from nothing, you give everything.”</p>
  <div class="ab-inner ab-prose">
    <p>One phrase has quietly become part of the spirit behind Sparklean. That belief continues to shape the company every single day.</p>
  </div>
</section>

<section class="cta" id="quote">
  <div class="eyebrow" style="justify-content:center;margin-bottom:14px;"><div class="ey-line"></div><span>Experience the Sparklean standard</span><div class="ey-line"></div></div>
  <p class="cta-quote">Trusted across Southwest Florida</p>
  <p class="cta-prelude">Luxury is consistency — and the calm of knowing your home was handled with intention.</p>
  <h2>Meet the standard<br><em>in your own residence</em></h2>
  <p class="cta-sub">Request a personalized quote and discover what elevated cleaning feels like when communication, accountability, and presentation are never optional.</p>
  <p class="cta-guar">✦ Licensed · Bonded · Insured · Same-day response</p>
  <div class="cta-btns">
    <a href="/contact" class="btn-gold">Request Your Personalized Quote →</a>
    <a href="tel:2398883588" class="btn-outline">Call (239) 888-3588</a>
  </div>
</section>

<footer>
  <div class="footer-top">
    <div class="footer-logo-wrap"><img src="https://www.sparklean.co/images/branding/Sparklean_Logo_Transparent.png" alt="Sparklean Cleaning"></div>
    <div class="footer-divider"></div>
    <div class="footer-cities"><a href="/house-cleaning-naples">Naples</a> &nbsp;·&nbsp; <a href="/house-cleaning-estero">Estero</a> &nbsp;·&nbsp; <a href="/house-cleaning-fort-myers">Fort Myers</a> &nbsp;·&nbsp; <a href="/house-cleaning-bonita-springs">Bonita Springs</a> &nbsp;·&nbsp; <a href="/house-cleaning-cape-coral">Cape Coral</a></div>
    <div class="footer-cols">
      <div class="footer-col">
        <div class="footer-col-title">Our Services</div>
        <a href="/residential-cleaning">Residential Cleaning</a>
        <a href="/commercial-cleaning">Commercial &amp; Janitorial</a>
        <a href="/post-construction-cleaning">Post-Construction</a>
        <a href="/specialized-cleaning">Specialized Add-Ons</a>
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
    <span class="footer-copy">Licensed · Bonded · Insured · SW Florida</span>
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
</body>
</html>
""".replace("__JSONLD__", ld).replace("__INLINE_CSS__", full_css)

out = ROOT / "pages" / "about.html"
out.write_text(html, encoding="utf-8")
print("Wrote", out, "bytes", out.stat().st_size)
