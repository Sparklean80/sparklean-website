/**
 * Behavioral + page regression tests for referral / recurring trust layer.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import { publishedCaseStudies } from "../data/sparklean-case-studies.mjs";
import { UNVERIFIED_TESTIMONIAL_ATTRIBUTIONS } from "../data/sparklean-testimonials.mjs";
import quoteSubmit, {
  REFERRAL_TYPES,
  validateReferralAnswers,
  buildPriorityTags,
  buildReferralEmailSubject,
  buildReferralHtmlEmail,
  buildReferralPlainText,
  buildHumanFallbackSummary,
} from "../netlify/functions/quote-submit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (cond) console.log("OK  ", msg);
  else {
    console.error("FAIL", msg);
    failed += 1;
  }
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function extractLd(html) {
  const blocks = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      blocks.push({ __parseError: true });
    }
  }
  return blocks;
}

function walk(o, fn) {
  if (!o || typeof o !== "object") return;
  if (Array.isArray(o)) return o.forEach((v) => walk(v, fn));
  fn(o);
  Object.values(o).forEach((v) => walk(v, fn));
}

function validReferralAnswers(overrides = {}) {
  return {
    serviceCategory: "referral",
    leadSource: "referral",
    fullName: "Alex Referrer",
    phone: "(239) 555-0101",
    email: "",
    referredName: "Jordan Referred",
    referredPhone: "",
    referredEmail: "jordan.referred@example.com",
    referralType: "realtor",
    referralPermission: "yes",
    referralConsent: "agree",
    notesReferral: "Prefers mornings",
    location: "Southwest Florida (referral)",
    ...overrides,
  };
}

async function postQuote(answers, extraBody = {}) {
  const body = {
    answers,
    serviceLabel: "Referral introduction",
    intakePreset: "referral",
    submittedAt: "2026-08-05T15:00:00.000Z",
    sourceUrl: "https://www.sparklean.co/refer",
    ...extraBody,
  };
  const req = new Request("https://www.sparklean.co/.netlify/functions/quote-submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return quoteSubmit(req);
}

function loadEventsApi() {
  const code = read("js/sparklean-events.js");
  const dataLayer = [];
  const gtagCalls = [];
  const sandbox = {
    window: {},
    document: {
      readyState: "complete",
      addEventListener() {},
    },
    gtag(...args) {
      gtagCalls.push(args);
    },
  };
  sandbox.window = sandbox;
  sandbox.window.dataLayer = dataLayer;
  vm.runInNewContext(code, sandbox);
  return {
    track: sandbox.window.SparkleanEvents.track,
    sanitizeParams: sandbox.window.SparkleanEvents._test.sanitizeParams,
    dataLayer,
    gtagCalls,
  };
}

/* -------------------------------------------------------------------------- */
/* Static page / route guards (kept narrow)                                   */
/* -------------------------------------------------------------------------- */

const NEW_PAGES = ["pages/why-sparklean.html", "pages/refer.html", "pages/partners.html"];

for (const rel of NEW_PAGES) {
  assert(fs.existsSync(path.join(root, rel)), `${rel} exists`);
  const html = read(rel);
  const blocks = extractLd(html);
  assert(blocks.length > 0 && !blocks.some((b) => b.__parseError), `${rel} JSON-LD parses`);
  let orgIds = new Set();
  walk(blocks, (o) => {
    if (o["@id"] === "https://www.sparklean.co/#organization") orgIds.add(o["@id"]);
  });
  assert(orgIds.size === 1, `${rel} references canonical org @id`);
  assert(!/ProfessionalService/.test(html), `${rel} has no ProfessionalService`);
  assert(!/"address"\s*:/.test(JSON.stringify(blocks)), `${rel} JSON-LD has no address`);
  for (const name of UNVERIFIED_TESTIMONIAL_ATTRIBUTIONS) {
    assert(!html.includes(name), `${rel} has no unverified testimonial ${name}`);
  }
  assert(!/fully licensed/i.test(html), `${rel} has no fully licensed claim`);
  assert(!/20,?000/.test(html), `${rel} has no 20,000 claim`);
}

assert(publishedCaseStudies().length === 0, "no published case studies without evidence");

const why = read("pages/why-sparklean.html");
assert(
  why.includes('href="/residential-cleaning#pane-recurring"'),
  "why-sparklean non-JS fallback targets #pane-recurring"
);
assert(
  why.includes('data-sparklean-intake-preset="recurringResidential"'),
  "why page keeps intake interception on recurring CTA"
);
assert(fs.existsSync(path.join(root, "pages/residential-cleaning.html")), "residential page exists");
assert(
  read("pages/residential-cleaning.html").includes('id="pane-recurring"'),
  "residential page has id=pane-recurring"
);

const netlify = read("netlify.toml");
assert(netlify.includes('from = "/why-sparklean"'), "why-sparklean rewrite");
assert(netlify.includes('from = "/refer"'), "refer rewrite");
assert(netlify.includes('from = "/partners"'), "partners rewrite");

assert(
  REFERRAL_TYPES.join(",") ===
    "homeowner,realtor,builder,property_manager,home_watch,interior_designer,commercial",
  "server referralType allowlist matches supported taxonomy"
);

/* -------------------------------------------------------------------------- */
/* Unit: validation boundaries                                                */
/* -------------------------------------------------------------------------- */

assert(
  validateReferralAnswers(validReferralAnswers({ referralPermission: "no" })).ok === false,
  "missing permission rejected"
);
assert(
  validateReferralAnswers(validReferralAnswers({ referralConsent: "no" })).ok === false,
  "missing consent rejected"
);
assert(
  validateReferralAnswers(validReferralAnswers({ referralType: "vip_partner" })).ok === false,
  "invalid referralType rejected at validate"
);
assert(
  validateReferralAnswers(
    validReferralAnswers({ phone: "", email: "", referredEmail: "ok@example.com" })
  ).ok === false,
  "referrer without phone/email rejected"
);
assert(validateReferralAnswers(validReferralAnswers()).ok === true, "valid referral accepted");

/* -------------------------------------------------------------------------- */
/* Behavioral: real quote-submit handler                                      */
/* -------------------------------------------------------------------------- */

const prevFetch = globalThis.fetch;
const prevEnv = { ...process.env };
const openaiHits = [];
const brevoPayloads = [];

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes("api.openai.com")) {
    openaiHits.push({ url: u, body: init.body ? String(init.body) : "" });
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"summary":"AI should not run"}' } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (u.includes("api.brevo.com")) {
    const parsed = init.body ? JSON.parse(String(init.body)) : {};
    brevoPayloads.push(parsed);
    return new Response(JSON.stringify({ messageId: "test-msg" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response("unexpected fetch", { status: 500 });
};

process.env.BREVO_API_KEY = "test-brevo-key";
process.env.SPARKLEAN_FROM_EMAIL = "Sparklean <info@sparklean.co>";
process.env.SPARKLEAN_LEAD_TO = "info@sparklean.co";
process.env.OPENAI_API_KEY = "test-openai-key-must-not-be-used-for-referral";

try {
  const deniedPerm = await postQuote(validReferralAnswers({ referralPermission: "no" }));
  assert(deniedPerm.status === 400, "handler rejects missing permission (HTTP 400)");
  const deniedPermBody = await deniedPerm.json();
  assert(/permission|consent/i.test(deniedPermBody.error || ""), "permission error message present");

  const deniedConsent = await postQuote(validReferralAnswers({ referralConsent: "disagree" }));
  assert(deniedConsent.status === 400, "handler rejects missing consent (HTTP 400)");

  const deniedType = await postQuote(validReferralAnswers({ referralType: "arbitrary_client_type" }));
  assert(deniedType.status === 400, "handler rejects invalid referralType (HTTP 400)");
  const deniedTypeBody = await deniedType.json();
  assert(/referralType/i.test(deniedTypeBody.error || ""), "invalid type error names referralType");

  openaiHits.length = 0;
  brevoPayloads.length = 0;

  const mixed = validReferralAnswers({
    fullName: "Alex Referrer",
    phone: "(239) 555-0101",
    email: "",
    referredName: "Jordan Referred",
    referredPhone: "",
    referredEmail: "jordan.referred@example.com",
    referralType: "homeowner",
  });
  const okRes = await postQuote(mixed);
  assert(okRes.status === 200, "valid referral returns 200");
  const okBody = await okRes.json();
  assert(okBody.ok === true && typeof okBody.leadId === "string", "valid referral returns ok + leadId");

  assert(openaiHits.length === 0, "referral PII never reaches OpenAI fetch");
  assert(brevoPayloads.length === 1, "valid referral still sends Brevo operational email");

  const email = brevoPayloads[0];
  assert(/^Sparklean referral · homeowner/i.test(email.subject || ""), "referral-specific subject");
  assert(/Private referral brief/i.test(email.htmlContent || ""), "referral-specific HTML layout");
  assert(/REFERRER/i.test(email.textContent || "") && /REFERRED PARTY/i.test(email.textContent || ""), "plain text has both identity sections");

  const html = email.htmlContent || "";
  const text = email.textContent || "";
  // Referrer name must not sit beside referred email in the single-contact header pattern.
  assert(!/Alex Referrer[\s\S]{0,120}jordan\.referred@example\.com/i.test(html.replace(/<[^>]+>/g, " ")), "HTML does not pair referrer name with referred email");
  assert(html.includes("Alex Referrer") && html.includes("Jordan Referred"), "HTML includes both names");
  assert(html.includes("(239) 555-0101") && html.includes("jordan.referred@example.com"), "HTML keeps each identity's own contact");
  assert(!html.includes("see referred contact"), "no mixed-identity placeholder phone");
  assert(!/referral@sparklean\.co/i.test(html), "no invented referrer email from referred party");

  // Identities remain separate in dedicated text blocks (before shared summary).
  const referrerIdx = text.indexOf("REFERRER");
  const referredIdx = text.indexOf("REFERRED PARTY");
  const detailsIdx = text.indexOf("REFERRAL DETAILS");
  const summaryIdx = text.indexOf("INTERNAL SUMMARY");
  assert(referrerIdx >= 0 && referredIdx > referrerIdx, "plain text order: referrer then referred");
  assert(detailsIdx > referredIdx && summaryIdx > detailsIdx, "plain text order: details then summary");
  const referrerSection = text.slice(referrerIdx, referredIdx);
  const referredSection = text.slice(referredIdx, detailsIdx);
  assert(referrerSection.includes("(239) 555-0101"), "referrer section keeps referrer phone");
  assert(!referrerSection.includes("jordan.referred@example.com"), "referrer section does not contain referred email");
  assert(referredSection.includes("jordan.referred@example.com"), "referred section keeps referred email");
  assert(!referredSection.includes("(239) 555-0101"), "referred section does not contain referrer phone");

  const tags = buildPriorityTags(mixed);
  assert(tags.includes("REFERRAL") && tags.includes("REFERRAL:homeowner"), "safe tags for valid referral");
  assert(!tags.some((t) => /arbitrary|vip_partner/i.test(t)), "tags not polluted by invalid types");

  const localSummary = buildHumanFallbackSummary(mixed, "Referral introduction");
  assert(/Alex Referrer/.test(localSummary) && /Jordan Referred/.test(localSummary), "local referral summary keeps both parties");

  const subject = buildReferralEmailSubject(mixed);
  assert(subject === "Sparklean referral · homeowner · Southwest Florida (referral)", "deterministic referral subject");

  const sampleHtml = buildReferralHtmlEmail({
    leadId: "test-lead",
    submittedAtEst: "Wed, Aug 5, 2026",
    priorityTags: tags,
    answers: mixed,
    summary: localSummary,
  });
  const sampleText = buildReferralPlainText({
    leadId: "test-lead",
    submittedAtEst: "Wed, Aug 5, 2026",
    priorityTags: tags,
    answers: mixed,
    summary: localSummary,
  });
  assert(sampleHtml.includes("Referrer") && sampleHtml.includes("Referred party"), "builder exposes two identity headings");
  assert(sampleText.includes("Name: Alex Referrer") && sampleText.includes("Name: Jordan Referred"), "plain builder lists both names");
} finally {
  globalThis.fetch = prevFetch;
  for (const k of Object.keys(process.env)) {
    if (!(k in prevEnv)) delete process.env[k];
  }
  Object.assign(process.env, prevEnv);
}

/* -------------------------------------------------------------------------- */
/* Analytics: no PII                                                          */
/* -------------------------------------------------------------------------- */

const events = loadEventsApi();
const dirty = events.sanitizeParams({
  referral_type: "realtor",
  fullName: "Alex Referrer",
  email: "alex@example.com",
  phone: "2395550101",
  referredEmail: "jordan.referred@example.com",
  notes: "secret note",
  address: "123 Main",
});
assert(
  dirty && dirty.referral_type === "realtor" && Object.keys(dirty).length === 1,
  "analytics sanitizeParams keep only safe keys"
);
events.track("referral_submitted", {
  referral_type: "builder",
  email: "leak@example.com",
  fullName: "Should Not Appear",
  notesReferral: "PII",
});
const pushed = events.dataLayer.find((r) => r.event === "referral_submitted");
assert(!!pushed, "referral_submitted event recorded");
assert(
  pushed.referral_type === "builder" &&
    !pushed.email &&
    !pushed.fullName &&
    !pushed.notesReferral &&
    !JSON.stringify(pushed).includes("leak@example.com"),
  "analytics events contain no PII"
);
events.track("referral_submitted", { referral_type: "not_a_real_type", email: "x@y.com" });
const badTypeRow = events.dataLayer.filter((r) => r.event === "referral_submitted").pop();
assert(!badTypeRow.referral_type, "invalid referral_type stripped from analytics");

/* -------------------------------------------------------------------------- */

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll referral/recurring tests passed.");
