/**
 * Injects canonical Sparklean JSON-LD into key marketing HTML pages.
 * Run: node scripts/sync-entity-schema.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  CITY_PAGES,
  FOUNDER_ROXY_ID,
  FOUNDER_TONY_ID,
  getCanonicalOrganization,
  getWebsiteNode,
  ldJsonScript,
  LOCKED_DESCRIPTION,
  ORG_ID,
  orgRef,
  PHONE_DISPLAY,
  WEBSITE_ID,
} from "../data/sparklean-entity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function extractJsonLdBlocks(html) {
  const blocks = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch {
      /* ignore broken blocks; sync replaces them */
    }
  }
  return blocks;
}

function findFaqMainEntity(blocks) {
  for (const b of blocks) {
    if (b["@type"] === "FAQPage" && Array.isArray(b.mainEntity)) {
      return b.mainEntity;
    }
    if (Array.isArray(b["@graph"])) {
      for (const n of b["@graph"]) {
        if (n["@type"] === "FAQPage" && Array.isArray(n.mainEntity)) {
          return n.mainEntity;
        }
      }
    }
  }
  return null;
}

function replaceAllLdJson(html, scriptHtml) {
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi;
  const stripped = html.replace(re, "");
  // Insert after canonical or after twitter:image:alt / before first stylesheet or style
  const markers = [
    /(<link rel="canonical"[^>]*>\s*)/i,
    /(<\/script>\s*)(?=<link href="https:\/\/fonts)/i,
    /(<link href="https:\/\/fonts\.googleapis\.com)/i,
    /(<style[\s>])/i,
  ];
  for (const marker of markers) {
    if (marker.test(stripped)) {
      return stripped.replace(marker, (m) => `${scriptHtml}\n${m}`);
    }
  }
  // Fallback: after <head>
  return stripped.replace(/<head[^>]*>/i, (m) => `${m}\n${scriptHtml}\n`);
}

function homepageFaqs() {
  return [
    {
      "@type": "Question",
      name: "What cleaning services does Sparklean offer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sparklean offers recurring residential cleaning, one-time deep cleans, move-in and move-out, commercial and janitorial, post-construction and final cleans, and specialized add-ons across Southwest Florida.",
      },
    },
    {
      "@type": "Question",
      name: "Is Sparklean licensed, bonded, insured and Workers' Comp covered?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Sparklean is fully licensed in Florida, bonded, covered by general liability insurance, and carries active Workers' Compensation for every team member.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to be home during the cleaning?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Many clients provide secure access instructions. Sparklean's uniformed, background-checked team arrives, cleans thoroughly, and secures your property when finished.",
      },
    },
    {
      "@type": "Question",
      name: "Does Sparklean bring its own cleaning supplies?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Sparklean arrives with its Sparklean Green Clean product line — eco-friendly, proprietary formulas for luxury environments.",
      },
    },
    {
      "@type": "Question",
      name: "What is the 24-Hour Happiness Guarantee?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If any aspect of your service does not meet expectations, contact Sparklean within 24 hours and the team returns at no extra charge.",
      },
    },
    {
      "@type": "Question",
      name: "How quickly can I get a quote or schedule?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Request a free quote online or call ${PHONE_DISPLAY}. Sparklean responds same-day and can typically schedule your first visit within 24 to 48 hours.`,
      },
    },
    {
      "@type": "Question",
      name: "What cities does Sparklean serve?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sparklean provides cleaning service throughout Southwest Florida including Naples, Bonita Springs, Estero, Fort Myers, Cape Coral, and Marco Island.",
      },
    },
  ];
}

function writePage(relPath, graph) {
  const abs = path.join(root, relPath);
  const html = fs.readFileSync(abs, "utf8");
  const next = replaceAllLdJson(html, ldJsonScript(graph));
  fs.writeFileSync(abs, next);
  console.log("synced", relPath);
}

function syncHomepage() {
  writePage("index.html", [
    getCanonicalOrganization(),
    ...founderNodesInline(),
    getWebsiteNode(),
    {
      "@type": "WebPage",
      "@id": "https://www.sparklean.co/#webpage",
      url: "https://www.sparklean.co/",
      name: "Sparklean Cleaning | Southwest Florida",
      description: LOCKED_DESCRIPTION,
      isPartOf: { "@id": WEBSITE_ID },
      about: orgRef(),
      publisher: orgRef(),
      mainEntity: orgRef(),
    },
    {
      "@type": "FAQPage",
      "@id": "https://www.sparklean.co/#faq",
      mainEntity: homepageFaqs(),
    },
  ]);
}

function founderNodesInline() {
  return [
    {
      "@type": "Person",
      "@id": FOUNDER_TONY_ID,
      name: "Tony Giuliano",
      jobTitle: "Co-Founder",
      worksFor: orgRef(),
      url: "https://www.sparklean.co/about",
    },
    {
      "@type": "Person",
      "@id": FOUNDER_ROXY_ID,
      name: 'Roxana "Roxy" Tellez',
      alternateName: "Roxy Tellez",
      jobTitle: "Co-Founder",
      worksFor: orgRef(),
      url: "https://www.sparklean.co/about",
    },
  ];
}

function syncAbout() {
  writePage("pages/about.html", [
    getCanonicalOrganization(),
    ...founderNodesInline(),
    getWebsiteNode(),
    {
      "@type": "AboutPage",
      "@id": "https://www.sparklean.co/about#webpage",
      url: "https://www.sparklean.co/about",
      name: "About Sparklean Cleaning",
      description: LOCKED_DESCRIPTION,
      isPartOf: { "@id": WEBSITE_ID },
      about: orgRef(),
      mainEntity: orgRef(),
      publisher: orgRef(),
    },
  ]);
}

function syncContact() {
  writePage("pages/contact.html", [
    getCanonicalOrganization(),
    ...founderNodesInline(),
    getWebsiteNode(),
    {
      "@type": "ContactPage",
      "@id": "https://www.sparklean.co/contact#webpage",
      url: "https://www.sparklean.co/contact",
      name: "Contact Sparklean Cleaning",
      description:
        "Request a quote for professionally managed residential and commercial cleaning across Southwest Florida.",
      isPartOf: { "@id": WEBSITE_ID },
      about: orgRef(),
      mainEntity: orgRef(),
      publisher: orgRef(),
    },
  ]);
}

function syncServicePage({
  relPath,
  pageUrl,
  pageName,
  pageDescription,
  serviceId,
  serviceName,
  serviceDescription,
  catalogName,
  offers,
  faqFromFile = true,
  extraFaq = null,
}) {
  const abs = path.join(root, relPath);
  const html = fs.readFileSync(abs, "utf8");
  const blocks = extractJsonLdBlocks(html);
  const faq = extraFaq || (faqFromFile ? findFaqMainEntity(blocks) : null);

  const graph = [
    getCanonicalOrganization(),
    ...founderNodesInline(),
    getWebsiteNode(),
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: pageName,
      description: pageDescription,
      isPartOf: { "@id": WEBSITE_ID },
      about: orgRef(),
      publisher: orgRef(),
    },
    {
      "@type": "Service",
      "@id": serviceId,
      name: serviceName,
      description: serviceDescription,
      url: pageUrl,
      provider: orgRef(),
      areaServed: getCanonicalOrganization().areaServed,
      serviceType: serviceName,
    },
  ];

  if (offers?.length) {
    graph.push({
      "@type": "OfferCatalog",
      "@id": `${pageUrl}#offers`,
      name: catalogName,
      itemListElement: offers,
    });
  }

  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faq,
    });
  }

  writePage(relPath, graph);
}

function syncCityPage(key) {
  const cfg = CITY_PAGES[key];
  const pageUrl = `https://www.sparklean.co/${cfg.slug}`;
  const relPath = `pages/${cfg.slug}.html`;
  const abs = path.join(root, relPath);
  const html = fs.readFileSync(abs, "utf8");
  const blocks = extractJsonLdBlocks(html);
  const faq = findFaqMainEntity(blocks);

  const graph = [
    getCanonicalOrganization(),
    ...founderNodesInline(),
    getWebsiteNode(),
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: cfg.name,
      description: cfg.serviceDescription,
      isPartOf: { "@id": WEBSITE_ID },
      about: orgRef(),
      publisher: orgRef(),
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
    },
    {
      "@type": "Service",
      "@id": `${pageUrl}#service`,
      name: cfg.serviceName,
      description: cfg.serviceDescription,
      url: pageUrl,
      provider: orgRef(),
      areaServed: {
        "@type": "City",
        name: cfg.city,
        containedInPlace: { "@type": "State", name: "Florida" },
      },
      serviceType: "House Cleaning",
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${pageUrl}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://www.sparklean.co/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: cfg.name,
          item: pageUrl,
        },
      ],
    },
  ];

  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faq,
    });
  }

  writePage(relPath, graph);
}

function syncBlogIndex() {
  const relPath = "pages/blog.html";
  const abs = path.join(root, relPath);
  const html = fs.readFileSync(abs, "utf8");
  const blocks = extractJsonLdBlocks(html);
  let blogNode = null;
  for (const b of blocks) {
    if (Array.isArray(b["@graph"])) {
      blogNode = b["@graph"].find((n) => n["@type"] === "Blog") || null;
    }
  }
  const graph = [
    getCanonicalOrganization(),
    ...founderNodesInline(),
    getWebsiteNode(),
  ];
  if (blogNode) {
    graph.push({
      ...blogNode,
      publisher: orgRef(),
    });
  } else {
    graph.push({
      "@type": "Blog",
      "@id": "https://www.sparklean.co/blog#blog",
      name: "Sparklean Cleaning Blog",
      url: "https://www.sparklean.co/blog",
      publisher: orgRef(),
    });
  }
  writePage(relPath, graph);
}

function syncBlogArticles() {
  const blogDir = path.join(root, "pages/blog");
  for (const file of fs.readdirSync(blogDir).filter((f) => f.endsWith(".html"))) {
    const relPath = `pages/blog/${file}`;
    const abs = path.join(root, relPath);
    const html = fs.readFileSync(abs, "utf8");
    const blocks = extractJsonLdBlocks(html);
    let graphNodes = [];
    for (const b of blocks) {
      if (Array.isArray(b["@graph"])) graphNodes = b["@graph"];
    }
    if (!graphNodes.length) continue;

    const rest = graphNodes.filter((n) => {
      const t = n["@type"];
      if (t === "Organization") return false;
      if (Array.isArray(t) && t.includes("Organization")) return false;
      return true;
    });

    const rewritten = rest.map((n) => {
      const copy = { ...n };
      if (copy.publisher) copy.publisher = orgRef();
      if (copy.author && copy.author["@type"] === "Organization") {
        copy.author = orgRef();
      }
      if (copy.provider) copy.provider = orgRef();
      return copy;
    });

    writePage(relPath, [
      getCanonicalOrganization(),
      ...founderNodesInline(),
      getWebsiteNode(),
      ...rewritten,
    ]);
  }
}

function syncCustomerPortal() {
  const relPath = "pages/customer-portal.html";
  const abs = path.join(root, relPath);
  const html = fs.readFileSync(abs, "utf8");
  const blocks = extractJsonLdBlocks(html);
  const faq = findFaqMainEntity(blocks);
  const graph = [
    getCanonicalOrganization(),
    ...founderNodesInline(),
    getWebsiteNode(),
    {
      "@type": "WebPage",
      "@id": "https://www.sparklean.co/customer-portal#webpage",
      url: "https://www.sparklean.co/customer-portal",
      name: "Sparklean Client App",
      isPartOf: { "@id": WEBSITE_ID },
      about: orgRef(),
      publisher: orgRef(),
    },
  ];
  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": "https://www.sparklean.co/customer-portal#faq",
      mainEntity: faq,
    });
  }
  writePage(relPath, graph);
}

function syncInnerCircle() {
  writePage("pages/inner-circle.html", [
    getCanonicalOrganization(),
    ...founderNodesInline(),
    getWebsiteNode(),
    {
      "@type": "WebPage",
      "@id": "https://www.sparklean.co/inner-circle#webpage",
      url: "https://www.sparklean.co/inner-circle",
      name: "Sparklean Inner Circle",
      isPartOf: { "@id": WEBSITE_ID },
      about: orgRef(),
      publisher: orgRef(),
    },
  ]);
}

// --- run ---
syncHomepage();
syncAbout();
syncContact();

syncServicePage({
  relPath: "pages/residential-cleaning.html",
  pageUrl: "https://www.sparklean.co/residential-cleaning",
  pageName: "Residential Cleaning | Sparklean Cleaning",
  pageDescription:
    "Professionally managed and supervised residential cleaning across Naples, Bonita Springs, Estero, Fort Myers, Cape Coral, and Marco Island.",
  serviceId: "https://www.sparklean.co/residential-cleaning#service",
  serviceName: "Residential Cleaning",
  serviceDescription:
    "Recurring house cleaning, deep cleaning, move-in/move-out, and white-glove residential care from Sparklean Cleaning.",
  catalogName: "Residential Cleaning Services",
  offers: [
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Recurring House Cleaning",
        provider: orgRef(),
        description:
          "Weekly, bi-weekly, or monthly residential cleaning across Southwest Florida.",
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Deep Cleaning",
        provider: orgRef(),
        description: "Top-to-bottom deep cleaning for homes and estates.",
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Move-In / Move-Out Cleaning",
        provider: orgRef(),
        description: "Complete move-in and move-out cleaning.",
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "White Glove Cleaning",
        provider: orgRef(),
        description: "Premium white-glove cleaning for luxury residences.",
      },
    },
  ],
  faqFromFile: false,
});

syncServicePage({
  relPath: "pages/commercial-cleaning.html",
  pageUrl: "https://www.sparklean.co/commercial-cleaning",
  pageName: "Commercial Cleaning | Sparklean Cleaning",
  pageDescription:
    "Professionally managed commercial and janitorial cleaning across Southwest Florida.",
  serviceId: "https://www.sparklean.co/commercial-cleaning#service",
  serviceName: "Commercial and Janitorial Cleaning",
  serviceDescription:
    "Office, medical, dealership, school, and high-traffic commercial cleaning from Sparklean Cleaning.",
  catalogName: "Commercial Cleaning Services SW Florida",
  offers: [
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Office Cleaning Southwest Florida",
        provider: orgRef(),
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Medical Office Cleaning",
        provider: orgRef(),
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Automotive Dealership Cleaning",
        provider: orgRef(),
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "School Cleaning",
        provider: orgRef(),
      },
    },
  ],
});

syncServicePage({
  relPath: "pages/post-construction-cleaning.html",
  pageUrl: "https://www.sparklean.co/post-construction-cleaning",
  pageName: "Post-Construction Cleaning | Sparklean Cleaning",
  pageDescription:
    "Professionally managed post-construction and final cleaning across Southwest Florida.",
  serviceId: "https://www.sparklean.co/post-construction-cleaning#service",
  serviceName: "Post-Construction Cleaning",
  serviceDescription:
    "Rough and final post-construction cleaning for new builds and remodels from Sparklean Cleaning.",
  catalogName: null,
  offers: null,
});

syncServicePage({
  relPath: "pages/specialized-cleaning.html",
  pageUrl: "https://www.sparklean.co/specialized-cleaning",
  pageName: "Specialized Cleaning | Sparklean Cleaning",
  pageDescription:
    "Specialized add-on cleaning services from a professionally managed Sparklean team.",
  serviceId: "https://www.sparklean.co/specialized-cleaning#service",
  serviceName: "Specialized Add-On Cleaning",
  serviceDescription:
    "Tile and grout, windows, kitchen detailing, and concierge extras from Sparklean Cleaning.",
  catalogName: "Add-on cleaning services",
  offers: [
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Tile and grout cleaning",
        provider: orgRef(),
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Window cleaning",
        provider: orgRef(),
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Kitchen and appliance detailing",
        provider: orgRef(),
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Home concierge extras",
        provider: orgRef(),
      },
    },
  ],
  faqFromFile: false,
});

for (const key of Object.keys(CITY_PAGES)) {
  syncCityPage(key);
}

syncBlogIndex();
syncBlogArticles();
syncCustomerPortal();
syncInnerCircle();

console.log("Entity schema sync complete. Canonical @id:", ORG_ID);
