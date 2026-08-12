/**
 * Durable lead / conversion tracking store (Netlify Blobs: sparklean-leads).
 * Conditional writes only: onlyIfNew (create) / onlyIfMatch (opaque ETag).
 * Never falls back to unconditional setJSON after a failed conditional write.
 */

import { getStore } from "@netlify/blobs";
import { randomBytes, timingSafeEqual } from "crypto";
import { hashToken } from "./request-guard.mjs";

export const STORE_NAME = "sparklean-leads";
export const IDEMPOTENCY_PREFIX = "idem:";

export const TRACKING_STATUS = Object.freeze({
  PENDING: "PENDING",
  BROWSER_SENT: "BROWSER_SENT",
  OFFLINE_QUEUED: "OFFLINE_QUEUED",
  OFFLINE_IMPORTED: "OFFLINE_IMPORTED",
  FAILED: "FAILED",
});

/** Monotonic allowed transitions. Terminal-ish states cannot regress. */
export const TRACKING_TRANSITIONS = Object.freeze({
  [TRACKING_STATUS.PENDING]: new Set([
    TRACKING_STATUS.BROWSER_SENT,
    TRACKING_STATUS.OFFLINE_QUEUED,
    TRACKING_STATUS.FAILED,
  ]),
  [TRACKING_STATUS.OFFLINE_QUEUED]: new Set([
    TRACKING_STATUS.BROWSER_SENT,
    TRACKING_STATUS.OFFLINE_IMPORTED,
    TRACKING_STATUS.FAILED,
  ]),
  [TRACKING_STATUS.FAILED]: new Set([
    TRACKING_STATUS.BROWSER_SENT,
    TRACKING_STATUS.OFFLINE_QUEUED,
    TRACKING_STATUS.OFFLINE_IMPORTED,
  ]),
  [TRACKING_STATUS.BROWSER_SENT]: new Set([TRACKING_STATUS.OFFLINE_IMPORTED]),
  [TRACKING_STATUS.OFFLINE_IMPORTED]: new Set([]),
});

export function canTransitionTrackingStatus(from, to) {
  if (from === to) return true;
  const allowed = TRACKING_TRANSITIONS[from];
  return Boolean(allowed && allowed.has(to));
}

export const INTAKE_SOURCE = Object.freeze({
  CONTACT_FORM: "CONTACT_FORM",
  GUIDED_INTAKE: "GUIDED_INTAKE",
});

export const CONVERSION_ACTION = "AW-17027441328/HnWnCJPRt9kcELDFqLc_";
export const REPORT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const RETRY_PAYLOAD_KEYS = Object.freeze([
  "leadId",
  "transactionId",
  "conversionAction",
  "gclid",
  "gbraid",
  "wbraid",
  "consent",
  "intakeSource",
  "trackingStatus",
  "createdAt",
  "updatedAt",
  "failureReason",
]);

export class CasConflictError extends Error {
  constructor(message = "CAS_CONFLICT") {
    super(message);
    this.name = "CasConflictError";
    this.code = "CAS_CONFLICT";
  }
}

export class IdempotencyMaterialConflictError extends Error {
  constructor(message = "IDEMPOTENCY_MATERIAL_CONFLICT") {
    super(message);
    this.name = "IdempotencyMaterialConflictError";
    this.code = "IDEMPOTENCY_MATERIAL_CONFLICT";
  }
}

export class IdempotencyInFlightError extends Error {
  constructor(message = "IDEMPOTENCY_IN_FLIGHT") {
    super(message);
    this.name = "IdempotencyInFlightError";
    this.code = "IDEMPOTENCY_IN_FLIGHT";
  }
}

export const CLAIM_STATUS = Object.freeze({
  CLAIMING: "claiming",
  LEASED: "leased",
  LEAD_READY: "lead_ready",
  COMPLETE: "complete",
});

export const OUTBOX_STATUS = Object.freeze({
  PENDING: "PENDING",
  SENDING: "SENDING",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
});

export const OUTBOX_PREFIX = "outbox:";
export const DEFAULT_CLAIM_LEASE_MS = 45_000;
export const DEFAULT_SEND_LEASE_MS = 60_000;

/** Test-only crash injection points (cleared between suites). */
export const leadsStoreTestHooks = {
  afterClaimBeforeCreate: null,
  afterOutboxBeforeSend: null,
  afterSendBeforeAck: null,
};

export function resetLeadsStoreTestHooks() {
  leadsStoreTestHooks.afterClaimBeforeCreate = null;
  leadsStoreTestHooks.afterOutboxBeforeSend = null;
  leadsStoreTestHooks.afterSendBeforeAck = null;
}

export function claimLeaseMs() {
  const n = Number(process.env.SPARKLEAN_IDEMPOTENCY_LEASE_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CLAIM_LEASE_MS;
}

export function sendLeaseMs() {
  const n = Number(process.env.SPARKLEAN_OUTBOX_SEND_LEASE_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SEND_LEASE_MS;
}

/** @type {Map<string, Map<string, { data: object, etag: string }>>} */
const memoryStores = new Map();
let injectedStore = null;

export function useMemory() {
  return process.env.SPARKLEAN_LEADS_MEMORY === "1" && !injectedStore;
}

export function resetMemoryStoreForTests() {
  memoryStores.clear();
}

export function setInjectedBlobStoreForTests(store) {
  injectedStore = store || null;
}

function contentFingerprint(data) {
  return JSON.stringify(data);
}

/**
 * BlobsServer often omits etag on getWithMetadata; cache WriteResult etags so
 * production-identical onlyIfMatch paths work in tests.
 * Only attach a cached etag when the read body matches the last successful write
 * (avoids pairing a fresh etag with a stale body → lost updates).
 */
export function wrapBlobStoreWithEtagCache(store) {
  /** @type {Map<string, { etag: string, fingerprint: string }>} */
  const meta = new Map();

  async function etagFromList(key) {
    try {
      const listed = await store.list();
      const blobs = (listed && listed.blobs) || [];
      const encoded = encodeURIComponent(key);
      for (const b of blobs) {
        if (!b || !b.etag) continue;
        if (b.key === key || b.key === encoded || decodeURIComponent(b.key) === key) {
          return b.etag;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  return {
    async get(key, opts) {
      return store.get(key, opts);
    },
    async getWithMetadata(key, opts) {
      for (let i = 0; i < 12; i++) {
        const r = await store.getWithMetadata(key, opts);
        if (!r || r.data == null) return r;
        if (r.etag) {
          meta.set(key, { etag: r.etag, fingerprint: contentFingerprint(r.data) });
          return r;
        }
        const cached = meta.get(key);
        const fp = contentFingerprint(r.data);
        if (cached && cached.fingerprint === fp) {
          return { ...r, etag: cached.etag };
        }
        const listedEtag = await etagFromList(key);
        if (listedEtag) {
          meta.set(key, { etag: listedEtag, fingerprint: fp });
          return { ...r, etag: listedEtag };
        }
        await new Promise((res) => setTimeout(res, 5 + i * 5));
      }
      throw new Error(`BLOB_ETAG_MISSING:${key}`);
    },
    async setJSON(key, data, opts) {
      const r = await store.setJSON(key, data, opts);
      if (r && r.modified && r.etag) {
        meta.set(key, { etag: r.etag, fingerprint: contentFingerprint(data) });
      }
      return r;
    },
    async delete(key) {
      meta.delete(key);
      return store.delete(key);
    },
    list(opts) {
      return store.list(opts);
    },
  };
}

function memoryMap() {
  if (!memoryStores.has(STORE_NAME)) memoryStores.set(STORE_NAME, new Map());
  return memoryStores.get(STORE_NAME);
}

function openStore() {
  if (injectedStore) return injectedStore;
  if (useMemory()) return null;
  return getStore(STORE_NAME);
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function newOpaqueEtag() {
  return `"${randomBytes(16).toString("hex")}"`;
}

/**
 * Read key with opaque ETag. Memory and Blob paths return the same shape.
 * @returns {Promise<{ data: object, etag: string } | null>}
 */
export async function getRecord(key) {
  const k = String(key);
  if (useMemory()) {
    const row = memoryMap().get(k);
    return row ? { data: clone(row.data), etag: row.etag } : null;
  }
  const store = openStore();
  const result = await store.getWithMetadata(k, { type: "json" });
  if (!result || result.data == null) return null;
  if (!result.etag) {
    throw new Error(`BLOB_ETAG_MISSING:${k}`);
  }
  return { data: result.data, etag: result.etag };
}

export async function getLeadRecord(leadId) {
  if (!leadId) return null;
  const rec = await getRecord(String(leadId));
  if (!rec) return null;
  return { ...rec, version: Number(rec.data.version) || 1 };
}

export async function getLead(leadId) {
  const rec = await getLeadRecord(leadId);
  return rec ? rec.data : null;
}

/**
 * Conditional write using only Netlify semantics:
 * - expectedEtag == null → onlyIfNew
 * - else → onlyIfMatch(opaqueEtag)
 * Never unconditional overwrite after failure.
 * @returns {Promise<string>} new opaque etag
 */
export async function writeCas(key, data, expectedEtag) {
  const k = String(key);
  const payload = clone(data);
  delete payload.reportToken;

  if (useMemory()) {
    const map = memoryMap();
    const cur = map.get(k);
    if (expectedEtag == null) {
      if (cur) throw new CasConflictError();
      const etag = newOpaqueEtag();
      map.set(k, { data: payload, etag });
      return etag;
    }
    if (!cur || cur.etag !== expectedEtag) throw new CasConflictError();
    const etag = newOpaqueEtag();
    map.set(k, { data: payload, etag });
    return etag;
  }

  const store = openStore();
  if (expectedEtag == null) {
    const res = await store.setJSON(k, payload, { onlyIfNew: true });
    if (!res || res.modified === false || !res.etag) throw new CasConflictError();
    return res.etag;
  }
  const res = await store.setJSON(k, payload, { onlyIfMatch: expectedEtag });
  if (!res || res.modified === false || !res.etag) throw new CasConflictError();
  return res.etag;
}

export async function writeLeadCas(lead, expectedEtag) {
  return writeCas(lead.leadId, lead, expectedEtag);
}

export async function mutateLeadCas(leadId, mutator, { maxAttempts = 24 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const rec = await getLeadRecord(leadId);
    if (!rec) return null;
    const next = mutator(clone(rec.data));
    if (next == null) return rec.data;
    next.leadId = rec.data.leadId;
    next.updatedAt = new Date().toISOString();
    next.version = (rec.data.version || 1) + 1;
    delete next.reportToken;
    if (
      next.trackingStatus &&
      next.trackingStatus !== rec.data.trackingStatus &&
      !canTransitionTrackingStatus(rec.data.trackingStatus, next.trackingStatus)
    ) {
      return rec.data;
    }
    try {
      await writeLeadCas(next, rec.etag);
      // BlobsServer may report onlyIfMatch success for two writers; confirm durability.
      let verify;
      try {
        verify = await getLead(leadId);
      } catch {
        await new Promise((r) => setTimeout(r, 5 + Math.floor(Math.random() * 25)));
        continue;
      }
      if (!verify || contentFingerprint(verify) !== contentFingerprint(next)) {
        await new Promise((r) => setTimeout(r, 5 + Math.floor(Math.random() * 25)));
        continue;
      }
      return verify;
    } catch (e) {
      if (e && e.code === "CAS_CONFLICT" && i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 5 + Math.floor(Math.random() * 25)));
        continue;
      }
      throw e;
    }
  }
  throw new CasConflictError("CAS_EXHAUSTED");
}

export function newLeadId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newReportToken() {
  return randomBytes(24).toString("base64url");
}

export function newAttemptId() {
  return `att_${randomBytes(10).toString("hex")}`;
}

export function verifyReportToken(lead, bearer) {
  if (!lead || !lead.reportTokenHash || !bearer) return false;
  const got = Buffer.from(hashToken(bearer), "utf8");
  const exp = Buffer.from(String(lead.reportTokenHash), "utf8");
  if (got.length !== exp.length) return false;
  return timingSafeEqual(got, exp);
}

export function isGoogleAttributed(lead) {
  if (!lead || !lead.consent) return false;
  return Boolean(lead.gclid || lead.gbraid || lead.wbraid);
}

export function isReportTokenExpired(lead, now = Date.now()) {
  if (!lead) return true;
  if (lead.reportTokenExpiresAt) {
    const exp = Date.parse(lead.reportTokenExpiresAt);
    if (Number.isFinite(exp)) return now > exp;
  }
  const created = Date.parse(lead.createdAt);
  if (!Number.isFinite(created)) return true;
  return now - created > REPORT_TOKEN_TTL_MS;
}

export function buildRetryPayload(lead) {
  const raw = {
    leadId: lead.leadId,
    transactionId: lead.transactionId || lead.leadId,
    conversionAction: lead.conversionAction || CONVERSION_ACTION,
    gclid: lead.gclid || null,
    gbraid: lead.gbraid || null,
    wbraid: lead.wbraid || null,
    consent: Boolean(lead.consent),
    intakeSource: lead.intakeSource,
    trackingStatus: lead.trackingStatus,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    failureReason: lead.failureReason || null,
  };
  const out = {};
  for (const k of RETRY_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, k)) out[k] = raw[k];
  }
  return out;
}

export function findSensitiveLeak(text) {
  const s = String(text || "");
  const hits = [];
  if (/reportToken(?!Hash)/i.test(s) || /"reportToken"\s*:/.test(s)) hits.push("reportToken");
  if (/BREVO_API_KEY|api-key|apiKey|SPARKLEAN_RECONCILE_KEY|password|secret/i.test(s)) {
    hits.push("credential_pattern");
  }
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|co|net|org|io)\b/i.test(s) && !/conversionAction|AW-/i.test(s)) {
    hits.push("email_like");
  }
  if (/\b(fullName|phone|email|message)\b\s*[:=]/i.test(s)) hits.push("pii_field");
  return hits;
}

function pickClickIds(campaign, consent) {
  if (!consent || !campaign || typeof campaign !== "object") {
    return { gclid: null, gbraid: null, wbraid: null };
  }
  const clip = (v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);
  return {
    gclid: clip(campaign.gclid),
    gbraid: clip(campaign.gbraid),
    wbraid: clip(campaign.wbraid),
  };
}

function idemKeyFor(idemKey) {
  return IDEMPOTENCY_PREFIX + hashToken(idemKey).slice(0, 40);
}

function outboxKeyFor(leadId) {
  return OUTBOX_PREFIX + String(leadId);
}

function leaseExpired(iso, now = Date.now()) {
  if (!iso) return true;
  const t = Date.parse(iso);
  return !Number.isFinite(t) || t <= now;
}

/**
 * Stable hash of request material for idempotency binding.
 * Same key + different material → IDEMPOTENCY_MATERIAL_CONFLICT.
 */
export function canonicalMaterialHash(material) {
  if (!material || typeof material !== "object") return hashToken("");
  const sorted = {};
  for (const k of Object.keys(material).sort()) {
    let v = material[k];
    if (v == null) continue;
    if (typeof v === "string") {
      v = v.trim().toLowerCase();
      if (!v) continue;
    } else if (typeof v === "object") {
      v = JSON.parse(JSON.stringify(v));
    }
    sorted[k] = v;
  }
  return hashToken(JSON.stringify(sorted));
}

async function waitForRecord(key, { timeoutMs = 4000, intervalMs = 20 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const rec = await getRecord(key);
      if (rec && rec.data) return rec;
    } catch {
      /* etag catch-up */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

async function waitForLead(leadId, { timeoutMs = 8000, intervalMs = 25 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const lead = await getLead(leadId);
    if (lead) return lead;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

function assertMaterial(claimData, materialHash) {
  if (claimData.materialHash && materialHash && claimData.materialHash !== materialHash) {
    throw new IdempotencyMaterialConflictError();
  }
}

/**
 * Acquire or recover idempotency lease bound to materialHash.
 * Orphaned sealed claims (no lead) are reclaimable when the lease expires.
 * @returns {Promise<{ won: boolean, leadId: string, recovered?: boolean, leadReady?: boolean }>}
 */
export async function claimIdempotency(idemKey, leadId, materialHash) {
  if (!idemKey || !leadId) throw new Error("IDEMPOTENCY_ARGS");
  if (!materialHash) throw new Error("IDEMPOTENCY_MATERIAL_REQUIRED");
  const key = idemKeyFor(idemKey);
  const now = Date.now();
  const leaseUntil = new Date(now + claimLeaseMs()).toISOString();
  const createdAt = new Date(now).toISOString();
  const leaseOwner = randomBytes(8).toString("hex");

  const existing = await getRecord(key);
  if (existing) {
    return recoverOrJoinClaim(key, existing, { leadId, materialHash, leaseUntil, leaseOwner, now });
  }

  const payload = {
    leadId,
    materialHash,
    status: CLAIM_STATUS.LEASED,
    createdAt,
    leaseOwner,
    leaseExpiresAt: leaseUntil,
  };
  try {
    await writeCas(key, payload, null);
  } catch (e) {
    if (!(e && e.code === "CAS_CONFLICT")) throw e;
    const raced = await waitForRecord(key, { timeoutMs: 4000 });
    if (!raced) throw new CasConflictError("IDEMPOTENCY_ORPHAN");
    return recoverOrJoinClaim(key, raced, { leadId, materialHash, leaseUntil, leaseOwner, now: Date.now() });
  }

  const sealed = await waitForRecord(key, { timeoutMs: 4000 });
  if (!sealed || !sealed.data.leadId) throw new CasConflictError("IDEMPOTENCY_ORPHAN");
  assertMaterial(sealed.data, materialHash);
  if (sealed.data.leadId !== leadId) {
    return joinExistingClaim(sealed.data, materialHash);
  }
  return { won: true, leadId, recovered: false };
}

async function joinExistingClaim(data, materialHash) {
  assertMaterial(data, materialHash);
  const lead = await waitForLead(data.leadId, { timeoutMs: 2500 });
  if (lead) return { won: false, leadId: data.leadId, leadReady: true };
  // Peer reserved leadId but create not durable yet — co-create with same id.
  return { won: true, leadId: data.leadId, recovered: true };
}

async function recoverOrJoinClaim(key, existing, ctx) {
  const { materialHash, leaseUntil, leaseOwner, now } = ctx;
  const data = existing.data;
  assertMaterial(data, materialHash);

  const lead = data.leadId ? await getLead(data.leadId) : null;
  if (lead) {
    return { won: false, leadId: data.leadId, leadReady: true };
  }

  // No durable lead yet (in-flight create or crash orphan). CAS-refresh the lease.
  const reclaimLeadId = data.leadId || ctx.leadId;
  const next = {
    leadId: reclaimLeadId,
    materialHash: data.materialHash || materialHash,
    status: CLAIM_STATUS.LEASED,
    createdAt: data.createdAt || new Date(now).toISOString(),
    leaseOwner,
    leaseExpiresAt: leaseUntil,
    recoveredAt: new Date().toISOString(),
  };
  try {
    await writeCas(key, next, existing.etag);
  } catch (e) {
    if (!(e && e.code === "CAS_CONFLICT")) throw e;
    const again = await waitForRecord(key, { timeoutMs: 4000 });
    if (!again) throw new CasConflictError("IDEMPOTENCY_ORPHAN");
    assertMaterial(again.data, materialHash);
    const lead2 = await waitForLead(again.data.leadId, { timeoutMs: 3000 });
    if (lead2) return { won: false, leadId: again.data.leadId, leadReady: true };
    throw new IdempotencyInFlightError();
  }

  const sealed = await waitForRecord(key, { timeoutMs: 4000 });
  if (!sealed || sealed.data.leadId !== reclaimLeadId) {
    const lead3 = sealed && (await waitForLead(sealed.data.leadId, { timeoutMs: 3000 }));
    if (lead3) return { won: false, leadId: sealed.data.leadId, leadReady: true };
    throw new IdempotencyInFlightError();
  }
  return { won: true, leadId: reclaimLeadId, recovered: true };
}

export async function markClaimLeadReady(idemKey, leadId, materialHash) {
  if (!idemKey) return;
  const key = idemKeyFor(idemKey);
  for (let i = 0; i < 12; i++) {
    const rec = await getRecord(key);
    if (!rec) return;
    assertMaterial(rec.data, materialHash);
    if (rec.data.status === CLAIM_STATUS.LEAD_READY || rec.data.status === CLAIM_STATUS.COMPLETE) return;
    try {
      await writeCas(
        key,
        {
          ...rec.data,
          leadId,
          materialHash: rec.data.materialHash || materialHash,
          status: CLAIM_STATUS.LEAD_READY,
          leaseExpiresAt: new Date(Date.now() + claimLeaseMs()).toISOString(),
        },
        rec.etag
      );
      return;
    } catch (e) {
      if (!(e && e.code === "CAS_CONFLICT")) throw e;
    }
  }
}

export async function markClaimComplete(idemKey) {
  if (!idemKey) return;
  const key = idemKeyFor(idemKey);
  for (let i = 0; i < 12; i++) {
    const rec = await getRecord(key);
    if (!rec) return;
    if (rec.data.status === CLAIM_STATUS.COMPLETE) return;
    try {
      await writeCas(key, { ...rec.data, status: CLAIM_STATUS.COMPLETE }, rec.etag);
      return;
    } catch (e) {
      if (!(e && e.code === "CAS_CONFLICT")) throw e;
    }
  }
}

export async function getIdempotentLeadId(idemKey) {
  if (!idemKey) return null;
  const rec = await getRecord(idemKeyFor(idemKey));
  return rec && rec.data && rec.data.leadId ? rec.data.leadId : null;
}

/** @deprecated use claimIdempotency — kept for tests that only read */
export async function putIdempotentLeadId(idemKey, leadId, materialHash = hashToken("legacy")) {
  return claimIdempotency(idemKey, leadId, materialHash);
}

export async function reissueReportToken(leadId) {
  const reportToken = newReportToken();
  const updated = await mutateLeadCas(leadId, (lead) => ({
    ...lead,
    reportTokenHash: hashToken(reportToken),
    reportTokenExpiresAt: new Date(Date.now() + REPORT_TOKEN_TTL_MS).toISOString(),
  }));
  return { lead: updated, reportToken };
}

export async function getOutbox(leadId) {
  if (!leadId) return null;
  const rec = await getRecord(outboxKeyFor(leadId));
  return rec ? rec.data : null;
}

/**
 * Durable notification outbox — enqueue before Brevo.
 */
export async function ensureOutboxPending(leadId, { payloadHash, channel = "brevo" } = {}) {
  const key = outboxKeyFor(leadId);
  const existing = await getRecord(key);
  if (existing) return existing.data;
  const row = {
    leadId,
    channel,
    payloadHash: payloadHash || null,
    status: OUTBOX_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: 0,
    sendLeaseOwner: null,
    sendLeaseExpiresAt: null,
    lastError: null,
  };
  try {
    await writeCas(key, row, null);
  } catch (e) {
    if (!(e && e.code === "CAS_CONFLICT")) throw e;
    const again = await getRecord(key);
    return again ? again.data : row;
  }
  return row;
}

/**
 * Deliver outbox with SENDING lease. DELIVERED short-circuits (no duplicate send).
 * Expired SENDING lease may retry once (at-least-once, controlled).
 */
export async function deliverOutbox(leadId, sendFn) {
  const key = outboxKeyFor(leadId);
  for (let attempt = 0; attempt < 16; attempt++) {
    let rec = await getRecord(key);
    if (!rec) {
      await ensureOutboxPending(leadId, {});
      rec = await getRecord(key);
      if (!rec) throw new Error("OUTBOX_MISSING");
    }
    const data = rec.data;
    if (data.status === OUTBOX_STATUS.DELIVERED) {
      return { delivered: true, sent: false, duplicate: true };
    }
    const now = Date.now();
    if (data.status === OUTBOX_STATUS.SENDING && !leaseExpired(data.sendLeaseExpiresAt, now)) {
      await new Promise((r) => setTimeout(r, 30));
      continue;
    }

    const leaseOwner = randomBytes(8).toString("hex");
    const sending = {
      ...data,
      status: OUTBOX_STATUS.SENDING,
      attempts: (data.attempts || 0) + 1,
      sendLeaseOwner: leaseOwner,
      sendLeaseExpiresAt: new Date(now + sendLeaseMs()).toISOString(),
      updatedAt: new Date().toISOString(),
      lastError: null,
    };
    try {
      await writeCas(key, sending, rec.etag);
    } catch (e) {
      if (e && e.code === "CAS_CONFLICT") continue;
      throw e;
    }

    if (typeof leadsStoreTestHooks.afterOutboxBeforeSend === "function") {
      await leadsStoreTestHooks.afterOutboxBeforeSend({ leadId, outbox: sending });
    }

    try {
      await sendFn();
    } catch (err) {
      const failRec = await getRecord(key);
      if (failRec) {
        try {
          await writeCas(
            key,
            {
              ...failRec.data,
              status: OUTBOX_STATUS.FAILED,
              lastError: String(err && err.message ? err.message : err).slice(0, 300),
              updatedAt: new Date().toISOString(),
            },
            failRec.etag
          );
        } catch {
          /* best-effort */
        }
      }
      throw err;
    }

    if (typeof leadsStoreTestHooks.afterSendBeforeAck === "function") {
      await leadsStoreTestHooks.afterSendBeforeAck({ leadId });
    }

    for (let j = 0; j < 12; j++) {
      const ackRec = await getRecord(key);
      if (!ackRec) break;
      if (ackRec.data.status === OUTBOX_STATUS.DELIVERED) {
        return { delivered: true, sent: true, duplicate: false };
      }
      try {
        await writeCas(
          key,
          {
            ...ackRec.data,
            status: OUTBOX_STATUS.DELIVERED,
            sendLeaseOwner: null,
            sendLeaseExpiresAt: null,
            updatedAt: new Date().toISOString(),
          },
          ackRec.etag
        );
        return { delivered: true, sent: true, duplicate: false };
      } catch (e) {
        if (!(e && e.code === "CAS_CONFLICT")) throw e;
      }
    }
    return { delivered: true, sent: true, duplicate: false };
  }
  throw new CasConflictError("OUTBOX_CAS_EXHAUSTED");
}

/**
 * Create lead with lease-backed idempotency. Never returns pendingHydration for a missing lead.
 * Orphaned claims (crash after claim, before create) are reclaimed on retry.
 */
export async function createLeadAtomically(input) {
  const leadId = input.leadId || newLeadId();
  const idemKey = input.idempotencyKey || null;
  const materialHash =
    input.materialHash || (input.material ? canonicalMaterialHash(input.material) : null);

  if (!idemKey) {
    const created = await createLead({ ...input, leadId });
    return { ...created, idempotentReplay: false };
  }
  if (!materialHash) throw new Error("IDEMPOTENCY_MATERIAL_REQUIRED");

  const claim = await claimIdempotency(idemKey, leadId, materialHash);

  if (!claim.won) {
    const lead = await waitForLead(claim.leadId, { timeoutMs: 3000 });
    if (!lead) throw new IdempotencyInFlightError();
    const outbox = await getOutbox(claim.leadId);
    if (outbox && outbox.status === OUTBOX_STATUS.DELIVERED) {
      return { lead, reportToken: null, idempotentReplay: true, needsDelivery: false };
    }
    const reissued = await reissueReportToken(claim.leadId);
    return {
      lead: reissued.lead,
      reportToken: reissued.reportToken,
      idempotentReplay: true,
      needsDelivery: true,
    };
  }

  if (typeof leadsStoreTestHooks.afterClaimBeforeCreate === "function") {
    await leadsStoreTestHooks.afterClaimBeforeCreate({ leadId: claim.leadId, idemKey, materialHash });
  }

  let existing = await getLead(claim.leadId);
  if (!existing) {
    const created = await createLead({ ...input, leadId: claim.leadId });
    await markClaimLeadReady(idemKey, claim.leadId, materialHash);
    if (created.alreadyExisted || !created.reportToken) {
      const reissued = await reissueReportToken(claim.leadId);
      return {
        lead: reissued.lead,
        reportToken: reissued.reportToken,
        idempotentReplay: false,
        needsDelivery: true,
        recovered: true,
      };
    }
    return { ...created, idempotentReplay: false, needsDelivery: true, recovered: Boolean(claim.recovered) };
  }

  await markClaimLeadReady(idemKey, claim.leadId, materialHash);
  const reissued = await reissueReportToken(claim.leadId);
  return {
    lead: reissued.lead,
    reportToken: reissued.reportToken,
    idempotentReplay: false,
    needsDelivery: true,
    recovered: true,
  };
}

/**
 * @returns {Promise<{ lead: object, reportToken: string }>}
 */
export async function createLead(input) {
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const leadId = input.leadId || newLeadId();
  const reportToken = newReportToken();
  const clicks = pickClickIds(input.campaign, Boolean(input.consent));
  const lead = {
    leadId,
    reportTokenHash: hashToken(reportToken),
    reportTokenExpiresAt: new Date(nowMs + REPORT_TOKEN_TTL_MS).toISOString(),
    createdAt: now,
    updatedAt: now,
    intakeSource: input.intakeSource,
    netlifyReceiptId: input.netlifyReceiptId || leadId,
    gclid: clicks.gclid,
    gbraid: clicks.gbraid,
    wbraid: clicks.wbraid,
    consent: Boolean(input.consent),
    conversionAction: CONVERSION_ACTION,
    transactionId: leadId,
    trackingStatus: TRACKING_STATUS.PENDING,
    attemptHistory: [
      {
        attemptId: newAttemptId(),
        at: now,
        status: TRACKING_STATUS.PENDING,
        note: "lead_accepted",
      },
    ],
    failureReason: null,
    retryPayload: null,
    version: 1,
  };
  try {
    await writeLeadCas(lead, null);
  } catch (e) {
    if (e && e.code === "CAS_CONFLICT") {
      // Recovered claim may race a twin create — load winner.
      const existing = await getLead(leadId);
      if (existing) return { lead: existing, reportToken: null, alreadyExisted: true };
    }
    throw e;
  }
  return { lead, reportToken };
}

export async function updateLead(leadId, patch) {
  return mutateLeadCas(leadId, (lead) => {
    const nextStatus = patch.trackingStatus !== undefined ? patch.trackingStatus : lead.trackingStatus;
    if (nextStatus !== lead.trackingStatus && !canTransitionTrackingStatus(lead.trackingStatus, nextStatus)) {
      return null;
    }
    const next = { ...lead, ...patch, leadId: lead.leadId, trackingStatus: nextStatus };
    delete next.reportToken;
    return next;
  });
}

export async function deleteLead(leadId) {
  if (!leadId) return false;
  const key = String(leadId);
  if (useMemory()) return memoryMap().delete(key);
  const store = openStore();
  await store.delete(key);
  return true;
}

export async function appendAttempt(leadId, attempt) {
  return mutateLeadCas(leadId, (lead) => {
    const entry = {
      attemptId: attempt.attemptId || newAttemptId(),
      at: new Date().toISOString(),
      ...attempt,
    };
    const attemptHistory = Array.isArray(lead.attemptHistory) ? [...lead.attemptHistory, entry] : [entry];
    return { ...lead, attemptHistory };
  });
}

export async function applyConversionReport({ leadId, reportToken, status, failureReason, now }) {
  const allowed = new Set([
    TRACKING_STATUS.BROWSER_SENT,
    TRACKING_STATUS.OFFLINE_QUEUED,
    TRACKING_STATUS.FAILED,
  ]);
  if (!allowed.has(status)) return { ok: false, error: "Invalid status", status: 400 };

  const rec = await getLeadRecord(leadId);
  if (!rec) return { ok: false, error: "Lead not found", status: 404 };
  const lead = rec.data;
  if (!verifyReportToken(lead, reportToken)) return { ok: false, error: "Unauthorized", status: 401 };
  if (isReportTokenExpired(lead, now ?? Date.now())) {
    return { ok: false, error: "Report token expired", status: 401 };
  }

  if (!canTransitionTrackingStatus(lead.trackingStatus, status)) {
    const fresh = await appendAttempt(leadId, {
      attemptId: newAttemptId(),
      status,
      note: "ignored_illegal_transition",
    });
    return { ok: true, lead: fresh, duplicate: true, illegalTransition: true };
  }

  if (lead.trackingStatus === status && lead.trackingStatus === TRACKING_STATUS.BROWSER_SENT) {
    const fresh = await appendAttempt(leadId, {
      attemptId: newAttemptId(),
      status,
      note: "ignored_duplicate_or_late_report",
    });
    return { ok: true, lead: fresh, duplicate: true };
  }

  const updated = await mutateLeadCas(leadId, (cur) => {
    if (!canTransitionTrackingStatus(cur.trackingStatus, status)) {
      return null;
    }
    const patch = {
      ...cur,
      trackingStatus: status,
      failureReason: failureReason ? String(failureReason).slice(0, 500) : null,
    };
    if (status === TRACKING_STATUS.OFFLINE_QUEUED || status === TRACKING_STATUS.FAILED) {
      patch.retryPayload = buildRetryPayload({ ...patch, updatedAt: new Date().toISOString() });
    }
    if (status === TRACKING_STATUS.BROWSER_SENT) patch.failureReason = null;
    const entry = {
      attemptId: newAttemptId(),
      at: new Date().toISOString(),
      status,
      note: "client_report",
      failureReason: patch.failureReason,
    };
    patch.attemptHistory = Array.isArray(cur.attemptHistory) ? [...cur.attemptHistory, entry] : [entry];
    return patch;
  });

  return { ok: true, lead: updated };
}

async function listAllLeads() {
  if (useMemory()) {
    return [...memoryMap().entries()]
      .filter(([k]) => !String(k).startsWith(IDEMPOTENCY_PREFIX) && !String(k).startsWith(OUTBOX_PREFIX))
      .map(([, row]) => clone(row.data));
  }
  const store = openStore();
  const out = [];
  for await (const page of store.list({ paginate: true })) {
    const blobs = (page && page.blobs) || [];
    for (const entry of blobs) {
      const key = entry && entry.key;
      if (!key || String(key).startsWith(IDEMPOTENCY_PREFIX) || String(key).startsWith(OUTBOX_PREFIX)) continue;
      const data = await store.get(key, { type: "json" });
      if (data && data.leadId) out.push(data);
    }
  }
  return out;
}

export async function listUnresolvedGoogleAttributed({ maxAgeMs = 15 * 60 * 1000, now = Date.now() } = {}) {
  const all = await listAllLeads();
  return all.filter((lead) => {
    if (!isGoogleAttributed(lead)) return false;
    if (lead.trackingStatus !== TRACKING_STATUS.PENDING) return false;
    const created = Date.parse(lead.createdAt);
    if (!Number.isFinite(created)) return true;
    return now - created >= maxAgeMs;
  });
}

export async function markOfflineQueued(leadId, failureReason) {
  return mutateLeadCas(leadId, (lead) => {
    if (!canTransitionTrackingStatus(lead.trackingStatus, TRACKING_STATUS.OFFLINE_QUEUED)) {
      return null;
    }
    const patch = {
      ...lead,
      trackingStatus: TRACKING_STATUS.OFFLINE_QUEUED,
      failureReason: failureReason || "reconcile_pending_timeout",
    };
    patch.retryPayload = buildRetryPayload({ ...patch, updatedAt: new Date().toISOString() });
    const entry = {
      attemptId: newAttemptId(),
      at: new Date().toISOString(),
      status: TRACKING_STATUS.OFFLINE_QUEUED,
      note: "reconcile",
      failureReason: patch.failureReason,
    };
    patch.attemptHistory = Array.isArray(lead.attemptHistory) ? [...lead.attemptHistory, entry] : [entry];
    return patch;
  });
}
