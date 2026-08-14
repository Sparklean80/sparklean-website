/**
 * Control Room Priority-1 proofs on Deploy Preview (exact product SHA).
 * Sanitized evidence only — never writes reconcile keys, Brevo keys, reportTokens,
 * names, emails, phones, or message bodies.
 *
 * Env:
 *   PREVIEW_BASE (required)
 *   PREVIEW_SHA
 *   SPARKLEAN_RECONCILE_KEY (optional; never written to evidence)
 *   SPARKLEAN_PROOF_PHASE=all|core|consent|reconcile|brevo|brevo-restore
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { chromium } from "playwright";

const BASE = process.env.PREVIEW_BASE || "";
const SHA = process.env.PREVIEW_SHA || "";
const PHASE = process.env.SPARKLEAN_PROOF_PHASE || "all";
const LABEL = "HnWnCJPRt9kcELDFqLc_";
const CONV_ID = "17027441328";
const OUT = path.resolve(
  process.env.PROOF_OUT || "docs/work-notes/2026-08-14-control-room-consent-brevo-reconcile"
);
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");

if (!BASE) {
  console.error("PREVIEW_BASE required");
  process.exit(2);
}

fs.mkdirSync(OUT, { recursive: true });

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
/** Phone-like patterns; UUIDs / AW- ids / conversion ids are shielded before this runs. */
const PHONE_RE = /\+?\d[\d\s().-]{8,}\d/g;
const TOKENISH_RE = /reportToken|BREVO_API_KEY|SPARKLEAN_RECONCILE_KEY|x-sparklean-reconcile-key/gi;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Keys whose string values must stay for Ads verification. */
const PRESERVE_KEYS = new Set([
  "leadId",
  "transaction_id",
  "tid_param",
  "conversion_id_path",
  "label",
  "send_to",
  "SEND_TO",
  "firedLeadIds",
  "conversionId",
  "conversionLabel",
]);

function looksLikeUuid(s) {
  return UUID_RE.test(String(s || "").trim());
}

function sanitizeString(s) {
  let out = String(s || "");
  // Protect conversion identifiers from phone redaction
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
    .replace(/CR Preview[^\n"]*/gi, "[redacted-name]")
    .replace(/"reportToken"\s*:\s*"[^"]*"/g, '"reportToken":"[redacted-token]"')
    .replace(TOKENISH_RE, "[redacted-secret-name]");
  for (let i = 0; i < shields.length; i++) {
    out = out.split(`__SHIELD_${i}__`).join(shields[i]);
  }
  return out;
}

function sanitizeDeep(v, key) {
  if (v == null) return v;
  if (typeof v === "string") {
    const k = String(key || "");
    if (key === "reportToken" || /(?:^|_)(?:token|secret|api[_-]?key|authorization)$/i.test(k)) {
      return v ? "[redacted-token]" : v;
    }
    if (PRESERVE_KEYS.has(k) || looksLikeUuid(v) || /^AW-\d+/.test(v) || v === LABEL || v === CONV_ID) {
      return v;
    }
    if (/email|phone|fullName|^name$|message|body/i.test(k)) {
      return v ? "[redacted]" : v;
    }
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
    transaction_id: q.transaction_id || tidFromData || null,
    tid_param: q.tid || null,
    conversion_id_path: /\/(?:pagead\/)?conversion\/(\d+)/.test(parsed.pathname)
      ? RegExp.$1
      : null,
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
  const config = hits.filter((h) => h.en === "gtag.config" || /event=gtag\.config/.test(String(h.data || "")));
  const pageView = hits.filter((h) => h.en === "page_view");
  const other = hits.filter((h) => !lead.includes(h) && !config.includes(h) && !pageView.includes(h));
  const logical = new Set(
    lead.map((h) => `${h.transaction_id || h.tid_param || "none"}|${h.label || LABEL}`)
  ).size;
  return {
    rawGoogleishCount: hits.length,
    leadConversionFanOutCount: lead.length,
    logicalLeadConversionCount: lead.length ? Math.max(1, logical) : 0,
    leadConversionHits: lead,
    configOrPageViewCount: config.length + pageView.length,
    otherGoogleishCount: other.length,
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
    if (!/\/\.netlify\/functions\/(contact-submit|quote-submit|conversion-report|leads-reconcile)/.test(url)) {
      return;
    }
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
        idempotentReplay: j.idempotentReplay === true,
        hasReportToken: Boolean(j.reportToken),
        duplicate: j.duplicate === true,
        errorPresent: Boolean(j.error),
        deliveryFinality: j.deliveryFinality || null,
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

async function shot(page, name) {
  const p = path.join(OUT, `${STAMP}-${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  return path.basename(p);
}

async function fillContact(page, tag) {
  await page.fill("#cf-name", `CR Preview ${tag}`);
  await page.fill("#cf-phone", "2395550130");
  await page.fill("#cf-email", `preview.cr.reproof.${tag}.${Date.now()}@sparklean.co`);
  await page.selectOption("#cf-property", "house");
  await page.fill("#cf-service", "Control Room reproof — ignore");
  await page.fill("#cf-city", "Naples");
  await page.selectOption("#cf-timing", "flexible");
  await page.fill("#cf-msg", `Ignore reproof ${tag}`);
  await page.check("#cf-consent-required");
}

async function completePaidIntake(page) {
  const next = page.locator("[data-intake-next]");
  await page.waitForSelector(".sq-intake__input, .sq-intake__opt", { timeout: 20000 });
  await page.fill(".sq-intake__input", "CR Preview Intake");
  await next.click();
  await page.waitForTimeout(150);
  await page.fill(".sq-intake__input", "2395550131");
  await next.click();
  await page.waitForTimeout(150);
  await page.fill(".sq-intake__input", `preview.cr.intake.${Date.now()}@sparklean.co`);
  await next.click();
  await page.waitForTimeout(150);
  await page.fill(".sq-intake__input", "34102");
  await next.click();
  await page.waitForTimeout(200);
  await page.locator('.sq-intake__opt[data-value="residential"]').click();
  await next.click();
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

async function refreshBackForwardZero(page, bucket, label) {
  const before = classifyGoogleHits(bucket.google).leadConversionFanOutCount;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => null);
  await page.waitForTimeout(1200);
  await page.goForward({ waitUntil: "domcontentloaded" }).catch(() => null);
  await page.waitForTimeout(1200);
  const after = classifyGoogleHits(bucket.google).leadConversionFanOutCount;
  return {
    label,
    leadConversionFanOutBeforeNav: before,
    leadConversionFanOutAfterNav: after,
    additionalLeadConversionFanOut: Math.max(0, after - before),
  };
}

function consentInitScript(mode) {
  // mode: denied | granted | unresolved (no script)
  if (mode === "unresolved") return null;
  if (mode === "denied") {
    return () => {
      window.__sparkleanAdsConsent = "denied";
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        window.dataLayer.push(arguments);
      }
      window.gtag = window.gtag || gtag;
      gtag("consent", "default", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
        wait_for_update: 500,
      });
    };
  }
  if (mode === "granted") {
    return () => {
      window.__sparkleanAdsConsent = "granted";
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        window.dataLayer.push(arguments);
      }
      window.gtag = window.gtag || gtag;
      gtag("consent", "default", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
      });
      gtag("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
      });
    };
  }
  return null;
}

async function runContact(context, tag, viewport) {
  const page = await context.newPage();
  const bucket = { google: [], functions: [] };
  attach(page, bucket);
  const gclid = `CR-REPROOF-${SHA.slice(0, 7)}-${tag}`;
  await page.goto(`${BASE}/contact?gclid=${encodeURIComponent(gclid)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const gtagReady = await waitGtag(page);
  await fillContact(page, tag);
  await shot(page, `${tag}-contact-before`);
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
  const consentState = await page.evaluate(() =>
    window.SparkleanAds && window.SparkleanAds.getAdsConsent
      ? window.SparkleanAds.getAdsConsent()
      : "helper_missing"
  );
  await shot(page, `${tag}-contact-after`);
  const google = classifyGoogleHits(bucket.google);
  const contactFns = pickFn(bucket, "contact-submit");
  const reportFns = pickFn(bucket, "conversion-report");
  const nav = await refreshBackForwardZero(page, bucket, "contact-after-success");
  const result = {
    viewport,
    tag,
    consentState,
    gtagReady,
    thanksVisible: thanks,
    formErrorPresent: Boolean(formError && formError.trim()),
    leadAccepted: contactFns.some((f) => f.status === 200 && f.ok && f.leadId),
    leadId: (contactFns.find((f) => f.leadId) || {}).leadId || null,
    hasReportTokenOnce: contactFns.some((f) => f.hasReportToken),
    conversionReport: reportFns.map((f) => ({
      status: f.status,
      ok: f.ok,
      trackingStatus: f.trackingStatus,
      duplicate: f.duplicate,
    })),
    finalDurableTrackingStatus: (reportFns.find((f) => f.trackingStatus === "BROWSER_SENT") || reportFns.find((f) => f.trackingStatus) || {}).trackingStatus || null,
    google,
    firedLeadIds: fired,
    replayNav: nav,
    additionalLeadConversionsAfterRefreshBackForward: nav.additionalLeadConversionFanOut,
    googleAdsUiRecording: "NOT_CHECKED",
    screenshotAfter: `${STAMP}-${tag}-contact-after.png`,
  };
  await page.close();
  return sanitizeDeep(result);
}

async function runIntake(context, tag, viewport, { consentMode = "unresolved", blockAds = false } = {}) {
  const page = await context.newPage();
  const init = consentInitScript(consentMode);
  if (init) await page.addInitScript(init);
  if (blockAds) {
    await page.route(/sparklean-ads\.js/, (route) => route.abort());
    await page.route(/googletagmanager\.com\/gtag/, (route) => route.abort());
    await page.route(/googleadservices\.com/, (route) => route.abort());
    await page.route(/googleads\.g\.doubleclick\.net/, (route) => route.abort());
  }
  const bucket = { google: [], functions: [] };
  attach(page, bucket);
  const gclid = `CR-REPROOF-INTAKE-${tag}`;
  await page.goto(`${BASE}/residential-cleaning?quote=1&gclid=${encodeURIComponent(gclid)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const gtagReady =
    blockAds || consentMode === "denied"
      ? await waitGtag(page, 3000).catch(() => false)
      : await waitGtag(page);
  await page.waitForSelector("[data-intake-next]", { timeout: 20000 });
  await shot(page, `${tag}-intake-open`);
  const quoteWait = page.waitForResponse(
    (r) => /quote-submit/.test(r.url()) && r.request().method() === "POST",
    { timeout: 60000 }
  );
  await completePaidIntake(page);
  await quoteWait;
  const durable =
    consentMode === "denied" || blockAds
      ? await page
          .waitForResponse((r) => /conversion-report/.test(r.url()), { timeout: 25000 })
          .then(() => true)
          .catch(() => false)
      : Boolean(await waitDurableBrowserSent(page, bucket, { timeoutMs: 45000 }));
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
  const consentState = await page.evaluate(() =>
    window.SparkleanAds && window.SparkleanAds.getAdsConsent
      ? window.SparkleanAds.getAdsConsent()
      : "helper_missing"
  );
  await shot(page, `${tag}-intake-after`);
  const quoteFns = pickFn(bucket, "quote-submit");
  const reportFns = pickFn(bucket, "conversion-report");
  const google = classifyGoogleHits(bucket.google);
  let nav = null;
  const terminalOk =
    consentMode === "denied" || blockAds
      ? reportFns.some((f) => f.ok && (f.trackingStatus === "OFFLINE_QUEUED" || f.trackingStatus === "FAILED"))
      : reportFns.some((f) => f.ok && f.trackingStatus === "BROWSER_SENT");
  if (doneTextPresent && !errPresent && terminalOk) {
    nav = await refreshBackForwardZero(page, bucket, "intake-after-success");
  }
  let replayExtra = 0;
  if (fired[0] && !blockAds && consentMode !== "denied") {
    const before = classifyGoogleHits(bucket.google).leadConversionFanOutCount;
    await page.evaluate((id) => {
      if (window.SparkleanAds && window.SparkleanAds.trackQuoteRequestCompleted) {
        window.SparkleanAds.trackQuoteRequestCompleted(id);
      }
    }, fired[0]);
    await page.waitForTimeout(1500);
    replayExtra = Math.max(0, classifyGoogleHits(bucket.google).leadConversionFanOutCount - before);
  }
  const finalStatus =
    (reportFns.find((f) => f.trackingStatus === "BROWSER_SENT") ||
      reportFns.find((f) => f.trackingStatus === "OFFLINE_QUEUED") ||
      reportFns.find((f) => f.trackingStatus) ||
      {}).trackingStatus || null;
  const result = {
    viewport,
    tag,
    consentMode,
    consentState,
    blockAds,
    gtagReady: Boolean(gtagReady),
    doneTextPresent,
    delayedNoteCount: delayed,
    intakeErrorPresent: errPresent,
    waitedForDurableTerminal: durable,
    acceptedOnlyIfTerminal:
      consentMode === "denied" || blockAds
        ? finalStatus === "OFFLINE_QUEUED" || finalStatus === "FAILED"
        : finalStatus === "BROWSER_SENT" && delayed === 0,
    leadAccepted: quoteFns.some((f) => f.status === 200 && f.ok && f.leadId),
    leadId: (quoteFns.find((f) => f.leadId) || {}).leadId || null,
    hasReportTokenOnce: quoteFns.some((f) => f.hasReportToken),
    conversionReport: reportFns.map((f) => ({
      status: f.status,
      ok: f.ok,
      trackingStatus: f.trackingStatus,
      duplicate: f.duplicate,
    })),
    finalDurableTrackingStatus: finalStatus,
    google,
    firedLeadIds: fired,
    replayNav: nav,
    additionalLeadConversionsAfterRefreshBackForward: nav ? nav.additionalLeadConversionFanOut : null,
    helperReplayExtraLeadFanOut: replayExtra,
    googleAdsUiRecording: "NOT_CHECKED",
  };
  await page.close();
  return sanitizeDeep(result);
}

async function runSent1(context, tag) {
  const page = await context.newPage();
  const bucket = { google: [], functions: [] };
  attach(page, bucket);
  await page.goto(`${BASE}/contact?sent=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitGtag(page);
  await page.waitForTimeout(2000);
  const thanks = await page.locator("#cp-thanks").isVisible().catch(() => false);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const google = classifyGoogleHits(bucket.google);
  await page.close();
  return sanitizeDeep({
    tag,
    thanksVisible: thanks,
    google,
    logicalLeadConversions: google.logicalLeadConversionCount,
  });
}

async function runReconcileProofs() {
  const key = process.env.SPARKLEAN_RECONCILE_KEY || "";
  async function post(headers) {
    const res = await fetch(`${BASE}/.netlify/functions/leads-reconcile`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ source: "control-room-reproof" }),
    });
    let j = {};
    try {
      j = await res.json();
    } catch {
      j = {};
    }
    return {
      status: res.status,
      ok: j.ok === true,
      checked: typeof j.checked === "number" ? j.checked : null,
      queuedCount: Array.isArray(j.queued) ? j.queued.length : null,
      error: j.error ? "present" : null,
    };
  }
  const unauthorizedNoKey = await post({});
  const unauthorizedWrongKey = await post({
    "x-sparklean-reconcile-key": "definitely-not-the-real-key-0000",
  });
  let authorized = null;
  let authorizedReplay = null;
  const keyConfigured = Boolean(key && key.length >= 16);
  if (keyConfigured) {
    authorized = await post({ "x-sparklean-reconcile-key": key });
    authorizedReplay = await post({ "x-sparklean-reconcile-key": key });
  }
  return sanitizeDeep({
    keyConfigured,
    unauthorizedNoKey,
    unauthorizedWrongKey,
    authorized,
    authorizedReplay,
    unauthorizedDenied: unauthorizedNoKey.status >= 400 && unauthorizedWrongKey.status >= 400,
    authorizedOk: authorized ? authorized.status === 200 && authorized.ok === true : null,
    authorizedIdempotent:
      authorized && authorizedReplay
        ? authorizedReplay.status === 200 && authorizedReplay.ok === true
        : null,
  });
}

async function postContactOnce(idem, tag) {
  const payload = {
    fullName: `CR Preview ${tag}`,
    phone: "2395550198",
    email: `preview.cr.${tag}.${Date.now()}@sparklean.co`,
    propertyType: "house",
    serviceNeeded: `Control Room ${tag} — ignore`,
    cityArea: "Naples",
    preferredTiming: "flexible",
    message: "Ignore",
    consentContact: "yes",
    campaign: { gclid: `CR-${tag}` },
  };
  const res = await fetch(`${BASE}/.netlify/functions/contact-submit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE,
      "idempotency-key": idem,
    },
    body: JSON.stringify(payload),
  });
  let j = {};
  try {
    j = await res.json();
  } catch {
    j = {};
  }
  return {
    status: res.status,
    ok: j.ok === true,
    leadId: j.leadId || null,
    hasReportToken: Boolean(j.reportToken),
    code: j.code || null,
    errorPresent: Boolean(j.error),
    deliveryFinality: j.deliveryFinality || null,
  };
}

async function runBrevoFailureApi() {
  const idem = `brevo-fail-${crypto.randomBytes(4).toString("hex")}`;
  const first = await postContactOnce(idem, "brevofail");
  const second = await postContactOnce(idem, "brevofail");
  return sanitizeDeep({
    note: "Requires SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL=1 and SPARKLEAN_FORCE_BREVO_FAIL=1 on preview host only.",
    first,
    second,
    sameLeadId: Boolean(first.leadId && first.leadId === second.leadId),
    falseSuccess: first.ok === true && first.status === 200,
    falseDeliveredClaim: first.ok === true,
    noReportTokenOnFail: first.hasReportToken !== true,
  });
}

async function runBrevoRestoreApi() {
  const idem = `brevo-ok-${crypto.randomBytes(4).toString("hex")}`;
  const first = await postContactOnce(idem, "brevorestore");
  return sanitizeDeep({
    note: "Requires FORCE flag unset; ALLOW may remain.",
    first,
    deliveredSuccess: first.ok === true && first.status === 200 && Boolean(first.leadId),
    hasReportToken: first.hasReportToken === true,
  });
}

const evidence = {
  productSha: SHA,
  previewUrl: BASE,
  phase: PHASE,
  startedAt: new Date().toISOString(),
  conversionConstants: { conversionId: CONV_ID, conversionLabel: LABEL },
  constraints: {
    noSeo: true,
    noMerge: true,
    noProdDeploy: true,
    noAdsBiddingChange: true,
    noGoogleAdsUiClaimWithoutDiagnostics: true,
  },
  steps: {},
};

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SparkleanCRReproof/3",
  });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 SparkleanCRReproof/3",
  });

  if (PHASE === "all" || PHASE === "core") {
    evidence.steps.desktopContact = await runContact(desktop, "desktop", "desktop-1440");
    evidence.steps.mobileContact = await runContact(mobile, "mobile", "mobile-390");
    evidence.steps.desktopIntakeUnresolved = await runIntake(desktop, "intake-unresolved", "desktop-1440", {
      consentMode: "unresolved",
    });
    evidence.steps.mobileIntakeUnresolved = await runIntake(mobile, "intake-mobile", "mobile-390", {
      consentMode: "unresolved",
    });
    evidence.steps.sent1Zero = await runSent1(desktop, "sent1");
  }

  if (PHASE === "all" || PHASE === "consent") {
    evidence.steps.consentDeniedIntake = await runIntake(desktop, "consent-denied", "desktop-1440", {
      consentMode: "denied",
    });
    evidence.steps.consentGrantedIntake = await runIntake(desktop, "consent-granted", "desktop-1440", {
      consentMode: "granted",
    });
    evidence.steps.consentUnresolvedIntake = await runIntake(desktop, "consent-unresolved", "desktop-1440", {
      consentMode: "unresolved",
    });
  }

  if (PHASE === "all" || PHASE === "reconcile") {
    evidence.steps.reconcile = await runReconcileProofs();
  }

  if (PHASE === "all" || PHASE === "brevo") {
    evidence.steps.brevoFailureApi = await runBrevoFailureApi();
  }

  if (PHASE === "all" || PHASE === "brevo-restore") {
    evidence.steps.brevoRestoreApi = await runBrevoRestoreApi();
  }

  await desktop.close();
  await mobile.close();
} catch (e) {
  evidence.runError = sanitizeString(String(e && e.stack ? e.stack : e));
} finally {
  await browser.close();
}

evidence.finishedAt = new Date().toISOString();

function row(step, kind) {
  if (!step) return null;
  const report = (step.conversionReport || []).find((r) => r.trackingStatus) || null;
  return {
    leadAccepted: step.leadAccepted === true,
    brevo:
      step.leadAccepted === true
        ? "delivered-or-accepted-path"
        : step.formErrorPresent || step.intakeErrorPresent
          ? "failed-or-unknown"
          : "unknown",
    googleRequest:
      step.google && step.google.logicalLeadConversionCount > 0
        ? "emitted"
        : step.consentMode === "denied" || step.blockAds
          ? "intentionally-blocked-or-denied"
          : "none",
    logicalLeadConversionCount: step.google ? step.google.logicalLeadConversionCount : null,
    conversionReport: report
      ? { status: report.status, ok: report.ok, trackingStatus: report.trackingStatus }
      : null,
    finalDurableTrackingStatus: step.finalDurableTrackingStatus,
    acceptedOnlyIfTerminal: step.acceptedOnlyIfTerminal ?? null,
    delayedNoteCount: step.delayedNoteCount ?? null,
    replayConversionCount: step.additionalLeadConversionsAfterRefreshBackForward,
    helperReplayExtraLeadFanOut: step.helperReplayExtraLeadFanOut ?? null,
    leadId: step.leadId || null,
    googleAdsUiRecording: "NOT_CHECKED",
    kind,
  };
}

evidence.matrix = sanitizeDeep({
  desktopContact: row(evidence.steps.desktopContact, "contact"),
  mobileContact: row(evidence.steps.mobileContact, "contact"),
  desktopIntakeUnresolved: row(evidence.steps.desktopIntakeUnresolved, "intake"),
  mobileIntakeUnresolved: row(evidence.steps.mobileIntakeUnresolved, "intake"),
  consentDenied: row(evidence.steps.consentDeniedIntake, "intake"),
  consentGranted: row(evidence.steps.consentGrantedIntake, "intake"),
  consentUnresolved: row(evidence.steps.consentUnresolvedIntake, "intake"),
  sent1: evidence.steps.sent1Zero
    ? {
        leadAccepted: false,
        brevo: "n/a",
        googleRequest: evidence.steps.sent1Zero.logicalLeadConversions === 0 ? "none" : "UNEXPECTED",
        conversionReport: "n/a",
        finalDurableTrackingStatus: "n/a",
        replayConversionCount: evidence.steps.sent1Zero.logicalLeadConversions,
        googleAdsUiRecording: "NOT_CHECKED",
      }
    : null,
  reconcile: evidence.steps.reconcile || null,
  brevoFailureApi: evidence.steps.brevoFailureApi || null,
  brevoRestoreApi: evidence.steps.brevoRestoreApi || null,
});

evidence.acceptance = sanitizeDeep({
  guidedIntakeDurableBrowserSent:
    (evidence.steps.desktopIntakeUnresolved &&
      evidence.steps.desktopIntakeUnresolved.finalDurableTrackingStatus === "BROWSER_SENT" &&
      evidence.steps.desktopIntakeUnresolved.delayedNoteCount === 0) ||
    false,
  consentDeniedZeroGoogle:
    evidence.steps.consentDeniedIntake &&
    evidence.steps.consentDeniedIntake.google &&
    evidence.steps.consentDeniedIntake.google.logicalLeadConversionCount === 0 &&
    evidence.steps.consentDeniedIntake.google.leadConversionFanOutCount === 0,
  consentGrantedExactlyOneLogical:
    evidence.steps.consentGrantedIntake &&
    evidence.steps.consentGrantedIntake.google &&
    evidence.steps.consentGrantedIntake.google.logicalLeadConversionCount === 1 &&
    evidence.steps.consentGrantedIntake.finalDurableTrackingStatus === "BROWSER_SENT",
  consentUnresolvedMayFire:
    evidence.steps.consentUnresolvedIntake &&
    evidence.steps.consentUnresolvedIntake.google &&
    evidence.steps.consentUnresolvedIntake.google.logicalLeadConversionCount >= 1,
  unauthorizedReconcileDenied: Boolean(
    evidence.steps.reconcile && evidence.steps.reconcile.unauthorizedDenied
  ),
  authorizedReconcileIdempotent: Boolean(
    evidence.steps.reconcile &&
      evidence.steps.reconcile.authorizedOk &&
      evidence.steps.reconcile.authorizedIdempotent
  ),
  forcedBrevoNoFalseSuccess: Boolean(
    evidence.steps.brevoFailureApi &&
      evidence.steps.brevoFailureApi.falseSuccess === false &&
      evidence.steps.brevoFailureApi.noReportTokenOnFail === true
  ),
  normalBrevoRestoredDelivered: Boolean(
    evidence.steps.brevoRestoreApi && evidence.steps.brevoRestoreApi.deliveredSuccess === true
  ),
});

const jsonPath = path.join(OUT, `${STAMP}-sanitized-evidence.json`);
fs.writeFileSync(jsonPath, JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    { jsonPath, acceptance: evidence.acceptance, matrix: evidence.matrix, runError: evidence.runError || null },
    null,
    2
  )
);
