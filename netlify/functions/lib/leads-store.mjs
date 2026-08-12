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
        // Stale body vs newer write etag (or unknown body) — wait for read to catch up.
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

/**
 * Atomic idempotency ownership via onlyIfNew before lead create / Brevo.
 * Re-read + onlyIfMatch seal so spurious BlobsServer onlyIfNew success cannot
 * mint two owners. Losers hydrate the winner leadId.
 * @returns {Promise<{ won: boolean, leadId: string }>}
 */
export async function claimIdempotency(idemKey, leadId) {
  if (!idemKey || !leadId) throw new Error("IDEMPOTENCY_ARGS");
  const key = idemKeyFor(idemKey);
  const createdAt = new Date().toISOString();
  const payload = {
    leadId,
    createdAt,
    status: "claiming",
  };
  try {
    await writeCas(key, payload, null);
  } catch (e) {
    if (!(e && e.code === "CAS_CONFLICT")) throw e;
    return hydrateIdempotencyLoser(key);
  }

  const confirmed = await waitForRecord(key, { timeoutMs: 4000 });
  if (!confirmed || !confirmed.data.leadId) throw new CasConflictError("IDEMPOTENCY_ORPHAN");
  if (confirmed.data.leadId !== leadId) {
    return { won: false, leadId: confirmed.data.leadId };
  }

  try {
    await writeCas(
      key,
      { leadId, createdAt: confirmed.data.createdAt || createdAt, status: "owned" },
      confirmed.etag
    );
  } catch (e) {
    if (!(e && e.code === "CAS_CONFLICT")) throw e;
    return hydrateIdempotencyLoser(key);
  }

  const sealed = await waitForRecord(key, { timeoutMs: 4000 });
  if (!sealed || !sealed.data.leadId) throw new CasConflictError("IDEMPOTENCY_ORPHAN");
  if (sealed.data.leadId !== leadId) {
    return { won: false, leadId: sealed.data.leadId };
  }
  return { won: true, leadId };
}

async function hydrateIdempotencyLoser(key) {
  const existing = await waitForRecord(key, { timeoutMs: 4000 });
  if (!existing || !existing.data.leadId) throw new CasConflictError("IDEMPOTENCY_ORPHAN");
  return { won: false, leadId: existing.data.leadId };
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

export async function getIdempotentLeadId(idemKey) {
  if (!idemKey) return null;
  const rec = await getRecord(idemKeyFor(idemKey));
  return rec && rec.data && rec.data.leadId ? rec.data.leadId : null;
}

/** @deprecated use claimIdempotency — kept for tests that only read */
export async function putIdempotentLeadId(idemKey, leadId) {
  const claim = await claimIdempotency(idemKey, leadId);
  return claim;
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

/**
 * Create lead with optional atomic idempotency claim first.
 * Losers hydrate the winner lead and must not send Brevo.
 * @returns {Promise<{ lead: object, reportToken: string|null, idempotentReplay: boolean }>}
 */
export async function createLeadAtomically(input) {
  const leadId = input.leadId || newLeadId();
  const idemKey = input.idempotencyKey || null;

  if (idemKey) {
    const claim = await claimIdempotency(idemKey, leadId);
    if (!claim.won) {
      const lead = await waitForLead(claim.leadId);
      if (!lead) {
        return { lead: { leadId: claim.leadId }, reportToken: null, idempotentReplay: true, pendingHydration: true };
      }
      return { lead, reportToken: null, idempotentReplay: true };
    }
  }

  const created = await createLead({ ...input, leadId });
  return { ...created, idempotentReplay: false };
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
  await writeLeadCas(lead, null);
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
      .filter(([k]) => !String(k).startsWith(IDEMPOTENCY_PREFIX))
      .map(([, row]) => clone(row.data));
  }
  const store = openStore();
  const out = [];
  for await (const page of store.list({ paginate: true })) {
    const blobs = (page && page.blobs) || [];
    for (const entry of blobs) {
      const key = entry && entry.key;
      if (!key || String(key).startsWith(IDEMPOTENCY_PREFIX)) continue;
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
