/**
 * Canonical Sparklean Cleaning entity — single source of truth for JSON-LD.
 * Sync into HTML via: node scripts/sync-entity-schema.mjs
 *
 * Hard rules:
 * - Stable @id: https://www.sparklean.co/#organization
 * - legalName: Sparklean Cleaning LLC (never "corporation")
 * - No street address (service-area business; home address intentionally unpublished)
 * - No Google Maps search URLs in sameAs
 * - No invented profiles, ratings, hours, or credentials
 * - Do not use @type CleaningService — not a real schema.org type (404);
 *   keep Organization + LocalBusiness and describe offerings as Service nodes
 */

export const ORG_ID = "https://www.sparklean.co/#organization";
export const WEBSITE_ID = "https://www.sparklean.co/#website";
export const SITE_URL = "https://www.sparklean.co/";
export const LOGO_URL = "/images/branding/Sparklean_Logo_Transparent.png";

/** Locked public positioning (exact). */
export const LOCKED_DESCRIPTION =
  "Sparklean Cleaning is a professionally managed and supervised residential and commercial cleaning company serving Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.";

export const PHONE_E164 = "+1-239-888-3588";
export const PHONE_DISPLAY = "(239) 888-3588";
export const EMAIL = "info@sparklean.co";
export const PRICE_RANGE = "$$$";

/** Complete service territory — five markets (no branch entities). */
export const SERVICE_AREA_NAMES = [
  "Naples",
  "Bonita Springs",
  "Estero",
  "Fort Myers",
  "Cape Coral",
];

/**
 * Direct profile URLs only. Leave empty until founder verifies each URL
 * (see docs/seo/SPARKLEAN_CITATION_CONSISTENCY_CHECKLIST.md).
 * Never use Google Maps search-result URLs here.
 */
export const SAME_AS = [];

export const FOUNDER_TONY_ID = "https://www.sparklean.co/#founder-tony-giuliano";
export const FOUNDER_ROXY_ID = "https://www.sparklean.co/#founder-roxana-tellez";

export const CITY_PAGES = {
  naples: {
    slug: "house-cleaning-naples",
    city: "Naples",
    name: "House Cleaning Naples FL",
    serviceName: "House Cleaning in Naples, FL",
    serviceDescription:
      "Supervised residential house cleaning in Naples, FL — Port Royal, Pelican Bay, Park Shore, Old Naples, and gated estates. Provided by Sparklean Cleaning.",
  },
  "bonita-springs": {
    slug: "house-cleaning-bonita-springs",
    city: "Bonita Springs",
    name: "House Cleaning Bonita Springs FL",
    serviceName: "House Cleaning in Bonita Springs, FL",
    serviceDescription:
      "Supervised residential house cleaning in Bonita Springs, FL — gated communities, seasonal homes, and waterfront properties. Provided by Sparklean Cleaning.",
  },
  estero: {
    slug: "house-cleaning-estero",
    city: "Estero",
    name: "House Cleaning Estero FL",
    serviceName: "House Cleaning in Estero, FL",
    serviceDescription:
      "Supervised residential house cleaning in Estero, FL — golf communities and family neighborhoods. Provided by Sparklean Cleaning.",
  },
  "fort-myers": {
    slug: "house-cleaning-fort-myers",
    city: "Fort Myers",
    name: "House Cleaning Fort Myers FL",
    serviceName: "House Cleaning in Fort Myers, FL",
    serviceDescription:
      "Supervised residential house cleaning in Fort Myers, FL — riverfront, gated, and family homes. Provided by Sparklean Cleaning.",
  },
  "cape-coral": {
    slug: "house-cleaning-cape-coral",
    city: "Cape Coral",
    name: "House Cleaning Cape Coral FL",
    serviceName: "House Cleaning in Cape Coral, FL",
    serviceDescription:
      "Supervised residential house cleaning in Cape Coral, FL — canal and waterfront homes. Provided by Sparklean Cleaning.",
  },
};

export function areaServedNodes() {
  return SERVICE_AREA_NAMES.map((name) => ({
    "@type": "City",
    name,
    containedInPlace: { "@type": "State", name: "Florida" },
  }));
}

export function founderNodes() {
  return [
    {
      "@type": "Person",
      "@id": FOUNDER_TONY_ID,
      name: "Tony Giuliano",
      jobTitle: "Co-Founder",
      worksFor: { "@id": ORG_ID },
      url: "https://www.sparklean.co/about",
    },
    {
      "@type": "Person",
      "@id": FOUNDER_ROXY_ID,
      name: 'Roxana "Roxy" Tellez',
      alternateName: "Roxy Tellez",
      jobTitle: "Co-Founder",
      worksFor: { "@id": ORG_ID },
      url: "https://www.sparklean.co/about",
    },
  ];
}

/** Offer catalog attached to the canonical organization. */
export function offerCatalog() {
  return {
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
          provider: { "@id": ORG_ID },
          areaServed: areaServedNodes(),
          description:
            "Recurring house cleaning, deep cleaning, move-in/move-out, and white-glove residential care in Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          "@id": "https://www.sparklean.co/commercial-cleaning#service",
          name: "Commercial and Janitorial Cleaning",
          url: "https://www.sparklean.co/commercial-cleaning",
          provider: { "@id": ORG_ID },
          areaServed: areaServedNodes(),
          description:
            "Office, medical, dealership, school, and high-traffic commercial cleaning in Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          "@id": "https://www.sparklean.co/post-construction-cleaning#service",
          name: "Post-Construction Cleaning",
          url: "https://www.sparklean.co/post-construction-cleaning",
          provider: { "@id": ORG_ID },
          areaServed: areaServedNodes(),
          description:
            "Rough and final post-construction cleaning for new builds and remodels in Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          "@id": "https://www.sparklean.co/specialized-cleaning#service",
          name: "Specialized Add-On Cleaning",
          url: "https://www.sparklean.co/specialized-cleaning",
          provider: { "@id": ORG_ID },
          areaServed: areaServedNodes(),
          description:
            "Tile and grout, window cleaning, kitchen detailing, and concierge add-ons.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          "@id": "https://www.sparklean.co/vacation-rental-cleaning#service",
          name: "Vacation Rental Cleaning",
          url: "https://www.sparklean.co/vacation-rental-cleaning",
          provider: { "@id": ORG_ID },
          areaServed: areaServedNodes(),
          description:
            "Airbnb and short-term rental turnover cleaning with lockbox access and guest-ready finishes in Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral.",
        },
      },
    ],
  };
}

/**
 * Canonical Organization + LocalBusiness node.
 *
 * ProfessionalService is intentionally omitted — Schema.org deprecated the
 * general type (confusion with Service). Offerings use Service + OfferCatalog.
 *
 * No address object: service-area business; street address unpublished.
 * Do not invent a partial PostalAddress. LocalBusiness rich-result eligibility
 * may be limited without a complete public address — that is accepted.
 * aggregateRating / openingHours / sameAs omitted until founder-verified.
 */
export function getCanonicalOrganization() {
  const org = {
    "@type": ["Organization", "LocalBusiness"],
    "@id": ORG_ID,
    name: "Sparklean Cleaning",
    legalName: "Sparklean Cleaning LLC",
    alternateName: ["Sparklean", "Sparklean Cleaning LLC"],
    description: LOCKED_DESCRIPTION,
    url: SITE_URL,
    telephone: PHONE_E164,
    email: EMAIL,
    priceRange: PRICE_RANGE,
    logo: {
      "@type": "ImageObject",
      "@id": "https://www.sparklean.co/#logo",
      url: LOGO_URL,
      contentUrl: LOGO_URL,
    },
    image: [
      LOGO_URL,
      "/images/heroes/69b21c8b4a74322eaf0b5148_1000051954-6f5aa8b3-1400.webp",
      "/images/heroes/69b21cae1dbe6ede803ef701_1000051474-0fcae9d8-1400.webp",
    ],
    founder: [{ "@id": FOUNDER_TONY_ID }, { "@id": FOUNDER_ROXY_ID }],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: PHONE_E164,
        email: EMAIL,
        contactType: "customer service",
        areaServed: "US-FL",
        availableLanguage: "English",
      },
    ],
    areaServed: areaServedNodes(),
    hasOfferCatalog: offerCatalog(),
  };

  if (SAME_AS.length) {
    org.sameAs = [...SAME_AS];
  }

  return org;
}

export function getWebsiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: "Sparklean Cleaning",
    description: LOCKED_DESCRIPTION,
    publisher: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

export function orgRef() {
  return { "@id": ORG_ID };
}

export function stringifyGraph(graph) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

export function ldJsonScript(graph) {
  return `<script type="application/ld+json">\n${stringifyGraph(graph)}\n</script>`;
}
