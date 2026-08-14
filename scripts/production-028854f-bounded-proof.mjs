/**
 * Bounded production proofs after 028854f deploy.
 * Desktop contact, mobile contact, guided intake only.
 * No Brevo force, no secret output.
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const BASE = process.env.PROD_BASE || "https://www.sparklean.co";
const SHA = process.env.PROD_SHA || "028854f4b6f83ad6385fe3c2628d0e02ec1f3a88";
const DEPLOY_ID = process.env.PROD_DEPLOY_ID || "";
const LABEL = "HnWnCJPRt9kcELDFqLc_";
const CONV_ID = "17027441328";
const OUT = path.resolve("docs/work-notes/2026-08-14-production-028854f-proofs");
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
    if (PRESERVE_KEYS.has(k) || UUID_RE.test(v) || /^AW-\d+/.test(v) || v === LABEL || v === CONV_ID) {
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
    // gtag transaction_id is often mirrored as oid on googleadservices conversion hits
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
  return {
    rawGoogleishCount: hits.length,
    leadConversionFanOutCount: lead.length,
    logicalLeadConversionCount: logical,
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

async function fillContact(page, tag) {
  await page.fill("#cf-name", `CR Prod ${tag}`);
  await page.fill("#cf-phone", "2395550140");
  await page.fill("#cf-email", `prod.cr.${tag}.${Date.now()}@sparklean.co`);
  await page.selectOption("#cf-property", "house");
  await page.fill("#cf-service", "Control Room production proof — ignore");
  await page.fill("#cf-city", "Naples");
  await page.selectOption("#cf-timing", "flexible");
  await page.fill("#cf-msg", `Ignore prod proof ${tag}`);
  await page.check("#cf-consent-required");
}

async function completePaidIntake(page) {
  const next = page.locator("[data-intake-next]");
  await page.waitForSelector(".sq-intake__input, .sq-intake__opt", { timeout: 20000 });
  await page.fill(".sq-intake__input", "CR Prod Intake");
  await next.click();
  await page.waitForTimeout(150);
  await page.fill(".sq-intake__input", "2395550141");
  await next.click();
  await page.waitForTimeout(150);
  await page.fill(".sq-intake__input", `prod.cr.intake.${Date.now()}@sparklean.co`);
  await next.click();
  await page.waitForTimeout(150);
  await page.fill(".sq-intake__input", "34102");
  await next.click();
  await page.waitForTimeout(200);
  await page.locator('.sq-intake__opt[data-value="residential"]').click();
  await next.click();
}

async function runContact(context, tag, viewport) {
  const page = await context.newPage();
  const bucket = { google: [], functions: [] };
  attach(page, bucket);
  const gclid = `CR-PROD-${SHA.slice(0, 7)}-${tag}`;
  await page.goto(`${BASE}/contact?gclid=${encodeURIComponent(gclid)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const gtagReady = await waitGtag(page);
  await fillContact(page, tag);
  await Promise.all([
    page.waitForResponse((r) => /contact-submit/.test(r.url()) && r.request().method() === "POST", {
      timeout: 60000,
    }),
    page.click(".cp-submit"),
  ]);
  await waitDurableBrowserSent(page, bucket, { timeoutMs: 45000 });
  await page.waitForTimeout(800);
  const thanks = await page.locator("#cp-thanks").isVisible().catch(() => false);
  const formError = await page.locator("#cp-form-error").innerText().catch(() => "");
  const fired = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem("sparklean_ads_conv_lead_ids") || "[]");
    } catch {
      return [];
    }
  });
  const contactFns = pickFn(bucket, "contact-submit");
  const reportFns = pickFn(bucket, "conversion-report");
  const google = classifyGoogleHits(bucket.google);
  const leadId = (contactFns.find((f) => f.leadId) || {}).leadId || null;
  const tidMatch = google.leadConversionHits.some(
    (h) => (h.transaction_id || h.tid_param) && leadId && (h.transaction_id === leadId || h.tid_param === leadId)
  );
  const result = {
    viewport,
    tag,
    gtagReady,
    thanksVisible: thanks,
    formErrorPresent: Boolean(formError && formError.trim()),
    leadAccepted: contactFns.some((f) => f.status === 200 && f.ok && f.leadId),
    leadId,
    hasReportTokenOnce: contactFns.some((f) => f.hasReportToken),
    conversionReport: reportFns.map((f) => ({
      status: f.status,
      ok: f.ok,
      trackingStatus: f.trackingStatus,
    })),
    finalDurableTrackingStatus:
      (reportFns.find((f) => f.trackingStatus === "BROWSER_SENT") || reportFns.find((f) => f.trackingStatus) || {})
        .trackingStatus || null,
    google,
    firedLeadIds: fired,
    transactionIdMatchesLeadUuid: tidMatch,
    googleAdsUiRecording: "CHECKED_SEPARATELY",
  };
  await page.close();
  return sanitizeDeep(result);
}

async function runIntake(context, tag, viewport) {
  const page = await context.newPage();
  const bucket = { google: [], functions: [] };
  attach(page, bucket);
  const gclid = `CR-PROD-INTAKE-${tag}`;
  await page.goto(`${BASE}/residential-cleaning?quote=1&gclid=${encodeURIComponent(gclid)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const gtagReady = await waitGtag(page);
  await page.waitForSelector("[data-intake-next]", { timeout: 20000 });
  const quoteWait = page.waitForResponse(
    (r) => /quote-submit/.test(r.url()) && r.request().method() === "POST",
    { timeout: 60000 }
  );
  await completePaidIntake(page);
  await quoteWait;
  await waitDurableBrowserSent(page, bucket, { timeoutMs: 45000 });
  await page.waitForTimeout(800);
  const doneTextPresent = (await page.locator(".sq-intake__done").count()) > 0;
  const delayed = await page.locator(".sparklean-tracking-delayed").count();
  const errPresent = Boolean((await page.locator("[data-intake-error]").innerText().catch(() => "")).trim());
  const fired = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem("sparklean_ads_conv_lead_ids") || "[]");
    } catch {
      return [];
    }
  });
  const quoteFns = pickFn(bucket, "quote-submit");
  const reportFns = pickFn(bucket, "conversion-report");
  const google = classifyGoogleHits(bucket.google);
  const leadId = (quoteFns.find((f) => f.leadId) || {}).leadId || null;
  const tidMatch = google.leadConversionHits.some(
    (h) => (h.transaction_id || h.tid_param) && leadId && (h.transaction_id === leadId || h.tid_param === leadId)
  );
  const result = {
    viewport,
    tag,
    gtagReady,
    doneTextPresent,
    delayedNoteCount: delayed,
    intakeErrorPresent: errPresent,
    leadAccepted: quoteFns.some((f) => f.status === 200 && f.ok && f.leadId),
    leadId,
    hasReportTokenOnce: quoteFns.some((f) => f.hasReportToken),
    conversionReport: reportFns.map((f) => ({
      status: f.status,
      ok: f.ok,
      trackingStatus: f.trackingStatus,
    })),
    finalDurableTrackingStatus:
      (reportFns.find((f) => f.trackingStatus === "BROWSER_SENT") || reportFns.find((f) => f.trackingStatus) || {})
        .trackingStatus || null,
    google,
    firedLeadIds: fired,
    transactionIdMatchesLeadUuid: tidMatch,
    acceptedOnlyIfTerminal: delayed === 0 && reportFns.some((f) => f.ok && f.trackingStatus === "BROWSER_SENT"),
    googleAdsUiRecording: "CHECKED_SEPARATELY",
  };
  await page.close();
  return sanitizeDeep(result);
}

const evidence = {
  productSha: SHA,
  deployId: DEPLOY_ID || null,
  productionUrl: BASE,
  startedAt: new Date().toISOString(),
  constraints: {
    noSeo: true,
    noBrevoForce: true,
    noSecretsInEvidence: true,
    noManufacturedPaidAdClick: true,
  },
  steps: {},
};

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SparkleanCRProd/1",
  });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 SparkleanCRProd/1",
  });
  evidence.steps.desktopContact = await runContact(desktop, "desktop", "desktop-1440");
  evidence.steps.mobileContact = await runContact(mobile, "mobile", "mobile-390");
  evidence.steps.guidedIntake = await runIntake(desktop, "intake", "desktop-1440");
  await desktop.close();
  await mobile.close();
} catch (e) {
  evidence.runError = sanitizeString(String(e && e.stack ? e.stack : e));
} finally {
  await browser.close();
}

evidence.finishedAt = new Date().toISOString();

function row(step) {
  if (!step) return null;
  return {
    leadAccepted: step.leadAccepted === true,
    leadId: step.leadId || null,
    brevoAcceptedPath: step.leadAccepted === true,
    logicalLeadConversionCount: step.google?.logicalLeadConversionCount ?? null,
    transactionIdMatchesLeadUuid: step.transactionIdMatchesLeadUuid === true,
    finalDurableTrackingStatus: step.finalDurableTrackingStatus,
    delayedNoteCount: step.delayedNoteCount ?? null,
    acceptedOnlyIfTerminal: step.acceptedOnlyIfTerminal ?? null,
  };
}

evidence.matrix = sanitizeDeep({
  desktopContact: row(evidence.steps.desktopContact),
  mobileContact: row(evidence.steps.mobileContact),
  guidedIntake: row(evidence.steps.guidedIntake),
});

evidence.acceptance = {
  desktopContact:
    evidence.steps.desktopContact?.leadAccepted === true &&
    evidence.steps.desktopContact?.finalDurableTrackingStatus === "BROWSER_SENT" &&
    evidence.steps.desktopContact?.google?.logicalLeadConversionCount === 1 &&
    evidence.steps.desktopContact?.transactionIdMatchesLeadUuid === true,
  mobileContact:
    evidence.steps.mobileContact?.leadAccepted === true &&
    evidence.steps.mobileContact?.finalDurableTrackingStatus === "BROWSER_SENT" &&
    evidence.steps.mobileContact?.google?.logicalLeadConversionCount === 1 &&
    evidence.steps.mobileContact?.transactionIdMatchesLeadUuid === true,
  guidedIntake:
    evidence.steps.guidedIntake?.leadAccepted === true &&
    evidence.steps.guidedIntake?.finalDurableTrackingStatus === "BROWSER_SENT" &&
    evidence.steps.guidedIntake?.delayedNoteCount === 0 &&
    evidence.steps.guidedIntake?.google?.logicalLeadConversionCount === 1 &&
    evidence.steps.guidedIntake?.transactionIdMatchesLeadUuid === true,
};
evidence.acceptance.allRequired = Object.values(evidence.acceptance).every(Boolean);

const jsonPath = path.join(OUT, `${STAMP}-sanitized-evidence.json`);
fs.writeFileSync(jsonPath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ jsonPath, acceptance: evidence.acceptance, matrix: evidence.matrix, runError: evidence.runError || null }, null, 2));
