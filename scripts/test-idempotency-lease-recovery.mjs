/**
 * BlobsServer proofs: real claim leases, outbox fencing, reconciliation,
 * material/outbox binding — controllable clock + fresh module reload.
 * Run: node scripts/test-idempotency-lease-recovery.mjs
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { getStore } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storeUrl = pathToFileURL(path.join(root, "netlify/functions/lib/leads-store.mjs")).href;
const alertsUrl = pathToFileURL(path.join(root, "netlify/functions/lib/conversion-alerts.mjs")).href;

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

async function loadStore(bust) {
  return import(`${storeUrl}?v=${bust}`);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sparklean-fence-"));
const token = "sparklean-fence-token";
const server = new BlobsServer({ token, port: 0, directory: dir });
const info = await server.start();
const rawStore = getStore({
  name: "sparklean-leads",
  token,
  edgeURL: `http://localhost:${info.port}`,
  siteID: "sparklean-fence-site",
});

process.env.SPARKLEAN_IDEMPOTENCY_LEASE_MS = "10000";
process.env.SPARKLEAN_OUTBOX_SEND_LEASE_MS = "10000";
delete process.env.SPARKLEAN_LEADS_MEMORY;

let mod = await loadStore(Date.now());
mod.setInjectedBlobStoreForTests(mod.wrapBlobStoreWithEtagCache(rawStore));
mod.setStoreClockForTests(1_000_000);
mod.resetLeadsStoreTestHooks();

const INTAKE = mod.INTAKE_SOURCE;
let brevoCalls = 0;
const sendBrevo = async () => {
  brevoCalls += 1;
};

try {
  // --- Active lease cannot be reclaimed; after expiry reclaim succeeds ---
  const idem = `lease-clock-${Date.now()}`;
  const material = { fullName: "Lease User", email: "lease@example.com", phone: "2395550100" };
  const materialHash = mod.canonicalMaterialHash(material);
  mod.leadsStoreTestHooks.afterClaimBeforeCreate = async () => {
    throw new Error("INJECTED_CRASH_AFTER_CLAIM");
  };
  let crashed = false;
  try {
    await mod.createLeadAtomically({
      intakeSource: INTAKE.CONTACT_FORM,
      campaign: { gclid: "L1" },
      consent: true,
      idempotencyKey: idem,
      materialHash,
      material,
    });
  } catch (e) {
    crashed = String(e && e.message).includes("INJECTED_CRASH_AFTER_CLAIM");
  }
  assert(crashed, "injected crash after claim before create");
  mod.resetLeadsStoreTestHooks();

  let denied = false;
  try {
    await mod.createLeadAtomically({
      intakeSource: INTAKE.CONTACT_FORM,
      campaign: { gclid: "L1" },
      consent: true,
      idempotencyKey: idem,
      materialHash,
      material,
    });
  } catch (e) {
    denied = e && e.code === "IDEMPOTENCY_IN_FLIGHT";
  }
  assert(denied, "retry before lease expiry → IDEMPOTENCY_IN_FLIGHT");

  mod.setStoreClockForTests(1_000_000 + 11_000);
  const recovered = await mod.createLeadAtomically({
    intakeSource: INTAKE.CONTACT_FORM,
    campaign: { gclid: "L1" },
    consent: true,
    idempotencyKey: idem,
    materialHash,
    material,
  });
  assert(Boolean(recovered.lead?.leadId), "retry after expiry creates one lead");
  assert(Boolean(recovered.reportToken), "usable reportToken after reclaim");
  assert(recovered.pendingHydration == null, "never pendingHydration");

  // --- Twelve concurrent post-expiry reclaim attempts → one lead ---
  const idem12 = `lease-12-${Date.now()}`;
  const mat12 = { fullName: "Twelve", email: "twelve@example.com", phone: "2395550112" };
  const mh12 = mod.canonicalMaterialHash(mat12);
  mod.setStoreClockForTests(2_000_000);
  mod.leadsStoreTestHooks.afterClaimBeforeCreate = async () => {
    throw new Error("INJECTED_CRASH_12");
  };
  try {
    await mod.createLeadAtomically({
      intakeSource: INTAKE.CONTACT_FORM,
      campaign: { gclid: "T12" },
      consent: true,
      idempotencyKey: idem12,
      materialHash: mh12,
      material: mat12,
    });
  } catch {
    /* crash */
  }
  mod.resetLeadsStoreTestHooks();
  mod.setStoreClockForTests(2_000_000 + 11_000);

  const results = await Promise.allSettled(
    Array.from({ length: 12 }, () =>
      mod.createLeadAtomically({
        intakeSource: INTAKE.CONTACT_FORM,
        campaign: { gclid: "T12" },
        consent: true,
        idempotencyKey: idem12,
        materialHash: mh12,
        material: mat12,
      })
    )
  );
  const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const leadIds = new Set(ok.map((r) => r.lead.leadId));
  assert(leadIds.size === 1, `twelve reclaimers → exactly one leadId (got ${leadIds.size})`);
  assert(ok.length >= 1, "at least one reclaim winner");
  const stored = await mod.getLead([...leadIds][0]);
  assert(Boolean(stored), "single durable lead exists");

  // --- Material conflict + attribution exclusion ---
  let conflict = false;
  try {
    await mod.createLeadAtomically({
      intakeSource: INTAKE.CONTACT_FORM,
      campaign: { gclid: "T12" },
      consent: true,
      idempotencyKey: idem12,
      materialHash: mod.canonicalMaterialHash({ ...mat12, phone: "2395550999" }),
      material: { ...mat12, phone: "2395550999" },
    });
  } catch (e) {
    conflict = e && e.code === "IDEMPOTENCY_MATERIAL_CONFLICT";
  }
  assert(conflict, "same key + different material → IDEMPOTENCY_MATERIAL_CONFLICT");

  const baseQ = {
    answers: {
      fullName: "Q",
      phone: "2395550200",
      email: "q@example.com",
      location: "34102",
      serviceCategory: "residential",
      bedrooms: "3",
      bathrooms: "2",
      frequency: "weekly",
      notesResidential: "pets",
    },
    serviceLabel: "Residential cleaning",
    intakeSource: INTAKE.GUIDED_INTAKE,
    campaign: { gclid: "ATTR1" },
  };
  const h1 = mod.canonicalMaterialHash(baseQ);
  const h2 = mod.canonicalMaterialHash({ ...baseQ, campaign: { gclid: "ATTR2" }, gclid: "X" });
  assert(h1 === h2, "attribution metadata excluded from material hash");
  for (const f of ["frequency", "bathrooms", "bedrooms", "notesResidential", "location", "serviceCategory"]) {
    const mutated = {
      ...baseQ,
      answers: { ...baseQ.answers, [f]: String(baseQ.answers[f]) + "-x" },
    };
    assert(mod.canonicalMaterialHash(mutated) !== h1, `quote field mutation ${f} changes hash`);
  }

  // --- Outbox payload mismatch rejected ---
  await mod.ensureOutboxPending(stored.leadId, { payloadHash: "hash-a" });
  let payloadConflict = false;
  try {
    await mod.ensureOutboxPending(stored.leadId, { payloadHash: "hash-b" });
  } catch (e) {
    payloadConflict = e && e.code === "OUTBOX_PAYLOAD_CONFLICT";
  }
  assert(payloadConflict, "outbox payload mismatch rejected");

  // --- Stale sender cannot mark newer lease DELIVERED / FAILED ---
  const leadStale = (
    await mod.createLead({
      intakeSource: INTAKE.CONTACT_FORM,
      campaign: { gclid: "STALE" },
      consent: true,
    })
  ).lead;
  await mod.ensureOutboxPending(leadStale.leadId, { payloadHash: "ph-stale" });
  mod.setStoreClockForTests(3_000_000);

  let staleOwner = null;
  let staleFence = null;
  mod.leadsStoreTestHooks.afterOutboxBeforeSend = async (ctx) => {
    staleOwner = ctx.sendLeaseOwner;
    staleFence = ctx.sendFence;
    throw new Error("PAUSE_STALE_SENDER");
  };
  try {
    await mod.deliverOutbox(leadStale.leadId, sendBrevo, { payloadHash: "ph-stale" });
  } catch (e) {
    assert(String(e.message).includes("PAUSE_STALE_SENDER"), "captured stale sender lease");
  }
  mod.resetLeadsStoreTestHooks();
  mod.setStoreClockForTests(3_000_000 + 11_000);
  brevoCalls = 0;
  const takeover = await mod.deliverOutbox(leadStale.leadId, sendBrevo, { payloadHash: "ph-stale" });
  assert(takeover.delivered === true && brevoCalls === 1, "newer lease delivered once");

  const staleDeliver = await mod.fenceOutboxTransition(
    leadStale.leadId,
    { sendLeaseOwner: staleOwner, sendFence: staleFence },
    (d) => ({ ...d, status: mod.OUTBOX_STATUS.DELIVERED })
  );
  assert(staleDeliver.ok === false && staleDeliver.stale === true, "stale sender cannot mark DELIVERED");
  const staleFail = await mod.fenceOutboxTransition(
    leadStale.leadId,
    { sendLeaseOwner: staleOwner, sendFence: staleFence },
    (d) => ({ ...d, status: mod.OUTBOX_STATUS.FAILED, lastError: "stale" })
  );
  assert(staleFail.ok === false && staleFail.stale === true, "stale sender cannot mark FAILED");
  assert((await mod.getOutbox(leadStale.leadId)).status === mod.OUTBOX_STATUS.DELIVERED, "newer lease stays DELIVERED");

  // --- Brevo success + failed durable ack → reconciliation-required (not completed) ---
  const leadAmb = (
    await mod.createLead({
      intakeSource: INTAKE.GUIDED_INTAKE,
      campaign: { gclid: "AMB" },
      consent: true,
    })
  ).lead;
  await mod.ensureOutboxPending(leadAmb.leadId, { payloadHash: "ph-amb" });
  mod.setStoreClockForTests(4_000_000);
  brevoCalls = 0;
  mod.resetLeadsStoreTestHooks();
  mod.leadsStoreTestHooks.afterSendBeforeAck = async ({ leadId, sendLeaseOwner, sendFence }) => {
    const r = await mod.fenceOutboxTransition(leadId, { sendLeaseOwner, sendFence }, (d) => ({
      ...d,
      status: mod.OUTBOX_STATUS.RECONCILIATION_REQUIRED,
      lastError: "brevo_accepted_delivery_ack_unconfirmed",
    }));
    assert(r.ok === true, "recon state written under valid fence");
    throw new mod.DeliveryAmbiguousError();
  };
  let ambiguous = false;
  try {
    await mod.deliverOutbox(leadAmb.leadId, sendBrevo, { payloadHash: "ph-amb" });
  } catch (e) {
    ambiguous = e && e.code === "DELIVERY_RECONCILIATION_REQUIRED";
  }
  assert(ambiguous, "successful Brevo + failed ack → DELIVERY_RECONCILIATION_REQUIRED");
  assert(brevoCalls === 1, "Brevo invoked once before ambiguous");
  assert(
    (await mod.getOutbox(leadAmb.leadId)).status === mod.OUTBOX_STATUS.RECONCILIATION_REQUIRED,
    "outbox RECONCILIATION_REQUIRED not DELIVERED"
  );

  const r1 = await mod.reconcileOutboxDelivered(leadAmb.leadId);
  assert(r1.status === mod.OUTBOX_STATUS.DELIVERED, "reconcile → DELIVERED");
  const r2 = await mod.reconcileOutboxDelivered(leadAmb.leadId);
  assert(r2.status === mod.OUTBOX_STATUS.DELIVERED, "reconcile idempotent");

  // --- Alert omits PII / tokens; semantics honest ---
  const alerts = await import(`${alertsUrl}?v=${Date.now()}`);
  const built = alerts.buildDeliveryAmbiguousAlertText({
    leadId: leadAmb.leadId,
    intakeSource: INTAKE.CONTACT_FORM,
  });
  assert(!/reportToken|@example|5550|password|api-key/i.test(built.text), "alert has no PII/secrets/tokens");
  assert(/at-least-once-ambiguous/i.test(built.text), "alert states at-least-once-ambiguous");
  assert(mod.BREVO_DELIVERY_SEMANTICS.exactlyOnce === false, "Brevo not labeled exactly-once");

  // --- Contact vs quote cross-flow identity remains distinct ---
  const contactMat = mod.canonicalMaterialHash({
    fullName: "Same",
    phone: "2395550300",
    email: "same@example.com",
    propertyType: "home",
    serviceNeeded: "residential",
    cityArea: "Naples",
    preferredTiming: "flex",
    message: "hi",
    intakeSource: INTAKE.CONTACT_FORM,
  });
  const quoteMat = mod.canonicalMaterialHash({
    answers: {
      fullName: "Same",
      phone: "2395550300",
      email: "same@example.com",
      location: "Naples",
      serviceCategory: "residential",
    },
    serviceLabel: "Residential cleaning",
    intakeSource: INTAKE.GUIDED_INTAKE,
  });
  assert(contactMat !== quoteMat, "contact vs quote material hashes differ");

  // Fresh module reload
  mod.setInjectedBlobStoreForTests(null);
  mod = await loadStore(Date.now() + 99);
  mod.setInjectedBlobStoreForTests(mod.wrapBlobStoreWithEtagCache(rawStore));
  mod.setStoreClockForTests(7_000_000);
  assert(
    (await mod.getOutbox(leadAmb.leadId)).status === mod.OUTBOX_STATUS.DELIVERED,
    "fresh module sees reconciled DELIVERED"
  );
} finally {
  if (mod) {
    mod.resetLeadsStoreTestHooks();
    mod.setStoreClockForTests(null);
    mod.setInjectedBlobStoreForTests(null);
  }
  await server.stop();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

console.log(`\nLEASE/FENCE RESULTS: pass=${passed} fail=${failed}`);
process.exit(failed ? 1 : 0);
