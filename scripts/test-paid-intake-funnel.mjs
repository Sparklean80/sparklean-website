/**
 * Paid-intake funnel + step-honesty + customer-portal wiring tests.
 * Run: node scripts/test-paid-intake-funnel.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";

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

const intakeSrc = fs.readFileSync(path.join(root, "js/quote-intake.js"), "utf8");
const flowsSrc = fs.readFileSync(path.join(root, "js/serviceFlows.js"), "utf8");
const adsSrc = fs.readFileSync(path.join(root, "js/sparklean-ads.js"), "utf8");
const portalHtml = fs.readFileSync(path.join(root, "pages/customer-portal.html"), "utf8");
const contactHtml = fs.readFileSync(path.join(root, "pages/contact.html"), "utf8");
const residentialHtml = fs.readFileSync(path.join(root, "pages/residential-cleaning.html"), "utf8");

assert(portalHtml.includes('href="/css/quote-intake.css"'), "customer-portal has quote-intake.css");
assert(portalHtml.includes('src="/js/serviceFlows.js"'), "customer-portal has serviceFlows.js");
assert(portalHtml.includes('src="/js/quote-intake.js"'), "customer-portal has quote-intake.js");
assert(/class="nav-btn"[^>]*data-sparklean-intake/.test(portalHtml), "customer-portal nav-btn has data-sparklean-intake");
assert(
  /class="nav-mobile-quote"[^>]*data-sparklean-intake/.test(portalHtml),
  "customer-portal mobile quote has data-sparklean-intake"
);
assert(/class="nav-btn"[^>]*data-sparklean-intake/.test(residentialHtml), "residential nav-btn has data-sparklean-intake");
assert(
  contactHtml.includes('id="sparklean-contact-form"') && contactHtml.includes("data-netlify"),
  "contact Netlify form preserved for organic"
);
assert(contactHtml.includes("data-sparklean-intake>Request Your Personalized Quote"), "contact quote CTA has data-sparklean-intake");
assert(intakeSrc.includes("isPaidLandingQuery"), "paid landing detector present");
assert(intakeSrc.includes("paidMode"), "paid mode flag present");
assert(intakeSrc.includes("maybeAutoOpenPaid"), "paid auto-open present");
assert(intakeSrc.includes("willExpandAfterServiceCategory"), "step honesty helper present");
assert(
  /trackQuoteRequestCompleted/.test(intakeSrc) && /res\.j && res\.j\.leadId/.test(intakeSrc),
  "conversion still gated on leadId"
);

function makeWindow(url, ua) {
  const dom = new JSDOM(`<!doctype html><html><body><a href="/contact" class="nav-btn" data-sparklean-intake>Get a Quote</a></body></html>`, {
    url,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
  window.dataLayer = [];
  const conversions = [];
  window.gtag = function () {
    if (arguments[0] === "event" && arguments[1] === "conversion") conversions.push(arguments[2]);
  };
  window.conversions = conversions;
  window.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ ok: true, leadId: "lead-paid-test-1" }),
  });
  window.eval(adsSrc);
  window.eval(flowsSrc);
  window.eval(intakeSrc);
  return window;
}

const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

// Paid detector via _test
{
  const w = makeWindow("https://www.sparklean.co/residential-cleaning", DESKTOP_UA);
  const T = w.SparkleanQuoteIntake._test;
  assert(T.isPaidLandingQuery("?quote=1") === true, "quote=1 is paid");
  assert(T.isPaidLandingQuery("?gclid=abc123") === true, "gclid is paid");
  assert(T.isPaidLandingQuery("?utm_medium=cpc&utm_source=google") === true, "utm cpc+google is paid");
  assert(T.isPaidLandingQuery("?utm_medium=organic&utm_source=google") === false, "organic medium not paid");
  assert(T.isPaidLandingQuery("") === false, "empty query not paid");
  assert(T.isPaidLandingQuery("?gbraid=x") === true, "gbraid is paid");
}

async function runPaidScenario(label, ua) {
  const w = makeWindow(
    "https://www.sparklean.co/residential-cleaning?gclid=TESTGCLID&utm_medium=cpc&utm_source=google",
    ua
  );
  await new Promise((r) => setTimeout(r, 30));

  const intake = w.document.getElementById("sparklean-quote-intake");
  assert(!!intake && !intake.hasAttribute("hidden"), `${label}: paid auto-open shows intake`);

  const st0 = w.SparkleanQuoteIntake._test.getState();
  assert(st0.paidMode === true, `${label}: paidMode true after auto-open`);
  assert(st0.stepsLen === 5, `${label}: paid flow has exactly 5 steps (got ${st0.stepsLen})`);

  const values = ["Tony Giuliano - Funnel Test", "2395550100", "tony-funnel-test@example.com", "34102"];
  for (let i = 0; i < 4; i++) {
    const inp = w.document.querySelector("[data-field]");
    assert(!!inp, `${label}: field input step ${i + 1}`);
    inp.value = values[i];
    const next = w.document.querySelector("[data-intake-next]");
    const prog = w.document.querySelector("[data-intake-progress]").textContent;
    assert(next.textContent === "Continue", `${label}: Continue before final (step ${i + 1})`);
    assert(!/Step 5 of 5/i.test(prog), `${label}: never Step 5 of 5 before service (${prog})`);
    next.click();
    await new Promise((r) => setTimeout(r, 10));
  }

  const stSvc = w.SparkleanQuoteIntake._test.getState();
  assert(stSvc.currentId === "serviceCategory", `${label}: on serviceCategory`);
  assert(/Step 5 of 5/i.test(stSvc.progressText), `${label}: Step 5 of 5 only when paid total is 5 (${stSvc.progressText})`);
  assert(stSvc.nextText === "Send request", `${label}: Send request only on final paid step`);

  const opt = w.document.querySelector('.sq-intake__opt[data-value="residential"]');
  assert(!!opt, `${label}: residential option`);
  opt.click();
  w.document.querySelector("[data-intake-next]").click();
  await new Promise((r) => setTimeout(r, 50));

  const stDone = w.SparkleanQuoteIntake._test.getState();
  assert(stDone.leadDelivered === true, `${label}: lead delivered after Brevo-success mock`);
  assert(w.conversions.length === 1, `${label}: exactly one Google conversion after success`);
  assert(w.conversions[0].transaction_id === "lead-paid-test-1", `${label}: conversion transaction_id = leadId`);
  assert(w.conversions[0].send_to === w.SparkleanAds.SEND_TO, `${label}: conversion send_to matches Ads`);

  // Failure gating: reopen with failing fetch — complete again, expect zero new conversions
  w.conversions.length = 0;
  w.SparkleanQuoteIntake.close();
  w.fetch = async () => ({ ok: false, status: 500, text: async () => JSON.stringify({ error: "fail" }) });
  w.SparkleanQuoteIntake.open({ paid: true, sourceUrl: w.location.href });
  await new Promise((r) => setTimeout(r, 10));
  const failVals = ["Fail User", "2395550199", "fail@example.com", "33901"];
  for (let i = 0; i < 4; i++) {
    w.document.querySelector("[data-field]").value = failVals[i];
    w.document.querySelector("[data-intake-next]").click();
    await new Promise((r) => setTimeout(r, 8));
  }
  w.document.querySelector('.sq-intake__opt[data-value="residential"]').click();
  w.document.querySelector("[data-intake-next]").click();
  await new Promise((r) => setTimeout(r, 40));
  assert(w.conversions.length === 0, `${label}: no Google conversion on Brevo failure`);
  const stFail = w.SparkleanQuoteIntake._test.getState();
  assert(stFail.leadDelivered === false, `${label}: leadDelivered false on failure`);
}

await runPaidScenario("desktop", DESKTOP_UA);
await runPaidScenario("mobile", MOBILE_UA);

// Organic honesty + no early submit
{
  const w = makeWindow("https://www.sparklean.co/residential-cleaning", DESKTOP_UA);
  w.SparkleanQuoteIntake.open({ paid: false, sourceUrl: w.location.href });
  await new Promise((r) => setTimeout(r, 10));
  const vals = ["Test User", "2395550100", "a@b.co", "Naples"];
  for (let i = 0; i < 4; i++) {
    w.document.querySelector("[data-field]").value = vals[i];
    w.document.querySelector("[data-intake-next]").click();
    await new Promise((r) => setTimeout(r, 8));
  }
  const st = w.SparkleanQuoteIntake._test.getState();
  assert(st.currentId === "serviceCategory", "organic: on serviceCategory");
  assert(st.nextText === "Continue", `organic: Continue not Send request before expand (got ${st.nextText})`);
  assert(!/Step 5 of 5/i.test(st.progressText), `organic: must not show Step 5 of 5 before expand (got ${st.progressText})`);
  w.document.querySelector('.sq-intake__opt[data-value="residential"]').click();
  w.document.querySelector("[data-intake-next]").click();
  await new Promise((r) => setTimeout(r, 15));
  const st2 = w.SparkleanQuoteIntake._test.getState();
  assert(st2.stepsLen > 5, `organic: expands past 5 after service (got ${st2.stepsLen})`);
  assert(st2.leadDelivered === false, "organic: does not submit on service selection");
}

// customer-portal Get a Quote opens intake
{
  const w = makeWindow("https://www.sparklean.co/customer-portal", DESKTOP_UA);
  assert(!!w.SparkleanQuoteIntake && typeof w.SparkleanQuoteIntake.open === "function", "portal: SparkleanQuoteIntake available");
  const a = w.document.querySelector("a.nav-btn");
  assert(a && a.hasAttribute("data-sparklean-intake"), "portal: nav-btn has data-sparklean-intake");
  // JSDOM navigates on <a href> even when listeners call preventDefault; open via API to prove wiring.
  w.SparkleanQuoteIntake.open({ sourceUrl: w.location.href });
  await new Promise((r) => setTimeout(r, 10));
  const root = w.document.getElementById("sparklean-quote-intake");
  assert(!!root && !root.hasAttribute("hidden"), "portal: Get a Quote opens intake");
  assert(!!w.SparkleanQuoteFlows && !!w.SparkleanQuoteFlows.flows, "portal: serviceFlows available");
}

if (failed) {
  console.error(`\n${failed} FAILED`);
  process.exit(1);
}
console.log("\nALL PAID INTAKE FUNNEL TESTS PASSED");
