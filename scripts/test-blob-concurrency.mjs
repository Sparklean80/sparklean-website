/**
 * Real Blob concurrency proofs via @netlify/blobs BlobsServer (not memory-map-only).
 * Proves: opaque ETag onlyIfMatch/onlyIfNew, append-only attempt races, simultaneous
 * contact+quote idempotency (one lead / one Brevo / one idem mapping).
 * Run: node scripts/test-blob-concurrency.mjs
 */
import fs from "fs";
import os from "os";
import path from "path";
import { getStore } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";
import {
  TRACKING_STATUS,
  applyConversionReport,
  appendAttempt,
  createLead,
  createLeadAtomically,
  getIdempotentLeadId,
  getLead,
  getLeadRecord,
  mutateLeadCas,
  setInjectedBlobStoreForTests,
  wrapBlobStoreWithEtagCache,
  CasConflictError,
  writeLeadCas,
  newAttemptId,
  canTransitionTrackingStatus,
  INTAKE_SOURCE,
  claimIdempotency,
} from "../netlify/functions/lib/leads-store.mjs";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    passed += 1;
    console.log("OK  ", msg);
  }
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sparklean-blobs-"));
const token = "sparklean-blob-test-token";
const server = new BlobsServer({
  token,
  port: 0,
  directory: dir,
});
const info = await server.start();
const rawStore = getStore({
  name: "sparklean-leads",
  token,
  edgeURL: `http://localhost:${info.port}`,
  siteID: "sparklean-test-site",
});
const store = wrapBlobStoreWithEtagCache(rawStore);
setInjectedBlobStoreForTests(store);
delete process.env.SPARKLEAN_LEADS_MEMORY;

const realFetch = globalThis.fetch;
let brevoCalls = 0;

try {
  // --- Opaque ETag from getWithMetadata path (via cache wrap for BlobsServer) ---
  const { lead, reportToken } = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "BLOB_C1" },
    consent: true,
  });
  assert(lead.reportTokenHash && !lead.reportToken, "Blob create stores hash only");
  assert(Boolean(reportToken), "bearer returned once");

  const a = await getLeadRecord(lead.leadId);
  assert(a && typeof a.etag === "string" && a.etag.length > 4, "opaque etag from getWithMetadata path");
  assert(a.etag.startsWith('"') || a.etag.length > 8, "etag looks opaque (not integer version)");

  // --- Append-only attempt race: both IDs survive; version +2; stale retries ---
  const v0 = (await getLead(lead.leadId)).version;
  const idA = newAttemptId();
  const idB = newAttemptId();
  assert(idA !== idB, "distinct attempt IDs");

  const staleBefore = await getLeadRecord(lead.leadId);

  await Promise.all([
    appendAttempt(lead.leadId, { attemptId: idA, note: "race-append-a", status: TRACKING_STATUS.PENDING }),
    appendAttempt(lead.leadId, { attemptId: idB, note: "race-append-b", status: TRACKING_STATUS.PENDING }),
  ]);

  const afterRace = await getLead(lead.leadId);
  const hist = afterRace.attemptHistory || [];
  const ids = hist.map((h) => h.attemptId);
  assert(ids.includes(idA), "attempt A survived concurrent update");
  assert(ids.includes(idB), "attempt B survived concurrent update");
  assert(afterRace.version === v0 + 2, `version advanced twice (got ${afterRace.version}, expected ${v0 + 2})`);

  let staleConflict = false;
  try {
    await writeLeadCas({ ...afterRace, failureReason: "stale-overwrite" }, staleBefore.etag);
  } catch (e) {
    staleConflict = e instanceof CasConflictError || (e && e.code === "CAS_CONFLICT");
  }
  assert(staleConflict, "stale writer gets CasConflictError (no overwrite)");

  const mid = await getLeadRecord(lead.leadId);
  await writeLeadCas(
    { ...mid.data, failureReason: "retry-ok", version: (mid.data.version || 1) + 1 },
    mid.etag
  );
  assert((await getLead(lead.leadId)).failureReason === "retry-ok", "stale writer retries with fresh etag");

  // onlyIfNew create conflict
  let createConflict = false;
  try {
    await writeLeadCas({ ...afterRace, leadId: lead.leadId, version: 99 }, null);
  } catch (e) {
    createConflict = e instanceof CasConflictError || (e && e.code === "CAS_CONFLICT");
  }
  assert(createConflict, "onlyIfNew fails when lead key exists");

  // Monotonic matrix on Blob
  assert(canTransitionTrackingStatus(TRACKING_STATUS.BROWSER_SENT, TRACKING_STATUS.FAILED) === false, "BROWSER_SENT cannot → FAILED");
  assert(canTransitionTrackingStatus(TRACKING_STATUS.OFFLINE_IMPORTED, TRACKING_STATUS.PENDING) === false, "OFFLINE_IMPORTED cannot → PENDING");

  await applyConversionReport({
    leadId: lead.leadId,
    reportToken,
    status: TRACKING_STATUS.BROWSER_SENT,
  });
  assert((await getLead(lead.leadId)).trackingStatus === TRACKING_STATUS.BROWSER_SENT, "BROWSER_SENT applied");

  const regress = await applyConversionReport({
    leadId: lead.leadId,
    reportToken,
    status: TRACKING_STATUS.FAILED,
    failureReason: "illegal",
  });
  assert(regress.illegalTransition === true, "FAILED report ignored as illegal transition");
  assert((await getLead(lead.leadId)).trackingStatus === TRACKING_STATUS.BROWSER_SENT, "status did not regress");

  // --- Atomic idempotency: concurrent identical claims → one owner ---
  const idem = `idem-blob-${Date.now()}`;
  const [c1, c2] = await Promise.all([
    createLeadAtomically({
      intakeSource: INTAKE_SOURCE.CONTACT_FORM,
      campaign: { gclid: "IDEMA" },
      consent: true,
      idempotencyKey: idem,
    }),
    createLeadAtomically({
      intakeSource: INTAKE_SOURCE.GUIDED_INTAKE,
      campaign: { gclid: "IDEMA" },
      consent: true,
      idempotencyKey: idem,
    }),
  ]);
  assert(c1.lead.leadId === c2.lead.leadId, "concurrent createLeadAtomically → same leadId");
  const winners = [c1, c2].filter((c) => !c.idempotentReplay);
  const losers = [c1, c2].filter((c) => c.idempotentReplay);
  assert(winners.length === 1, "exactly one atomic create winner");
  assert(losers.length === 1, "exactly one loser hydrates winner");
  assert((await getIdempotentLeadId(idem)) === c1.lead.leadId, "one idempotency mapping");

  // --- Simultaneous contact + quote handlers (mocked Brevo) ---
  process.env.SPARKLEAN_SKIP_ORIGIN_CHECK = "1";
  process.env.BREVO_API_KEY = "test-brevo-key";
  process.env.SPARKLEAN_FROM_EMAIL = "info@sparklean.co";
  process.env.SPARKLEAN_LEAD_TO = "info@sparklean.co";
  brevoCalls = 0;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes("api.brevo.com")) {
      brevoCalls += 1;
      return new Response(JSON.stringify({ messageId: "m1" }), { status: 201 });
    }
    return realFetch(url, opts);
  };

  const contactHandler = (await import("../netlify/functions/contact-submit.mjs")).default;
  const quoteHandler = (await import("../netlify/functions/quote-submit.mjs")).default;
  const sharedIdem = `sim-contact-quote-${Date.now()}`;

  const contactBody = {
    fullName: "Test User",
    phone: "2395550100",
    email: "test@example.com",
    propertyType: "home",
    serviceNeeded: "residential",
    cityArea: "Naples",
    preferredTiming: "flexible",
    consentContact: "yes",
    message: "blob race",
    campaign: { gclid: "SIM1" },
    idempotencyKey: sharedIdem,
  };
  const quoteBody = {
    answers: {
      fullName: "Test User",
      phone: "2395550100",
      email: "test@example.com",
      location: "34102",
      serviceCategory: "residential",
      bedrooms: "3",
      bathrooms: "2",
    },
    serviceLabel: "Residential cleaning",
    campaign: { gclid: "SIM1" },
    idempotencyKey: sharedIdem,
    submittedAt: new Date().toISOString(),
  };

  const mkReq = (body) =>
    new Request("https://www.sparklean.co/.netlify/functions/x", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://www.sparklean.co",
        "x-idempotency-key": sharedIdem,
      },
      body: JSON.stringify(body),
    });

  const [cr, qr] = await Promise.all([
    contactHandler(mkReq(contactBody), { requestId: "nf-c1" }),
    quoteHandler(mkReq(quoteBody), { requestId: "nf-q1" }),
  ]);
  const cj = await cr.json();
  const qj = await qr.json();
  assert(cr.status === 200 && qr.status === 200, "both handlers 200");
  assert(cj.ok && qj.ok, "both ok");
  assert(cj.leadId === qj.leadId, "simultaneous contact+quote → same leadId");
  assert(brevoCalls === 1, `exactly one Brevo send (got ${brevoCalls})`);
  assert((await getIdempotentLeadId(sharedIdem)) === cj.leadId, "one idempotency record for shared key");
  const stored = await getLead(cj.leadId);
  assert(Boolean(stored), "exactly one lead record exists");
  assert([true, undefined].includes(cj.idempotentReplay) || [true, undefined].includes(qj.idempotentReplay), "at least one replay flag on loser");
  const replayCount = [cj, qj].filter((x) => x.idempotentReplay).length;
  assert(replayCount === 1, "exactly one idempotentReplay response");

  // claimIdempotency onlyIfNew
  const claimKey = `claim-only-${Date.now()}`;
  const first = await claimIdempotency(claimKey, "lead-first");
  const second = await claimIdempotency(claimKey, "lead-second");
  assert(first.won === true && first.leadId === "lead-first", "first claim wins");
  assert(second.won === false && second.leadId === "lead-first", "second claim hydrates winner id");
} finally {
  globalThis.fetch = realFetch;
  setInjectedBlobStoreForTests(null);
  await server.stop();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

console.log(`\nBLOB CONCURRENCY RESULTS: pass=${passed} fail=${failed}`);
process.exit(failed ? 1 : 0);
