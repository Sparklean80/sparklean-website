/**
 * Sparklean — scheduled reconcile for Google-attributed PENDING leads.
 *
 * Auth:
 * - Ordinary HTTP: requires timing-safe SPARKLEAN_RECONCILE_KEY header (always).
 * - Schedule: Netlify schedule payload authenticity (event + next_run body + no Origin)
 *   AND env secret must be configured; never authorize on x-netlify-event alone.
 */

import { timingSafeEqual } from "crypto";
import {
  listUnresolvedGoogleAttributed,
  markOfflineQueued,
  TRACKING_STATUS,
} from "./lib/leads-store.mjs";
import { alertConversionGap } from "./lib/conversion-alerts.mjs";
import { timingSafeEqualString } from "./lib/request-guard.mjs";

const DEFAULT_MAX_AGE_MS = 15 * 60 * 1000;

function hasConfiguredSecret() {
  const k = process.env.SPARKLEAN_RECONCILE_KEY;
  return Boolean(k && String(k).length >= 16);
}

/**
 * Prove schedule authenticity beyond a forgeable event header alone.
 */
export async function isAuthenticNetlifySchedule(request) {
  if (!request || !request.headers) return false;
  if (!hasConfiguredSecret()) return false;
  const event = String(request.headers.get("x-netlify-event") || "").toLowerCase();
  if (event !== "schedule") return false;
  // Browser / cross-site forgeries typically send Origin
  if (request.headers.get("origin")) return false;
  const nfId = request.headers.get("x-nf-request-id");
  if (!nfId) return false;
  // Netlify schedule body includes next_run
  try {
    const clone = request.clone ? request.clone() : request;
    const text = await clone.text();
    if (!text) return false;
    const body = JSON.parse(text);
    return Boolean(body && (body.next_run || body.nextRun));
  } catch {
    return false;
  }
}

export function isReconcileHttpAuthorized(request) {
  if (!hasConfiguredSecret()) return false;
  const expected = process.env.SPARKLEAN_RECONCILE_KEY;
  const got = request.headers.get("x-sparklean-reconcile-key") || "";
  return timingSafeEqualString(got, expected);
}

export async function isReconcileAuthorized(request) {
  // Never: x-netlify-event alone
  if (isReconcileHttpAuthorized(request)) return true;
  if (await isAuthenticNetlifySchedule(request)) return true;
  return false;
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
  if (!(await isReconcileAuthorized(request))) {
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

// silence unused import if bundler tree-shakes poorly
void timingSafeEqual;
