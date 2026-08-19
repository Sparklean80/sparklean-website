/**
 * Regression tests for referral / recurring trust layer.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { publishedCaseStudies } from "../data/sparklean-case-studies.mjs";
import {
  UNVERIFIED_TESTIMONIAL_ATTRIBUTIONS,
} from "../data/sparklean-testimonials.mjs";

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

const NEW_PAGES = [
  "pages/why-sparklean.html",
  "pages/refer.html",
  "pages/partners.html",
];

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
  assert(!/corporation/i.test(JSON.stringify(blocks)), `${rel} schema has no corporation`);
}

assert(publishedCaseStudies().length === 0, "no published case studies without evidence");

const why = read("pages/why-sparklean.html");
assert(why.includes("consumer checklist") || why.includes("What to verify"), "why page has checklist");
assert(why.includes("How Sparklean remains"), "why page has operating model");
assert(why.includes("data-sparklean-intake-preset=\"recurringResidential\""), "why page recurring CTA");

const refer = read("pages/refer.html");
assert(refer.includes("data-sparklean-intake-preset=\"referral\""), "refer page opens referral intake");
assert(refer.includes("Introduce someone to the Sparklean"), "refer primary message");
assert(!/application\/ld\+json[\s\S]*referredName|referredEmail|referredPhone/.test(refer), "refer page schema has no referral PII fields");

const partners = read("pages/partners.html");
assert(partners.includes("/refer?type=realtor"), "partners link preserves realtor category");
assert(partners.includes("Do not claim existing partnerships") || partners.includes("do not claim existing partnerships") || partners.includes("We do not claim existing partnerships"), "partners disclaims invented partnerships");

const flows = read("js/serviceFlows.js");
assert(flows.includes("flows.referralIntro"), "referral flow defined");
assert(flows.includes("continueAfterOneTime"), "one-time continuing-care question present");

const intake = read("js/quote-intake.js");
assert(intake.includes('preset === "referral"'), "intake supports referral preset");
assert(intake.includes('preset === "recurringResidential"'), "intake supports recurring preset");
assert(intake.includes("referral_submitted"), "referral_submitted event wired");
assert(intake.includes("recurring_quote_submitted"), "recurring_quote_submitted event wired");

const events = read("js/sparklean-events.js");
assert(events.includes("why_sparklean_view"), "why_sparklean_view allowed");
assert(events.includes("google_reviews_clicked"), "google_reviews_clicked allowed");
assert(events.includes("sanitizeParams"), "events sanitize params");
assert(!/fullName|referredEmail|phone|email|notes/.test(events.match(/ALLOWED_PARAM_KEYS[\s\S]*?};/)?.[0] || ""), "events allowlist excludes PII keys");

const submit = read("netlify/functions/quote-submit.mjs");
assert(submit.includes("REFERRAL"), "server tags REFERRAL");
assert(submit.includes("isReferral"), "server has referral validation branch");
assert(submit.includes("leadSource"), "server stores leadSource attribution");

const netlify = read("netlify.toml");
assert(netlify.includes('from = "/why-sparklean"'), "why-sparklean rewrite");
assert(netlify.includes('from = "/refer"'), "refer rewrite");
assert(netlify.includes('from = "/partners"'), "partners rewrite");

const home = read("index.html");
// Homepage is Naples-led brand hub: open intake without forcing recurring preset.
// Recurring residential ownership lives on /residential-cleaning (asserted below).
assert(home.includes("data-sparklean-intake"), "homepage primary quote intake CTA");
assert(
  /<a href="\/contact\?quote=1#quote-intake"[^>]*data-sparklean-event-type="hero_primary"/.test(
    home
  ),
  "homepage primary quote CTA uses durable /contact?quote=1#quote-intake"
);
assert(home.includes("/why-sparklean"), "homepage links Why Sparklean");
assert(home.includes("/js/sparklean-events.js"), "homepage loads events helper");

const resi = read("pages/residential-cleaning.html");
assert(resi.includes('data-sparklean-intake-preset="recurringResidential"'), "residential recurring CTA");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll referral/recurring tests passed.");
