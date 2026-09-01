/**
 * Sparklean lead-email color tokens — solid hex only (email-client safe).
 * Do not hand-write color strings in templates; import from here.
 */

/** @type {Readonly<Record<string, string>>} */
export const LEAD_EMAIL_TOKENS = Object.freeze({
  pageBg: "#0A0A0A",
  cardBg: "#121212",
  sectionBg: "#0E0E0E",
  textPrimary: "#F9F7F3",
  textSecondary: "#D4D0CA",
  textMuted: "#B8B4AE",
  textMeta: "#A8A49E",
  textFooter: "#8A8680",
  gold: "#B8A47A",
  goldLight: "#D4BF96",
  goldButtonText: "#0E0E0E",
  borderGold: "#4A4335",
  borderGoldMid: "#3A3528",
  borderGoldFaint: "#353024",
  borderHeader: "#403A2C",
});

/** Pairs that must meet WCAG AA (4.5:1) for normal text on lead emails. */
export const LEAD_EMAIL_CONTRAST_PAIRS = Object.freeze([
  { fg: LEAD_EMAIL_TOKENS.textPrimary, bg: LEAD_EMAIL_TOKENS.cardBg, label: "primary on card" },
  { fg: LEAD_EMAIL_TOKENS.textPrimary, bg: LEAD_EMAIL_TOKENS.pageBg, label: "primary on page" },
  { fg: LEAD_EMAIL_TOKENS.textSecondary, bg: LEAD_EMAIL_TOKENS.cardBg, label: "secondary on card" },
  { fg: LEAD_EMAIL_TOKENS.textMuted, bg: LEAD_EMAIL_TOKENS.cardBg, label: "muted labels on card" },
  { fg: LEAD_EMAIL_TOKENS.textMeta, bg: LEAD_EMAIL_TOKENS.cardBg, label: "meta on card" },
  { fg: LEAD_EMAIL_TOKENS.textFooter, bg: LEAD_EMAIL_TOKENS.cardBg, label: "footer on card" },
  { fg: LEAD_EMAIL_TOKENS.goldLight, bg: LEAD_EMAIL_TOKENS.cardBg, label: "gold accent on card" },
  { fg: LEAD_EMAIL_TOKENS.gold, bg: LEAD_EMAIL_TOKENS.cardBg, label: "gold on card" },
  { fg: LEAD_EMAIL_TOKENS.goldButtonText, bg: LEAD_EMAIL_TOKENS.gold, label: "button text on gold" },
  { fg: LEAD_EMAIL_TOKENS.textPrimary, bg: LEAD_EMAIL_TOKENS.sectionBg, label: "primary on section" },
  { fg: LEAD_EMAIL_TOKENS.textMuted, bg: LEAD_EMAIL_TOKENS.sectionBg, label: "muted on section" },
]);

export const LEAD_EMAIL_LOGO_URL =
  "https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21b5c7958824a1f172b0f_sparklean-logo-transparent.png";
