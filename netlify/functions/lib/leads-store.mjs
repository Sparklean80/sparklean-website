/**
 * Durable lead / conversion tracking store (Netlify Blobs: sparklean-leads).
 * States are truthful browser/server outcomes — never "Google confirmed".
 *
 * Retention: operational Blob records are intended for conversion reconciliation
 * (default report-token TTL 24h; ops may delete keys after offline import or
 * after retention window — see docs/work-notes evidence). No customer PII is
 * stored on the Blob lead record beyond click ids under consent.
 */

import { getStore } from "@netlify/blobs";
import { randomBytes } from "crypto";

export const STORE_NAME = "sparklean-leads";

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

/** Report tokens expire; expired reports are rejected (no silent success). */
export const REPORT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Allowlisted keys only — never dump full lead / reportToken / PII. */
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

/** In-memory fallback for unit tests / local without Blobs context. */
const memoryStores = new Map();

function useMemory() {
  return process.env.SPARKLEAN_LEADS_MEMORY === "1";
}

function memoryMap() {
  if (!memoryStores.has(STORE_NAME)) memoryStores.set(STORE_NAME, new Map());
  return memoryStores.get(STORE_NAME);
}

export function resetMemoryStoreForTests() {
  memoryStores.clear();
}

function openStore() {
  if (useMemory()) return null;
  return getStore(STORE_NAME);
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

async function readRaw(leadId) {
  if (useMemory()) {
    const v = memoryMap().get(leadId);
    return v ? clone(v) : null;
  }
  const store = openStore();
  const data = await store.get(leadId, { type: "json" });
  return data || null;
}

async function writeRaw(lead) {
  if (useMemory()) {
    memoryMap().set(lead.leadId, clone(lead));
    return;
  }
  const store = openStore();
  await store.setJSON(lead.leadId, lead);
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

/**
 * Fixed-schema retry payload for ops / future Ads Offline Import.
 * Never includes reportToken, customer PII, or credentials.
 */
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

/** Scan serialized alert/retry text for forbidden leakage. */
export function findSensitiveLeak(text) {
  const s = String(text || "");
  const hits = [];
  if (/reportToken/i.test(s)) hits.push("reportToken");
  if (/BREVO_API_KEY|api-key|apiKey|SPARKLEAN_RECONCILE_KEY|password|secret/i.test(s)) {
    hits.push("credential_pattern");
  }
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(s) && !/conversionAction|AW-/i.test(s)) {
    // Allow conversion action ids; flag real emails
    if (/@[a-z0-9.-]+\.(com|co|net|org|io)\b/i.test(s)) hits.push("email_like");
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
 * @param {object} input
 * @param {string} input.intakeSource
 * @param {string} [input.netlifyReceiptId]
 * @param {object} [input.campaign]
 * @param {boolean} input.consent
 * @param {string} [leadId]
 */
export async function createLead(input) {
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const leadId = input.leadId || newLeadId();
  const reportToken = newReportToken();
  const clicks = pickClickIds(input.campaign, Boolean(input.consent));
  const lead = {
    leadId,
    reportToken,
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
  };
  await writeRaw(lead);
  return lead;
}

export async function getLead(leadId) {
  if (!leadId) return null;
  return readRaw(String(leadId));
}

export async function updateLead(leadId, patch) {
  const lead = await getLead(leadId);
  if (!lead) return null;
  const next = {
    ...lead,
    ...patch,
    leadId: lead.leadId,
    reportToken: patch.reportToken !== undefined ? patch.reportToken : lead.reportToken,
    updatedAt: new Date().toISOString(),
  };
  await writeRaw(next);
  return next;
}

export async function deleteLead(leadId) {
  if (!leadId) return false;
  if (useMemory()) {
    return memoryMap().delete(String(leadId));
  }
  const store = openStore();
  await store.delete(String(leadId));
  return true;
}

export async function appendAttempt(leadId, attempt) {
  const lead = await getLead(leadId);
  if (!lead) return null;
  const entry = {
    at: new Date().toISOString(),
    ...attempt,
  };
  const attemptHistory = Array.isArray(lead.attemptHistory) ? [...lead.attemptHistory, entry] : [entry];
  return updateLead(leadId, { attemptHistory });
}

/**
 * Apply client/server report outcome. Auth: reportToken must match and not be expired.
 * @returns {{ ok: boolean, lead?: object, error?: string, status?: number, duplicate?: boolean }}
 */
export async function applyConversionReport({ leadId, reportToken, status, failureReason, now }) {
  const allowed = new Set([
    TRACKING_STATUS.BROWSER_SENT,
    TRACKING_STATUS.OFFLINE_QUEUED,
    TRACKING_STATUS.FAILED,
  ]);
  if (!allowed.has(status)) {
    return { ok: false, error: "Invalid status", status: 400 };
  }
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, error: "Lead not found", status: 404 };
  if (!reportToken || reportToken !== lead.reportToken) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }
  if (isReportTokenExpired(lead, now ?? Date.now())) {
    return { ok: false, error: "Report token expired", status: 401 };
  }

  // Do not regress terminal-ish states from BROWSER_SENT back to queue unless FAILED.
  if (lead.trackingStatus === TRACKING_STATUS.BROWSER_SENT && status !== TRACKING_STATUS.FAILED) {
    await appendAttempt(leadId, { status, note: "ignored_duplicate_or_late_report" });
    const fresh = await getLead(leadId);
    return { ok: true, lead: fresh, duplicate: true };
  }

  const patch = {
    trackingStatus: status,
    failureReason: failureReason ? String(failureReason).slice(0, 500) : null,
  };
  if (status === TRACKING_STATUS.OFFLINE_QUEUED || status === TRACKING_STATUS.FAILED) {
    patch.retryPayload = buildRetryPayload({ ...lead, ...patch, updatedAt: new Date().toISOString() });
  }
  if (status === TRACKING_STATUS.BROWSER_SENT) {
    patch.failureReason = null;
  }

  let updated = await updateLead(leadId, patch);
  updated = await appendAttempt(leadId, {
    status,
    note: "client_report",
    failureReason: patch.failureReason,
  });
  return { ok: true, lead: updated };
}

async function listAllLeads() {
  if (useMemory()) {
    return [...memoryMap().values()].map((v) => clone(v));
  }
  const store = openStore();
  const out = [];
  for await (const page of store.list({ paginate: true })) {
    const blobs = (page && page.blobs) || [];
    for (const entry of blobs) {
      const key = entry && entry.key;
      if (!key) continue;
      const data = await store.get(key, { type: "json" });
      if (data) out.push(data);
    }
  }
  return out;
}

/**
 * Google-attributed leads still PENDING past maxAgeMs.
 */
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
  const lead = await getLead(leadId);
  if (!lead) return null;
  if (
    lead.trackingStatus === TRACKING_STATUS.BROWSER_SENT ||
    lead.trackingStatus === TRACKING_STATUS.OFFLINE_IMPORTED
  ) {
    return lead;
  }
  const patch = {
    trackingStatus: TRACKING_STATUS.OFFLINE_QUEUED,
    failureReason: failureReason || "reconcile_pending_timeout",
  };
  patch.retryPayload = buildRetryPayload({ ...lead, ...patch, updatedAt: new Date().toISOString() });
  let updated = await updateLead(leadId, patch);
  updated = await appendAttempt(leadId, {
    status: TRACKING_STATUS.OFFLINE_QUEUED,
    note: "reconcile",
    failureReason: patch.failureReason,
  });
  return updated;
}
