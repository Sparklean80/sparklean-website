/**
 * Sparklean — scheduled reconcile for Google-attributed PENDING leads.
 * After N seconds still PENDING → OFFLINE_QUEUED + conversion-gap alert.
 *
 * Auth: Netlify schedule event OR matching SPARKLEAN_RECONCILE_KEY header.
 * Unauthorized callers receive 401 (no silent reconcile).
 */

import {
  listUnresolvedGoogleAttributed,
  markOfflineQueued,
  TRACKING_STATUS,
} from "./lib/leads-store.mjs";
import { alertConversionGap } from "./lib/conversion-alerts.mjs";

const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;

export function isReconcileAuthorized(request) {
  if (!request || !request.headers) return false;
  const event = String(request.headers.get("x-netlify-event") || "").toLowerCase();
  if (event === "schedule") return true;
  const expected = process.env.SPARKLEAN_RECONCILE_KEY;
  if (!expected) return false;
  const got = request.headers.get("x-sparklean-reconcile-key");
  return Boolean(got && got === expected);
}

export async function runLeadsReconcile({ maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  const age = Number(process.env.SPARKLEAN_RECONCILE_MAX_AGE_MS) || maxAgeMs;
  const stale = await listUnresolvedGoogleAttributed({ maxAgeMs: age });
  const results = [];

  for (const lead of stale) {
    const updated = await markOfflineQueued(lead.leadId, "reconcile_pending_timeout");
    if (updated && updated.trackingStatus === TRACKING_STATUS.OFFLINE_QUEUED) {
      await alertConversionGap(updated);
      results.push({ leadId: updated.leadId, status: updated.trackingStatus });
    }
  }

  console.log("[leads-reconcile]", {
    checked: stale.length,
    queued: results.length,
    maxAgeMs: age,
  });

  return { ok: true, queued: results, checked: stale.length };
}

export default async (request) => {
  if (!isReconcileAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const result = await runLeadsReconcile();
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

export const config = {
  schedule: "*/15 * * * *",
};
