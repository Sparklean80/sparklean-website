/**
 * Sparklean lead email HTML — quote intake + contact form.
 * All colors from lead-email-tokens.mjs (solid hex only).
 */

import { LEAD_EMAIL_LOGO_URL, LEAD_EMAIL_TOKENS as T } from "./lead-email-tokens.mjs";
import { validateLeadEmailCss } from "./lead-email-css-guard.mjs";

export { LEAD_EMAIL_LOGO_URL };

const PROPERTY_DETAIL_KEYS = new Set([
  "bedrooms",
  "bathrooms",
  "sqftBand",
  "pets",
  "occupied",
  "floorNumber",
  "elevator",
  "hoaRules",
  "balconyGlass",
  "condoOccupied",
  "estateSqft",
  "staffOnSite",
  "security",
  "officeSize",
  "employees",
  "facilityType",
  "facilitySqft",
  "floors",
  "trafficLevel",
  "multiSuite",
  "pcSqft",
  "medicalSqft",
  "retailSqft",
  "hoaCommonSqft",
  "amenityTypes",
  "gateAccessModel",
  "hoaMeetingCadence",
  "examRooms",
  "moveType",
  "emptyHome",
  "intExt",
  "waterfront",
  "stories",
  "ladderAccess",
  "glassAmount",
  "screensTracks",
  "turnsPerMonth",
  "linensLaundry",
  "restock",
  "activeConstruction",
  "dustLevel",
  "stickersPaint",
  "constructionPhase",
  "punchListStatus",
  "cleanPhase",
  "addonFocus",
  "innerHomeProfile",
  "innerSeasonalPattern",
  "innerSparkleanHistory",
]);

const SERVICE_DETAIL_KEYS = new Set([
  "frequency",
  "frequencyEstate",
  "deepClean",
  "daysPerWeek",
  "dayNight",
  "restrooms",
  "trashService",
  "currentProvider",
  "dayPorter",
  "consumables",
  "disinfectCadence",
  "pairedService",
  "innerCadence",
]);

const SCHEDULING_DETAIL_KEYS = new Set(["timelinePc", "moveDate", "afterHoursAccess", "builderOrOwner"]);

function isNotesKey(k) {
  return /^notes/i.test(k);
}

export function partitionQuoteIntakeRows(detailRows) {
  const property = [];
  const services = [];
  const scheduling = [];
  const notes = [];
  for (const r of detailRows) {
    if (isNotesKey(r.key)) notes.push(r);
    else if (SCHEDULING_DETAIL_KEYS.has(r.key)) scheduling.push(r);
    else if (SERVICE_DETAIL_KEYS.has(r.key)) services.push(r);
    else if (PROPERTY_DETAIL_KEYS.has(r.key)) property.push(r);
    else property.push(r);
  }
  return { property, services, scheduling, notes };
}

export function escapeLeadHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailIntakeSection(title, rows) {
  if (!rows.length) return "";
  const inner = buildDetailTableRows(rows);
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">` +
    `<tr><td style="font-family:Georgia,serif;font-size:13px;color:${T.gold};letter-spacing:.12em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid ${T.borderGold};">${escapeLeadHtml(title)}</td></tr>` +
    `<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.sectionBg};border-radius:4px;">${inner}</table></td></tr></table>`
  );
}

function buildDetailTableRows(rows) {
  return rows
    .map(
      (r) =>
        `<tr><td style="padding:10px 14px;border-bottom:1px solid ${T.borderGoldMid};color:${T.textMuted};font-size:12px;letter-spacing:.06em;text-transform:uppercase;">${escapeLeadHtml(r.label)}</td>` +
        `<td style="padding:10px 14px;border-bottom:1px solid ${T.borderGoldFaint};color:${T.textPrimary};font-size:14px;">${escapeLeadHtml(r.value)}</td></tr>`,
    )
    .join("");
}

/**
 * @param {object} p
 * @param {string} p.leadId
 * @param {string} p.submittedAtEst
 * @param {string[]} p.priorityTags
 * @param {string} p.serviceLabel
 * @param {{ fullName: string, email: string, location: string, phone?: string }} p.answers
 * @param {string} p.summary
 * @param {Array<{ key: string, label: string, value: string }>} p.detailRows
 * @param {string} [p.trackingMeta]
 * @param {string} [p.logoUrl]
 */
export function buildQuoteLeadHtmlEmail({
  leadId,
  submittedAtEst,
  priorityTags,
  serviceLabel,
  answers,
  summary,
  detailRows,
  trackingMeta,
  logoUrl = LEAD_EMAIL_LOGO_URL,
}) {
  const tel = String(answers.phone || "").replace(/\D/g, "");
  const telHref = tel ? `tel:${tel}` : "tel:2398883588";
  const displayPhone = answers.phone || "(239) 888-3588";
  const replyHref = `mailto:${encodeURIComponent(answers.email)}?subject=${encodeURIComponent("Re: Sparklean inquiry")}`;
  const tagsHtml = priorityTags.length
    ? `<tr><td style="padding:0 0 20px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${T.goldLight};">${priorityTags.map((t) => escapeLeadHtml(t)).join(" · ")}</td></tr>`
    : "";

  const { property, services, scheduling, notes } = partitionQuoteIntakeRows(detailRows);
  const schedulingNotes = [...scheduling, ...notes];
  const sectionsHtml =
    emailIntakeSection("Property information", property) +
    emailIntakeSection("Requested services", services) +
    emailIntakeSection("Scheduling notes", schedulingNotes);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lead</title></head>
<body style="margin:0;padding:0;background:${T.pageBg};color:${T.textPrimary};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.pageBg};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:600px;background:${T.cardBg};border:1px solid ${T.borderGold};border-radius:4px;overflow:hidden;">
<tr><td style="padding:28px 28px 20px 28px;text-align:center;border-bottom:1px solid ${T.borderHeader};">
<img src="${logoUrl}" alt="Sparklean" width="180" style="display:block;margin:0 auto 16px auto;height:auto;">
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:${T.goldLight};">Private intake brief</p>
<p style="margin:8px 0 0 0;font-family:Georgia,serif;font-size:20px;color:${T.textPrimary};">${escapeLeadHtml(serviceLabel)}</p>
<p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:${T.textMeta};">Lead ID <span style="color:${T.gold};">${escapeLeadHtml(leadId)}</span> · ${escapeLeadHtml(submittedAtEst)}</p>
${trackingMeta ? `<p style="margin:8px 0 0 0;font-family:Arial,sans-serif;font-size:11px;color:${T.textMeta};">${escapeLeadHtml(trackingMeta)}</p>` : ""}
</td></tr>
<tr><td style="padding:20px 24px 8px 24px;">${tagsHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
<tr><td style="font-family:Georgia,serif;font-size:13px;color:${T.gold};letter-spacing:.12em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid ${T.borderGold};">Contact information</td></tr>
<tr><td style="padding:14px 0 0 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:${T.textPrimary};">
<strong style="color:${T.textPrimary};">${escapeLeadHtml(answers.fullName)}</strong><br>
<span style="color:${T.textSecondary};">${escapeLeadHtml(answers.email)}</span><br>
<span style="color:${T.textSecondary};">${escapeLeadHtml(answers.location)}</span>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;">
<tr><td align="center" style="border-radius:4px;background:${T.gold};">
<a href="${telHref}" style="display:block;padding:16px 20px;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;color:${T.goldButtonText};text-decoration:none;">Call ${escapeLeadHtml(displayPhone)}</a>
</td></tr>
<tr><td height="12"></td></tr>
<tr><td align="center" style="border-radius:4px;border:1px solid ${T.gold};">
<a href="${replyHref}" style="display:block;padding:14px 20px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:${T.goldLight};text-decoration:none;">Reply to lead</a>
</td></tr>
</table>
${sectionsHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-family:Georgia,serif;font-size:13px;color:${T.gold};letter-spacing:.12em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid ${T.borderGold};">Internal AI summary</td></tr>
<tr><td style="padding:14px 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.65;color:${T.textPrimary};font-style:italic;">${escapeLeadHtml(summary)}</td></tr>
</table>
<p style="margin:20px 0 0 0;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;color:${T.textFooter};">Use Call / Reply above to reach the client. Do not discuss pricing in email—coordinate by phone.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const cssCheck = validateLeadEmailCss(html);
  if (!cssCheck.ok) {
    throw new Error(`quote lead email CSS invalid: ${cssCheck.errors.join("; ")}`);
  }
  return html;
}

/**
 * @param {object} p
 * @param {string} p.trackingMeta
 * @param {string} p.fullName
 * @param {string} p.email
 * @param {string} p.phone
 * @param {string} p.propertyType
 * @param {string} p.serviceNeeded
 * @param {string} p.cityArea
 * @param {string} p.preferredTiming
 * @param {string} p.message
 */
export function buildContactLeadHtmlEmail({
  trackingMeta,
  fullName,
  email,
  phone,
  propertyType,
  serviceNeeded,
  cityArea,
  preferredTiming,
  message,
}) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact lead</title></head>
<body style="margin:0;padding:0;background:${T.pageBg};color:${T.textPrimary};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.pageBg};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:600px;background:${T.cardBg};border:1px solid ${T.borderGold};border-radius:4px;overflow:hidden;">
<tr><td style="padding:28px 24px 20px 24px;border-bottom:1px solid ${T.borderHeader};">
<h1 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:16px;letter-spacing:.12em;text-transform:uppercase;color:${T.gold};">Contact form</h1>
<p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:${T.textMeta};">${escapeLeadHtml(trackingMeta)}</p>
</td></tr>
<tr><td style="padding:20px 24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:${T.textPrimary};">
<p style="margin:0 0 16px 0;"><strong style="color:${T.textPrimary};">${escapeLeadHtml(fullName)}</strong><br>
<span style="color:${T.textSecondary};">${escapeLeadHtml(email)}</span><br>
<span style="color:${T.textSecondary};">${escapeLeadHtml(phone)}</span></p>
<p style="margin:0 0 16px 0;color:${T.textPrimary};">Property: ${escapeLeadHtml(propertyType)}<br>
Service: ${escapeLeadHtml(serviceNeeded)}<br>
Area: ${escapeLeadHtml(cityArea)}<br>
Timing: ${escapeLeadHtml(preferredTiming)}</p>
<p style="margin:0;color:${T.textPrimary};">${escapeLeadHtml(message || "(no message)")}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const cssCheck = validateLeadEmailCss(html);
  if (!cssCheck.ok) {
    throw new Error(`contact lead email CSS invalid: ${cssCheck.errors.join("; ")}`);
  }
  return html;
}

/** Sample fixtures for tests and visual evidence. */
export function quoteLeadEmailFixture() {
  return {
    leadId: "lead-test-00000000-0000-4000-8000-000000000001",
    submittedAtEst: "Mon, Sep 1, 2026, 6:30 PM EDT",
    priorityTags: ["HIGH VALUE"],
    serviceLabel: "Luxury residential cleaning",
    answers: {
      fullName: "Jane Sample",
      email: "jane.sample@example.com",
      location: "Naples · 34102",
      phone: "(239) 555-0100",
    },
    summary:
      "They requested recurring residential service for a occupied home in Naples. Preferred weekly cadence with attention to kitchen and primary bath.",
    detailRows: [
      { key: "bedrooms", label: "Bedrooms", value: "4" },
      { key: "bathrooms", label: "Bathrooms", value: "3" },
      { key: "frequency", label: "Cadence", value: "Weekly" },
      { key: "notesResidential", label: "Residential notes", value: "Two dogs; gate code on file." },
    ],
    trackingMeta: "Lead ID: lead-test · gclid: present",
  };
}

export function contactLeadEmailFixture() {
  return {
    trackingMeta: "Lead ID: lead-contact-test · gclid: none",
    fullName: "Alex Contact",
    email: "alex.contact@example.com",
    phone: "(239) 555-0199",
    propertyType: "Single-family home",
    serviceNeeded: "Recurring residential",
    cityArea: "Bonita Springs",
    preferredTiming: "Within two weeks",
    message: "Looking for a reliable team for our home near Bonita Bay.",
  };
}
