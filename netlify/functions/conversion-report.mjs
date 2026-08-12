/**
 * Sparklean — POST /.netlify/functions/conversion-report
 * Client reports BROWSER_SENT | OFFLINE_QUEUED | FAILED; bearer verified against hash.
 */

import { applyConversionReport, TRACKING_STATUS } from "./lib/leads-store.mjs";
import { alertConversionGap } from "./lib/conversion-alerts.mjs";
import {
  assertSameSiteOrigin,
  clientIp,
  rateLimitCheck,
} from "./lib/request-guard.mjs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function cors204() {
  return new Response(null, { status: 204 });
}

export default async (request) => {
  if (request.method === "OPTIONS") return cors204();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const originGate = assertSameSiteOrigin(request);
  if (!originGate.ok) return json({ error: originGate.error }, originGate.status || 403);

  const rl = rateLimitCheck(`report:${clientIp(request)}`, { windowMs: 60_000, max: 40 });
  if (!rl.ok) return json({ error: rl.error }, rl.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const leadId = typeof body.leadId === "string" ? body.leadId.trim().slice(0, 80) : "";
  const reportToken = typeof body.reportToken === "string" ? body.reportToken.trim().slice(0, 200) : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";
  const failureReason =
    typeof body.failureReason === "string" ? body.failureReason.trim().slice(0, 500) : undefined;

  if (!leadId || !reportToken || !status) {
    return json({ error: "leadId, reportToken, and status required" }, 400);
  }

  const result = await applyConversionReport({ leadId, reportToken, status, failureReason });
  if (!result.ok) {
    return json({ error: result.error || "Report failed" }, result.status || 400);
  }

  const lead = result.lead;
  if (
    lead &&
    !result.duplicate &&
    (lead.trackingStatus === TRACKING_STATUS.OFFLINE_QUEUED ||
      lead.trackingStatus === TRACKING_STATUS.FAILED)
  ) {
    await alertConversionGap(lead);
  }

  return json({
    ok: true,
    leadId: lead.leadId,
    trackingStatus: lead.trackingStatus,
    duplicate: Boolean(result.duplicate),
  });
};
