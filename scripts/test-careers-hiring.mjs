/**
 * Public careers hiring funnel regressions.
 * Run: node scripts/test-careers-hiring.mjs
 *
 * Default (including `npm run test:site`) is read-only against api.sparklean.co.
 * A synthetic application is DESTRUCTIVE to production Sparklean OS hiring data.
 * Enable only in a local non-CI shell:
 *   SPARKLEAN_LIVE_HIRING_MUTATION=1 npm run test:careers
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
assert(read("css/sparklean-careers.css").includes(".careers-faq .faq-q"), "careers FAQ questions are styled");
assert(
  /\.careers-faq \.faq-q[\s\S]{0,280}background:\s*transparent/.test(read("css/sparklean-careers.css")),
  "FAQ questions are not default white buttons"
);
assert(read("css/sparklean-careers.css").includes(".careers-empty[hidden]"), "empty-state card stays CSS-hidden while listings show");
assert(
  read("js/sparklean-careers.js").includes("if (!openings.length) return"),
  "empty hiring API does not wipe the careers listings"
);
assert(read("js/sparklean-careers-apply.js").includes("roleFromQuery"), "apply matches ?role= from /careers");

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
  assert(html.includes("Residential Cleaner — Full-Time"), `${rel} lists the full-time opening`);
  assert(html.includes("Residential Cleaner — Part-Time"), `${rel} lists the part-time opening`);
  assert(html.includes("$18/hour"), `${rel} shows starting pay`);
  assert(html.includes("20–30 hours per week"), `${rel} shows part-time hours`);
  assert(html.includes("/careers/apply?role=full-time"), `${rel} apply link for full-time`);
  assert(html.includes("/careers/apply?role=part-time"), `${rel} apply link for part-time`);
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
assert(gate.includes("https://api.sparklean.co"), "edge gate validates tokens against Sparklean OS");
assert(gate.includes("/api/hiring/offers/"), "edge gate checks offer tokens with the hiring API");
assert(gate.includes("/api/hiring/documents/status"), "edge gate checks document tokens with the hiring API");
assert(gate.includes("x-hiring-resume"), "edge gate sends the resume token only as an API header");
assert(gate.includes("referrer-policy"), "edge deny/pass responses set referrer-policy");
assert(gate.includes("no-referrer"), "edge gate uses no-referrer");
assert(gate.includes("no-store"), "edge gate uses no-store");
assert(!gate.includes("HIRING_REVIEW_TOKEN"), "edge gate does not use founder review secret");
assert(!gate.includes("founder-demo"), "edge gate does not mark founder demo");
assert(!/full_legal_name|email|phone/.test(gate), "edge gate does not read applicant fields");

const pkg = read("package.json");
assert(pkg.includes("test:careers:live-mutation"), "destructive live-mutation script is named");
assert(!/SPARKLEAN_LIVE_HIRING_MUTATION=1/.test(pkg), "package.json does not enable live hiring mutations");
assert(
  read("scripts/refuse-live-hiring-mutation.mjs").includes("DESTRUCTIVE"),
  "live-mutation npm script refuses to write"
);
assert(
  read("scripts/test-careers-hiring.mjs").indexOf("mutationRequested") <
    read("scripts/test-careers-hiring.mjs").indexOf('method: "POST"'),
  "synthetic application POST is behind the explicit mutation flag"
);

const LIVE_MUTATION_FLAG = "SPARKLEAN_LIVE_HIRING_MUTATION";
const inCi = Boolean(
  process.env.CI || process.env.GITHUB_ACTIONS || process.env.NETLIFY || process.env.TF_BUILD || process.env.GITLAB_CI
);
const mutationRequested = process.env[LIVE_MUTATION_FLAG] === "1";
assert(
  !inCi || !mutationRequested,
  "synthetic live applications must not run in CI"
);

const live = { openings: null, office: null, offer: null, documents: null, application: null, mutation: "skipped" };

try {
  const openingsRes = await fetch(`${API}/api/hiring/openings`);
  const openingsJson = await openingsRes.json();
  live.openings = { status: openingsRes.status, count: Array.isArray(openingsJson.openings) ? openingsJson.openings.length : null };
  assert(openingsRes.ok, `live openings HTTP ${openingsRes.status}`);
  assert(Array.isArray(openingsJson.openings), "live openings is an array, not fixtures");
  console.log("LIVE openings count:", openingsJson.openings.length);

  const officeRes = await fetch(`${API}/api/office/hiring/review`);
  live.office = { status: officeRes.status };
  assert(officeRes.status === 401, `office hiring review is 401 (got ${officeRes.status})`);

  const jobsRes = await fetch(`${API}/api/office/hiring/jobs`);
  assert(jobsRes.status === 401, `office hiring jobs is 401 (got ${jobsRes.status})`);

  const offerRes = await fetch(`${API}/api/hiring/offers/not-a-real-token`);
  live.offer = { status: offerRes.status };
  assert(offerRes.status === 404, `invalid offer token is 404 (got ${offerRes.status})`);

  const docsRes = await fetch(`${API}/api/hiring/documents/status`);
  live.documents = { status: docsRes.status };
  assert(docsRes.status === 401, `documents status without token is 401 (got ${docsRes.status})`);

  if (!mutationRequested) {
    console.log(
      "SKIP DESTRUCTIVE live application — npm run test:site is read-only against api.sparklean.co. Local founder proof: SPARKLEAN_LIVE_HIRING_MUTATION=1 npm run test:careers (blocked in CI)."
    );
  } else if (inCi) {
    failed += 1;
    console.error("FAIL: SPARKLEAN_LIVE_HIRING_MUTATION is blocked in CI");
  } else if (openingsJson.openings[0]) {
    console.warn("DESTRUCTIVE: writing a synthetic application to production Sparklean OS hiring data");
    const job = openingsJson.openings[0];
    const startedRes = await fetch(`${API}/api/hiring/applications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ job_id: job.id }),
    });
    const started = await startedRes.json();
    live.mutation = "wrote";
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
    live.application.gate = { status: gateRes.status, error: gateJson.error || null };
    assert(gateRes.ok, `test application gate reached Sparklean OS (${gateRes.status})`);
  } else {
    live.mutation = "no-openings";
    console.log("LIVE no published openings — destructive application proof deferred until Office publishes a job");
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
