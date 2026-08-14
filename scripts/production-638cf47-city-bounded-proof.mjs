/**
 * ONE bounded production lead proof from a city page after 638cf47 deploy.
 * Guided intake on /house-cleaning-naples + refresh no double-fire.
 * No Brevo force. No secrets in evidence. Max one new lead.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const BASE = process.env.PROD_BASE || "https://www.sparklean.co";
const SHA = "638cf4767d578bda1b2d7f1335707bf76b153b37";
const DEPLOY_ID = process.env.PROD_DEPLOY_ID || "6a7f62008af4ec4a666153c6";
const TEST_PATH = process.env.PROD_TEST_PATH || "/house-cleaning-naples";
const LABEL = "HnWnCJPRt9kcELDFqLc_";
const CONV_ID = "17027441328";
const OUT = path.resolve("docs/work-notes/2026-08-14-phase1-full-local-seo/prod-proof");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
fs.mkdirSync(OUT, { recursive: true });

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/g;
const TOKENISH_RE = /reportToken|BREVO_API_KEY|SPARKLEAN_RECONCILE_KEY|x-sparklean-reconcile-key/gi;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRESERVE_KEYS = new Set([
  "leadId",
  "transaction_id",
  "tid_param",
  "conversion_id_path",
  "label",
  "send_to",
  "firedLeadIds",
  "conversionId",
  "conversionLabel",
  "gclid",
]);

function sanitizeString(s) {
  let out = String(s || "");
  const shields = [];
  out = out.replace(/\bAW-\d+\/[A-Za-z0-9_-]+\b/g, (m) => {
    shields.push(m);
    return `__SHIELD_${shields.length - 1}__`;
  });
  out = out.replace(/\bAW-\d+\b/g, (m) => {
    shields.push(m);
    return `__SHIELD_${shields.length - 1}__`;
  });
  out = out.replace(/\b17027441328\b/g, (m) => {
    shields.push(m);
    return `__SHIELD_${shields.length - 1}__`;
  });
  out = out.replace(/\bHnWnCJPRt9kcELDFqLc_\b/g, (m) => {
    shields.push(m);
    return `__SHIELD_${shields.length - 1}__`;
  });
  out = out.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    (m) => {
      shields.push(m);
      return `__SHIELD_${shields.length - 1}__`;
    }
  );
  out = out
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(PHONE_RE, "[redacted-phone]")
    .replace(/CR Prod[^\n"]*/gi, "[redacted-name]")
    .replace(/"reportToken"\s*:\s*"[^"]*"/g, '"reportToken":"[redacted-token]"')
    .replace(TOKENISH_RE, "[redacted-secret-name]");
  for (let i = 0; i < shields.length; i++) out = out.split(`__SHIELD_${i}__`).join(shields[i]);
  return out;
}

function sanitizeDeep(v, key) {
  if (v == null) return v;
  if (typeof v === "string") {
    const k = String(key || "");
    if (key === "reportToken" || /(?:^|_)(?:token|secret|api[_-]?key|authorization)$/i.test(k)) {
      return v ? "[redacted-token]" : v;
    }
    if (PRESERVE_KEYS.has(k) || UUID_RE.test(v) || /^AW-\d+/.test(v) || v === LABEL || v === CONV_ID || /^CR-PROD-/.test(v)) {
      return v;
    }
    if (/email|phone|fullName|^name$|message|body/i.test(k)) return v ? "[redacted]" : v;
    return sanitizeString(v);
  }
  if (Array.isArray(v)) {
    if (key === "firedLeadIds") return v.map((x) => (typeof x === "string" ? x : sanitizeDeep(x)));
    return v.map((x) => sanitizeDeep(x));
  }
  if (typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = sanitizeDeep(val, k);
    return out;
  }
  return v;
}

function isGoogleish(url) {
  return /google|doubleclick|googlesyndication|googleadservices/i.test(String(url || ""));
}

function parseHit(req) {
  const url = req.url();
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { url: sanitizeString(url), method: req.method() };
  }
  const q = Object.fromEntries(parsed.searchParams.entries());
  const tidFromData = (() => {
    const data = String(q.data || "");
    const m = data.match(/transaction_id[=:]([^;,&]+)/i);
    return m ? decodeURIComponent(m[1]) : null;
  })();
  return {
    method: req.method(),
    host: parsed.hostname,
    pathname: parsed.pathname,
    en: q.en || null,
    data: q.data || null,
    label: q.label || null,
    transaction_id: q.transaction_id || q.oid || tidFromData || null,
    tid_param: q.tid || null,
    oid: q.oid || null,
    conversion_id_path: /\/(?:pagead\/)?conversion\/(\d+)/.test(parsed.pathname) ? RegExp.$1 : null,
    send_to: q.send_to || null,
  };
}

function isLeadConversionHit(hit) {
  const en = String(hit.en || "");
  const data = String(hit.data || "");
  const label = String(hit.label || "");
  const path = String(hit.pathname || "");
  const sendTo = String(hit.send_to || "");
  return (
    label.includes(LABEL) ||
    sendTo.includes(LABEL) ||
    en === "conversion" ||
    /event=conversion/.test(data) ||
    (/\/conversion\//.test(path) && (en === "conversion" || label.includes(LABEL) || path.includes(CONV_ID)))
  );
}

function classifyGoogleHits(hits) {
  const lead = hits.filter(isLeadConversionHit);
  const tids = lead.map((h) => h.transaction_id || h.tid_param || h.oid).filter(Boolean);
  const logical = tids.length ? new Set(tids).size : lead.length ? 1 : 0;
  const labels = [...new Set(lead.map((h) => h.label || h.send_to).filter(Boolean))];
  const convIds = [...new Set(lead.map((h) => h.conversion_id_path).filter(Boolean))];
  return {
    rawGoogleishCount: hits.length,
    leadConversionFanOutCount: lead.length,
    logicalLeadConversionCount: logical,
    conversionLabelsSeen: labels,
    conversionIdsSeen: convIds,
    leadConversionHits: lead,
  };
}

function attach(page, bucket) {
  page.on("request", (req) => {
    const url = req.url();
    if (isGoogleish(url) && /conversion|pagead|ccm|rmkt|doubleclick|googleadservices/i.test(url)) {
      bucket.google.push(parseHit(req));
    }
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (!/\/\.netlify\/functions\/(contact-submit|quote-submit|conversion-report)/.test(url)) return;
    let body = "";
    try {
      body = await res.text();
    } catch {
      body = "";
    }
    let j = {};
    try {
      j = body ? JSON.parse(body) : {};
    } catch {
      j = { parseError: true };
    }
    const fn = url.split("/").pop().split("?")[0];
    bucket.functions.push(
      sanitizeDeep({
        fn,
        status: res.status(),
        ok: j.ok === true,
        leadId: j.leadId || null,
        trackingStatus: j.trackingStatus || null,
        code: j.code || null,
        hasReportToken: Boolean(j.reportToken),
        errorPresent: Boolean(j.error),
        gclid: j.gclid || j.campaign?.gclid || null,
      })
    );
  });
}

async function waitGtag(page, ms = 10000) {
  try {
    await page.waitForFunction(() => typeof window.gtag === "function", { timeout: ms });
    return true;
  } catch {
    return false;
  }
}

function pickFn(bucket, name) {
  return (bucket.functions || []).filter((f) => f.fn === name);
}

async function waitDurableBrowserSent(page, bucket, { timeoutMs = 45000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const reports = pickFn(bucket, "conversion-report");
    const hit = reports.find((f) => f.ok && f.trackingStatus === "BROWSER_SENT");
    if (hit) return hit;
    await page.waitForTimeout(400);
  }
  return null;
}

async function completePaidIntake(page) {
  const next = page.locator("[data-intake-next]");
  await page.waitForSelector(".sq-intake.is-open, .sq-intake__input, .sq-intake__opt", { timeout: 20000 });
  await page.waitForTimeout(300);
  await page.fill(".sq-intake__input", "CR Prod City");
  await next.click();
  await page.waitForTimeout(250);
  await page.fill(".sq-intake__input", "(239) 555-0141");
  await next.click();
  await page.waitForTimeout(250);
  await page.fill(".sq-intake__input", `prod.cr.city.${Date.now()}@sparklean.co`);
  await next.click();
  await page.waitForTimeout(250);
  await page.fill(".sq-intake__input", "34102");
  await next.click();
  await page.waitForTimeout(400);
  const opt = page.locator('.sq-intake__opt[data-value="residential"]');
  await opt.waitFor({ state: "visible", timeout: 15000 });
  await opt.click();
  await page.waitForTimeout(200);
  await next.click();
}

const evidence = {
  productSha: SHA,
  deployId: DEPLOY_ID,
  productionUrl: BASE,
  testedPage: TEST_PATH,
  startedAt: new Date().toISOString(),
  constraints: {
    maxNewLeads: 1,
    noSeoChanges: true,
    noBrevoForce: true,
    noAdsConsoleChanges: true,
    noSecretsInEvidence: true,
  },
  steps: {},
};

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SparkleanCRProd/638cf47",
  });
  const page = await context.newPage();
  const bucket = { google: [], functions: [] };
  attach(page, bucket);

  const gclid = `CR-PROD-638cf47-city`;
  const utm = `utm_source=google&utm_medium=cpc&utm_campaign=cr-prod-638cf47&utm_content=city-naples`;
  await page.goto(`${BASE}${TEST_PATH}?quote=1&gclid=${encodeURIComponent(gclid)}&${utm}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // UI presence checks (branding/CTAs)
  const ui = await page.evaluate(() => {
    const paid = document.getElementById("paid-match");
    const cost = document.getElementById("cost-factors");
    const tels = [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute("href"));
    return {
      title: document.title,
      h1: document.querySelector("h1")?.innerText?.replace(/\s+/g, " ").trim() || null,
      paidMatchVisible: Boolean(paid),
      costFactorsPresent: Boolean(cost),
      telHrefs: tels,
      quoteCtaTextPresent: /personalized recurring-cleaning quote/i.test(document.body.innerText),
    };
  });
  evidence.steps.uiSnapshot = sanitizeDeep(ui);

  const gtagReady = await waitGtag(page);
  await page.waitForSelector("[data-intake-next]", { timeout: 20000 });
  const intakeOpen = await page.locator(".sq-intake.is-open").count();
  const quoteWait = page.waitForResponse(
    (r) => /quote-submit/.test(r.url()) && r.request().method() === "POST",
    { timeout: 60000 }
  );
  await completePaidIntake(page);
  const quoteRes = await quoteWait;
  let quoteBody = {};
  try {
    quoteBody = await quoteRes.json();
  } catch {
    quoteBody = { parseError: true };
  }
  bucket.functions.push(
    sanitizeDeep({
      fn: "quote-submit",
      status: quoteRes.status(),
      ok: quoteBody.ok === true,
      leadId: quoteBody.leadId || null,
      trackingStatus: quoteBody.trackingStatus || null,
      code: quoteBody.code || null,
      hasReportToken: Boolean(quoteBody.reportToken),
      errorPresent: Boolean(quoteBody.error),
      gclid: quoteBody.gclid || quoteBody.campaign?.gclid || null,
      source: "waitForResponse",
    })
  );
  await waitDurableBrowserSent(page, bucket, { timeoutMs: 45000 });
  await page.waitForTimeout(1000);

  const doneTextPresent = (await page.locator(".sq-intake__done").count()) > 0;
  const delayed = await page.locator(".sparklean-tracking-delayed").count();
  const intakeErr = await page.locator("[data-intake-error]").innerText().catch(() => "");
  const firedAfterSubmit = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem("sparklean_ads_conv_lead_ids") || "[]");
    } catch {
      return [];
    }
  });
  const quoteFns = pickFn(bucket, "quote-submit");
  const reportFns = pickFn(bucket, "conversion-report");
  const googleAfterSubmit = classifyGoogleHits(bucket.google);
  const leadId =
    quoteBody.leadId || (quoteFns.find((f) => f.leadId) || {}).leadId || null;
  evidence.steps.quoteSubmitDirect = sanitizeDeep({
    status: quoteRes.status(),
    ok: quoteBody.ok === true,
    leadId: quoteBody.leadId || null,
    hasReportToken: Boolean(quoteBody.reportToken),
    code: quoteBody.code || null,
    errorPresent: Boolean(quoteBody.error),
    intakeOpenAtStart: intakeOpen > 0,
    intakeErrorText: intakeErr || null,
  });
  const storedGclid = await page.evaluate(() => {
    try {
      return window.SparkleanAttribution?.getStoredAdClickIds?.()?.gclid || null;
    } catch {
      return null;
    }
  });

  evidence.steps.cityIntake = sanitizeDeep({
    gtagReady,
    doneTextPresent,
    delayedNoteCount: delayed,
    leadAccepted: quoteFns.some((f) => f.status === 200 && f.ok && f.leadId),
    leadId,
    gclidExpected: gclid,
    gclidStored: storedGclid,
    attributionPreserved: storedGclid === gclid,
    hasReportTokenOnce: quoteFns.some((f) => f.hasReportToken),
    conversionReport: reportFns.map((f) => ({
      status: f.status,
      ok: f.ok,
      trackingStatus: f.trackingStatus,
    })),
    finalDurableTrackingStatus:
      (reportFns.find((f) => f.trackingStatus === "BROWSER_SENT") || reportFns.find((f) => f.trackingStatus) || {})
        .trackingStatus || null,
    google: googleAfterSubmit,
    firedLeadIds: firedAfterSubmit,
    transactionIdMatchesLeadUuid: googleAfterSubmit.leadConversionHits.some(
      (h) => (h.transaction_id || h.tid_param) && leadId && (h.transaction_id === leadId || h.tid_param === leadId)
    ),
    correctConversionId:
      googleAfterSubmit.conversionIdsSeen.includes(CONV_ID) ||
      googleAfterSubmit.leadConversionHits.some((h) => String(h.send_to || "").includes(`AW-${CONV_ID}`)),
    correctConversionLabel:
      googleAfterSubmit.conversionLabelsSeen.some((x) => String(x).includes(LABEL)) ||
      googleAfterSubmit.leadConversionHits.some((h) => String(h.send_to || "").includes(LABEL)),
  });

  // Refresh / revisit completion — must NOT fire another conversion
  const googleCountBeforeRefresh = bucket.google.length;
  const reportCountBeforeRefresh = reportFns.length;
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);
  const googleAfterRefresh = classifyGoogleHits(bucket.google.slice(googleCountBeforeRefresh));
  const reportAfterRefresh = pickFn(bucket, "conversion-report").slice(reportCountBeforeRefresh);
  const firedAfterRefresh = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem("sparklean_ads_conv_lead_ids") || "[]");
    } catch {
      return [];
    }
  });

  evidence.steps.refreshNoDoubleFire = sanitizeDeep({
    newLogicalLeadConversions: googleAfterRefresh.logicalLeadConversionCount,
    newLeadConversionFanOut: googleAfterRefresh.leadConversionFanOutCount,
    newConversionReports: reportAfterRefresh.length,
    firedLeadIdsAfterRefresh: firedAfterRefresh,
    pass:
      googleAfterRefresh.logicalLeadConversionCount === 0 &&
      reportAfterRefresh.filter((r) => r.trackingStatus === "BROWSER_SENT").length === 0,
  });

  await context.close();
} catch (e) {
  evidence.runError = sanitizeString(String(e && e.stack ? e.stack : e));
} finally {
  await browser.close();
}

evidence.finishedAt = new Date().toISOString();
const step = evidence.steps.cityIntake || {};
evidence.acceptance = {
  durableLead: step.leadAccepted === true && Boolean(step.leadId),
  brevoPathAccepted: step.leadAccepted === true,
  exactlyOneLogicalGoogleConversion: step.google?.logicalLeadConversionCount === 1,
  correctConversionId: step.correctConversionId === true,
  correctConversionLabel: step.correctConversionLabel === true,
  transactionIdEqualsLeadUuid: step.transactionIdMatchesLeadUuid === true,
  attributionPreserved: step.attributionPreserved === true,
  durableBrowserSent: step.finalDurableTrackingStatus === "BROWSER_SENT",
  refreshNoSecondConversion: evidence.steps.refreshNoDoubleFire?.pass === true,
};
evidence.acceptance.allRequired = Object.values(evidence.acceptance).every(Boolean);

const jsonPath = path.join(OUT, `${STAMP}-sanitized-evidence.json`);
fs.writeFileSync(jsonPath, JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    {
      jsonPath,
      leadId: step.leadId || null,
      acceptance: evidence.acceptance,
      runError: evidence.runError || null,
    },
    null,
    2
  )
);
