/**
 * BlobsServer proofs: claim lease recovery, material conflict, durable outbox,
 * across a fresh module reload (simulates function restart).
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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sparklean-lease-"));
const token = "sparklean-lease-token";
const server = new BlobsServer({ token, port: 0, directory: dir });
const info = await server.start();
const rawStore = getStore({
  name: "sparklean-leads",
  token,
  edgeURL: `http://localhost:${info.port}`,
  siteID: "sparklean-lease-site",
});

process.env.SPARKLEAN_IDEMPOTENCY_LEASE_MS = "500";
process.env.SPARKLEAN_OUTBOX_SEND_LEASE_MS = "500";
delete process.env.SPARKLEAN_LEADS_MEMORY;

let mod = await loadStore(Date.now());
const wrapped = mod.wrapBlobStoreWithEtagCache(rawStore);
mod.setInjectedBlobStoreForTests(wrapped);

const INTAKE = mod.INTAKE_SOURCE;
let brevoCalls = 0;
const sendBrevo = async () => {
  brevoCalls += 1;
};

try {
  // --- Crash after claim, before create; fresh module restart; identical retry ---
  const idem = `crash-claim-${Date.now()}`;
  const material = {
    fullName: "Recovery User",
    phone: "2395550199",
    email: "recover@example.com",
    cityArea: "Naples",
  };
  const materialHash = mod.canonicalMaterialHash(material);

  mod.leadsStoreTestHooks.afterClaimBeforeCreate = async () => {
    throw new Error("INJECTED_CRASH_AFTER_CLAIM");
  };

  let crashed = false;
  try {
    await mod.createLeadAtomically({
      intakeSource: INTAKE.CONTACT_FORM,
      campaign: { gclid: "CRASH1" },
      consent: true,
      idempotencyKey: idem,
      materialHash,
      material,
    });
  } catch (e) {
    crashed = String(e && e.message).includes("INJECTED_CRASH_AFTER_CLAIM");
  }
  assert(crashed, "injected crash after claim before create");
  assert((await mod.getLead(await mod.getIdempotentLeadId(idem))) == null, "no lead after crash");

  // Fresh module reload (function restart) — Blob data persists on BlobsServer
  mod.resetLeadsStoreTestHooks();
  mod.setInjectedBlobStoreForTests(null);
  mod = await loadStore(Date.now() + 1);
  mod.setInjectedBlobStoreForTests(mod.wrapBlobStoreWithEtagCache(rawStore));
  mod.resetLeadsStoreTestHooks();

  const recovered = await mod.createLeadAtomically({
    intakeSource: INTAKE.CONTACT_FORM,
    campaign: { gclid: "CRASH1" },
    consent: true,
    idempotencyKey: idem,
    materialHash,
    material,
  });
  assert(Boolean(recovered.lead && recovered.lead.leadId), "retry creates exactly one lead");
  assert(Boolean(recovered.reportToken), "retry returns usable reportToken");
  assert(recovered.pendingHydration !== true, "never pendingHydration");
  assert(mod.verifyReportToken(recovered.lead, recovered.reportToken), "reportToken verifies");

  await mod.ensureOutboxPending(recovered.lead.leadId, { payloadHash: "ph1" });
  const d1 = await mod.deliverOutbox(recovered.lead.leadId, sendBrevo);
  assert(d1.sent === true && brevoCalls === 1, "Brevo sent once after recovery");
  await mod.markClaimComplete(idem);

  const replay = await mod.createLeadAtomically({
    intakeSource: INTAKE.CONTACT_FORM,
    campaign: { gclid: "CRASH1" },
    consent: true,
    idempotencyKey: idem,
    materialHash,
    material,
  });
  assert(replay.idempotentReplay === true, "complete replay is idempotent");
  assert(replay.needsDelivery === false, "delivered outbox skips needsDelivery");
  assert(replay.lead.leadId === recovered.lead.leadId, "replay same leadId");
  const d2 = await mod.deliverOutbox(replay.lead.leadId, sendBrevo);
  assert(d2.duplicate === true && brevoCalls === 1, "outbox DELIVERED prevents duplicate Brevo");

  // --- Material conflict ---
  let conflict = false;
  try {
    await mod.createLeadAtomically({
      intakeSource: INTAKE.CONTACT_FORM,
      campaign: { gclid: "CRASH1" },
      consent: true,
      idempotencyKey: idem,
      materialHash: mod.canonicalMaterialHash({ ...material, email: "other@example.com" }),
      material: { ...material, email: "other@example.com" },
    });
  } catch (e) {
    conflict = e && e.code === "IDEMPOTENCY_MATERIAL_CONFLICT";
  }
  assert(conflict, "same key + different material → IDEMPOTENCY_MATERIAL_CONFLICT");

  // --- Crash before Brevo (after outbox enqueue) ---
  brevoCalls = 0;
  const idem2 = `crash-brevo-${Date.now()}`;
  const material2 = { fullName: "Outbox User", email: "outbox@example.com", phone: "2395550111" };
  const mh2 = mod.canonicalMaterialHash(material2);
  const created2 = await mod.createLeadAtomically({
    intakeSource: INTAKE.CONTACT_FORM,
    campaign: { gclid: "OB1" },
    consent: true,
    idempotencyKey: idem2,
    materialHash: mh2,
    material: material2,
  });
  await mod.ensureOutboxPending(created2.lead.leadId, { payloadHash: "ph2" });
  mod.leadsStoreTestHooks.afterOutboxBeforeSend = async () => {
    throw new Error("INJECTED_CRASH_BEFORE_BREVO");
  };
  let beforeBrevoCrash = false;
  try {
    await mod.deliverOutbox(created2.lead.leadId, sendBrevo);
  } catch (e) {
    beforeBrevoCrash = String(e && e.message).includes("INJECTED_CRASH_BEFORE_BREVO");
  }
  assert(beforeBrevoCrash, "crash before Brevo");
  assert(brevoCalls === 0, "no Brevo on pre-send crash");

  mod.resetLeadsStoreTestHooks();
  mod.setInjectedBlobStoreForTests(null);
  mod = await loadStore(Date.now() + 2);
  mod.setInjectedBlobStoreForTests(mod.wrapBlobStoreWithEtagCache(rawStore));
  // Expire send lease so restart can reclaim SENDING
  process.env.SPARKLEAN_OUTBOX_SEND_LEASE_MS = "1";
  await new Promise((r) => setTimeout(r, 20));

  const d3 = await mod.deliverOutbox(created2.lead.leadId, sendBrevo);
  assert(d3.sent === true && brevoCalls === 1, "restart delivers Brevo exactly once after pre-send crash");
  const box3 = await mod.getOutbox(created2.lead.leadId);
  assert(box3.status === mod.OUTBOX_STATUS.DELIVERED, "outbox DELIVERED after recovery send");

  // --- Crash after Brevo before ack ---
  brevoCalls = 0;
  process.env.SPARKLEAN_OUTBOX_SEND_LEASE_MS = "500";
  const idem3 = `crash-ack-${Date.now()}`;
  const material3 = { fullName: "Ack User", email: "ack@example.com", phone: "2395550222" };
  const mh3 = mod.canonicalMaterialHash(material3);
  const created3 = await mod.createLeadAtomically({
    intakeSource: INTAKE.GUIDED_INTAKE,
    campaign: { gclid: "ACK1" },
    consent: true,
    idempotencyKey: idem3,
    materialHash: mh3,
    material: material3,
  });
  await mod.ensureOutboxPending(created3.lead.leadId, { payloadHash: "ph3" });
  mod.leadsStoreTestHooks.afterSendBeforeAck = async () => {
    throw new Error("INJECTED_CRASH_AFTER_BREVO_BEFORE_ACK");
  };
  let afterBrevoCrash = false;
  try {
    await mod.deliverOutbox(created3.lead.leadId, sendBrevo);
  } catch (e) {
    afterBrevoCrash = String(e && e.message).includes("INJECTED_CRASH_AFTER_BREVO_BEFORE_ACK");
  }
  assert(afterBrevoCrash, "crash after Brevo before ack");
  assert(brevoCalls === 1, "Brevo already invoked once before ack crash");

  mod.resetLeadsStoreTestHooks();
  mod.setInjectedBlobStoreForTests(null);
  mod = await loadStore(Date.now() + 3);
  mod.setInjectedBlobStoreForTests(mod.wrapBlobStoreWithEtagCache(rawStore));
  process.env.SPARKLEAN_OUTBOX_SEND_LEASE_MS = "1";
  await new Promise((r) => setTimeout(r, 20));

  const callsBeforeAckRetry = brevoCalls;
  const d4 = await mod.deliverOutbox(created3.lead.leadId, sendBrevo);
  assert(d4.delivered === true, "ack-recovery reaches DELIVERED");
  // Controlled at-most-one extra send if SENDING lease expired without ack — not uncontrolled duplicates
  assert(brevoCalls - callsBeforeAckRetry <= 1, "ack recovery does not uncontrolled-duplicate Brevo");
  const box4 = await mod.getOutbox(created3.lead.leadId);
  assert(box4.status === mod.OUTBOX_STATUS.DELIVERED, "outbox DELIVERED after ack recovery");
  const d5 = await mod.deliverOutbox(created3.lead.leadId, sendBrevo);
  assert(d5.duplicate === true, "subsequent deliver is duplicate no-op");

  // pendingHydration must not appear on createLeadAtomically results
  assert(
    recovered.pendingHydration == null && replay.pendingHydration == null,
    "createLeadAtomically never returns pendingHydration"
  );
} finally {
  if (mod) {
    mod.resetLeadsStoreTestHooks();
    mod.setInjectedBlobStoreForTests(null);
  }
  await server.stop();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

console.log(`\nLEASE RECOVERY RESULTS: pass=${passed} fail=${failed}`);
process.exit(failed ? 1 : 0);
