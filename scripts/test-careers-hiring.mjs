/**
 * Public careers hiring funnel regressions.
 * Run: node scripts/test-careers-hiring.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.sparklean.co";
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  ", msg);
  }
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const landing = "pages/careers.html";
const applyPage = "pages/careers-apply.html";
const tokenPages = ["pages/careers-offer.html", "pages/careers-documents.html"];
const jsFiles = [
  "js/sparklean-careers-api.js",
  "js/sparklean-careers.js",
  "js/sparklean-careers-apply.js",
  "js/sparklean-careers-offer.js",
  "js/sparklean-careers-documents.js",
];
const toml = read("netlify.toml");
const robots = read("robots.txt");
const allCareers = [landing, applyPage, ...tokenPages, ...jsFiles, "css/sparklean-careers.css"].map(read).join("\n");

assert(!fs.existsSync(path.join(root, "js/sparklean-careers-review.js")), "founder review JS is removed");
assert(
  !fs.existsSync(path.join(root, "netlify/edge-functions/hiring-review-gate.js")),
  "founder review gate is removed"
);
assert(
  fs.existsSync(path.join(root, "netlify/edge-functions/hiring-applicant-gate.js")),
  "applicant token gate exists"
);

assert(!/127\.0\.0\.1:8787/.test(allCareers), "no localhost hiring API");
assert(!/SparkleanHiringReview/.test(allCareers), "no founder-review helper");
assert(!/founder-demo|fill-demo-answers|Use demo answers|Founder Demo/.test(allCareers), "no demo controls");
assert(!/Hiring API is not connected/.test(allCareers), "no production demo exception");
assert(!/<input[^>]*type=["']file["']/i.test(allCareers), "no file inputs on careers surfaces");
assert(
  /https:\/\/api\.sparklean\.co/.test(read("js/sparklean-careers-api.js")),
  "public client uses api.sparklean.co"
);
assert(
  read("js/sparklean-careers-api.js").includes("/hiring/onboarding/") &&
    read("js/sparklean-careers-documents.js").includes("onboardingUrl"),
  "document capture continues on Sparklean OS"
);
assert(
  read("js/sparklean-careers-documents.js").includes("storage_not_configured") ||
    read("js/sparklean-careers-api.js").includes("storage_not_configured"),
  "storage 503 remains the document-collection failure"
);

for (const rel of [landing]) {
  const html = read(rel);
  assert(!/name=["']robots["'][^>]*noindex/i.test(html), `${rel} is indexable`);
  assert(/<link rel="canonical"/i.test(html), `${rel} has canonical`);
  assert(/application\/ld\+json/.test(html), `${rel} has JSON-LD`);
  assert(/rewards-panel-title/.test(html), `${rel} has homepage rewards panel`);
  assert(/qualifying Sparklean services/.test(html), `${rel} uses homepage rewards copy`);
  assert(/aria-expanded/.test(html) && /nav-hamburger/.test(html), `${rel} hamburger has aria-expanded`);
  assert(/footer-bottom/.test(html) && /Workers' Comp/.test(html), `${rel} has homepage legal row`);
  assert(/nav-call/.test(html), `${rel} includes homepage call control`);
  assert(html.includes("There are no open positions at this time. Please check back soon."), `${rel} has empty-state copy`);
}

{
  const html = read(applyPage);
  assert(/name=["']robots["'][^>]*noindex/i.test(html), `${applyPage} stays noindex`);
  assert(!/application\/ld\+json/.test(html), `${applyPage} has no public structured data`);
  assert(/rewards-panel-title/.test(html), `${applyPage} has homepage rewards panel`);
  assert(/qualifying Sparklean services/.test(html), `${applyPage} uses homepage rewards copy`);
  assert(/aria-expanded/.test(html) && /nav-hamburger/.test(html), `${applyPage} hamburger has aria-expanded`);
  assert(/footer-bottom/.test(html) && /Workers' Comp/.test(html), `${applyPage} has homepage legal row`);
  assert(/nav-call/.test(html), `${applyPage} includes homepage call control`);
}

for (const rel of tokenPages) {
  const html = read(rel);
  assert(/name=["']robots["'][^>]*noindex/i.test(html), `${rel} stays noindex`);
}

assert(!toml.includes("hiring-review-gate"), "netlify.toml does not attach founder gate");
assert(toml.includes("hiring-applicant-gate"), "netlify.toml attaches applicant gate");
assert(!/function = "hiring-applicant-gate"\s*\n\s*path = "\/careers"$/m.test(toml), "gate is not on /careers");
assert(!/path = "\/careers\/apply"/.test(toml), "applicant gate is not on /careers/apply");
const edgeBlock = toml.split("[[edge_functions]]").filter((b) => b.includes("hiring-applicant-gate")).join("\n");
assert(!/path = "\/careers"\s*$/m.test(edgeBlock.split("[[")[0] || edgeBlock), "public /careers is not gated");
assert(edgeBlock.includes("/careers/offer"), "offer path is gated");
assert(edgeBlock.includes("/careers/documents"), "documents path is gated");
assert(!edgeBlock.includes("/pages/careers.html"), "public careers HTML is not gated");
assert(!edgeBlock.includes("/pages/careers-apply.html"), "public apply HTML is not gated");

assert(robots.includes("Disallow: /careers/apply"), "robots blocks apply");
assert(robots.includes("Disallow: /careers/offer"), "robots blocks offer");
assert(robots.includes("Disallow: /careers/documents"), "robots blocks documents");
assert(!/^Disallow:\s*\/careers\s*$/m.test(robots), "robots does not blanket-block careers");
assert(/for = "\/careers\/apply"[\s\S]{0,160}X-Robots-Tag = "noindex/.test(toml), "apply URL is noindex");
assert(/for = "\/pages\/careers-apply.html"[\s\S]{0,160}X-Robots-Tag = "noindex/.test(toml), "apply HTML is noindex");

const gate = read("netlify/edge-functions/hiring-applicant-gate.js");
assert(gate.includes("applicantToken"), "edge gate requires an applicant token");
assert(!gate.includes("HIRING_REVIEW_TOKEN"), "edge gate does not use founder review secret");
assert(!gate.includes("founder-demo"), "edge gate does not mark founder demo");

const live = { openings: null, office: null, offer: null, documents: null, application: null };

try {
  const openingsRes = await fetch(`${API}/api/hiring/openings`);
  const openingsJson = await openingsRes.json();
  live.openings = { status: openingsRes.status, body: openingsJson };
  assert(openingsRes.ok, `live openings HTTP ${openingsRes.status}`);
  assert(Array.isArray(openingsJson.openings), "live openings is an array, not fixtures");
  console.log("LIVE openings count:", openingsJson.openings.length);

  const officeRes = await fetch(`${API}/api/office/hiring/review`);
  live.office = { status: officeRes.status, body: await officeRes.json().catch(() => ({})) };
  assert(officeRes.status === 401, `office hiring review is 401 (got ${officeRes.status})`);

  const jobsRes = await fetch(`${API}/api/office/hiring/jobs`);
  assert(jobsRes.status === 401, `office hiring jobs is 401 (got ${jobsRes.status})`);

  const offerRes = await fetch(`${API}/api/hiring/offers/not-a-real-token`);
  live.offer = { status: offerRes.status };
  assert(offerRes.status === 404, `invalid offer token is 404 (got ${offerRes.status})`);

  const docsRes = await fetch(`${API}/api/hiring/documents/status`);
  live.documents = { status: docsRes.status };
  assert(docsRes.status === 401, `documents status without token is 401 (got ${docsRes.status})`);

  if (openingsJson.openings[0]) {
    const job = openingsJson.openings[0];
    const startedRes = await fetch(`${API}/api/hiring/applications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ job_id: job.id }),
    });
    const started = await startedRes.json();
    live.application = { status: startedRes.status, id: started.application_id || null };
    assert(startedRes.ok && started.resume_token && started.application_id, "test application started on live API");
    const stamp = String(Date.now()).slice(-6);
    const gateBody = {
      full_legal_name: "Jordan Hale Review",
      phone: `239555${stamp}`,
      email: `jordan.hale.${stamp}@sparklean.invalid`,
      city: "Naples",
      zip: "34102",
      at_least_18: true,
      work_authorized: true,
      requires_sponsorship: false,
      accepts_starting_pay: true,
      understands_rate_nonnegotiable: true,
      can_report_earliest_time: true,
      available_full_time: true,
      willing_over_40: true,
      understands_ot_rate: true,
      understands_ot_not_guaranteed: true,
      can_work_required_days: true,
      has_valid_fl_dl: true,
      reliable_transport: true,
      can_perform_essential_duties: true,
      accepts_conduct_requirements: true,
      agrees_later_screening: true,
    };
    const gateRes = await fetch(`${API}/api/hiring/applications/${started.application_id}/gate`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-hiring-resume": started.resume_token },
      body: JSON.stringify(gateBody),
    });
    const gateJson = await gateRes.json();
    live.application.gate = { status: gateRes.status, body: gateJson };
    assert(gateRes.ok, `test application gate reached Sparklean OS (${gateRes.status})`);
  } else {
    console.log("LIVE no published openings — application queue proof deferred until Office publishes a job");
  }
} catch (err) {
  failed += 1;
  console.error("FAIL: live hiring API evidence", err.message || err);
}

fs.mkdirSync(path.join(root, "evidence", "public-careers-2026-08-28"), { recursive: true });
fs.writeFileSync(
  path.join(root, "evidence", "public-careers-2026-08-28", "api-evidence.json"),
  JSON.stringify({ api: API, live, at: new Date().toISOString() }, null, 2)
);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll careers hiring tests passed.");
