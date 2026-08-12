/**
 * Unit tests for leads-store state machine (memory backend).
 * Run: SPARKLEAN_LEADS_MEMORY=1 node scripts/test-leads-store.mjs
 */
process.env.SPARKLEAN_LEADS_MEMORY = "1";

import {
  INTAKE_SOURCE,
  TRACKING_STATUS,
  applyConversionReport,
  createLead,
  isGoogleAttributed,
  listUnresolvedGoogleAttributed,
  markOfflineQueued,
  resetMemoryStoreForTests,
  updateLead,
} from "../netlify/functions/lib/leads-store.mjs";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  ", msg);
  }
}

resetMemoryStoreForTests();

{
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "GCLICK1" },
    consent: true,
  });
  assert(lead.trackingStatus === TRACKING_STATUS.PENDING, "create → PENDING");
  assert(lead.transactionId === lead.leadId, "transactionId = leadId");
  assert(lead.gclid === "GCLICK1", "gclid stored with consent");
  assert(Boolean(lead.reportToken), "reportToken issued");
  assert(isGoogleAttributed(lead), "Google-attributed when gclid + consent");

  const bad = await applyConversionReport({
    leadId: lead.leadId,
    reportToken: "wrong",
    status: TRACKING_STATUS.BROWSER_SENT,
  });
  assert(bad.ok === false && bad.status === 401, "bad reportToken → 401");

  const sent = await applyConversionReport({
    leadId: lead.leadId,
    reportToken: lead.reportToken,
    status: TRACKING_STATUS.BROWSER_SENT,
  });
  assert(sent.ok === true, "BROWSER_SENT report ok");
  assert(sent.lead.trackingStatus === TRACKING_STATUS.BROWSER_SENT, "status BROWSER_SENT");
  assert(sent.lead.trackingStatus !== "CONFIRMED", "never CONFIRMED label");
}

resetMemoryStoreForTests();

{
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.GUIDED_INTAKE,
    campaign: { gbraid: "GB1" },
    consent: true,
  });
  const queued = await applyConversionReport({
    leadId: lead.leadId,
    reportToken: lead.reportToken,
    status: TRACKING_STATUS.OFFLINE_QUEUED,
    failureReason: "gtag_unavailable",
  });
  assert(queued.lead.trackingStatus === TRACKING_STATUS.OFFLINE_QUEUED, "OFFLINE_QUEUED set");
  assert(queued.lead.retryPayload && queued.lead.retryPayload.leadId === lead.leadId, "retryPayload present");
  assert(queued.lead.retryPayload.gbraid === "GB1", "retryPayload keeps click id");
}

resetMemoryStoreForTests();

{
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.GUIDED_INTAKE,
    campaign: { wbraid: "WB1" },
    consent: false,
  });
  assert(!isGoogleAttributed(lead), "no attribution without consent");
  assert(lead.wbraid == null, "click ids omitted without consent");
}

resetMemoryStoreForTests();

{
  const lead = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "STALE1" },
    consent: true,
  });
  await updateLead(lead.leadId, {
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  });

  const stale = await listUnresolvedGoogleAttributed({ maxAgeMs: 15 * 60 * 1000 });
  assert(stale.some((l) => l.leadId === lead.leadId), "stale PENDING Google lead listed");

  const marked = await markOfflineQueued(lead.leadId, "reconcile_pending_timeout");
  assert(marked.trackingStatus === TRACKING_STATUS.OFFLINE_QUEUED, "reconcile → OFFLINE_QUEUED");
  assert(marked.retryPayload, "reconcile retry payload");
}

console.log(failed ? `\nFAILED: ${failed}` : "\nALL LEADS-STORE TESTS PASSED");
process.exit(failed ? 1 : 0);
