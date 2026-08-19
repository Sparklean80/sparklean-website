/**
 * Homepage-only rebuild injector (authorized work order 2026-08-17).
 * Edits index.html only. Does not touch quote-intake.js / serviceFlows.js.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const GOOGLE_REVIEWS =
  "https://www.google.com/maps/search/?api=1&query=Sparklean%20Cleaning%2024221%20Bernwood%20Dr%20Suite%202%20Bonita%20Springs%20FL%2034135";

const faqEntities = [
  {
    q: "What cleaning services does Sparklean provide?",
    a: "Sparklean provides residential, commercial and janitorial, post-construction, vacation-rental, deep, move-in, move-out, and recurring cleaning. Every service is scoped around the property and requested level of care.",
  },
  {
    q: "Can I book one cleaning without committing to recurring service?",
    a: "Yes. You may begin with a personalized one-time cleaning, deep cleaning, move-in or move-out service, post-construction cleaning, or another approved service. Recurring care is available when you decide it is right for your property.",
  },
  {
    q: "What affects the price of cleaning?",
    a: "Pricing depends on the property size, current condition, requested scope, cleaning frequency, access requirements, and any specialized areas or finishes. Sparklean provides a written personalized quote before service begins.",
  },
  {
    q: "Does Sparklean serve areas outside Naples?",
    a: "Yes. Sparklean serves Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral. Availability may depend on the service type, project size, and scheduling requirements.",
  },
  {
    q: "Does Sparklean bring cleaning products and equipment?",
    a: "Yes. Sparklean arrives with professional products and equipment. Tell the team about preferred products, sensitive finishes, pets, allergies, or special instructions during the quote process.",
  },
  {
    q: "Is Sparklean insured and bonded?",
    a: "Yes. Sparklean carries general liability insurance, bonding, and Workers' Compensation coverage. Documentation is available when required.",
  },
  {
    q: "What is the 24-Hour Happiness Guarantee?",
    a: "If part of the completed service does not meet the agreed standard, contact Sparklean within 24 hours so the team can review the concern and, when covered by the guarantee, return to make it right.",
  },
  {
    q: "Do I need to be home?",
    a: "Not necessarily. Access instructions can be coordinated in advance for approved properties. Sparklean follows the agreed entry, service, and property-securing instructions.",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "LocalBusiness", "CleaningService"],
      "@id": "https://www.sparklean.co/#organization",
      name: "Sparklean Cleaning",
      legalName: "Sparklean Cleaning LLC",
      alternateName: ["Sparklean", "Sparklean Cleaning LLC"],
      description:
        "Sparklean Cleaning is a luxury residential and commercial cleaning company serving Naples and Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral with direct employees and supervised teams.",
      url: "https://www.sparklean.co/",
      telephone: "+1-239-888-3588",
      email: "info@sparklean.co",
      priceRange: "$$$",
      logo: {
        "@type": "ImageObject",
        "@id": "https://www.sparklean.co/#logo",
        url: "/images/branding/Sparklean_Logo_Transparent.png",
        contentUrl: "/images/branding/Sparklean_Logo_Transparent.png",
      },
      image: [
        "/images/branding/Sparklean_Logo_Transparent.png",
        "/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp",
        "/images/heroes/69b21c8b4a74322eaf0b5148_1000051954-6f5aa8b3-1400.webp",
      ],
      founder: [
        { "@id": "https://www.sparklean.co/#founder-tony-giuliano" },
        { "@id": "https://www.sparklean.co/#founder-roxana-tellez" },
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+1-239-888-3588",
          email: "info@sparklean.co",
          contactType: "customer service",
          areaServed: "US-FL",
          availableLanguage: "English",
        },
      ],
      areaServed: [
        { "@type": "AdministrativeArea", name: "Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral" },
        {
          "@type": "City",
          name: "Naples",
          containedInPlace: { "@type": "State", name: "Florida" },
        },
        {
          "@type": "City",
          name: "Bonita Springs",
          containedInPlace: { "@type": "State", name: "Florida" },
        },
        {
          "@type": "City",
          name: "Estero",
          containedInPlace: { "@type": "State", name: "Florida" },
        },
        {
          "@type": "City",
          name: "Fort Myers",
          containedInPlace: { "@type": "State", name: "Florida" },
        },
        {
          "@type": "City",
          name: "Cape Coral",
          containedInPlace: { "@type": "State", name: "Florida" },
        },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        "@id": "https://www.sparklean.co/#offer-catalog",
        name: "Sparklean Cleaning Services",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              "@id": "https://www.sparklean.co/residential-cleaning#service",
              name: "Residential Cleaning",
              url: "https://www.sparklean.co/residential-cleaning",
              provider: { "@id": "https://www.sparklean.co/#organization" },
              description:
                "One-time, deep, move-in/move-out, and recurring residential cleaning across Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              "@id": "https://www.sparklean.co/commercial-cleaning#service",
              name: "Commercial and Janitorial Cleaning",
              url: "https://www.sparklean.co/commercial-cleaning",
              provider: { "@id": "https://www.sparklean.co/#organization" },
              description:
                "Office, medical, dealership, and commercial cleaning across Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              "@id": "https://www.sparklean.co/post-construction-cleaning#service",
              name: "Post-Construction Cleaning",
              url: "https://www.sparklean.co/post-construction-cleaning",
              provider: { "@id": "https://www.sparklean.co/#organization" },
              description:
                "Rough and final post-construction cleaning for new builds and remodels in Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              "@id": "https://www.sparklean.co/vacation-rental-cleaning#service",
              name: "Vacation Rental Cleaning",
              url: "https://www.sparklean.co/vacation-rental-cleaning",
              provider: { "@id": "https://www.sparklean.co/#organization" },
              description:
                "Vacation rental turnover and property-care cleaning across Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
            },
          },
        ],
      },
    },
    {
      "@type": "Person",
      "@id": "https://www.sparklean.co/#founder-tony-giuliano",
      name: "Tony Giuliano",
      jobTitle: "Co-Founder",
      worksFor: { "@id": "https://www.sparklean.co/#organization" },
      url: "https://www.sparklean.co/about",
    },
    {
      "@type": "Person",
      "@id": "https://www.sparklean.co/#founder-roxana-tellez",
      name: 'Roxana "Roxy" Tellez',
      alternateName: "Roxy Tellez",
      jobTitle: "Co-Founder",
      worksFor: { "@id": "https://www.sparklean.co/#organization" },
      url: "https://www.sparklean.co/about",
    },
    {
      "@type": "WebSite",
      "@id": "https://www.sparklean.co/#website",
      url: "https://www.sparklean.co/",
      name: "Sparklean Cleaning",
      description:
        "Luxury residential and commercial cleaning in Naples and Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
      publisher: { "@id": "https://www.sparklean.co/#organization" },
      inLanguage: "en-US",
    },
    {
      "@type": "WebPage",
      "@id": "https://www.sparklean.co/#webpage",
      url: "https://www.sparklean.co/",
      name: "Luxury Cleaning Services in Naples & Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral | Sparklean",
      description:
        "Luxury residential, commercial, post-construction and vacation-rental cleaning in Naples, Bonita Springs, Estero, Fort Myers and Cape Coral.",
      isPartOf: { "@id": "https://www.sparklean.co/#website" },
      about: { "@id": "https://www.sparklean.co/#organization" },
      publisher: { "@id": "https://www.sparklean.co/#organization" },
      mainEntity: { "@id": "https://www.sparklean.co/#organization" },
    },
    {
      "@type": "FAQPage",
      "@id": "https://www.sparklean.co/#faq",
      mainEntity: faqEntities.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const homepageCss = `
<style id="homepage-rebuild-2026-08-17">
.hero-bg{position:absolute;inset:-2px;overflow:hidden;}
.hero-bg img{width:100%;height:100%;object-fit:cover;object-position:70% center;display:block;animation:zoomIn 14s ease-out forwards;}
.hero-benefit{font-family:var(--serif);font-size:clamp(1.05rem,2.2vw,1.35rem);line-height:1.45;color:var(--white);margin-bottom:14px;opacity:0;animation:up 1s .58s forwards;}
.hero-sub{margin-bottom:14px;}
.home-quote{padding:72px 80px;background:var(--dark2);border-top:1px solid rgba(201,168,76,.1);border-bottom:1px solid rgba(201,168,76,.1);}
.home-quote-inner{max-width:980px;margin:0 auto;}
.home-quote .sec-h{margin-bottom:12px;}
.home-quote-lead{font-family:var(--serif);font-size:.96rem;line-height:1.8;color:var(--w70);max-width:46rem;margin-bottom:28px;}
.home-quote-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:end;}
.home-quote-field{display:flex;flex-direction:column;gap:8px;}
.home-quote-field label{font-size:.5rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);}
.home-quote-field input,.home-quote-field select{width:100%;background:rgba(14,14,14,.55);border:1px solid rgba(201,168,76,.22);color:var(--white);font-family:var(--sans);font-size:.78rem;padding:14px 14px;outline:none;transition:border-color .2s;}
.home-quote-field input:focus,.home-quote-field select:focus{border-color:rgba(201,168,76,.55);}
.home-quote-field select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--gold) 50%),linear-gradient(135deg,var(--gold) 50%,transparent 50%);background-position:calc(100% - 18px) calc(50% - 3px),calc(100% - 12px) calc(50% - 3px);background-size:6px 6px,6px 6px;background-repeat:no-repeat;padding-right:34px;}
.home-quote-field--cta .btn-gold{width:100%;justify-content:center;border:0;cursor:pointer;font-family:var(--sans);}
.home-quote-note{margin-top:14px;font-size:.52rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(249,247,243,.34);line-height:1.6;}
.svc-card .svc-intents{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;position:relative;z-index:1;}
.svc-card .svc-intent{font-size:.46rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:rgba(249,247,243,.55);}
.svc-addons-link{display:inline-flex;margin-top:28px;font-size:.56rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--w70);text-decoration:none;border-bottom:1px solid rgba(249,247,243,.2);padding-bottom:2px;transition:color .25s,border-color .25s;}
.svc-addons-link:hover{color:var(--gold-lt);border-color:var(--gold);}
.areas-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:3px;max-width:1100px;margin:0 auto;}
.area{padding:34px 28px 32px;text-align:left;border:1px solid rgba(201,168,76,.1);text-decoration:none;color:inherit;transition:background .3s,border-color .3s;display:flex;flex-direction:column;gap:10px;min-height:100%;}
.area:hover{background:rgba(201,168,76,.05);border-color:rgba(201,168,76,.28);}
.area-name{font-family:var(--serif);font-size:1.35rem;font-weight:400;margin-bottom:0;}
.area-desc{font-family:var(--serif);font-size:.88rem;line-height:1.7;color:var(--w70);flex:1;}
.area-cta{font-size:.5rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-top:8px;}
.cta-trust{margin-top:22px;font-size:.52rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(249,247,243,.38);}
.svc-icon{display:none;}
@media(max-width:1024px){
.home-quote{padding-left:32px;padding-right:32px;}
.home-quote-form{grid-template-columns:1fr 1fr;}
}
@media(max-width:640px){
.home-quote{padding:60px 20px;}
.home-quote-form{grid-template-columns:1fr;}
.hero-bg img{object-position:center top;}
}
@media(max-width:767px){
.hero-bg img{object-position:center top;}
}
@media(prefers-reduced-motion:reduce){
.hero-tag,h1,.hero-benefit,.hero-sub,.hero-guar,.hero-btns,.hero-stats,.hero-bg img{opacity:1!important;animation:none!important;transform:none!important;}
}
</style>
`;

const sections = `
<section class="hero" id="home">
  <div class="hero-bg">
    <img src="/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp" alt="Sparklean luxury residential cleaning team preparing a Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral home" width="1400" height="900" fetchpriority="high" decoding="async">
  </div>
  <div class="hero-ov"></div>
  <div class="hero and-content hero-content">
    <div class="hero-tag"><div class="hero-tag-line"></div><span>Luxury Residential &amp; Commercial Cleaning</span></div>
    <h1>Luxury Cleaning Services in <em>Naples</em> &amp; Across Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral</h1>
    <p class="hero-benefit">Exceptional care for your property—without a one-size-fits-all commitment.</p>
    <p class="hero-sub">Begin with one personalized cleaning or choose ongoing care for your home, business, construction project, or vacation property. Sparklean’s supervised teams serve Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral with the same attention to detail and accountability.</p>
    <div class="hero-guar">✦ 24-Hour Happiness Guarantee</div>
    <div class="hero-btns">
      <a href="/contact" class="btn-gold" data-sparklean-intake data-sparklean-event="quote_cta" data-sparklean-event-type="hero_primary">Request Your Personalized Quote</a>
      <a href="#about" class="btn-outline">Discover the Sparklean Standard</a>
    </div>
  </div>
  <div class="hero-stats">
    <a class="hero-google-proof" href="${GOOGLE_REVIEWS}" target="_blank" rel="noopener noreferrer" data-sparklean-event="google_review_click" data-sparklean-event-type="hero">
      <div><div class="hs-n">4.9★</div><div class="hs-l">Google Rating</div></div>
    </a>
    <div><div class="hs-n">Five Cities</div><div class="hs-l">Service Area</div></div>
  </div>
</section>

<section class="trust" id="trust" aria-label="Trust and proof">
  <div class="trust-inner">
    <a class="trust-item" href="${GOOGLE_REVIEWS}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit;" data-sparklean-event="google_review_click" data-sparklean-event-type="trust_strip">
      <span class="t-icon">★</span>
      <div><span class="t-title">4.9★ Google Rating</span><span class="t-sub">Live reviews</span></div>
    </a>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Direct Employees</span><span class="t-sub">Our team</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Supervised Teams</span><span class="t-sub">Team-lead oversight</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">Bonded &amp; Insured</span><span class="t-sub">Workers’ Comp</span></div></div>
    <div class="trust-sep"></div>
    <div class="trust-item"><span class="t-icon">✦</span><div><span class="t-title">24-Hour Guarantee</span><span class="t-sub">Happiness protected</span></div></div>
  </div>
</section>

<section class="home-quote" id="start-quote" aria-labelledby="home-quote-h">
  <div class="home-quote-inner">
    <div class="eyebrow"><div class="ey-line"></div><span>Begin Here</span></div>
    <h2 class="sec-h" id="home-quote-h">Start with the service<br><em>your property needs.</em></h2>
    <p class="home-quote-lead">Tell us what you need and we’ll help you choose the right level of care. Begin with one cleaning or request an ongoing plan built around your property.</p>
    <form class="home-quote-form" id="home-quote-entry" novalidate>
      <div class="home-quote-field">
        <label for="hq-zip">ZIP code</label>
        <input id="hq-zip" name="zip" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="10" placeholder="34102" aria-required="false">
      </div>
      <div class="home-quote-field">
        <label for="hq-service">Service type</label>
        <select id="hq-service" name="service" aria-required="false">
          <option value="">Select a service</option>
          <option value="residential">Residential Cleaning</option>
          <option value="commercial">Commercial Cleaning</option>
          <option value="postConstruction">Post-Construction Cleaning</option>
          <option value="vacationRental">Vacation Rental Cleaning</option>
          <option value="unsure">Not Sure Yet</option>
        </select>
      </div>
      <div class="home-quote-field">
        <label for="hq-property">Property type</label>
        <select id="hq-property" name="property" aria-required="false">
          <option value="">Select a property</option>
          <option value="home">Home / Condo</option>
          <option value="estate">Estate / Seasonal</option>
          <option value="office">Office / Commercial</option>
          <option value="construction">Construction / Remodel</option>
          <option value="rental">Vacation Rental</option>
          <option value="other">Other / Not sure</option>
        </select>
      </div>
      <div class="home-quote-field home-quote-field--cta">
        <label for="hq-continue">&nbsp;</label>
        <button type="submit" class="btn-gold" id="hq-continue" data-sparklean-event="quote_cta" data-sparklean-event-type="homepage_compact_continue">Build My Personalized Quote</button>
      </div>
    </form>
    <p class="home-quote-note">Opens Sparklean’s existing quote intake — no lead is sent until you complete and submit the full request.</p>
  </div>
</section>

<section class="founder-story" id="founder-message" aria-labelledby="founder-story-h">
  <div class="founder-inner">
    <div class="eyebrow"><div class="ey-line"></div><span>From our founder</span><div class="ey-line"></div></div>
    <h2 class="sec-h" id="founder-story-h">Care is where the<br><em>Sparklean standard</em> begins.</h2>
    <p class="founder-lede">Roxy rebuilt her life in Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral with a belief that caring for someone’s property is personal. Her background in medicine shaped a company built around precision, responsibility, and respect for every space entrusted to its team.</p>
    <div class="founder-cinematic">
      <div class="founder-cinematic__chrome">
        <div class="founder-cinematic__ratio">
          <div class="founder-player" id="founder-player" data-yt-src="https://www.youtube-nocookie.com/embed/l59cKJ9JhLo?rel=0&amp;modestbranding=1&amp;playsinline=1">
            <button type="button" class="founder-poster-btn" id="founder-poster-btn" aria-label="Play video: Meet Roxy and hear her story" data-sparklean-event="founder_video" data-sparklean-event-type="play">
              <span class="founder-poster-layout">
                <span class="founder-poster-panel">
                  <span class="founder-poster-kicker">Founder story · 2 min</span>
                  <span class="founder-poster-headline">Meet Roxy and<br><em>hear her story</em></span>
                  <span class="founder-poster-sub">A Cuban doctor who started over with nothing — Roxy on rebuilding her life, giving everything she has, and why care is at the center of every home.</span>
                  <span class="founder-poster-play-btn"><span class="founder-poster-play-icon" aria-hidden="true"></span>Watch now</span>
                </span>
                <span class="founder-poster-media">
                  <img class="founder-poster-img" src="/images/branding/roxy-welcome-poster.png" alt="" width="720" height="960" loading="lazy" decoding="async">
                  <span class="founder-poster-media-play" aria-hidden="true"><span class="founder-poster-media-play-ring"></span></span>
                </span>
              </span>
            </button>
            <div class="founder-embed-slot" id="founder-embed-slot" aria-live="polite"></div>
          </div>
        </div>
      </div>
    </div>
    <p class="founder-tagline">Experience the Sparklean standard</p>
    <a class="founder-soft-cta" href="#founder-message" id="founder-story-cta">Meet Roxy and Hear Her Story</a>
    <p class="founder-trust-line">Trusted in homes across Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral</p>
  </div>
</section>

<section class="about" id="about">
  <div class="about-grid">
    <div class="about-imgs">
      <img class="about-main" src="/images/heroes/69b21c8b4a74322eaf0b5148_1000051954-6f5aa8b3-1400.webp" alt="Sparklean team reviewing service details in a luxury Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral home" loading="lazy" decoding="async">
      <img class="about-float" src="/images/heroes/69b21cae1dbe6ede803ef701_1000051474-0fcae9d8-1400.webp" alt="Sparklean team lead directing a supervised cleaning crew" loading="lazy" decoding="async">
      <div class="about-badge"><div class="about-badge-n">24h</div><div class="about-badge-t">Happiness Guaranteed</div></div>
    </div>
    <div>
      <div class="eyebrow"><div class="ey-line"></div><span>The Sparklean Standard</span></div>
      <h2 class="sec-h">Luxury is knowing every<br>detail is <em>accounted for.</em></h2>
      <div class="gold-line"></div>
      <p class="about-body">A beautiful result matters. So does knowing who entered your property, how the work was supervised, and who is accountable if something needs attention. Sparklean combines attentive cleaning with direct employees, consistent standards, and responsive management for homes and businesses across Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.</p>
      <ul class="checks">
        <li><span class="ck-icon">✦</span><div class="ck-t"><strong>Discreet, Professional Teams</strong>Uniformed employees who treat your property, privacy, and preferences with respect.</div></li>
        <li><span class="ck-icon">✦</span><div class="ck-t"><strong>Consistent Supervision</strong>A team lead helps maintain the same standard from one visit to the next.</div></li>
        <li><span class="ck-icon">✦</span><div class="ck-t"><strong>Care Designed Around You</strong>Choose a one-time service or ongoing care based on your property and priorities.</div></li>
        <li><span class="ck-icon">✦</span><div class="ck-t"><strong>Accountability After Every Visit</strong>If something does not meet expectations, contact Sparklean within 24 hours and the team will make it right under the published guarantee.</div></li>
      </ul>
      <a href="#why" class="btn-gold">Why Clients Choose Sparklean</a>
    </div>
  </div>
</section>

<section class="services" id="services">
  <div class="svc-top">
    <div>
      <div class="eyebrow"><div class="ey-line"></div><span>Services</span></div>
      <h2 class="sec-h">The right level of care<br>for <em>every property.</em></h2>
      <p class="home-quote-lead" style="margin-top:16px;margin-bottom:0;">Start with one service or create an ongoing plan. Every quote is tailored to the property, current condition, desired scope, and level of care.</p>
    </div>
  </div>
  <div class="svc-grid">
    <a href="/residential-cleaning" class="svc-card" data-sparklean-event="service_card_click" data-sparklean-event-type="residential">
      <div class="svc-bg" style="background-image:url('/images/cdn-migrated/69b21c9939e6441bc6975f7e_1000051963.jpeg-36ddec59-1200.webp')"></div>
      <div class="svc-num">01</div>
      <h3 class="svc-title">Residential Cleaning</h3>
      <p class="svc-desc">Personalized one-time, deep, move-in, move-out, and recurring cleaning for homes, condominiums, and seasonal residences.</p>
      <div class="svc-intents"><span class="svc-intent">Recurring Care</span><span class="svc-intent">Deep Cleaning</span><span class="svc-intent">Move-In/Out</span></div>
      <div class="svc-arrow">→</div>
    </a>
    <a href="/commercial-cleaning" class="svc-card" data-sparklean-event="service_card_click" data-sparklean-event-type="commercial">
      <div class="svc-bg" style="background-image:url('/images/cdn-migrated/69b21daa92235defbf795917_1000052025--1-.JPG-cf98c3d0-1200.webp')"></div>
      <div class="svc-num">02</div>
      <h3 class="svc-title">Commercial &amp; Janitorial</h3>
      <p class="svc-desc">Reliable cleaning for offices, dealerships, medical spaces, common areas, and commercial properties that must remain presentation-ready.</p>
      <div class="svc-intents"><span class="svc-intent">Office Cleaning</span><span class="svc-intent">Janitorial</span><span class="svc-intent">Floor Care</span></div>
      <div class="svc-arrow">→</div>
    </a>
    <a href="/post-construction-cleaning" class="svc-card" data-sparklean-event="service_card_click" data-sparklean-event-type="post_construction">
      <div class="svc-bg" style="background-image:url('/images/cdn-migrated/69b700932a9bb8e7dab16969_Untitled-design--6-.jpg-3c52826f-1200.webp')"></div>
      <div class="svc-num">03</div>
      <h3 class="svc-title">Post-Construction Cleaning</h3>
      <p class="svc-desc">Detailed final cleaning for renovations, remodels, new construction, and properties preparing for turnover or occupancy.</p>
      <div class="svc-intents"><span class="svc-intent">Remodels</span><span class="svc-intent">Final Cleans</span><span class="svc-intent">Turnover Preparation</span></div>
      <div class="svc-arrow">→</div>
    </a>
    <a href="/vacation-rental-cleaning" class="svc-card" data-sparklean-event="service_card_click" data-sparklean-event-type="vacation_rental">
      <div class="svc-bg" style="background-image:url('/images/cdn-migrated/69b21e37dc913e9e39c6e66b_1000051480.JPG-e261c045-1200.webp')"></div>
      <div class="svc-num">04</div>
      <h3 class="svc-title">Vacation Rental Cleaning</h3>
      <p class="svc-desc">Responsive turnover and property-care cleaning for vacation rentals, seasonal properties, and homes prepared for arriving guests.</p>
      <div class="svc-intents"><span class="svc-intent">Turnovers</span><span class="svc-intent">Arrival Preparation</span><span class="svc-intent">Property Care</span></div>
      <div class="svc-arrow">→</div>
    </a>
  </div>
  <a href="/specialized-cleaning" class="svc-addons-link">Explore specialized add-ons →</a>
</section>

<section class="why" id="why">
  <div class="eyebrow"><div class="ey-line"></div><span>Why Sparklean</span></div>
  <h2 class="sec-h">A more dependable way<br>to <em>care for your property.</em></h2>
  <div class="why-grid">
    <div class="why-imgs">
      <div class="why-corner"></div>
      <img class="why-main" src="/images/heroes/69b3054cb0f376b3a2fc6522_1000052028-54411974-1400.webp" alt="Sparklean supervisor directing a cleaning team on site" loading="lazy" decoding="async">
      <img class="why-float" src="/images/cdn-migrated/69b305580e7ebd68fa993f21_1000062969.jpeg-d097a869-1200.webp" alt="Detailed bathroom finishing work by Sparklean" width="1200" height="800" loading="lazy" decoding="async">
    </div>
    <div class="why-feats">
      <div class="why-feat"><div class="wf-n">I.</div><div><div class="wf-title">Direct Employees</div><div class="wf-desc">Sparklean sends trained members of its own team—not workers selected from an open gig marketplace.</div></div></div>
      <div class="why-feat"><div class="wf-n">II.</div><div><div class="wf-title">Active Supervision</div><div class="wf-desc">Team leads help keep service consistent and details from being overlooked.</div></div></div>
      <div class="why-feat"><div class="wf-n">III.</div><div><div class="wf-title">Luxury-Grade Products</div><div class="wf-desc">Professional products and equipment selected for effective cleaning and careful property care.</div></div></div>
      <div class="why-feat"><div class="wf-n">IV.</div><div><div class="wf-title">Flexible Service Paths</div><div class="wf-desc">Begin with a one-time cleaning or choose weekly, biweekly, monthly, seasonal, or commercial service.</div></div></div>
      <div class="why-feat"><div class="wf-n">V.</div><div><div class="wf-title">Clear Accountability</div><div class="wf-desc">Written quotes, responsive communication, and a 24-hour opportunity to make concerns right.</div></div></div>
    </div>
  </div>
</section>

<section class="products" id="products">
  <div class="prod-grid">
    <div class="prod-imgs">
      <img class="prod-img" src="/images/cdn-migrated/69b21cd7208efa44622d119d_unnamed.jpg-176c05a3-1200.webp" alt="Sparklean Green Clean professional cleaning products" width="1200" height="800" loading="lazy" decoding="async">
      <div class="prod-badge"><div class="prod-badge-icon">✦</div><div class="prod-badge-txt">GREEN<br>CLEAN</div></div>
    </div>
    <div>
      <div class="eyebrow"><div class="ey-line"></div><span>Our Products</span></div>
      <h2 class="sec-h">Professional cleaning powered by the<br><em>Sparklean Green Clean</em> line.</h2>
      <div class="gold-line"></div>
      <p class="prod-body">Sparklean arrives prepared with its own professional-grade cleaning products, developed for dependable results across residential and commercial environments. Product preferences, sensitive surfaces, children, and pets can be discussed during your personalized quote.</p>
      <div class="prod-range">
        <div class="prod-row"><div class="prod-dot" style="background:#e8a0a0"></div><div><div class="prod-name">Multipurpose Cleaner</div><div class="prod-desc-t">All-surface everyday clean</div></div></div>
        <div class="prod-row"><div class="prod-dot" style="background:#c9a84c"></div><div><div class="prod-name">Green Clean Degreaser</div><div class="prod-desc-t">Kitchen and surface degreaser</div></div></div>
        <div class="prod-row"><div class="prod-dot" style="background:#7ba7bc"></div><div><div class="prod-name">Window Cleaner</div><div class="prod-desc-t">Clear, streak-conscious finish</div></div></div>
      </div>
      <div class="prod-tags">
        <span class="prod-tag">✦ Professional-grade</span>
        <span class="prod-tag">✦ Brought to every visit</span>
        <span class="prod-tag">✦ Preferences welcome</span>
      </div>
    </div>
  </div>
</section>

<section class="reviews" id="reviews">
  <div class="eyebrow"><div class="ey-line"></div><span>Client Trust</span></div>
  <h2 class="sec-h" style="margin-bottom:14px;text-align:center">4.9★ on <em>Google</em></h2>
  <div class="rev-band rev-band--google-only">
    <div>
      <p class="rev-sub">Homeowners and businesses throughout Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral use Sparklean for one-time projects and ongoing property care. Read current feedback directly on Sparklean’s live Google profile.</p>
      <div class="rev-stats">
        <a class="rev-google-proof" href="${GOOGLE_REVIEWS}" target="_blank" rel="noopener noreferrer" data-sparklean-event="google_review_click" data-sparklean-event-type="reviews">
          <div><div class="rev-stat-n">4.9</div><div class="rev-stat-l">★★★★★<br>Google Rating</div></div>
        </a>
        <div><div class="rev-stat-n">Five Cities</div><div class="rev-stat-l">Service<br>Area</div></div>
        <div><div class="rev-stat-n">24h</div><div class="rev-stat-l">Happiness<br>Guarantee</div></div>
      </div>
      <p class="rev-google-cta" style="margin-top:22px;">
        <a href="${GOOGLE_REVIEWS}" target="_blank" rel="noopener noreferrer" class="btn-outline" style="font-size:.54rem;padding:12px 24px;letter-spacing:.14em;" data-sparklean-event="google_review_click" data-sparklean-event-type="reviews_cta">Read Live Google Reviews ↗</a>
      </p>
    </div>
  </div>
</section>

<section class="areas" id="areas">
  <div class="areas-head">
    <div class="eyebrow"><div class="ey-line"></div><span>Service Areas</span><div class="ey-line"></div></div>
    <h2 class="sec-h" style="margin-top:11px;text-align:center">Luxury cleaning throughout<br><em>Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.</em></h2>
    <p class="areas-intro">Sparklean brings the same supervised service, professional standards, and 24-hour happiness guarantee to homes and businesses across the region. Explore cleaning services available in your community.</p>
  </div>
  <div class="areas-grid">
    <a href="/house-cleaning-naples" class="area" data-sparklean-event="city_page_click" data-sparklean-event-type="naples">
      <div class="area-name">Naples</div>
      <p class="area-desc">Luxury residential and commercial cleaning for estates, condominiums, offices, seasonal residences, and construction projects.</p>
      <span class="area-cta">Explore Cleaning Services in Naples →</span>
    </a>
    <a href="/house-cleaning-bonita-springs" class="area" data-sparklean-event="city_page_click" data-sparklean-event-type="bonita_springs">
      <div class="area-name">Bonita Springs</div>
      <p class="area-desc">Personalized care for homes, gated communities, businesses, vacation properties, and post-construction projects.</p>
      <span class="area-cta">Explore Cleaning Services in Bonita Springs →</span>
    </a>
    <a href="/house-cleaning-estero" class="area" data-sparklean-event="city_page_click" data-sparklean-event-type="estero">
      <div class="area-name">Estero</div>
      <p class="area-desc">Supervised cleaning for residences, commercial properties, seasonal homes, and growing communities throughout Estero.</p>
      <span class="area-cta">Explore Cleaning Services in Estero →</span>
    </a>
    <a href="/house-cleaning-fort-myers" class="area" data-sparklean-event="city_page_click" data-sparklean-event-type="fort_myers">
      <div class="area-name">Fort Myers</div>
      <p class="area-desc">Residential, commercial, post-construction, and property-care cleaning delivered with consistent Sparklean standards.</p>
      <span class="area-cta">Explore Cleaning Services in Fort Myers →</span>
    </a>
    <a href="/house-cleaning-cape-coral" class="area" data-sparklean-event="city_page_click" data-sparklean-event-type="cape_coral">
      <div class="area-name">Cape Coral</div>
      <p class="area-desc">Professional cleaning for homes, waterfront properties, businesses, rentals, and construction or remodeling projects.</p>
      <span class="area-cta">Explore Cleaning Services in Cape Coral →</span>
    </a>
  </div>
</section>

<section class="faq" id="faq">
  <div class="eyebrow"><div class="ey-line"></div><span>Common Questions</span></div>
  <h2 class="sec-h">What to expect<br>from <em>Sparklean.</em></h2>
  <div class="faq-grid">
    <div>
      <p class="faq-body-txt">Transparency is part of the Sparklean standard. If you don’t find what you’re looking for, our team is always just a call away.</p>
      <div class="faq-contact">
        <div class="faq-cl">Reach Us Directly</div>
        <a href="tel:2398883588" class="faq-phone" data-sparklean-event="phone_click">(239) 888-3588</a>
        <a href="mailto:info@sparklean.co" class="faq-email" data-sparklean-event="email_click">info@sparklean.co</a>
      </div>
    </div>
    <div class="faq-list">
      ${faqEntities
        .map(
          (f) => `<div class="faq-item"><button type="button" class="faq-q" onclick="toggleFaq(this)" aria-expanded="false">${f.q.replace(/'/g, "&#39;")} <span class="faq-plus" aria-hidden="true">+</span></button><div class="faq-ans">${f.a}</div></div>`
        )
        .join("")}
    </div>
  </div>
</section>

<section class="inner" id="inner-circle">
  <div class="inner-box">
    <div class="inner-tag">Private recurring care</div>
    <h2 class="inner-h">The Sparklean<br><em>Inner Circle</em></h2>
    <p class="inner-desc">For properties where consistency, discretion, and priority coordination matter most. Inner Circle members receive an elevated recurring-care relationship designed around how their home or business operates.</p>
    <p class="inner-note">Limited recurring capacity is maintained intentionally.</p>
    <div class="inner-actions">
      <a href="/inner-circle" class="btn-outline" data-sparklean-event="inner_circle_click" data-sparklean-event-type="explore">Explore the Inner Circle</a>
      <a href="/contact" class="btn-gold" data-sparklean-intake-preset="innerCircle" data-sparklean-event="inner_circle_click" data-sparklean-event-type="request">Request Membership Consideration</a>
    </div>
  </div>
</section>

<section class="cta" id="quote">
  <div class="cta-inner">
    <div class="eyebrow" style="justify-content:center"><div class="ey-line"></div><span>Your First Visit</span><div class="ey-line"></div></div>
    <h2 class="cta-h" style="margin-top:13px">Begin with one exceptional clean.<br><em>Continue with care designed around your property.</em></h2>
    <p class="cta-sub">Tell us about your home, business, rental, or project. Sparklean will recommend the appropriate scope and provide a personalized quote before service begins.</p>
    <div class="cta-btns">
      <a href="/contact" class="btn-gold" style="font-size:.68rem;padding:17px 40px;" data-sparklean-intake data-sparklean-event="quote_cta" data-sparklean-event-type="final">Request Your Personalized Quote</a>
    </div>
    <div class="cta-links">
      <a href="tel:2398883588" class="cta-link" data-sparklean-event="phone_click">Call (239) 888-3588</a>
      <a href="mailto:info@sparklean.co" class="cta-link" data-sparklean-event="email_click">Email info@sparklean.co</a>
    </div>
    <p class="cta-trust">Bonded · Insured · Workers’ Compensation · 24-Hour Happiness Guarantee</p>
  </div>
</section>
`.replace('class="hero and-content hero-content"', 'class="hero-content"');

const homeQuoteScript = `
<script>
(function(){
  var form=document.getElementById('home-quote-entry');
  if(!form)return;
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var zip=(document.getElementById('hq-zip')||{}).value||'';
    var service=(document.getElementById('hq-service')||{}).value||'';
    var property=(document.getElementById('hq-property')||{}).value||'';
    try{
      sessionStorage.setItem('sparklean_home_quote_hint',JSON.stringify({
        zip:String(zip).slice(0,10),
        service:String(service).slice(0,40),
        property:String(property).slice(0,40),
        ts:Date.now(),
        path:'/'
      }));
    }catch(err){}
    if(window.SparkleanEvents&&typeof window.SparkleanEvents.track==='function'){
      window.SparkleanEvents.track('homepage_quote_entry_continue',{
        service_hint:service||'none',
        property_hint:property||'none',
        has_zip:zip? '1':'0'
      });
    }
    if(window.SparkleanQuoteIntake&&typeof window.SparkleanQuoteIntake.open==='function'){
      window.SparkleanQuoteIntake.open({sourceUrl:window.location.href+'#start-quote'});
      return;
    }
    window.location.href='/contact';
  });
  var founderCta=document.getElementById('founder-story-cta');
  var founderBtn=document.getElementById('founder-poster-btn');
  if(founderCta&&founderBtn){
    founderCta.addEventListener('click',function(e){
      e.preventDefault();
      founderBtn.focus();
      founderBtn.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }
})();
</script>
`;

// --- Apply transformations ---

html = html.replace(
  /<title>[\s\S]*?<\/title>/,
  "<title>Luxury Cleaning Services in Naples &amp; Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral | Sparklean</title>"
);

html = html.replace(
  /<meta name="description" content="[^"]*">/,
  '<meta name="description" content="Luxury residential, commercial, post-construction and vacation-rental cleaning in Naples, Bonita Springs, Estero, Fort Myers and Cape Coral.">'
);

html = html.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  `<script type="application/ld+json">\n${JSON.stringify(schema)}\n</script>`
);

html = html.replace(
  /<meta property="og:title" content="[^"]*">/,
  '<meta property="og:title" content="Luxury Cleaning Services in Naples &amp; Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral | Sparklean">'
);
html = html.replace(
  /<meta property="og:description" content="[^"]*">/,
  '<meta property="og:description" content="Luxury residential, commercial, post-construction and vacation-rental cleaning in Naples, Bonita Springs, Estero, Fort Myers and Cape Coral.">'
);
html = html.replace(
  /<meta name="twitter:title" content="[^"]*">/,
  '<meta name="twitter:title" content="Luxury Cleaning Services in Naples &amp; Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral | Sparklean">'
);
html = html.replace(
  /<meta name="twitter:description" content="[^"]*">/,
  '<meta name="twitter:description" content="Luxury residential, commercial, post-construction and vacation-rental cleaning in Naples, Bonita Springs, Estero, Fort Myers and Cape Coral.">'
);

if (!html.includes('id="homepage-rebuild-2026-08-17"')) {
  html = html.replace(
    '</head>',
    homepageCss + "\n</head>"
  );
}

html = html.replace(
  />Get a Quote</g,
  ">Request a Quote<"
);

// Replace main content from hero through final CTA (before footer)
const start = html.indexOf('<section class="hero"');
const footer = html.indexOf("<footer>");
if (start < 0 || footer < 0) {
  console.error("Could not find hero/footer markers", { start, footer });
  process.exit(1);
}
html = html.slice(0, start) + sections + "\n" + html.slice(footer);

// Soften footer service-area anchors (homepage footer only; same structure)
html = html.replace(
  '<li><a href="/house-cleaning-naples">Cleaning service Naples FL</a></li>',
  '<li><a href="/house-cleaning-naples">Naples</a></li>'
);
html = html.replace(
  '<li><a href="/house-cleaning-fort-myers">Cleaning service Fort Myers FL</a></li>',
  '<li><a href="/house-cleaning-fort-myers">Fort Myers</a></li>'
);
html = html.replace(
  '<li><a href="/house-cleaning-bonita-springs">Cleaning service Bonita Springs FL</a></li>',
  '<li><a href="/house-cleaning-bonita-springs">Bonita Springs</a></li>'
);
html = html.replace(
  '<li><a href="/house-cleaning-estero">Cleaning service Estero FL</a></li>',
  '<li><a href="/house-cleaning-estero">Estero</a></li>'
);
html = html.replace(
  '<li><a href="/house-cleaning-cape-coral">Cleaning service Cape Coral FL</a></li>',
  '<li><a href="/house-cleaning-cape-coral">Cape Coral</a></li>'
);

// Inject homepage quote handoff script before serviceFlows
if (!html.includes("home-quote-entry")) {
  console.error("home-quote-entry missing after inject");
  process.exit(1);
}
if (!html.includes("sparklean_home_quote_hint")) {
  html = html.replace(
    '<script src="/js/serviceFlows.js"></script>',
    homeQuoteScript + '\n<script src="/js/serviceFlows.js"></script>'
  );
}

// Neutralize old CSS hero background-image rule conflict by overriding in homepage css (already done)
// Remove obsolete background url animation dependency - old .hero-bg still has background in inline CSS.
// Our new CSS sets .hero-bg img; old rule still sets background on .hero-bg which may double-load.
html = html.replace(
  ".hero-bg{position:absolute;inset:-2px;background:url('/images/heroes/69b21c822d48a61eeebb9364_Roxy1-aae74a30-1400.webp') 70% center / cover no-repeat;animation:zoomIn 14s ease-out forwards;}",
  ".hero-bg{position:absolute;inset:-2px;overflow:hidden;background:none;}"
);
html = html.replace(
  /@media\(max-width:767px\)\{\.hero-bg\{background-image:url\('\/images\/heroes\/69b30b198c9c5a39c1c2fdf0_1000062959--1--aae5c637-1400\.webp'\);background-position:center top;\}#home\.hero \.hero-content::before\{content:none;display:none\}\}/,
  "@media(max-width:767px){#home.hero .hero-content::before{content:none;display:none}}"
);
html = html.replace(
  /@media\(max-width:479px\)\{\.hero-bg\{background-image:url\('\/images\/heroes\/69b30b198c9c5a39c1c2fdf0_1000062959--1--aae5c637-1400\.webp'\);background-position:center top;\}\}/,
  ""
);

fs.writeFileSync(indexPath, html);
console.log("Homepage rebuild written to index.html");
console.log("Bytes:", Buffer.byteLength(html));
