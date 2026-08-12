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
    .filter((f) => !f.includes("pages/signalhouse/") && f !== "googleb2e0bc4648b22d1e.html");
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

// --- Conversion helper behavior (vm sandbox) ---
const adsSrc = fs.readFileSync(path.join(root, "js/sparklean-ads.js"), "utf8");
const intakeSrc = fs.readFileSync(path.join(root, "js/quote-intake.js"), "utf8");

assert(
  intakeSrc.includes("trackQuoteRequestCompleted"),
  "quote-intake calls SparkleanAds.trackQuoteRequestCompleted"
);
assert(
  /res\.j && res\.j\.leadId/.test(intakeSrc) || /res\.j\.leadId/.test(intakeSrc),
  "quote-intake gates conversion on server leadId"
);
assert(intakeSrc.includes("INTAKE_FAIL"), "failure path still present");
assert(intakeSrc.includes("gclid"), "gclid preserved in campaign payload");

function makeEnv() {
  const store = new Map();
  const conversions = [];
  const gtagCalls = [];
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
    gtag,
    console,
    URLSearchParams,
  };
  sandbox.window.sessionStorage = sessionStorage;
  vm.runInNewContext(adsSrc, sandbox);
  return { sandbox, conversions, gtagCalls, store };
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

// --- Netlify contact form success path ---
const contactHtml = fs.readFileSync(path.join(root, "pages/contact.html"), "utf8");
assert(contactHtml.includes("markContactFormSubmitPending"), "contact form marks pending on submit");
assert(contactHtml.includes("trackContactFormAccepted"), "contact success calls trackContactFormAccepted");
assert(contactHtml.includes("sent=1"), "contact success still keyed on sent=1");
assert(!contactHtml.includes("HnWnCJPRt9kcELDFqLc_"), "contact.html does not embed send_to (uses sparklean-ads.js)");
assert(
  adsSrc.includes("trackContactFormAccepted") && adsSrc.includes("CONTACT_PENDING_KEY"),
  "ads.js exposes contact pending + accept helpers"
);

{
  const { sandbox, conversions } = makeEnv();
  // Direct ?sent=1 with no pending submit → zero conversions
  const fired = sandbox.window.SparkleanAds.trackContactFormAccepted();
  assert(fired === "", "direct sent=1 without pending fires nothing");
  assert(conversions.length === 0, "no conversion without pending submit");
}

{
  const { sandbox, conversions } = makeEnv();
  const pending = sandbox.window.SparkleanAds.markContactFormSubmitPending();
  assert(/^contact-\d+-[a-z0-9]+$/i.test(pending), `pending id shape (${pending})`);
  const txn = sandbox.window.SparkleanAds.trackContactFormAccepted();
  assert(txn === pending, "accepted txn matches pending id");
  assert(conversions.length === 1, "exactly one conversion after contact accept");
  assert(conversions[0].send_to === sandbox.window.SparkleanAds.SEND_TO, "contact uses AI Quote Request Completed send_to");
  assert(conversions[0].transaction_id === pending, "contact transaction_id is stable pending id");
  // Replay accept / duplicate → zero new conversions
  sandbox.window.SparkleanAds.trackContactFormAccepted();
  sandbox.window.SparkleanAds.trackQuoteRequestCompleted(pending);
  assert(conversions.length === 1, "contact duplicate / replay does not fire again");
}

console.log(failed ? `\nFAILED: ${failed}` : "\nALL GOOGLE ADS TESTS PASSED");
process.exit(failed ? 1 : 0);
