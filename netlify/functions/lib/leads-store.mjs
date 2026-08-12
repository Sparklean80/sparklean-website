/**
 * Durable lead / conversion tracking store (Netlify Blobs: sparklean-leads).
 * States are truthful browser/server outcomes — never "Google confirmed".
 *
 * Security: only SHA-256(reportToken) is persisted; bearer returned once at create.
 * Concurrency: conditional writes (Blob onlyIfMatch / in-memory version CAS).
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

/** Optional injected store for BlobsServer concurrency tests. */
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

function newEtag() {
  return `"${randomBytes(8).toString("hex")}"`;
}

/**
 * @returns {Promise<{ data: object, etag: string, version: number } | null>}
 */
export async function getLeadRecord(leadId) {
  if (!leadId) return null;
  const key = String(leadId);
  if (useMemory()) {
    const row = memoryMap().get(key);
    return row
      ? { data: clone(row.data), etag: row.etag, version: row.data.version || 1 }
      : null;
  }
  const store = openStore();
  const result = await store.getWithMetadata(key, { type: "json" });
  if (!result || result.data == null) return null;
  const version = Number(result.data.version) || 1;
  // Application CAS key is always version-based (HTTP etag optional / unreliable on BlobsServer).
  return { data: result.data, etag: `v${version}`, httpEtag: result.etag || null, version };
}

export async function getLead(leadId) {
  const rec = await getLeadRecord(leadId);
  return rec ? rec.data : null;
}

/**
 * Conditional write. expectedEtag null → create-only.
 * Uses Blob onlyIfMatch when etag is opaque HTTP etag; otherwise version CAS.
 */
export async function writeLeadCas(lead, expectedEtag) {
  const key = lead.leadId;
  const payload = clone(lead);
  delete payload.reportToken;

  if (useMemory()) {
    const map = memoryMap();
    const cur = map.get(key);
    if (expectedEtag == null) {
      if (cur) throw new CasConflictError();
      const etag = newEtag();
      map.set(key, { data: payload, etag });
      return etag;
    }
    if (!cur || cur.etag !== expectedEtag) throw new CasConflictError();
    const etag = newEtag();
    map.set(key, { data: payload, etag });
    return etag;
  }

  const store = openStore();
  const current = await store.get(key, { type: "json" });

  if (expectedEtag == null) {
    if (current) throw new CasConflictError();
    await store.setJSON(key, payload);
    return `v${payload.version || 1}`;
  }

  if (!current) throw new CasConflictError();

  // Prefer version-stamp CAS (durable across BlobsServer + production).
  const expectedVersion = Number(String(expectedEtag).replace(/^v/, ""));
  if (!Number.isFinite(expectedVersion) || current.version !== expectedVersion) {
    throw new CasConflictError();
  }
  const again = await store.get(key, { type: "json" });
  if (!again || again.version !== expectedVersion) throw new CasConflictError();

  // Best-effort HTTP etag conditional write when available.
  if (typeof expectedEtag === "string" && expectedEtag.startsWith('"')) {
    try {
      const res = await store.setJSON(key, payload, { onlyIfMatch: expectedEtag });
      if (res && res.modified === false) throw new CasConflictError();
      return (res && res.etag) || `v${payload.version || 1}`;
    } catch (e) {
      if (e instanceof CasConflictError) throw e;
      // fall through to plain set after version check
    }
  }
  await store.setJSON(key, payload);
  return `v${payload.version || 1}`;
}

/**
 * Serialized mutation boundary with CAS retries.
 */
export async function mutateLeadCas(leadId, mutator, { maxAttempts = 12 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const rec = await getLeadRecord(leadId);
    if (!rec) return null;
    const next = mutator(clone(rec.data));
    if (next == null) return rec.data;
    next.leadId = rec.data.leadId;
    next.updatedAt = new Date().toISOString();
    next.version = (rec.data.version || 1) + 1;
    delete next.reportToken;
    const expected = rec.etag || `v${rec.version || rec.data.version || 1}`;
    try {
      await writeLeadCas(next, expected);
      return next;
    } catch (e) {
      if (e && e.code === "CAS_CONFLICT" && i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 5 + Math.floor(Math.random() * 15)));
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

/**
 * @returns {Promise<{ lead: object, reportToken: string }>}
 * reportToken is returned once — never stored or logged by callers.
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
    const next = { ...lead, ...patch, leadId: lead.leadId };
    delete next.reportToken;
    if (patch.reportTokenHash !== undefined) next.reportTokenHash = patch.reportTokenHash;
    next.version = (lead.version || 1) + 1;
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
    const entry = { at: new Date().toISOString(), ...attempt };
    const attemptHistory = Array.isArray(lead.attemptHistory) ? [...lead.attemptHistory, entry] : [entry];
    return { ...lead, attemptHistory, version: (lead.version || 1) + 1 };
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

  if (lead.trackingStatus === TRACKING_STATUS.BROWSER_SENT && status !== TRACKING_STATUS.FAILED) {
    const fresh = await appendAttempt(leadId, { status, note: "ignored_duplicate_or_late_report" });
    return { ok: true, lead: fresh, duplicate: true };
  }

  const updated = await mutateLeadCas(leadId, (cur) => {
    if (cur.trackingStatus === TRACKING_STATUS.BROWSER_SENT && status !== TRACKING_STATUS.FAILED) {
      return null;
    }
    const patch = {
      ...cur,
      trackingStatus: status,
      failureReason: failureReason ? String(failureReason).slice(0, 500) : null,
      version: (cur.version || 1) + 1,
    };
    if (status === TRACKING_STATUS.OFFLINE_QUEUED || status === TRACKING_STATUS.FAILED) {
      patch.retryPayload = buildRetryPayload({ ...patch, updatedAt: new Date().toISOString() });
    }
    if (status === TRACKING_STATUS.BROWSER_SENT) patch.failureReason = null;
    const entry = {
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
    return [...memoryMap().values()].map((row) => clone(row.data));
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
    if (
      lead.trackingStatus === TRACKING_STATUS.BROWSER_SENT ||
      lead.trackingStatus === TRACKING_STATUS.OFFLINE_IMPORTED
    ) {
      return null;
    }
    const patch = {
      ...lead,
      trackingStatus: TRACKING_STATUS.OFFLINE_QUEUED,
      failureReason: failureReason || "reconcile_pending_timeout",
      version: (lead.version || 1) + 1,
    };
    patch.retryPayload = buildRetryPayload({ ...patch, updatedAt: new Date().toISOString() });
    const entry = {
      at: new Date().toISOString(),
      status: TRACKING_STATUS.OFFLINE_QUEUED,
      note: "reconcile",
      failureReason: patch.failureReason,
    };
    patch.attemptHistory = Array.isArray(lead.attemptHistory) ? [...lead.attemptHistory, entry] : [entry];
    return patch;
  });
}

/** Idempotency map: key → { leadId, createdAt } with CAS create. */
export async function getIdempotentLeadId(idemKey) {
  if (!idemKey) return null;
  const key = IDEMPOTENCY_PREFIX + hashToken(idemKey).slice(0, 40);
  if (useMemory()) {
    const row = memoryMap().get(key);
    return row && row.data && row.data.leadId ? row.data.leadId : null;
  }
  const store = openStore();
  const data = await store.get(key, { type: "json" });
  return data && data.leadId ? data.leadId : null;
}

export async function putIdempotentLeadId(idemKey, leadId) {
  if (!idemKey || !leadId) return;
  const key = IDEMPOTENCY_PREFIX + hashToken(idemKey).slice(0, 40);
  const payload = { leadId, createdAt: new Date().toISOString() };
  if (useMemory()) {
    const map = memoryMap();
    if (map.has(key)) return;
    map.set(key, { data: payload, etag: newEtag() });
    return;
  }
  const store = openStore();
  try {
    await store.setJSON(key, payload, { onlyIfNew: true });
  } catch {
    /* concurrent idempotent create — OK */
  }
}
