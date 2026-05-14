/**
 * Sparklean — POST /.netlify/functions/quote-submit
 * Outbound only: Netlify function → Brevo transactional API → your inbox (e.g. info@sparklean.co).
 * Structured lead body is authoritative; optional OpenAI summary never blocks email.
 */

const MAX_BODY = 120_000;

/** Shown in the intake UI on any server/email failure — luxury calm, no technical detail. */
const PUBLIC_EMAIL_FAILURE =
  "We're having trouble submitting your request right now. Please call Sparklean directly at (239) 888-3588.";

const LOGO_URL =
  "https://cdn.prod.website-files.com/69b2101ca55e3c42c4f97568/69b21b5c7958824a1f172b0f_sparklean-logo-transparent.png";

const CONTACT_KEYS = new Set(["fullName", "phone", "email", "location"]);

const ZIP_CITY = {
  34102: "Naples",
  34103: "Naples",
  34104: "Naples",
  34105: "Naples",
  34108: "Naples",
  34109: "Naples",
  34110: "Naples",
  34112: "Naples",
  34113: "Naples",
  34114: "Naples",
  34116: "Naples",
  34119: "Naples",
  34120: "Naples",
  34134: "Naples",
  33901: "Fort Myers",
  33907: "Fort Myers",
  33908: "Fort Myers",
  33912: "Fort Myers",
  33913: "Fort Myers",
  33916: "Fort Myers",
  33919: "Fort Myers",
  33928: "Estero",
  33929: "Estero",
  34135: "Bonita Springs",
  33904: "Cape Coral",
  33909: "Cape Coral",
  33914: "Cape Coral",
  33990: "Cape Coral",
  33991: "Cape Coral",
};

const FIELD_LABELS = {
  serviceCategory: "Service category",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  sqftBand: "Approx. square footage",
  pets: "Pets",
  frequency: "Cadence",
  deepClean: "First-time / deep clean",
  occupied: "Occupied during service",
  floorNumber: "Floor level",
  elevator: "Elevator access",
  hoaRules: "HOA / building rules",
  balconyGlass: "Balcony / exterior glass",
  condoOccupied: "Occupied / vacant",
  officeSize: "Office size",
  employees: "Headcount",
  daysPerWeek: "Days per week",
  dayNight: "Day or night service",
  restrooms: "Restrooms to service",
  trashService: "Trash / recycling",
  multiSuite: "Suite layout",
  facilityType: "Facility type",
  facilitySqft: "Facility square footage",
  floors: "Floors",
  trafficLevel: "Traffic level",
  currentProvider: "Current provider",
  dayPorter: "Day porter",
  consumables: "Consumables",
  cleanPhase: "Clean phase",
  activeConstruction: "Active construction",
  builderOrOwner: "Contact type",
  timelinePc: "Timeline",
  dustLevel: "Dust / debris level",
  stickersPaint: "Stickers / paint removal",
  pcSqft: "Square footage",
  constructionPhase: "Construction phase",
  punchListStatus: "Punch-list status",
  examRooms: "Exam / treatment rooms",
  medicalSqft: "Approx. clinical sq ft",
  afterHoursAccess: "After-hours access",
  disinfectCadence: "Disinfection cadence",
  retailSqft: "Retail footprint",
  peakTraffic: "Peak traffic",
  storefrontGlass: "Showcase / storefront glass",
  hoaCommonSqft: "Common-area sq ft",
  amenityTypes: "Amenities",
  gateAccessModel: "Gate / access model",
  hoaMeetingCadence: "Board / walk cadence",
  notesResidential: "Residential notes",
  notesCondo: "Building / access notes",
  notesEstate: "Estate priorities",
  notesMove: "Move notes",
  notesAirbnb: "Listing notes",
  notesCommercial: "Operational notes",
  notesFacility: "Facility notes",
  notesPc: "Site notes",
  notesWindows: "Window / access notes",
  notesAddons: "Add-on scope",
  notesMedical: "Clinical notes",
  notesRetail: "Retail notes",
  notesHoa: "Community notes",
};

function newLeadId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatEst(iso) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "shortGeneric",
    }).format(d);
  } catch {
    return String(iso);
  }
}

function digitsTel(s) {
  return String(s || "").replace(/\D/g, "");
}

function displayLocation(locRaw) {
  const loc = String(locRaw || "").trim();
  if (!loc) return "SW Florida";
  const zip = loc.replace(/\D/g, "");
  if (zip.length === 5 && ZIP_CITY[zip]) return `${ZIP_CITY[zip]} · ${zip}`;
  return loc;
}

function buildPriorityTags(answers) {
  const tags = [];
  const cat = answers.serviceCategory;
  if (cat === "luxuryEstate") tags.push("HIGH VALUE");
  if (
    cat === "commercialOffice" ||
    cat === "facilityJanitorial" ||
    cat === "medicalOffice" ||
    cat === "retailHospitality" ||
    cat === "hoaCommunity"
  ) {
    tags.push("COMMERCIAL");
  }
  if (cat === "medicalOffice") tags.push("MEDICAL");
  if (cat === "hoaCommunity") tags.push("HOA / COMMUNITY");
  if (cat === "retailHospitality") tags.push("RETAIL");
  if (cat === "postConstruction") tags.push("POST-CONSTRUCTION");
  if (answers.frequency === "weekly" || answers.frequency === "biweekly" || answers.frequencyEstate === "weekly" || answers.frequencyEstate === "biweekly") {
    tags.push("RECURRING");
  }
  if (answers.deepClean === "yes") tags.push("DEEP CLEAN");
  if (answers.cleanPhase === "rough" || answers.dustLevel === "heavy") tags.push("URGENCY");
  if (cat === "moveInOut" || cat === "airbnbRental") tags.push("TURNOVER");
  return [...new Set(tags)];
}

function bedBathSubjectPart(answers) {
  const b = answers.bedrooms;
  const t = answers.bathrooms;
  if (!b && !t) return "";
  const bn = b === "5+" ? "5+" : b;
  const tn = t === "5+" ? "5+" : t;
  if (bn && tn) return `${bn} Bed / ${tn} Bath`;
  if (bn) return `${bn} Bed`;
  if (tn) return `${tn} Bath`;
  return "";
}

function buildEmailSubject({ serviceLabel, answers }) {
  const loc = displayLocation(answers.location);
  const parts = [`New ${serviceLabel} Lead`, loc];
  const cat = answers.serviceCategory;
  if (cat === "residential" || cat === "condoHighRise" || cat === "luxuryEstate") {
    const bb = bedBathSubjectPart(answers);
    if (bb) parts.push(bb);
  } else if (cat === "commercialOffice" || cat === "medicalOffice") {
    parts.push("Office");
  } else if (cat === "facilityJanitorial") {
    parts.push("Facility");
  } else if (cat === "retailHospitality") {
    parts.push("Retail");
  } else if (cat === "hoaCommunity") {
    parts.push("HOA / community");
  } else if (cat === "postConstruction") {
    parts.push("Post-construction");
  } else if (cat === "windowCleaning") {
    parts.push("Windows");
  }
  return parts.filter(Boolean).join(" • ").slice(0, 200);
}

function humanFrequency(v) {
  const m = {
    weekly: "weekly service",
    biweekly: "every-two-weeks service",
    monthly: "monthly service",
    oneTime: "one-time or as-needed service",
    custom: "a custom cadence",
  };
  return m[v] || v || "";
}

function buildHumanFallbackSummary(answers, serviceLabel) {
  const loc = displayLocation(answers.location);
  const cat = answers.serviceCategory;

  if (cat === "residential") {
    const freq = humanFrequency(answers.frequency);
    const bed = answers.bedrooms || "";
    const bath = answers.bathrooms || "";
    const occ =
      answers.occupied === "occupied"
        ? "an occupied home"
        : answers.occupied === "vacant"
          ? "a vacant home"
          : "a home";
    let s = `This client is exploring ${freq || "residential cleaning"} for ${occ} in ${loc}.`;
    if (bed || bath) s += ` They noted approximately ${bed || "—"} bedroom(s) and ${bath || "—"} bathroom(s).`;
    if (answers.deepClean === "unsure" || answers.deepClean === "Not sure yet") {
      s += " They were unsure about starting with a deep clean—worth a quick conversation on expectations.";
    } else if (answers.deepClean === "yes") {
      s += " They indicated interest in beginning with a first-time or deep clean.";
    }
    if (answers.notesResidential) s += ` Additional context: ${answers.notesResidential}`;
    return s.trim();
  }

  if (cat === "condoHighRise") {
    let s = `This client is coordinating condo or high-rise service in ${loc}.`;
    if (answers.floorNumber) s += ` Floor context: ${answers.floorNumber}.`;
    if (answers.elevator) s += ` Elevator access for equipment: ${answers.elevator}.`;
    if (answers.hoaRules && answers.hoaRules !== "none") s += " There may be HOA or building rules to align on.";
    if (answers.notesCondo) s += ` ${answers.notesCondo}`;
    return s.trim();
  }

  if (cat === "luxuryEstate") {
    const freq = humanFrequency(answers.frequencyEstate);
    let s = `This client is shaping a ${freq || "custom estate"} program in ${loc}.`;
    if (answers.estateSqft) s += ` Approximate footprint band: ${answers.estateSqft}.`;
    if (answers.security && answers.security !== "none") s += " Expect gate, alarm, or vendor coordination details.";
    if (answers.notesEstate) s += ` ${answers.notesEstate}`;
    return s.trim();
  }

  if (cat === "commercialOffice" || cat === "medicalOffice") {
    let s = `This client submitted a ${serviceLabel.toLowerCase()} inquiry for ${loc}.`;
    if (answers.officeSize) s += ` Footprint context: ${answers.officeSize}.`;
    if (answers.daysPerWeek) s += ` Service rhythm: ${answers.daysPerWeek} day(s) per week.`;
    if (cat === "medicalOffice" && answers.examRooms) s += ` They flagged exam or treatment room count for clinical routing.`;
    if (answers.afterHoursAccess) s += ` After-hours access: ${answers.afterHoursAccess}.`;
    if (answers.disinfectCadence && cat === "medicalOffice") s += ` Disinfection cadence preference: ${answers.disinfectCadence}.`;
    if (answers.notesCommercial || answers.notesMedical) s += ` Notes: ${answers.notesCommercial || answers.notesMedical}`;
    return s.trim();
  }

  if (cat === "facilityJanitorial") {
    let s = `This client outlined janitorial scope for a ${answers.facilityType || "facility"} footprint in ${loc}.`;
    if (answers.facilitySqft) s += ` Size context: ${answers.facilitySqft}.`;
    if (answers.trafficLevel) s += ` Traffic profile: ${answers.trafficLevel}.`;
    if (answers.notesFacility) s += ` ${answers.notesFacility}`;
    return s.trim();
  }

  if (cat === "retailHospitality") {
    let s = `This client is evaluating guest-facing or retail floor support in ${loc}.`;
    if (answers.retailSqft) s += ` Public floor scale: ${answers.retailSqft}.`;
    if (answers.peakTraffic) s += ` Peak traffic: ${answers.peakTraffic}.`;
    if (answers.notesRetail) s += ` ${answers.notesRetail}`;
    return s.trim();
  }

  if (cat === "hoaCommunity") {
    let s = `This client is coordinating HOA or community common-area care in ${loc}.`;
    if (answers.hoaCommonSqft) s += ` Common-area scale: ${answers.hoaCommonSqft}.`;
    if (answers.gateAccessModel) s += ` Access model: ${answers.gateAccessModel}.`;
    if (answers.notesHoa) s += ` ${answers.notesHoa}`;
    return s.trim();
  }

  if (cat === "postConstruction") {
    let s = `This client is coordinating ${serviceLabel.toLowerCase()} work in ${loc}.`;
    if (answers.cleanPhase) s += ` Clean phase: ${answers.cleanPhase}.`;
    if (answers.constructionPhase) s += ` Build stage: ${answers.constructionPhase}.`;
    if (answers.punchListStatus) s += ` Punch-list status: ${answers.punchListStatus}.`;
    if (answers.dustLevel) s += ` Site condition: ${answers.dustLevel} residual dust or debris.`;
    if (answers.timelinePc) s += ` Timing: ${answers.timelinePc}.`;
    if (answers.notesPc) s += ` ${answers.notesPc}`;
    return s.trim();
  }

  return `This client completed the Sparklean intake for ${serviceLabel} in ${loc}. Follow up soon while expectations and timing are still fresh.`;
}

function labelForKey(k) {
  return FIELD_LABELS[k] || k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

function groupDetailRows(answers) {
  const rows = [];
  for (const [k, v] of Object.entries(answers)) {
    if (CONTACT_KEYS.has(k) || v == null || v === "") continue;
    if (typeof v !== "string") continue;
    rows.push({ key: k, label: labelForKey(k), value: v });
  }
  rows.sort((a, b) => a.label.localeCompare(b.label));
  return rows;
}

const PROPERTY_DETAIL_KEYS = new Set([
  "serviceCategory",
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
]);

const SCHEDULING_DETAIL_KEYS = new Set(["timelinePc", "moveDate", "afterHoursAccess", "builderOrOwner"]);

function isNotesKey(k) {
  return /^notes/i.test(k);
}

function partitionIntakeRows(detailRows) {
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

function emailIntakeSection(title, rows) {
  if (!rows.length) return "";
  const inner = buildDetailTableRows(rows);
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">` +
    `<tr><td style="font-family:Georgia,serif;font-size:13px;color:#b8a47a;letter-spacing:.12em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid rgba(184,164,122,.25);">${escapeHtml(title)}</td></tr>` +
    `<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(0,0,0,.25);border-radius:4px;">${inner}</table></td></tr></table>`
  );
}

function buildDetailTableRows(rows) {
  return rows
    .map(
      (r) =>
        `<tr><td style="padding:10px 14px;border-bottom:1px solid rgba(184,164,122,.15);color:rgba(249,247,243,.55);font-size:12px;letter-spacing:.06em;text-transform:uppercase;">${escapeHtml(r.label)}</td>` +
        `<td style="padding:10px 14px;border-bottom:1px solid rgba(184,164,122,.12);color:#f9f7f3;font-size:14px;">${escapeHtml(r.value)}</td></tr>`
    )
    .join("");
}

function buildLuxuryHtmlEmail({
  leadId,
  submittedAtEst,
  priorityTags,
  serviceLabel,
  answers,
  summary,
  detailRows,
}) {
  const tel = digitsTel(answers.phone);
  const telHref = tel ? `tel:${tel}` : "tel:2398883588";
  const displayPhone = answers.phone || "(239) 888-3588";
  const replyHref = `mailto:${encodeURIComponent(answers.email)}?subject=${encodeURIComponent("Re: Sparklean inquiry")}`;
  const tagsHtml = priorityTags.length
    ? `<tr><td style="padding:0 0 20px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d4bf96;">${priorityTags.map((t) => escapeHtml(t)).join(" · ")}</td></tr>`
    : "";

  const { property, services, scheduling, notes } = partitionIntakeRows(detailRows);
  const schedulingNotes = [...scheduling, ...notes];
  const sectionsHtml =
    emailIntakeSection("Property information", property) +
    emailIntakeSection("Requested services", services) +
    emailIntakeSection("Scheduling notes", schedulingNotes);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lead</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:600px;background:#121212;border:1px solid rgba(184,164,122,.25);border-radius:4px;overflow:hidden;">
<tr><td style="padding:28px 28px 20px 28px;text-align:center;border-bottom:1px solid rgba(184,164,122,.2);">
<img src="${LOGO_URL}" alt="Sparklean" width="180" style="display:block;margin:0 auto 16px auto;height:auto;">
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#d4bf96;">Private intake brief</p>
<p style="margin:8px 0 0 0;font-family:Georgia,serif;font-size:20px;color:#f9f7f3;">${escapeHtml(serviceLabel)}</p>
<p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:rgba(249,247,243,.45);">Lead ID <span style="color:#b8a47a;">${escapeHtml(leadId)}</span> · ${escapeHtml(submittedAtEst)}</p>
</td></tr>
<tr><td style="padding:20px 24px 8px 24px;">${tagsHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
<tr><td style="font-family:Georgia,serif;font-size:13px;color:#b8a47a;letter-spacing:.12em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid rgba(184,164,122,.25);">Contact information</td></tr>
<tr><td style="padding:14px 0 0 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#f9f7f3;">
<strong style="color:#f9f7f3;">${escapeHtml(answers.fullName)}</strong><br>
<span style="color:rgba(249,247,243,.75);">${escapeHtml(answers.email)}</span><br>
<span style="color:rgba(249,247,243,.75);">${escapeHtml(answers.location)}</span>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;">
<tr><td align="center" style="border-radius:4px;background:linear-gradient(165deg,#d4bf96,#b8a47a);">
<a href="${telHref}" style="display:block;padding:16px 20px;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;color:#0e0e0e;text-decoration:none;">Call ${escapeHtml(displayPhone)}</a>
</td></tr>
<tr><td height="12"></td></tr>
<tr><td align="center" style="border-radius:4px;border:1px solid #b8a47a;">
<a href="${replyHref}" style="display:block;padding:14px 20px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#d4bf96;text-decoration:none;">Reply to lead</a>
</td></tr>
</table>
${sectionsHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-family:Georgia,serif;font-size:13px;color:#b8a47a;letter-spacing:.12em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid rgba(184,164,122,.25);">Internal AI summary</td></tr>
<tr><td style="padding:14px 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.65;color:rgba(249,247,243,.88);font-style:italic;">${escapeHtml(summary)}</td></tr>
</table>
<p style="margin:20px 0 0 0;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;color:rgba(249,247,243,.35);">Structured JSON is attached for CRM import. Do not discuss pricing in email threads—coordinate by phone.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function formatPlainSection(title, rows) {
  if (!rows.length) return "";
  return `${title}\n${rows.map((r) => `${r.label}: ${r.value}`).join("\n")}\n`;
}

function buildPlainTextLead({
  leadId,
  submittedAtEst,
  priorityTags,
  serviceLabel,
  answers,
  summary,
  detailRows,
}) {
  const { property, services, scheduling, notes } = partitionIntakeRows(detailRows);
  const schedulingNotes = [...scheduling, ...notes];
  return [
    `SPARKLEAN — ${serviceLabel.toUpperCase()}`,
    `Lead ID: ${leadId}`,
    `Received (EST): ${submittedAtEst}`,
    priorityTags.length ? `Tags: ${priorityTags.join(" · ")}` : "",
    "",
    "CONTACT INFORMATION",
    `Name: ${answers.fullName}`,
    `Phone: ${answers.phone}`,
    `Email: ${answers.email}`,
    `Location: ${answers.location}`,
    "",
    formatPlainSection("PROPERTY INFORMATION", property),
    formatPlainSection("REQUESTED SERVICES", services),
    formatPlainSection("SCHEDULING NOTES", schedulingNotes),
    "INTERNAL AI SUMMARY",
    summary,
    "",
    "JSON attachment: lead-intake.json",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

async function notifySlackOptional({ leadId, serviceLabel, summary, priorityTags }) {
  const url = process.env.SPARKLEAN_SLACK_WEBHOOK_URL;
  if (!url) return;
  const text = [
    `*Sparklean lead* · ${serviceLabel}`,
    `ID: \`${leadId}\``,
    priorityTags.length ? `Tags: ${priorityTags.join(", ")}` : "",
    summary.slice(0, 400),
  ]
    .filter(Boolean)
    .join("\n");
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) console.error("[quote-submit] Slack webhook non-OK", r.status, await r.text());
  } catch (e) {
    console.error("[quote-submit] Slack webhook failed", e);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function cors204() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function summarizeLead({ serviceLabel, answers, sourceUrl, submittedAt }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 2200);

  const payload = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You output ONLY valid JSON: {"summary":"..."}.
The summary must be 2–3 short sentences (max ~420 characters), warm and operational—like a senior coordinator handing off to a partner. No emojis, no exclamation marks, no sales hype.
Use ONLY facts from the provided fields. Do not invent services, policies, availability, or scope. Write in third person ("they" / "the contact") or neutral phrasing—never "you".
NEVER mention prices, rates, estimates, costs, dollars, or numeric quotes.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          serviceLabel,
          sourceUrl,
          submittedAt,
          answers,
        }),
      },
    ],
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[quote-submit] OpenAI summary skipped (non-OK)", res.status, t);
      return null;
    }
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content;
    if (!txt) return null;
    try {
      const parsed = JSON.parse(txt);
      return typeof parsed.summary === "string" ? parsed.summary.trim() : null;
    } catch {
      return null;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return null;
    console.error("[quote-submit] OpenAI summary skipped (fetch error)", e);
    return null;
  } finally {
    clearTimeout(tid);
  }
}

function parseBrevoFailureText(text) {
  if (!text || typeof text !== "string") return "Unknown error from email provider.";
  try {
    const j = JSON.parse(text);
    if (typeof j.message === "string") return j.message;
    if (Array.isArray(j.message)) return j.message.map(String).join("; ");
    if (j.message && typeof j.message === "object") return JSON.stringify(j.message);
  } catch {
    /* ignore */
  }
  return text.slice(0, 500);
}

/** Parse SPARKLEAN_FROM_EMAIL into Brevo sender { name, email }. */
function parseSender(fromRaw) {
  const s = String(fromRaw || "").trim();
  const br = s.match(/^(.+?)\s*<([^>]+)>$/);
  if (br) {
    return {
      name: br[1].replace(/^["']|["']$/g, "").trim() || "Sparklean Cleaning",
      email: br[2].trim(),
    };
  }
  return { name: "Sparklean Cleaning", email: s || "info@sparklean.co" };
}

function buildBrevoPayload({ sender, toEmail, subject, html, text, replyTo, attachment }) {
  const payload = {
    sender,
    to: [{ email: toEmail }],
    subject,
    htmlContent: html,
    textContent: text,
  };
  if (replyTo && typeof replyTo === "string" && replyTo.includes("@")) {
    payload.replyTo = { email: replyTo.trim() };
  }
  if (attachment) {
    payload.attachment = [attachment];
  }
  return payload;
}

async function brevoPost(apiKey, payload) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  const responseText = await res.text();
  return { ok: res.ok, status: res.status, text: responseText };
}

async function sendBrevoTransactionalEmail({ subject, html, text, attachmentJson, replyTo }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromRaw = (process.env.SPARKLEAN_FROM_EMAIL && process.env.SPARKLEAN_FROM_EMAIL.trim()) || "info@sparklean.co";
  const toEmail = (process.env.SPARKLEAN_LEAD_TO && process.env.SPARKLEAN_LEAD_TO.trim()) || "info@sparklean.co";
  const sender = parseSender(fromRaw);

  if (!apiKey) {
    console.error("[quote-submit] missing outbound config", {
      hasBrevoApiKey: false,
      senderEmail: sender.email,
      leadTo: toEmail,
    });
    throw new Error("MISSING_EMAIL_CONFIG");
  }

  const basePayload = buildBrevoPayload({
    sender,
    toEmail,
    subject,
    html,
    text,
    replyTo,
    attachment: null,
  });

  const withAttachmentPayload =
    attachmentJson &&
    buildBrevoPayload({
      sender,
      toEmail,
      subject,
      html,
      text,
      replyTo,
      attachment: {
        name: "lead-intake.json",
        content: Buffer.from(attachmentJson, "utf8").toString("base64"),
      },
    });

  let attempt = withAttachmentPayload
    ? await brevoPost(apiKey, withAttachmentPayload)
    : await brevoPost(apiKey, basePayload);

  if (!attempt.ok && withAttachmentPayload) {
    console.warn("[quote-submit] Brevo failed with attachment; retrying without.", attempt.status, attempt.text);
    attempt = await brevoPost(apiKey, basePayload);
  }

  if (!attempt.ok) {
    const detail = parseBrevoFailureText(attempt.text);
    console.error("[quote-submit] Brevo outbound failed", {
      httpStatus: attempt.status,
      parsedMessage: detail,
      attemptedWithAttachmentFirst: Boolean(withAttachmentPayload),
    });
    console.error("[quote-submit] Brevo raw response (for support):", attempt.text);
    const err = new Error("BREVO_FAILED");
    err.brevoStatus = attempt.status;
    err.brevoDetail = detail;
    throw err;
  }

  try {
    return attempt.text ? JSON.parse(attempt.text) : {};
  } catch {
    return {};
  }
}

export default async (request) => {
  if (request.method === "OPTIONS") return cors204();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }
  if (raw.length > MAX_BODY) return json({ error: "Payload too large" }, 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const answers = body.answers;
  if (!answers || typeof answers !== "object") return json({ error: "Missing answers" }, 400);
  const required = ["fullName", "phone", "email", "location", "serviceCategory"];
  for (const k of required) {
    if (typeof answers[k] !== "string" || !answers[k].trim()) {
      return json({ error: `Missing or invalid: ${k}` }, 400);
    }
  }

  const submittedAt = typeof body.submittedAt === "string" ? body.submittedAt : new Date().toISOString();
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.slice(0, 2000) : "";
  const landingPage =
    typeof body.landingPage === "string" && body.landingPage.trim()
      ? body.landingPage.trim().slice(0, 2000)
      : sourceUrl;
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 2000) : "";
  const deviceType = typeof body.deviceType === "string" ? body.deviceType.slice(0, 80) : "";
  const userAgent = typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : "";
  const campaign = body.campaign && typeof body.campaign === "object" && !Array.isArray(body.campaign) ? body.campaign : null;

  const intakeEntryUrl =
    typeof body.intakeEntryUrl === "string" && body.intakeEntryUrl.trim()
      ? body.intakeEntryUrl.trim().slice(0, 2000)
      : landingPage;
  const submitPageUrl =
    typeof body.submitPageUrl === "string" && body.submitPageUrl.trim()
      ? body.submitPageUrl.trim().slice(0, 2000)
      : "";

  const serviceLabel =
    typeof body.serviceLabel === "string" && body.serviceLabel.trim()
      ? body.serviceLabel.trim()
      : answers.serviceCategory;

  const leadId = newLeadId();
  const submittedAtEst = formatEst(submittedAt);
  const priorityTags = buildPriorityTags(answers);

  const dashboardRecord = {
    event: "quote_intake_completed",
    version: 2,
    leadId,
    submittedAt,
    submittedAtEst,
    sourceUrl,
    serviceCategory: answers.serviceCategory,
    serviceLabel,
    priorityTags,
    answers: { ...answers },
    summary: null,
    analytics: {
      landingPage,
      intakeEntryUrl,
      submitPageUrl,
      referrer,
      campaign,
      deviceType,
      userAgent,
      intakeSourceUrl: sourceUrl,
    },
    reporting: {
      _future:
        "Daily 6PM digest (visitors, quote starts/completions, top pages, device mix, attribution) — wire to analytics store when ready; not populated here.",
    },
  };

  let summary = await summarizeLead({
    serviceLabel,
    answers,
    sourceUrl,
    submittedAt,
  });
  if (!summary) {
    summary = buildHumanFallbackSummary(answers, serviceLabel);
  }
  dashboardRecord.summary = summary;

  const attachmentJson = JSON.stringify(dashboardRecord, null, 2);
  const subject = buildEmailSubject({ serviceLabel, answers });
  const detailRows = groupDetailRows(answers);

  const html = buildLuxuryHtmlEmail({
    leadId,
    submittedAtEst,
    priorityTags,
    serviceLabel,
    answers,
    summary,
    detailRows,
  });

  const text = buildPlainTextLead({
    leadId,
    submittedAtEst,
    priorityTags,
    serviceLabel,
    answers,
    summary,
    detailRows,
  });

  try {
    await sendBrevoTransactionalEmail({
      subject,
      html,
      text,
      attachmentJson,
      replyTo: answers.email,
    });
  } catch (e) {
    console.error("[quote-submit] email path aborted — see logs above for Brevo / config", {
      code: e && e.message,
      brevoStatus: e && e.brevoStatus,
      brevoDetail: e && e.brevoDetail,
    });
    return json({ error: PUBLIC_EMAIL_FAILURE }, 500);
  }

  await notifySlackOptional({ leadId, serviceLabel, summary, priorityTags });

  return json({ ok: true, receivedAt: new Date().toISOString(), leadId });
};
