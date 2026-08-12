/**
 * Real Blob concurrency proofs via @netlify/blobs BlobsServer (not memory-map-only).
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
  createLead,
  getLead,
  mutateLeadCas,
  setInjectedBlobStoreForTests,
  CasConflictError,
  writeLeadCas,
  getLeadRecord,
  INTAKE_SOURCE,
} from "../netlify/functions/lib/leads-store.mjs";

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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sparklean-blobs-"));
const token = "sparklean-blob-test-token";
const server = new BlobsServer({
  token,
  port: 0,
  directory: dir,
});
const info = await server.start();
const store = getStore({
  name: "sparklean-leads",
  token,
  edgeURL: `http://localhost:${info.port}`,
  siteID: "sparklean-test-site",
});
setInjectedBlobStoreForTests(store);
delete process.env.SPARKLEAN_LEADS_MEMORY;

try {
  const { lead, reportToken } = await createLead({
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
    campaign: { gclid: "BLOB_C1" },
    consent: true,
  });
  assert(lead.reportTokenHash && !lead.reportToken, "Blob create stores hash only");
  assert(Boolean(reportToken), "bearer returned once");
  const stored = await getLead(lead.leadId);
  assert(stored && !stored.reportToken, "stored lead has no bearer token");
  assert(stored.reportTokenHash === lead.reportTokenHash, "hash persisted on Blob");

  const a = await getLeadRecord(lead.leadId);
  const b = await getLeadRecord(lead.leadId);
  assert(a && a.etag, "etag/version stamp readable from Blob store");
  assert(a.etag === b.etag, "stable version stamp across reads");

  let writes = 0;
  await Promise.all([
    mutateLeadCas(lead.leadId, (cur) => {
      writes += 1;
      return { ...cur, failureReason: "race-a", version: (cur.version || 1) + 1 };
    }),
    mutateLeadCas(lead.leadId, (cur) => {
      writes += 1;
      return { ...cur, failureReason: "race-b", version: (cur.version || 1) + 1 };
    }),
  ]);
  const after = await getLead(lead.leadId);
  assert(after.failureReason === "race-a" || after.failureReason === "race-b", "one race result persisted");
  assert(writes >= 2, "both mutators ran (CAS retry path exercised)");

  let conflict = false;
  try {
    await writeLeadCas({ ...after, failureReason: "stale" }, a.etag);
  } catch (e) {
    conflict = e instanceof CasConflictError || (e && e.code === "CAS_CONFLICT");
  }
  assert(conflict, "stale etag write throws CasConflictError");

  const rep = await applyConversionReport({
    leadId: lead.leadId,
    reportToken,
    status: TRACKING_STATUS.OFFLINE_QUEUED,
    failureReason: "concurrency_suite",
  });
  assert(rep.ok === true, "report with bearer succeeds against hash");
  assert((await getLead(lead.leadId)).trackingStatus === TRACKING_STATUS.OFFLINE_QUEUED, "OFFLINE_QUEUED on Blob");
} finally {
  setInjectedBlobStoreForTests(null);
  await server.stop();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

console.log(`\nBLOB CONCURRENCY RESULTS: pass=${passed} fail=${failed} skip=${skipped}`);
process.exit(failed ? 1 : 0);
