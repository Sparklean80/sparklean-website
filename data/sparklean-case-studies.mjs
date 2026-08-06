/**
 * Future client stories / case studies — publish only with evidence + permission.
 *
 * Required fields when adding an entry:
 * - id
 * - sourceEvidenceRef (internal note or Google review URL after direct verification)
 * - clientPermissionStatus: 'granted' | 'pending' | 'denied'
 * - serviceType
 * - cityOrArea (general; no street address)
 * - verifiedFactualOutcome
 * - approvedQuote (exact approved text, or '')
 * - approvedImageUrls (Sparklean-owned only)
 * - publicationStatus: 'draft' | 'published' | 'archived'
 *
 * Empty APPROVED_CASE_STUDIES must produce no public case-study / testimonial section.
 */

export const APPROVED_CASE_STUDIES = [];

/**
 * Candidates only — do NOT copy third-party review text onto the site from this list.
 * Promote only after direct source verification + permission, then move into APPROVED_CASE_STUDIES.
 */
export const GOOGLE_REVIEW_CASE_STUDY_CANDIDATES = [
  {
    id: "candidate-gbp-aggregate",
    note:
      "Live Google Business Profile reviews (≈4.9 rating; count changes). Individual reviews may become case studies only after founder verifies the exact quote on Google and obtains permission if republishing beyond a link-out.",
    publicationStatus: "not_for_publication",
    actionRequired: [
      "Confirm direct GBP / reviews URL",
      "Select specific reviews with verifiable author + date",
      "Obtain client permission if quoting on-site",
      "Never invent or paraphrase into new attributed quotes",
    ],
  },
];

export function publishedCaseStudies() {
  return APPROVED_CASE_STUDIES.filter(
    (c) =>
      c &&
      c.publicationStatus === "published" &&
      c.clientPermissionStatus === "granted" &&
      c.sourceEvidenceRef &&
      c.verifiedFactualOutcome
  );
}
