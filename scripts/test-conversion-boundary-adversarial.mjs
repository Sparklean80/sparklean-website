/**
 * Adversarial + blocked-script + reconcile-auth proofs.
 * Run: node scripts/test-conversion-boundary-adversarial.mjs
 */
process.env.SPARKLEAN_LEADS_MEMORY = "1";
process.env.SPARKLEAN_SKIP_ORIGIN_CHECK = "1";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";
import {
  INTAKE_SOURCE,
  TRACKING_STATUS,
  applyConversionReport,
  createLead,
  getLead,
  resetMemoryStoreForTests,
  updateLead,
  buildRetryPayload,
  findSensitiveLeak,
  REPORT_TOKEN_TTL_MS,
  putIdempotentLeadId,
  getIdempotentLeadId,
} from "../netlify/functions/lib/leads-store.mjs";
import { buildConversionGapAlertText } from "../netlify/functions/lib/conversion-alerts.mjs";
import {
  isReconcileHttpAuthorized,
  isAuthenticNetlifySchedule,
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

resetMemoryStoreForTests();

// Schedule in VC config
{
  const toml = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
  const reconcileSrc = fs.readFileSync(path.join(root, "netlify/functions/leads-reconcile.mjs"), "utf8");
  assert(/schedule\s*=\s*"\*\/15 \* \* \* \*"/.test(toml), "netlify.toml schedule */15");
  assert(/schedule:\s*"\*\/15 \* \* \* \*"/.test(reconcileSrc), "function schedule */15");
  assert(!/if \(event === "schedule"\) return true/.test(reconcileSrc), "no event-only authorize");
}

// Forged / cross / expired / replay
{
  resetMemoryStoreForTests();
  const { lead, reportToken } = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "G_FORGE" },
    consent: true,
  });
  assert((await applyConversionReport({ leadId: lead.leadId, reportToken: "forged", status: TRACKING_STATUS.BROWSER_SENT })).status === 401, "forged → 401");

  const a = await createLead({ intakeSource: INTAKE_SOURCE.GUIDED_INTAKE, campaign: { gclid: "GA" }, consent: true });
  const b = await createLead({ intakeSource: INTAKE_SOURCE.GUIDED_INTAKE, campaign: { gclid: "GB" }, consent: true });
  assert(
    (await applyConversionReport({ leadId: a.lead.leadId, reportToken: b.reportToken, status: TRACKING_STATUS.BROWSER_SENT })).status === 401,
    "cross-lead token → 401"
  );

  const exp = await createLead({ intakeSource: INTAKE_SOURCE.CONTACT_FORM, campaign: { gclid: "G_EXP" }, consent: true });
  await updateLead(exp.lead.leadId, {
    reportTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  assert(
    (await applyConversionReport({ leadId: exp.lead.leadId, reportToken: exp.reportToken, status: TRACKING_STATUS.BROWSER_SENT })).status === 401,
    "expired → 401"
  );

  const r = await createLead({ intakeSource: INTAKE_SOURCE.GUIDED_INTAKE, campaign: { gclid: "G_REPLAY" }, consent: true });
  await applyConversionReport({ leadId: r.lead.leadId, reportToken: r.reportToken, status: TRACKING_STATUS.BROWSER_SENT });
  const replay = await applyConversionReport({
    leadId: r.lead.leadId,
    reportToken: r.reportToken,
    status: TRACKING_STATUS.BROWSER_SENT,
  });
  assert(replay.duplicate === true, "replay duplicate");
}

// Reconcile auth: event alone fails; secret required for HTTP
{
  process.env.SPARKLEAN_RECONCILE_KEY = "expected-reconcile-secret-ok";
  assert(
    isReconcileHttpAuthorized({
      headers: { get: (n) => (n === "x-netlify-event" ? "schedule" : null) },
    }) === false,
    "event header alone is not HTTP auth"
  );
  assert(
    (await isReconcileAuthorized({
      headers: { get: (n) => (n === "x-netlify-event" ? "schedule" : null) },
      text: async () => "",
      clone() {
        return this;
      },
    })) === false,
    "schedule event alone unauthorized"
  );
  assert(
    isReconcileHttpAuthorized({
      headers: { get: (n) => (n === "x-sparklean-reconcile-key" ? "expected-reconcile-secret-ok" : null) },
    }) === true,
    "HTTP secret authorized"
  );
  assert(
    (await isAuthenticNetlifySchedule({
      headers: {
        get(n) {
          if (n === "x-netlify-event") return "schedule";
          if (n === "x-nf-request-id") return "req-1";
          if (n === "origin") return null;
          return null;
        },
      },
      text: async () => JSON.stringify({ next_run: "2026-08-12T00:00:00Z" }),
      clone() {
        return this;
      },
    })) === true,
    "authentic schedule payload accepted"
  );
  assert(
    (await isAuthenticNetlifySchedule({
      headers: {
        get(n) {
          if (n === "x-netlify-event") return "schedule";
          if (n === "origin") return "https://evil.example";
          return null;
        },
      },
      text: async () => JSON.stringify({ next_run: "x" }),
      clone() {
        return this;
      },
    })) === false,
    "schedule with Origin rejected"
  );
  delete process.env.SPARKLEAN_RECONCILE_KEY;
}

// Complete blocked-script case (attribution without SparkleanAds)
{
  resetMemoryStoreForTests();
  const attrSrc = fs.readFileSync(path.join(root, "js/sparklean-attribution.js"), "utf8");
  const store = new Map();
  const reports = [];
  const sandbox = {
    window: { location: { search: "?gclid=BLOCKED_SCRIPT_GCLID&gbraid=GBLOCKED" } },
    sessionStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    document: {
      createElement(tag) {
        return { className: "", setAttribute() {}, textContent: "", tagName: tag, appendChild() {} };
      },
    },
    URLSearchParams,
    fetch(url, init) {
      const body = init && init.body ? JSON.parse(init.body) : {};
      reports.push(body);
      return applyConversionReport(body).then((r) => ({
        ok: r.ok,
        status: r.status || 200,
        text: async () => JSON.stringify({ ok: r.ok, trackingStatus: r.lead && r.lead.trackingStatus }),
      }));
    },
    console,
  };
  sandbox.window.sessionStorage = sandbox.sessionStorage;
  sandbox.window.document = sandbox.document;
  sandbox.window.fetch = sandbox.fetch;
  vm.runInNewContext(attrSrc, sandbox);
  assert(typeof sandbox.window.SparkleanAds === "undefined", "SparkleanAds absent in blocked case");
  const ids = sandbox.window.SparkleanAttribution.getStoredAdClickIds();
  assert(ids.gclid === "BLOCKED_SCRIPT_GCLID", "click ID captured without Ads helper");

  const { lead, reportToken } = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: ids,
    consent: true,
  });
  assert(lead.gclid === "BLOCKED_SCRIPT_GCLID", "lead accepted once with click id");

  const outcome = await sandbox.window.SparkleanAttribution.reportOfflineWhenAdsBlocked({
    leadId: lead.leadId,
    reportToken,
  });
  assert(outcome.trackingStatus === "OFFLINE_QUEUED", "Blob/report → OFFLINE_QUEUED");
  assert((await getLead(lead.leadId)).trackingStatus === TRACKING_STATUS.OFFLINE_QUEUED, "durable OFFLINE_QUEUED");

  const host = { children: [], querySelector() { return null; }, appendChild(n) { this.children.push(n); } };
  sandbox.window.SparkleanAttribution.showTrackingDelayedMessage(host);
  assert(host.children.length === 1 && /delayed/i.test(host.children[0].textContent), "delayed message visible");

  const alertLead = await getLead(lead.leadId);
  const built = buildConversionGapAlertText(alertLead);
  assert(!built.text.includes(reportToken), "alert has no bearer token");
  assert(findSensitiveLeak(built.text).length === 0, "alert no PII/token leak");

  // Replay report — duplicate, no second lead
  const replay = await applyConversionReport({
    leadId: lead.leadId,
    reportToken,
    status: TRACKING_STATUS.OFFLINE_QUEUED,
  });
  assert(replay.ok === true, "replay report ok");
  // Idempotent submit map
  await putIdempotentLeadId("idem-blocked-1", lead.leadId);
  assert((await getIdempotentLeadId("idem-blocked-1")) === lead.leadId, "idempotency prevents duplicate lead key");
}

// Alert allowlist
{
  resetMemoryStoreForTests();
  const { lead, reportToken } = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "G_ALERT" },
    consent: true,
  });
  lead.trackingStatus = TRACKING_STATUS.OFFLINE_QUEUED;
  lead.failureReason = "x";
  lead.email = "customer@example.com";
  lead.retryPayload = buildRetryPayload(lead);
  lead.retryPayload.reportToken = reportToken;
  const built = buildConversionGapAlertText(lead);
  assert(!built.text.includes(reportToken), "no token in alert");
  assert(!built.text.includes("customer@example.com"), "no email in alert");
}

console.log(`\nADVERSARIAL RESULTS: pass=${passed} fail=${failed} skip=${skipped}`);
process.exit(failed ? 1 : 0);
