/**
 * Source of truth for on-site testimonials and Google-rating presentation.
 *
 * Rules:
 * - Do not publish attributed quotations unless listed in APPROVED_CLIENT_TESTIMONIALS
 * with a documented source (Google review URL + exact quote, or private permission note).
 * - Do not place “Verified on Google” adjacent to private testimonials.
 * - Do not hard-code Google review counts in JSON-LD (or invent quote text).
 * - Visible 4.9★ rating may remain; live count belongs on Google, not schema.
 */

/**
 * Google reviews CTA. Do **not** put a street address in this URL.
 * Swap for the founder’s direct GBP/reviews URL when they provide it.
 */
export const GOOGLE_REVIEWS_HREF =
  "https://www.google.com/maps/search/?api=1&query=Sparklean%20Cleaning";

/** Visible rating only — do not embed reviewCount in schema AggregateRating. */
export const GOOGLE_RATING_DISPLAY = "4.9";

/**
 * Approved client testimonials only. Empty until founder documents sources.
 * Shape: { id, quote, attribution, locality, sourceType: 'google'|'private',
 * sourceUrl?, permissionNote?, verifiedExactQuote: true }
 */
export const APPROVED_CLIENT_TESTIMONIALS = [];

/**
 * Names previously published without a verifiable source. Regression blocklist.
 * Do not reintroduce without adding a matching APPROVED_CLIENT_TESTIMONIALS entry.
 */
export const UNVERIFIED_TESTIMONIAL_ATTRIBUTIONS = [
 "M. Castellano",
 "S. Martinez",
 "Dr. R. Thompson",
 "J. Alvarez",
 "L. Fontaine",
 "T. Williams",
 "A. Reyes",
];

/** Quote fragments from the removed unverified set (extra regression signal). */
export const UNVERIFIED_TESTIMONIAL_QUOTE_FRAGMENTS = [
 "Sparklean has completely elevated the way I feel about my home",
 "From the moment they walked in it was clear this was a different caliber",
 "The supervisor walked through before and after every visit",
 "Post-construction clean was flawless. Punch-list ready",
 "I have tried many cleaning services in Estero and nothing compares",
 "Booked a move-out clean in Cape Coral and got my full deposit back",
 "We use Sparklean for our medical office and the results are exceptional",
];

export const PAGE_REVIEW_SUBS = {
 "index.html":
 "Homeowners and businesses across our five service cities trust Sparklean to maintain their properties to the highest standard. Read current Google reviews on our live profile.",
 "pages/house-cleaning-naples.html":
 "Homeowners and businesses in Naples trust Sparklean — including homeowners in Port Royal, Pelican Bay, and Park Shore. Read current Google reviews on our live profile.",
 "pages/house-cleaning-bonita-springs.html":
 "Homeowners and businesses in Bonita Springs trust Sparklean — including homeowners in Bonita Bay, Barefoot Beach, and Pelican Landing. Read current Google reviews on our live profile.",
 "pages/house-cleaning-estero.html":
 "Homeowners and businesses in Estero trust Sparklean — including homeowners in West Bay Club, Grandezza, and The Brooks. Read current Google reviews on our live profile.",
 "pages/house-cleaning-fort-myers.html":
 "Homeowners and businesses in Fort Myers trust Sparklean — including homeowners in Gulf Harbour, Crown Colony, and Heritage Palms. Read current Google reviews on our live profile.",
 "pages/house-cleaning-cape-coral.html":
 "Homeowners and businesses in Cape Coral trust Sparklean — including homeowners in Cape Harbour, Sandoval, and Tarpon Point. Read current Google reviews on our live profile.",
};

export function buildGoogleReviewsSection({ sub, pretty = true }) {
 const href = GOOGLE_REVIEWS_HREF.replace(/&/g, "&amp;");
 const compact = !pretty;
 const nl = compact ? " " : "\n";
 const ind = compact ? "" : " ";
 const ind2 = compact ? "" : " ";
 const ind3 = compact ? "" : " ";
 const ind4 = compact ? "" : " ";

 // Client Testimonials section omitted while APPROVED_CLIENT_TESTIMONIALS is empty.
 return [
 `<section class="reviews" id="reviews">`,
 `${ind}<div class="eyebrow"><div class="ey-line"></div><span>Google Reviews</span></div>`,
 `${ind}<h2 class="sec-h" style="margin-bottom:14px;text-align:center">4.9★ on <em>Google</em></h2>`,
 `${ind}<div class="rev-band rev-band--google-only">`,
 `${ind2}<div>`,
 `${ind3}<p class="rev-sub">${sub}</p>`,
 `${ind3}<div class="rev-stats">`,
 `${ind4}<a class="rev-google-proof" href="${href}" target="_blank" rel="noopener noreferrer"><div><div class="rev-stat-n">${GOOGLE_RATING_DISPLAY}</div><div class="rev-stat-l">★★★★★<br>Google Rating</div></div></a>`,
 `${ind4}<div><div class="rev-stat-n">Known Teams</div><div class="rev-stat-l">Professional<br>Supervision</div></div>`,
 `${ind4}<div><div class="rev-stat-n">24h</div><div class="rev-stat-l">Happiness<br>Guarantee</div></div>`,
 `${ind3}</div>`,
 `${ind3}<p class="rev-google-cta"><a href="${href}" target="_blank" rel="noopener noreferrer" class="btn-outline" style="font-size:.54rem;padding:12px 24px;letter-spacing:.14em;">Read live Google reviews ↗</a></p>`,
 `${ind2}</div>`,
 `${ind}</div>`,
 `</section>`,
 ].join(nl);
}
