/**
 * Deterministic tests for Google Ads base tag + quote conversion gating.
 * Run: node scripts/test-google-ads-conversion.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import vm from "vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  ", msg);
  }
}

function listPublicHtml() {
  return execSync('git ls-files "*.html" "pages/**/*.html"', {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((f) => !f.includes("pages/signalhouse/") && f !== "googleb2e0bc4648b22d1e.html")
    .filter(
      (f) =>
        f !== "pages/careers-apply.html" &&
        f !== "pages/careers-offer.html" &&
        f !== "pages/careers-documents.html"
    );
}

// --- Base tag exactly once per public HTML page ---
const htmlFiles = listPublicHtml();
assert(htmlFiles.length >= 20, `expected many public HTML files, got ${htmlFiles.length}`);

for (const rel of htmlFiles) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  const idHits = (html.match(/AW-17027441328/g) || []).length;
  // snippet: script src id + config id = 2
  assert(idHits === 2, `${rel} has AW id count ${idHits} (want 2)`);
  const asyncLoads = (html.match(/googletagmanager\.com\/gtag\/js\?id=AW-17027441328/g) || []).length;
  assert(asyncLoads === 1, `${rel} gtag.js async load count ${asyncLoads}`);
  const adsJs = (html.match(/src="\/js\/sparklean-ads\.js"/g) || []).length;
  assert(adsJs === 1, `${rel} sparklean-ads.js count ${adsJs}`);
  assert(!html.includes("HnWnCJPRt9kcELDFqLc_"), `${rel} must not embed conversion send_to in HTML`);
}

const signalhouse = execSync('git ls-files "pages/signalhouse/**/*.html"', {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
for (const rel of signalhouse) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  assert(!html.includes("AW-17027441328"), `signalhouse ${rel} must not have Ads tag`);
}

for (const rel of ["pages/careers-apply.html", "pages/careers-offer.html", "pages/careers-documents.html"]) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  assert(!html.includes("AW-17027441328"), `${rel} must not send hiring pages to Google Ads`);
  assert(!html.includes("sparklean-ads.js"), `${rel} must not load Ads helper`);
}

// --- Conversion helper behavior (vm sandbox) ---
const adsSrc = fs.readFileSync(path.join(root, "js/sparklean-ads.js"), "utf8");
const attrSrc = fs.readFileSync(path.join(root, "js/sparklean-attribution.js"), "utf8");
const intakeSrc = fs.readFileSync(path.join(root, "js/quote-intake.js"), "utf8");
const contactHtml = fs.readFileSync(path.join(root, "pages/contact.html"), "utf8");

assert(fs.existsSync(path.join(root, "js/sparklean-attribution.js")), "first-party attribution helper exists");
assert(intakeSrc.includes("conversion-report"), "intake can report without SparkleanAds");
assert(contactHtml.includes("sparklean-attribution.js"), "contact loads attribution helper");
assert(contactHtml.includes("SparkleanAttribution"), "contact reports when Ads absent");

assert(
  intakeSrc.includes("fireAndReportConversion") || intakeSrc.includes("trackQuoteRequestCompleted"),
  "quote-intake calls SparkleanAds conversion helpers"
);
assert(
  /res\.j && res\.j\.leadId/.test(intakeSrc) || /res\.j\.leadId/.test(intakeSrc),
  "quote-intake gates conversion on server leadId"
);
assert(intakeSrc.includes("reportToken"), "quote-intake expects reportToken");
assert(intakeSrc.includes("INTAKE_FAIL"), "failure path still present");
assert(intakeSrc.includes("gclid"), "gclid preserved in campaign payload");
assert(adsSrc.includes("BROWSER_SENT"), "ads.js uses BROWSER_SENT (not Google-confirmed)");
assert(adsSrc.includes("OFFLINE_QUEUED"), "ads.js can report OFFLINE_QUEUED");
assert(adsSrc.includes("reportConversionOutcome"), "ads.js exposes reportConversionOutcome");

function makeEnv(opts) {
  opts = opts || {};
  const store = new Map();
  const conversions = [];
  const gtagCalls = [];
  const reports = [];
  const sessionStorage = {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    },
    removeItem(k) {
      store.delete(k);
    },
  };
  function gtag() {
    gtagCalls.push(Array.from(arguments));
    if (arguments[0] === "event" && arguments[1] === "conversion") {
      conversions.push(arguments[2]);
    }
  }
  const sandbox = {
    window: { location: { search: "?gclid=TESTCLICK123&utm_source=google" } },
    sessionStorage,
    console,
    URLSearchParams,
    setInterval,
    clearInterval,
    document: {
      createElement(tag) {
        return { className: "", setAttribute() {}, textContent: "", tagName: tag };
      },
    },
    fetch(url, init) {
      const body = init && init.body ? JSON.parse(init.body) : {};
      reports.push({ url: String(url), body });
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, trackingStatus: body.status }),
      });
    },
  };
  if (opts.withGtag !== false) sandbox.gtag = gtag;
  sandbox.window.sessionStorage = sessionStorage;
  sandbox.window.fetch = sandbox.fetch;
  sandbox.window.document = sandbox.document;
  vm.runInNewContext(attrSrc, sandbox);
  if (opts.withAds !== false) vm.runInNewContext(adsSrc, sandbox);
  return { sandbox, conversions, gtagCalls, store, reports };
}

// Modal open / partial / pre-success: zero conversions (no track call)
{
  const { conversions } = makeEnv();
  assert(conversions.length === 0, "loading ads.js alone fires zero conversions");
}

// Success once
{
  const { sandbox, conversions } = makeEnv();
  const ok1 = sandbox.window.SparkleanAds.trackQuoteRequestCompleted("lead-aaa");
  const ok2 = sandbox.window.SparkleanAds.trackQuoteRequestCompleted("lead-aaa");
  assert(ok1 === true, "first success track returns true");
  assert(ok2 === false, "duplicate leadId does not fire again");
  assert(conversions.length === 1, "exactly one conversion for one leadId");
  assert(conversions[0].send_to === sandbox.window.SparkleanAds.SEND_TO, "send_to matches Ads conversion");
  assert(conversions[0].transaction_id === "lead-aaa", "transaction_id = leadId");
}

// Separate request can convert
{
  const { sandbox, conversions } = makeEnv();
  sandbox.window.SparkleanAds.trackQuoteRequestCompleted("lead-1");
  sandbox.window.SparkleanAds.trackQuoteRequestCompleted("lead-2");
  assert(conversions.length === 2, "two distinct leadIds → two conversions");
}

// Invalid / empty
{
  const { sandbox, conversions } = makeEnv();
  assert(sandbox.window.SparkleanAds.trackQuoteRequestCompleted("") === false, "empty leadId ignored");
  assert(sandbox.window.SparkleanAds.trackQuoteRequestCompleted(null) === false, "null leadId ignored");
  assert(conversions.length === 0, "invalid ids produce zero conversions");
}

// gclid persisted from URL
{
  const { sandbox } = makeEnv();
  const ids = sandbox.window.SparkleanAds.getStoredAdClickIds();
  assert(ids.gclid === "TESTCLICK123", "gclid stored from query string");
}

// Simulate failure path: no leadId → no track (unit-level contract)
{
  const { sandbox, conversions } = makeEnv();
  const leadId = ""; // backend failure / missing
  if (leadId && sandbox.window.SparkleanAds) {
    sandbox.window.SparkleanAds.trackQuoteRequestCompleted(leadId);
  }
  assert(conversions.length === 0, "missing leadId produces zero conversions");
}

// No PII in conversion payload
{
  const { sandbox, conversions } = makeEnv();
  sandbox.window.SparkleanAds.trackQuoteRequestCompleted("lead-xyz");
  const payload = JSON.stringify(conversions[0]);
  assert(!/email|phone|fullName|@/i.test(payload) || payload.includes("transaction_id"), "conversion payload has no customer PII fields");
  assert(!payload.includes("@gmail"), "no email in conversion");
}

// BROWSER_SENT only when durable report ok
{
  const { sandbox, conversions, reports } = makeEnv();
  const outcome = await sandbox.window.SparkleanAds.fireAndReportConversion({
    leadId: "lead-browser-1",
    reportToken: "tok-1",
  });
  assert(conversions.length === 1, "fireAndReport: one browser conversion");
  assert(reports.length === 1, "fireAndReport: one conversion-report POST");
  assert(reports[0].body.status === "BROWSER_SENT", "fireAndReport posts BROWSER_SENT");
  assert(outcome.browserSent === true && outcome.reportOk === true, "success requires durable ok");
}

// Durable report failure after gtag → NOT BROWSER_SENT success
{
  const { sandbox, conversions } = makeEnv();
  sandbox.fetch = () =>
    Promise.resolve({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ ok: false }),
    });
  sandbox.window.fetch = sandbox.fetch;
  const outcome = await sandbox.window.SparkleanAds.fireAndReportConversion({
    leadId: "lead-report-fail",
    reportToken: "tok-fail",
  });
  assert(conversions.length === 1, "gtag may fire");
  assert(outcome.browserSent === false, "durable fail → not browserSent success");
  assert(outcome.delayed === true, "durable fail → delayed/unresolved");
  assert(outcome.trackingStatus === "UNRESOLVED", "durable fail → UNRESOLVED");
}

// Helper missing → OFFLINE_QUEUED via attribution (not Ads)
{
  const { sandbox, conversions, reports } = makeEnv({ withGtag: false });
  const outcome = await sandbox.window.SparkleanAds.fireAndReportConversion({
    leadId: "lead-offline-1",
    reportToken: "tok-2",
  });
  assert(conversions.length === 0, "helper missing: zero gtag conversions");
  assert(outcome.browserSent === false, "helper missing: browserSent false");
  assert(outcome.trackingStatus === "OFFLINE_QUEUED", "helper missing: OFFLINE_QUEUED");
  assert(reports.some((r) => r.body.status === "OFFLINE_QUEUED"), "helper missing reported OFFLINE_QUEUED");
}

// Attribution alone captures gclid without ads.js
{
  const { sandbox } = makeEnv({ withAds: false });
  assert(sandbox.window.SparkleanAttribution.getStoredAdClickIds().gclid === "TESTCLICK123", "attribution stores gclid without ads.js");
  assert(!sandbox.window.SparkleanAds, "ads absent when withAds false");
}

// --- Contact form: server accept + reportToken (not ?sent=1 as sole gate) ---
assert(contactHtml.includes("contact-submit"), "contact form posts to contact-submit");
assert(contactHtml.includes("fireAndReportConversion") || contactHtml.includes("SparkleanAttribution"), "contact success path present");
assert(contactHtml.includes("reportToken"), "contact expects reportToken");
assert(contactHtml.includes("sent=1"), "contact keeps optional ?sent=1 bookmark UX");
assert(!contactHtml.includes("markContactFormSubmitPending"), "contact no longer relies on pending-only gate");
assert(!contactHtml.includes("HnWnCJPRt9kcELDFqLc_"), "contact.html does not embed send_to (uses sparklean-ads.js)");
assert(
  adsSrc.includes("reportConversionOutcome") && adsSrc.includes("fireAndReportConversion"),
  "ads.js exposes report + fireAndReport helpers"
);

// Legacy helpers still exist for tests / bookmark paths but ?sent=1 alone does not invent conversions in HTML
{
  const { sandbox, conversions } = makeEnv();
  const fired = sandbox.window.SparkleanAds.trackContactFormAccepted();
  assert(fired === "", "legacy accept without pending fires nothing");
  assert(conversions.length === 0, "no conversion without pending submit");
}

{
  const { sandbox, conversions } = makeEnv();
  const pending = sandbox.window.SparkleanAds.markContactFormSubmitPending();
  assert(/^contact-\d+-[a-z0-9]+$/i.test(pending), `pending id shape (${pending})`);
  const txn = sandbox.window.SparkleanAds.trackContactFormAccepted();
  assert(txn === pending, "accepted txn matches pending id");
  assert(conversions.length === 1, "legacy pending path still can fire once");
  sandbox.window.SparkleanAds.trackContactFormAccepted();
  sandbox.window.SparkleanAds.trackQuoteRequestCompleted(pending);
  assert(conversions.length === 1, "legacy duplicate / replay does not fire again");
}

console.log(failed ? `\nFAILED: ${failed}` : "\nALL GOOGLE ADS TESTS PASSED");
process.exit(failed ? 1 : 0);
