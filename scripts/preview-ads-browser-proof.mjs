/**
 * Control Room preview browser proof — exact product SHA only.
 * Does not change Google Ads settings. Does not hit www.sparklean.co.
 *
 * Run: node scripts/preview-ads-browser-proof.mjs
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const BASE = process.env.PREVIEW_BASE || "https://conversion-b18a49f-exact--sparklean-website.netlify.app";
const SHA = process.env.PREVIEW_SHA || "b18a49f726f596c9b8e6b5e9b5f362807480ddb7";
const OUT = path.resolve("docs/work-notes/2026-08-13-preview-ads-browser-proof");
const LABEL = "HnWnCJPRt9kcELDFqLc_";
const SEND_TO = `AW-17027441328/${LABEL}`;
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");

fs.mkdirSync(OUT, { recursive: true });

function isGoogleConversionUrl(url) {
  const u = String(url || "");
  if (!/google|doubleclick|googlesyndication|googleadservices|google.com\/ccm|google.com\/pagead/i.test(u)) {
    return false;
  }
  return /conversion|pagead\/1p-|viewthroughconversion|\/ccm\//i.test(u);
}

function parseConversionHit(req) {
  const url = req.url();
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { url, method: req.method() };
  }
  const q = Object.fromEntries(parsed.searchParams.entries());
  return {
    url,
    method: req.method(),
    host: parsed.hostname,
    pathname: parsed.pathname,
    label: q.label || q.send_to || null,
    transaction_id: q.transaction_id || q.oid || q.tid || q.order_id || null,
    conversion_id: q.conversion_id || null,
    query: q,
  };
}

function attachNetwork(page, bucket) {
  page.on("request", (req) => {
    const url = req.url();
    if (isGoogleConversionUrl(url)) bucket.googleConversion.push(parseConversionHit(req));
    if (/conversion-report/.test(url) && req.method() === "POST") {
      bucket.conversionReport.push({ url, method: req.method() });
    }
    if (/contact-submit|quote-submit/.test(url) && req.method() === "POST") {
      bucket.leadSubmit.push({ url, method: req.method() });
    }
  });
  page.on("response", async (res) => {
    const url = res.url();
    if (!/contact-submit|quote-submit|conversion-report/.test(url)) return;
    let body = "";
    try {
      body = await res.text();
    } catch {
      body = "";
    }
    bucket.functionResponses.push({
      url,
      status: res.status(),
      body: String(body).slice(0, 800),
    });
  });
}

async function waitGtag(page, ms = 8000) {
  try {
    await page.waitForFunction(() => typeof window.gtag === "function", { timeout: ms });
    return true;
  } catch {
    return false;
  }
}

async function screenshot(page, name) {
  const p = path.join(OUT, `${STAMP}-${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  return p;
}

async function fillContact(page, tag) {
  await page.fill("#cf-name", `CR Preview ${tag}`);
  await page.fill("#cf-phone", "2395550110");
  await page.fill("#cf-email", `preview.cr.${tag}.${Date.now()}@sparklean.co`);
  await page.selectOption("#cf-property", "house");
  await page.fill("#cf-service", "Control Room preview proof — ignore");
  await page.fill("#cf-city", "Naples");
  await page.selectOption("#cf-timing", "flexible");
  await page.fill("#cf-msg", `Control Room browser proof ${tag} SHA ${SHA}. Ignore.`);
  await page.check("#cf-consent-required");
}

async function runContact(context, tag, viewportLabel) {
  const page = await context.newPage();
  const bucket = { googleConversion: [], conversionReport: [], leadSubmit: [], functionResponses: [] };
  attachNetwork(page, bucket);
  const gclid = `CR-PROOF-${SHA.slice(0, 7)}-${tag}`;
  await page.goto(`${BASE}/contact?gclid=${encodeURIComponent(gclid)}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const gtagReady = await waitGtag(page);
  await fillContact(page, tag);
  await screenshot(page, `${tag}-contact-before`);
  await Promise.all([
    page.waitForResponse((r) => /contact-submit/.test(r.url()) && r.request().method() === "POST", { timeout: 45000 }).catch(() => null),
    page.click(".cp-submit"),
  ]);
  await page.waitForTimeout(2500);
  const thanksVisible = await page.locator("#cp-thanks").isVisible().catch(() => false);
  const errText = await page.locator("#cp-form-error").innerText().catch(() => "");
  const firedIds = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem("sparklean_ads_conv_lead_ids") || "[]");
    } catch {
      return [];
    }
  });
  const shotAfter = await screenshot(page, `${tag}-contact-after`);
  const result = {
    viewport: viewportLabel,
    gtagReady,
    thanksVisible,
    formError: errText || null,
    firedTransactionIds: firedIds,
    googleConversionCount: bucket.googleConversion.length,
    googleConversionHits: bucket.googleConversion,
    conversionReportCount: bucket.conversionReport.length,
    leadSubmit: bucket.leadSubmit,
    functionResponses: bucket.functionResponses,
    screenshotAfter: shotAfter,
    contactStarIdPresent: firedIds.some((id) => String(id).startsWith("contact-")),
    labelHit: bucket.googleConversion.some(
      (h) =>
        String(h.label || "").includes(LABEL) ||
        String(h.url || "").includes(LABEL) ||
        String(h.url || "").includes("17027441328")
    ),
  };
  await page.close();
  return result;
}

async function runSent1Zero(context, tag) {
  const page = await context.newPage();
  const bucket = { googleConversion: [], conversionReport: [], leadSubmit: [], functionResponses: [] };
  attachNetwork(page, bucket);
  await page.goto(`${BASE}/contact?sent=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitGtag(page);
  await page.waitForTimeout(2500);
  const thanksVisible = await page.locator("#cp-thanks").isVisible().catch(() => false);
  const firedIds = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem("sparklean_ads_conv_lead_ids") || "[]");
    } catch {
      return [];
    }
  });
  await screenshot(page, `${tag}-sent1-direct`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await screenshot(page, `${tag}-sent1-refresh`);
  const result = {
    thanksVisible,
    googleConversionCount: bucket.googleConversion.length,
    googleConversionHits: bucket.googleConversion,
    firedTransactionIds: firedIds,
    extraConversionRequests: bucket.googleConversion.length,
  };
  await page.close();
  return result;
}

async function completePaidIntake(page) {
  const next = page.locator("[data-intake-next]");
  await page.waitForSelector(".sq-intake__input, .sq-intake__opt", { timeout: 15000 });
  await page.fill(".sq-intake__input", "CR Preview Intake");
  await next.click();
  await page.waitForTimeout(200);
  await page.fill(".sq-intake__input", "2395550111");
  await next.click();
  await page.waitForTimeout(200);
  await page.fill(".sq-intake__input", `preview.cr.intake.${Date.now()}@sparklean.co`);
  await next.click();
  await page.waitForTimeout(200);
  await page.fill(".sq-intake__input", "34102");
  await next.click();
  await page.waitForTimeout(300);
  await page.locator('.sq-intake__opt[data-value="residential"]').click();
  await next.click();
}

async function runIntake(context, tag, { blockAds } = {}) {
  const page = await context.newPage();
  const bucket = { googleConversion: [], conversionReport: [], leadSubmit: [], functionResponses: [] };
  attachNetwork(page, bucket);
  if (blockAds) {
    await page.route(/sparklean-ads\.js/, (route) => route.abort());
    await page.route(/googletagmanager\.com\/gtag/, (route) => route.abort());
    await page.route(/googleadservices\.com/, (route) => route.abort());
  }
  const gclid = `CR-PROOF-INTAKE-${tag}`;
  await page.goto(`${BASE}/residential-cleaning?quote=1&gclid=${encodeURIComponent(gclid)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const gtagReady = blockAds ? false : await waitGtag(page);
  await page.waitForSelector(".sq-intake.is-open, [data-intake-next]", { timeout: 20000 });
  await screenshot(page, `${tag}-intake-open`);
  await completePaidIntake(page);
  await page.waitForTimeout(4000);
  const doneText = await page.locator(".sq-intake__done").innerText().catch(() => "");
  const delayed = await page.locator(".sparklean-tracking-delayed").count();
  const err = await page.locator("[data-intake-error]").innerText().catch(() => "");
  const firedIds = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem("sparklean_ads_conv_lead_ids") || "[]");
    } catch {
      return [];
    }
  });
  await screenshot(page, `${tag}-intake-after`);

  let replayGoogleBefore = bucket.googleConversion.length;
  if (!blockAds && firedIds[0]) {
    await page.evaluate((id) => {
      if (window.SparkleanAds && window.SparkleanAds.trackQuoteRequestCompleted) {
        window.SparkleanAds.trackQuoteRequestCompleted(id);
      }
    }, firedIds[0]);
    await page.waitForTimeout(1500);
  }
  const replayExtra = bucket.googleConversion.length - replayGoogleBefore;

  const result = {
    tag,
    blockAds: !!blockAds,
    gtagReady,
    doneText,
    delayedNoteCount: delayed,
    intakeError: err || null,
    firedTransactionIds: firedIds,
    googleConversionCount: bucket.googleConversion.length,
    googleConversionHits: bucket.googleConversion,
    conversionReportCount: bucket.conversionReport.length,
    functionResponses: bucket.functionResponses,
    replayExtraGoogleHits: replayExtra,
  };
  await page.close();
  return result;
}

const evidence = {
  verdicts: {
    production_contact:
      "PRODUCTION_CONTACT_CONVERSION_CODE_DEPLOYED_BROWSER_GOOGLE_PROOF_REQUIRED",
    ai_intake: "AI_INTAKE_CONVERSION_HARDENING_PREVIEW_ONLY_BROWSER_PROOF_REQUIRED",
  },
  previewUrl: BASE,
  productSha: SHA,
  startedAt: new Date().toISOString(),
  constraints: {
    noGoogleAdsSettingChange: true,
    noProductionTest: true,
    noMerge: true,
    noProdDeploy: true,
  },
  steps: {},
};

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SparkleanCRProof/1",
  });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 SparkleanCRProof/1",
  });

  evidence.steps.desktopContact = await runContact(desktop, "desktop", "desktop-1440");
  evidence.steps.mobileContact = await runContact(mobile, "mobile", "mobile-390");
  evidence.steps.sent1ZeroDesktop = await runSent1Zero(desktop, "desktop");
  evidence.steps.aiIntake = await runIntake(desktop, "intake", { blockAds: false });
  evidence.steps.aiIntakeBlockedTag = await runIntake(desktop, "intake-blocked", { blockAds: true });

  await desktop.close();
  await mobile.close();
} catch (e) {
  evidence.runError = String(e && e.stack ? e.stack : e);
} finally {
  await browser.close();
}

evidence.finishedAt = new Date().toISOString();
evidence.summary = {
  desktopGoogleHits: evidence.steps.desktopContact?.googleConversionCount ?? null,
  mobileGoogleHits: evidence.steps.mobileContact?.googleConversionCount ?? null,
  desktopContactStar: evidence.steps.desktopContact?.contactStarIdPresent ?? null,
  mobileContactStar: evidence.steps.mobileContact?.contactStarIdPresent ?? null,
  sent1ExtraHits: evidence.steps.sent1ZeroDesktop?.extraConversionRequests ?? null,
  intakeGoogleHits: evidence.steps.aiIntake?.googleConversionCount ?? null,
  intakeReplayExtra: evidence.steps.aiIntake?.replayExtraGoogleHits ?? null,
  blockedTagGoogleHits: evidence.steps.aiIntakeBlockedTag?.googleConversionCount ?? null,
  note:
    "b18a49f contact form uses Blob leadId + fireAndReportConversion, not production contact-* / ?sent=1 consume path.",
};

const jsonPath = path.join(OUT, `${STAMP}-evidence.json`);
fs.writeFileSync(jsonPath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ jsonPath, summary: evidence.summary, runError: evidence.runError || null }, null, 2));
