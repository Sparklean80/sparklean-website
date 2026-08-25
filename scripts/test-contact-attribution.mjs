/**
 * Browser-level contact attribution: DOM .value after load and before submit.
 * Reproduces query capture + URL cleanup (history.replaceState strips search).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (cond) console.log("OK  ", msg);
  else {
    console.error("FAIL", msg);
    failed += 1;
  }
}

const QUERY =
  "?interest=inner-circle&preset=innerCircle&utm_source=audit&utm_campaign=review";
const LANDING = `/contact${QUERY}`;
const HASH = "#quote-intake";

const html = `<!DOCTYPE html>
<html><head></head><body>
<form id="sparklean-contact-form">
  <div id="cp-interest-banner" hidden></div>
  <input type="hidden" name="interest" id="cf-interest" value="">
  <input type="hidden" name="landingPage" id="cf-landing" value="">
  <input type="hidden" name="utmSource" id="cf-utm-source" value="">
  <input type="hidden" name="utmMedium" id="cf-utm-medium" value="">
  <input type="hidden" name="utmCampaign" id="cf-utm-campaign" value="">
  <input type="text" name="service" id="cf-service" value="">
  <button type="submit">Send</button>
</form>
</body></html>`;

const dom = new JSDOM(html, {
  url: `https://www.sparklean.co/contact${QUERY}${HASH}`,
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
});

const { window } = dom;
const { document } = window;

try {
  window.sessionStorage.clear();
} catch {
  /* ignore */
}

const src = fs.readFileSync(
  path.join(root, "js", "sparklean-contact-attribution.js"),
  "utf8"
);
const scriptEl = document.createElement("script");
scriptEl.textContent = src;
document.head.appendChild(scriptEl);

assert(!!window.SparkleanContactAttribution, "SparkleanContactAttribution exported");
assert(
  window.location.search.includes("utm_source=audit"),
  `location.search has utm (${window.location.search})`
);

// Explicit apply (boot may have already run; re-apply is idempotent)
window.SparkleanContactAttribution.applyToForm();

const expected = {
  interest: "inner-circle",
  landingPage: LANDING,
  utmSource: "audit",
  utmCampaign: "review",
};

function readDomValues() {
  return {
    interest: document.getElementById("cf-interest").value,
    landingPage: document.getElementById("cf-landing").value,
    utmSource: document.getElementById("cf-utm-source").value,
    utmCampaign: document.getElementById("cf-utm-campaign").value,
    interestAttr: document.getElementById("cf-interest").getAttribute("value"),
    landingAttr: document.getElementById("cf-landing").getAttribute("value"),
    utmSourceAttr: document.getElementById("cf-utm-source").getAttribute("value"),
    utmCampaignAttr: document.getElementById("cf-utm-campaign").getAttribute("value"),
  };
}

const afterLoad = readDomValues();
assert(afterLoad.interest === expected.interest, `after load interest=${afterLoad.interest}`);
assert(
  afterLoad.landingPage === expected.landingPage,
  `after load landingPage=${afterLoad.landingPage}`
);
assert(afterLoad.utmSource === expected.utmSource, `after load utmSource=${afterLoad.utmSource}`);
assert(
  afterLoad.utmCampaign === expected.utmCampaign,
  `after load utmCampaign=${afterLoad.utmCampaign}`
);
assert(
  afterLoad.interestAttr === expected.interest &&
    afterLoad.landingAttr === expected.landingPage &&
    afterLoad.utmSourceAttr === expected.utmSource &&
    afterLoad.utmCampaignAttr === expected.utmCampaign,
  "after load HTML value attributes match live DOM values"
);

const banner = document.getElementById("cp-interest-banner");
assert(banner && banner.hidden === false, "Inner Circle banner shown after load");
assert(
  /Inner Circle/i.test(document.getElementById("cf-service").value || ""),
  "service prefilled for Inner Circle"
);

// Simulate guided-intake / thank-you URL cleanup that strips query params
window.history.replaceState(null, "", `/contact${HASH}`);
assert(
  !window.location.search || window.location.search === "",
  "URL search cleared after replaceState"
);

window.SparkleanContactAttribution.applyToForm();

const afterStrip = readDomValues();
assert(
  afterStrip.interest === expected.interest,
  `after URL strip interest=${afterStrip.interest}`
);
assert(
  afterStrip.landingPage === expected.landingPage,
  `after URL strip landingPage=${afterStrip.landingPage}`
);
assert(
  afterStrip.utmSource === expected.utmSource,
  `after URL strip utmSource=${afterStrip.utmSource}`
);
assert(
  afterStrip.utmCampaign === expected.utmCampaign,
  `after URL strip utmCampaign=${afterStrip.utmCampaign}`
);

let submitSnapshot = null;
const form = document.getElementById("sparklean-contact-form");
form.addEventListener(
  "submit",
  function (ev) {
    ev.preventDefault();
    window.SparkleanContactAttribution.applyToForm();
    submitSnapshot = readDomValues();
    const fd = new window.FormData(form);
    submitSnapshot.formData = {
      interest: fd.get("interest"),
      landingPage: fd.get("landingPage"),
      utmSource: fd.get("utmSource"),
      utmCampaign: fd.get("utmCampaign"),
    };
  },
  true
);

form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

assert(!!submitSnapshot, "submit handler ran");
assert(
  submitSnapshot.interest === expected.interest &&
    submitSnapshot.landingPage === expected.landingPage &&
    submitSnapshot.utmSource === expected.utmSource &&
    submitSnapshot.utmCampaign === expected.utmCampaign,
  "DOM values immediately before submission"
);
assert(
  submitSnapshot.formData.interest === expected.interest &&
    submitSnapshot.formData.landingPage === expected.landingPage &&
    submitSnapshot.formData.utmSource === expected.utmSource &&
    submitSnapshot.formData.utmCampaign === expected.utmCampaign,
  "FormData values immediately before submission"
);

const contactHtml = fs.readFileSync(path.join(root, "pages", "contact.html"), "utf8");
assert(
  contactHtml.includes('src="/js/sparklean-contact-attribution.js"'),
  "contact.html loads sparklean-contact-attribution.js"
);
assert(
  !/Satisfaction Window/i.test(contactHtml),
  "contact page does not use Satisfaction Window label"
);

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nContact attribution browser checks passed.");
