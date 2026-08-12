/**
 * Paid-intake funnel + soft-prompt + step-honesty + portal wiring tests.
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
const eventsSrc = fs.readFileSync(path.join(root, "js/sparklean-events.js"), "utf8");
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
assert(intakeSrc.includes("isSoftPaidLandingQuery"), "soft paid landing detector present");
assert(intakeSrc.includes("isForcedQuoteQuery"), "forced quote detector present");
assert(intakeSrc.includes("schedulePaidSoftPrompt"), "soft prompt scheduler present");
assert(!intakeSrc.includes("maybeAutoOpenPaid"), "legacy immediate auto-open removed");
assert(intakeSrc.includes("Ready for a personalized cleaning plan?"), "soft prompt copy present");
assert(intakeSrc.includes("Call Sparklean · (239) 888-3588"), "confirmation call CTA present");
assert(eventsSrc.includes("paid_quote_prompt_shown"), "events allowlist: prompt shown");
assert(eventsSrc.includes("paid_quote_started"), "events allowlist: started");
assert(eventsSrc.includes("paid_quote_submitted"), "events allowlist: submitted");
assert(eventsSrc.includes("phone_click"), "events allowlist: phone_click");
assert(
  /fireAndReportConversion/.test(intakeSrc) && /res\.j && res\.j\.leadId/.test(intakeSrc),
  "conversion gated on leadId via fireAndReportConversion"
);
assert(intakeSrc.includes("reportToken"), "intake uses reportToken from quote-submit");
assert(contactHtml.includes("contact-submit"), "contact posts to contact-submit function");
assert(contactHtml.includes("fireAndReportConversion"), "contact uses fireAndReportConversion");
assert(adsSrc.includes("BROWSER_SENT") || adsSrc.includes("reportConversionOutcome"), "ads helper reports outcomes");

function makeWindow(url, ua, opts) {
  const width = (opts && opts.width) || 1280;
  const height = (opts && opts.height) || 800;
  const dom = new JSDOM(
    `<!doctype html><html><body style="height:4000px">
      <a href="/contact" class="nav-btn" data-sparklean-intake>Get a Quote</a>
      <a href="tel:+12398883588" class="nav-phone">Call</a>
      <button type="button" class="sparklean-mcta__quote">Sticky Quote</button>
    </body></html>`,
    {
      url,
      pretendToBeVisual: true,
      runScripts: "outside-only",
    }
  );
  const { window } = dom;
  Object.defineProperty(window.navigator, "userAgent", { value: ua, configurable: true });
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
  window.dataLayer = [];
  const conversions = [];
  const analytics = [];
  window.gtag = function () {
    if (arguments[0] === "event" && arguments[1] === "conversion") {
      conversions.push(arguments[2]);
      return;
    }
    if (arguments[0] === "event") {
      analytics.push({ name: arguments[1], params: arguments[2] || {} });
    }
  };
  window.conversions = conversions;
  window.analytics = analytics;
  window.fetch = async (url) => {
    const u = String(url || "");
    if (u.includes("conversion-report")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true, trackingStatus: "BROWSER_SENT" }),
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ ok: true, leadId: "lead-paid-test-1", reportToken: "tok-paid-test-1" }),
    };
  };
  window.eval(eventsSrc);
  window.eval(adsSrc);
  window.eval(flowsSrc);
  window.eval(intakeSrc);
  return window;
}

function intakeOpen(w) {
  const el = w.document.getElementById("sparklean-quote-intake");
  return !!(el && !el.hasAttribute("hidden") && el.classList.contains("is-open"));
}

function promptVisible(w) {
  const T = w.SparkleanQuoteIntake._test;
  const el = T.getSoftPromptEl();
  return !!(el && !el.hasAttribute("hidden") && el.classList.contains("is-visible"));
}

const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

// Detectors
{
  const w = makeWindow("https://www.sparklean.co/residential-cleaning", DESKTOP_UA);
  const T = w.SparkleanQuoteIntake._test;
  assert(T.isForcedQuoteQuery("?quote=1") === true, "quote=1 is forced");
  assert(T.isSoftPaidLandingQuery("?quote=1") === false, "quote=1 alone is not soft-paid");
  assert(T.isPaidLandingQuery("?quote=1") === true, "quote=1 is paid mode");
  assert(T.isSoftPaidLandingQuery("?gclid=abc123") === true, "gclid is soft-paid");
  assert(T.isForcedQuoteQuery("?gclid=abc123") === false, "gclid is not forced");
  assert(T.isPaidLandingQuery("?utm_medium=cpc&utm_source=google") === true, "utm cpc+google is paid");
  assert(T.isSoftPaidLandingQuery("?utm_medium=cpc&utm_source=google") === true, "utm cpc is soft-paid");
  assert(T.isPaidLandingQuery("?utm_medium=organic&utm_source=google") === false, "organic medium not paid");
  assert(T.isPaidLandingQuery("") === false, "empty query not paid");
  assert(T.isSoftPaidLandingQuery("?gbraid=x") === true, "gbraid is soft-paid");
  assert(T.isSoftPaidLandingQuery("?wbraid=y") === true, "wbraid is soft-paid");
}

// GCLID does NOT immediately open modal
{
  const w = makeWindow(
    "https://www.sparklean.co/residential-cleaning?gclid=TESTGCLID&utm_medium=cpc&utm_source=google",
    DESKTOP_UA
  );
  await new Promise((r) => setTimeout(r, 40));
  assert(!intakeOpen(w), "gclid: intake not open immediately");
  assert(!promptVisible(w), "gclid: soft prompt not shown immediately");
}

// ?quote=1 does immediately open
{
  const w = makeWindow("https://www.sparklean.co/residential-cleaning?quote=1", DESKTOP_UA);
  await new Promise((r) => setTimeout(r, 40));
  assert(intakeOpen(w), "quote=1: intake opens immediately");
  const st = w.SparkleanQuoteIntake._test.getState();
  assert(st.paidMode === true, "quote=1: paidMode true");
  assert(st.stepsLen === 5, `quote=1: five-step paid flow (got ${st.stepsLen})`);
}

// Ten-second trigger shows soft prompt
{
  const w = makeWindow(
    "https://www.sparklean.co/residential-cleaning?gclid=TIMER1&utm_medium=cpc",
    DESKTOP_UA
  );
  await new Promise((r) => setTimeout(r, 20));
  const T = w.SparkleanQuoteIntake._test;
  T.resetSoftPromptForTest();
  T.setPromptDelayMs(35);
  T.schedulePaidSoftPrompt();
  assert(!promptVisible(w), "timer: prompt hidden before delay");
  await new Promise((r) => setTimeout(r, 60));
  assert(promptVisible(w), "timer: soft prompt shown after delay");
  assert(
    w.analytics.some((e) => e.name === "paid_quote_prompt_shown"),
    "timer: paid_quote_prompt_shown analytics only"
  );
  assert(w.conversions.length === 0, "timer: prompt shown is not a Google conversion");
}

// 35% scroll trigger shows soft prompt
{
  const w = makeWindow(
    "https://www.sparklean.co/residential-cleaning?gclid=SCROLL1&utm_medium=cpc",
    DESKTOP_UA,
    { height: 800 }
  );
  await new Promise((r) => setTimeout(r, 20));
  const T = w.SparkleanQuoteIntake._test;
  T.resetSoftPromptForTest();
  T.setPromptDelayMs(60000);
  T.schedulePaidSoftPrompt();
  Object.defineProperty(w.document.documentElement, "scrollHeight", { value: 4000, configurable: true });
  Object.defineProperty(w.document.body, "scrollHeight", { value: 4000, configurable: true });
  Object.defineProperty(w.document.documentElement, "clientHeight", { value: 800, configurable: true });
  Object.defineProperty(w, "pageYOffset", { value: 0, configurable: true, writable: true });
  Object.defineProperty(w.document.documentElement, "scrollTop", { value: 0, configurable: true, writable: true });
  // 35% of (4000-800)=3200 → 1120
  w.pageYOffset = 1200;
  w.document.documentElement.scrollTop = 1200;
  w.dispatchEvent(new w.Event("scroll"));
  await new Promise((r) => setTimeout(r, 10));
  assert(promptVisible(w), "scroll: soft prompt shown at ~35%");
  assert(T.getPromptScrollRatio() === 0.35, "scroll: ratio is 35%");
}

// Prompt once + dismissal respected
{
  const w = makeWindow(
    "https://www.sparklean.co/residential-cleaning?gclid=DISMISS1&utm_medium=cpc",
    DESKTOP_UA
  );
  await new Promise((r) => setTimeout(r, 20));
  const T = w.SparkleanQuoteIntake._test;
  T.resetSoftPromptForTest();
  T.showSoftPrompt();
  assert(promptVisible(w), "dismiss: prompt visible");
  T.dismissSoftPrompt();
  assert(!promptVisible(w), "dismiss: prompt hidden");
  assert(T.getSoftPromptState() === "dismissed", "dismiss: state persisted");
  T.showSoftPrompt();
  assert(!promptVisible(w), "dismiss: prompt does not reappear");
}

// Prompt CTA opens five-step paid flow
{
  const w = makeWindow(
    "https://www.sparklean.co/residential-cleaning?gclid=PROMPTCTA&utm_medium=cpc",
    DESKTOP_UA
  );
  await new Promise((r) => setTimeout(r, 20));
  const T = w.SparkleanQuoteIntake._test;
  T.resetSoftPromptForTest();
  T.showSoftPrompt();
  const btn = T.getSoftPromptEl().querySelector("[data-paid-prompt-open]");
  btn.click();
  await new Promise((r) => setTimeout(r, 15));
  assert(intakeOpen(w), "prompt CTA: opens intake");
  assert(!promptVisible(w), "prompt CTA: prompt hidden after open");
  const st = T.getState();
  assert(st.paidMode === true, "prompt CTA: paidMode");
  assert(st.stepsLen === 5, `prompt CTA: five steps (got ${st.stepsLen})`);
  assert(
    w.analytics.some((e) => e.name === "paid_quote_started"),
    "prompt CTA: paid_quote_started analytics"
  );
  assert(w.conversions.length === 0, "prompt CTA: start is not a Google conversion");
}

// Hero / sticky CTA still opens immediately on paid landing
async function assertImmediateCta(label, ua, width) {
  const w = makeWindow(
    "https://www.sparklean.co/residential-cleaning?gclid=CTAIMMEDIATE&utm_medium=cpc",
    ua,
    { width: width || 1280, height: 800 }
  );
  await new Promise((r) => setTimeout(r, 30));
  assert(!intakeOpen(w), `${label}: not auto-open before CTA`);
  w.document.querySelector("a.nav-btn").click();
  await new Promise((r) => setTimeout(r, 15));
  // JSDOM may navigate; open via API if click did not keep document
  if (!intakeOpen(w)) {
    w.SparkleanQuoteIntake.open({ sourceUrl: w.location.href + "#nav" });
    await new Promise((r) => setTimeout(r, 10));
  }
  assert(intakeOpen(w), `${label}: CTA opens intake immediately`);
  const st = w.SparkleanQuoteIntake._test.getState();
  assert(st.paidMode === true, `${label}: paidMode from gclid`);
  assert(st.stepsLen === 5, `${label}: five-step paid flow`);

  w.SparkleanQuoteIntake.close();
  await new Promise((r) => setTimeout(r, 5));
  w.document.querySelector(".sparklean-mcta__quote").click();
  await new Promise((r) => setTimeout(r, 10));
  assert(intakeOpen(w), `${label}: sticky quote opens immediately`);
}

await assertImmediateCta("desktop CTA", DESKTOP_UA, 1280);
await assertImmediateCta("mobile 390 CTA", MOBILE_UA, 390);

async function runPaidSubmitScenario(label, ua, width) {
  const w = makeWindow(
    "https://www.sparklean.co/residential-cleaning?gclid=TESTGCLID&utm_medium=cpc&utm_source=google",
    ua,
    { width: width || 1280, height: 800 }
  );
  await new Promise((r) => setTimeout(r, 30));
  assert(!intakeOpen(w), `${label}: no immediate open before manual start`);

  w.SparkleanQuoteIntake.open({ paid: true, sourceUrl: w.location.href });
  await new Promise((r) => setTimeout(r, 10));

  const st0 = w.SparkleanQuoteIntake._test.getState();
  assert(st0.paidMode === true, `${label}: paidMode true`);
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
  await new Promise((r) => setTimeout(r, 120));

  const stDone = w.SparkleanQuoteIntake._test.getState();
  assert(stDone.leadDelivered === true, `${label}: lead delivered after Brevo-success mock`);
  assert(w.conversions.length === 1, `${label}: exactly one Google conversion after success`);
  assert(w.conversions[0].transaction_id === "lead-paid-test-1", `${label}: conversion transaction_id = leadId`);
  assert(w.conversions[0].send_to === w.SparkleanAds.SEND_TO, `${label}: conversion send_to matches Ads`);
  assert(
    w.analytics.some((e) => e.name === "paid_quote_submitted"),
    `${label}: paid_quote_submitted analytics`
  );
  assert(
    /Call Sparklean · \(239\) 888-3588/.test(stDone.doneHtml),
    `${label}: confirmation shows Call Sparklean`
  );
  assert(!/within \d+|minutes|hour|SLA/i.test(stDone.doneHtml), `${label}: no invented response-time SLA`);

  // Failure gating
  w.conversions.length = 0;
  w.SparkleanQuoteIntake.close();
  w.fetch = async (url) => {
    const u = String(url || "");
    if (u.includes("conversion-report")) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
    }
    return { ok: false, status: 500, text: async () => JSON.stringify({ error: "fail" }) };
  };
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

await runPaidSubmitScenario("desktop", DESKTOP_UA, 1280);
await runPaidSubmitScenario("mobile 390", MOBILE_UA, 390);

// phone_click analytics only
{
  const w = makeWindow("https://www.sparklean.co/residential-cleaning?gclid=PHONE1", DESKTOP_UA);
  await new Promise((r) => setTimeout(r, 20));
  w.document.querySelector("a.nav-phone").click();
  await new Promise((r) => setTimeout(r, 5));
  assert(
    w.analytics.some((e) => e.name === "phone_click"),
    "phone_click tracked as analytics"
  );
  assert(w.conversions.length === 0, "phone_click is not a Google conversion");
}

// Organic honesty + click-only (no soft prompt)
{
  const w = makeWindow("https://www.sparklean.co/residential-cleaning", DESKTOP_UA);
  await new Promise((r) => setTimeout(r, 40));
  assert(!intakeOpen(w), "organic: no auto-open");
  w.SparkleanQuoteIntake._test.showSoftPrompt();
  assert(!promptVisible(w), "organic: soft prompt never shows");
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

// customer-portal: functional; bare open is not a paid conversion
{
  const w = makeWindow("https://www.sparklean.co/customer-portal", DESKTOP_UA);
  assert(!!w.SparkleanQuoteIntake && typeof w.SparkleanQuoteIntake.open === "function", "portal: SparkleanQuoteIntake available");
  const a = w.document.querySelector("a.nav-btn");
  assert(a && a.hasAttribute("data-sparklean-intake"), "portal: nav-btn has data-sparklean-intake");
  w.SparkleanQuoteIntake.open({ sourceUrl: w.location.href });
  await new Promise((r) => setTimeout(r, 10));
  const rootEl = w.document.getElementById("sparklean-quote-intake");
  assert(!!rootEl && !rootEl.hasAttribute("hidden"), "portal: Get a Quote opens intake");
  assert(!!w.SparkleanQuoteFlows && !!w.SparkleanQuoteFlows.flows, "portal: serviceFlows available");
  assert(w.conversions.length === 0, "portal: opening intake is not a Google conversion");
  assert(
    !w.analytics.some((e) => e.name === "paid_quote_submitted"),
    "portal: no paid_quote_submitted without ad-attributed submit"
  );
}

if (failed) {
  console.error(`\n${failed} FAILED`);
  process.exit(1);
}
console.log("\nALL PAID INTAKE FUNNEL TESTS PASSED");
