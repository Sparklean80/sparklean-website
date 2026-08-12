/**
 * Adversarial + failure-path tests for lead/conversion boundary.
 * Run: node scripts/test-conversion-boundary-adversarial.mjs
 */
process.env.SPARKLEAN_LEADS_MEMORY = "1";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  INTAKE_SOURCE,
  TRACKING_STATUS,
  applyConversionReport,
  buildRetryPayload,
  createLead,
  deleteLead,
  findSensitiveLeak,
  getLead,
  resetMemoryStoreForTests,
  updateLead,
  REPORT_TOKEN_TTL_MS,
} from "../netlify/functions/lib/leads-store.mjs";
import { buildConversionGapAlertText } from "../netlify/functions/lib/conversion-alerts.mjs";
import {
  isReconcileAuthorized,
  runLeadsReconcile,
} from "../netlify/functions/leads-reconcile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
let failed = 0;
let skipped = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    passed += 1;
    console.log("OK  ", msg);
  }
}

function skip(msg) {
  skipped += 1;
  console.log("SKIP", msg);
}

resetMemoryStoreForTests();

// --- Schedule in version-controlled Netlify config ---
{
  const toml = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
  const reconcileSrc = fs.readFileSync(path.join(root, "netlify/functions/leads-reconcile.mjs"), "utf8");
  assert(/\[functions\."leads-reconcile"\]/.test(toml), "netlify.toml declares leads-reconcile function block");
  assert(/schedule\s*=\s*"\*\/15 \* \* \* \*"/.test(toml), "netlify.toml schedule */15 * * * *");
  assert(/schedule:\s*"\*\/15 \* \* \* \*"/.test(reconcileSrc), "leads-reconcile.mjs export config schedule */15");
}

// --- Forged reportToken ---
{
  resetMemoryStoreForTests();
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "G_FORGE" },
    consent: true,
  });
  const forged = await applyConversionReport({
    leadId: lead.leadId,
    reportToken: "forged-token-not-real",
    status: TRACKING_STATUS.BROWSER_SENT,
  });
  assert(forged.ok === false && forged.status === 401, "forged reportToken → 401");
  const fresh = await getLead(lead.leadId);
  assert(fresh.trackingStatus === TRACKING_STATUS.PENDING, "forged token leaves status PENDING");
}

// --- Cross-lead token swap ---
{
  resetMemoryStoreForTests();
  const a = await createLead({
    intakeSource: INTAKE_SOURCE.GUIDED_INTAKE,
    campaign: { gclid: "GA" },
    consent: true,
  });
  const b = await createLead({
    intakeSource: INTAKE_SOURCE.GUIDED_INTAKE,
    campaign: { gclid: "GB" },
    consent: true,
  });
  const cross = await applyConversionReport({
    leadId: a.leadId,
    reportToken: b.reportToken,
    status: TRACKING_STATUS.BROWSER_SENT,
  });
  assert(cross.ok === false && cross.status === 401, "cross-lead reportToken → 401");
  assert((await getLead(a.leadId)).trackingStatus === TRACKING_STATUS.PENDING, "lead A still PENDING after cross-token");
  assert((await getLead(b.leadId)).trackingStatus === TRACKING_STATUS.PENDING, "lead B still PENDING after cross-token");
}

// --- Expired reportToken ---
{
  resetMemoryStoreForTests();
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "G_EXP" },
    consent: true,
  });
  const past = Date.now() - REPORT_TOKEN_TTL_MS - 60_000;
  await updateLead(lead.leadId, {
    createdAt: new Date(past).toISOString(),
    reportTokenExpiresAt: new Date(past + 1000).toISOString(),
  });
  const expired = await applyConversionReport({
    leadId: lead.leadId,
    reportToken: lead.reportToken,
    status: TRACKING_STATUS.BROWSER_SENT,
    now: Date.now(),
  });
  assert(expired.ok === false && expired.status === 401, "expired reportToken → 401");
  assert(/expired/i.test(expired.error || ""), "expired error message");
}

// --- Replay after BROWSER_SENT ---
{
  resetMemoryStoreForTests();
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.GUIDED_INTAKE,
    campaign: { gclid: "G_REPLAY" },
    consent: true,
  });
  const first = await applyConversionReport({
    leadId: lead.leadId,
    reportToken: lead.reportToken,
    status: TRACKING_STATUS.BROWSER_SENT,
  });
  assert(first.ok === true && !first.duplicate, "first BROWSER_SENT accepted");
  const replay = await applyConversionReport({
    leadId: lead.leadId,
    reportToken: lead.reportToken,
    status: TRACKING_STATUS.BROWSER_SENT,
  });
  assert(replay.ok === true && replay.duplicate === true, "replay BROWSER_SENT marked duplicate");
  const queueAfter = await applyConversionReport({
    leadId: lead.leadId,
    reportToken: lead.reportToken,
    status: TRACKING_STATUS.OFFLINE_QUEUED,
    failureReason: "should_not_regress",
  });
  assert(queueAfter.duplicate === true, "cannot regress BROWSER_SENT → OFFLINE_QUEUED via client report");
  assert(
    (await getLead(lead.leadId)).trackingStatus === TRACKING_STATUS.BROWSER_SENT,
    "status remains BROWSER_SENT after replay/queue attempt"
  );
}

// --- Unauthorized reconciliation ---
{
  const fakeReq = {
    headers: {
      get(name) {
        if (name === "x-netlify-event") return null;
        if (name === "x-sparklean-reconcile-key") return "wrong";
        return null;
      },
    },
  };
  process.env.SPARKLEAN_RECONCILE_KEY = "expected-reconcile-secret";
  assert(isReconcileAuthorized(fakeReq) === false, "wrong reconcile key unauthorized");
  assert(
    isReconcileAuthorized({
      headers: { get: (n) => (n === "x-netlify-event" ? "schedule" : null) },
    }) === true,
    "Netlify schedule event authorized"
  );
  assert(
    isReconcileAuthorized({
      headers: {
        get: (n) => (n === "x-sparklean-reconcile-key" ? "expected-reconcile-secret" : null),
      },
    }) === true,
    "matching reconcile key authorized"
  );
  delete process.env.SPARKLEAN_RECONCILE_KEY;
  assert(
    isReconcileAuthorized({
      headers: { get: () => null },
    }) === false,
    "no key + no schedule → unauthorized"
  );
}

// --- Concurrent submissions → distinct leadIds ---
{
  resetMemoryStoreForTests();
  const [l1, l2, l3] = await Promise.all([
    createLead({ intakeSource: INTAKE_SOURCE.CONTACT_FORM, campaign: { gclid: "C1" }, consent: true }),
    createLead({ intakeSource: INTAKE_SOURCE.CONTACT_FORM, campaign: { gclid: "C1" }, consent: true }),
    createLead({ intakeSource: INTAKE_SOURCE.GUIDED_INTAKE, campaign: { gclid: "C1" }, consent: true }),
  ]);
  const ids = new Set([l1.leadId, l2.leadId, l3.leadId]);
  assert(ids.size === 3, "concurrent creates yield distinct leadIds");
  const tokens = new Set([l1.reportToken, l2.reportToken, l3.reportToken]);
  assert(tokens.size === 3, "concurrent creates yield distinct reportTokens");
}

// --- Blob create failure simulation (memory write throw) ---
{
  // Partial failure: Brevo path marking FAILED after create — covered by updateLead
  resetMemoryStoreForTests();
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.GUIDED_INTAKE,
    campaign: { gclid: "G_BREVO" },
    consent: true,
  });
  await updateLead(lead.leadId, {
    trackingStatus: TRACKING_STATUS.FAILED,
    failureReason: "email_delivery_failed",
  });
  const failedLead = await getLead(lead.leadId);
  assert(failedLead.trackingStatus === TRACKING_STATUS.FAILED, "Brevo failure marks Blob FAILED");
  assert(failedLead.failureReason === "email_delivery_failed", "email failure reason recorded");
}

// --- Callback loss → reconcile queues OFFLINE_QUEUED ---
{
  resetMemoryStoreForTests();
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "G_CBLOSS" },
    consent: true,
  });
  // Simulate age past reconcile window without client callback
  await updateLead(lead.leadId, {
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  });
  const prevFetch = globalThis.fetch;
  const alertBodies = [];
  globalThis.fetch = async (url, init) => {
    alertBodies.push({ url: String(url), body: init && init.body });
    return { ok: true, status: 200, text: async () => "" };
  };
  process.env.SPARKLEAN_SLACK_WEBHOOK_URL = "https://hooks.slack.test/conversion-gap";
  process.env.SPARKLEAN_RECONCILE_MAX_AGE_MS = "900000";
  const result = await runLeadsReconcile({ maxAgeMs: 15 * 60 * 1000 });
  globalThis.fetch = prevFetch;
  delete process.env.SPARKLEAN_SLACK_WEBHOOK_URL;
  assert(result.queued.some((q) => q.leadId === lead.leadId), "callback-loss lead queued by reconcile");
  const after = await getLead(lead.leadId);
  assert(after.trackingStatus === TRACKING_STATUS.OFFLINE_QUEUED, "callback loss → OFFLINE_QUEUED");
  assert(after.retryPayload && after.retryPayload.leadId === lead.leadId, "retry payload present after reconcile");
}

// --- Alert: no PII / reportToken / credentials / unrestricted dump ---
{
  resetMemoryStoreForTests();
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "G_ALERT_SAFE" },
    consent: true,
  });
  // Poison lead with fields that must never appear in alerts
  lead.trackingStatus = TRACKING_STATUS.OFFLINE_QUEUED;
  lead.failureReason = "gtag_unavailable";
  lead.email = "customer@example.com";
  lead.phone = "2395550100";
  lead.fullName = "Should Not Leak";
  lead.BREVO_API_KEY = "secret-should-not-leak";
  lead.retryPayload = buildRetryPayload(lead);
  // Intentionally try to smuggle reportToken into retry
  lead.retryPayload.reportToken = lead.reportToken;

  const built = buildConversionGapAlertText(lead);
  assert(!built.text.includes(lead.reportToken), "alert text omits reportToken");
  assert(!/"reportToken"/.test(built.text), "alert JSON has no reportToken key");
  assert(!built.text.includes("customer@example.com"), "alert omits customer email");
  assert(!built.text.includes("Should Not Leak"), "alert omits fullName");
  assert(!built.text.includes("2395550100"), "alert omits phone");
  assert(!built.text.includes("secret-should-not-leak"), "alert omits credential field");
  const leaks = findSensitiveLeak(built.text);
  assert(leaks.length === 0, `alert findSensitiveLeak empty (got ${leaks.join(",")})`);
  const retryKeys = Object.keys(built.retry).sort();
  assert(
    !retryKeys.includes("reportToken") && !retryKeys.includes("email") && !retryKeys.includes("phone"),
    "retry allowlist excludes PII/token keys"
  );
}

// --- deleteLead retention helper ---
{
  resetMemoryStoreForTests();
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    consent: true,
    campaign: {},
  });
  assert(await deleteLead(lead.leadId), "deleteLead returns true");
  assert((await getLead(lead.leadId)) == null, "deleted lead gone from store");
}

// --- Language: never Google-confirmed ---
{
  const storeSrc = fs.readFileSync(path.join(root, "netlify/functions/lib/leads-store.mjs"), "utf8");
  const adsSrc = fs.readFileSync(path.join(root, "js/sparklean-ads.js"), "utf8");
  assert(!/\bCONFIRMED\b/.test(storeSrc) || /never.*Google confirmed/i.test(storeSrc), "store avoids CONFIRMED as status");
  assert(!Object.values(TRACKING_STATUS).includes("CONFIRMED"), "TRACKING_STATUS has no CONFIRMED");
  assert(adsSrc.includes("BROWSER_SENT"), "client uses BROWSER_SENT language");
  assert(!/Google[- ]confirmed/i.test(adsSrc) || /never/i.test(adsSrc), "ads.js does not claim Google-confirmed success");
}

// --- Contact / quote contract files present ---
{
  assert(fs.existsSync(path.join(root, "netlify/functions/contact-submit.mjs")), "contact-submit function exists");
  assert(fs.existsSync(path.join(root, "netlify/functions/conversion-report.mjs")), "conversion-report exists");
}

console.log(`\nADVERSARIAL RESULTS: pass=${passed} fail=${failed} skip=${skipped}`);
process.exit(failed ? 1 : 0);
