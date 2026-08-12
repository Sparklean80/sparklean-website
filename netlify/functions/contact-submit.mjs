/**
 * Sparklean — POST /.netlify/functions/contact-submit
 * Server-accepted contact lead: Blob PENDING + Brevo → { ok, leadId, reportToken }.
 * reportToken returned once; only hash stored on Blob.
 */

import {
  CONVERSION_ACTION,
  INTAKE_SOURCE,
  TRACKING_STATUS,
  OUTBOX_STATUS,
  canonicalMaterialHash,
  createLeadAtomically,
  ensureOutboxPending,
  deliverOutbox,
  markClaimComplete,
  getOutbox,
  updateLead,
  IdempotencyMaterialConflictError,
  IdempotencyInFlightError,
} from "./lib/leads-store.mjs";
import {
  assertSameSiteOrigin,
  clientIp,
  clipStr,
  hashToken,
  parseIdempotencyKey,
  rateLimitCheck,
} from "./lib/request-guard.mjs";

const MAX_BODY = 80_000;
const PUBLIC_FAILURE =
  "We're having trouble submitting your request right now. Please call Sparklean directly at (239) 888-3588.";

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

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseSender(fromRaw) {
  const s = String(fromRaw || "").trim();
  const br = s.match(/^(.+?)\s*<([^>]+)>$/);
  if (br) {
    return {
      name: br[1].replace(/^["']|["']$/g, "").trim() || "Sparklean Cleaning",
      email: br[2].trim(),
    };
  }
  return { name: "Sparklean Cleaning", email: s || "info@sparklean.co" };
}

function parseFormBody(raw, contentType) {
  if (contentType.includes("application/json")) return JSON.parse(raw);
  const params = new URLSearchParams(raw);
  const o = {};
  for (const [k, v] of params.entries()) o[k] = v;
  return o;
}

async function sendBrevo({ subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromRaw =
    (process.env.SPARKLEAN_FROM_EMAIL && process.env.SPARKLEAN_FROM_EMAIL.trim()) || "info@sparklean.co";
  const toEmail =
    (process.env.SPARKLEAN_LEAD_TO && process.env.SPARKLEAN_LEAD_TO.trim()) || "info@sparklean.co";
  const sender = parseSender(fromRaw);
  if (!apiKey) throw new Error("MISSING_EMAIL_CONFIG");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email: toEmail }],
      replyTo: { email: sender.email },
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    console.error("[contact-submit] Brevo failed", res.status);
    throw new Error("BREVO_FAILED");
  }
}

async function notifySlackOptional({ leadId, serviceNeeded, cityArea }) {
  const url = process.env.SPARKLEAN_SLACK_WEBHOOK_URL;
  if (!url) return;
  const text = [
    `*Sparklean contact form*`,
    `ID: \`${leadId}\``,
    serviceNeeded ? `Service: ${serviceNeeded}` : "",
    cityArea ? `Area: ${cityArea}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (e) {
    console.error("[contact-submit] Slack failed", e);
  }
}

export default async (request, context) => {
  if (request.method === "OPTIONS") return cors204();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const originGate = assertSameSiteOrigin(request);
  if (!originGate.ok) return json({ error: originGate.error }, originGate.status || 403);

  const rl = rateLimitCheck(`contact:${clientIp(request)}`, { windowMs: 60_000, max: 12 });
  if (!rl.ok) return json({ error: rl.error }, rl.status);

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }
  if (raw.length > MAX_BODY) return json({ error: "Payload too large" }, 413);

  const contentType = request.headers.get("content-type") || "";
  let body;
  try {
    body = parseFormBody(raw, contentType);
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  if (body["bot-field"] || body.botField) {
    return json({ ok: true, leadId: "ignored", reportToken: "ignored" }, 200);
  }

  const idemKey = parseIdempotencyKey(request, body);

  const fullName = clipStr(body.fullName, 120);
  const phone = clipStr(body.phone, 32);
  const email = clipStr(body.email, 160);
  const propertyType = clipStr(body.propertyType, 80);
  const serviceNeeded = clipStr(body.serviceNeeded, 200);
  const cityArea = clipStr(body.cityArea, 120);
  const preferredTiming = clipStr(body.preferredTiming, 80);
  const message = clipStr(body.message, 4000);
  const consentContact =
    body.consentContact === "yes" || body.consentContact === true || body.consentContact === "on";
  const consentMarketing =
    body.consentMarketing === "yes" || body.consentMarketing === true || body.consentMarketing === "on";

  if (!fullName || !phone || !email || !propertyType || !serviceNeeded || !cityArea || !preferredTiming) {
    return json({ error: "Missing required fields" }, 400);
  }
  if (!email.includes("@") || email.length > 160) return json({ error: "Invalid email" }, 400);
  if (!consentContact) return json({ error: "Consent required" }, 400);

  let campaign = null;
  if (body.campaign && typeof body.campaign === "object") {
    campaign = {
      gclid: clipStr(body.campaign.gclid, 200) || null,
      gbraid: clipStr(body.campaign.gbraid, 200) || null,
      wbraid: clipStr(body.campaign.wbraid, 200) || null,
    };
  } else {
    campaign = {
      gclid: clipStr(body.gclid, 200) || null,
      gbraid: clipStr(body.gbraid, 200) || null,
      wbraid: clipStr(body.wbraid, 200) || null,
    };
  }

  const receiptId =
    (context && context.requestId) ||
    request.headers.get("x-nf-request-id") ||
    `contact_${Date.now()}`;

  const material = {
    fullName,
    phone,
    email,
    propertyType,
    serviceNeeded,
    cityArea,
    preferredTiming,
    message,
    intakeSource: INTAKE_SOURCE.CONTACT_FORM,
  };
  const materialHash = canonicalMaterialHash(material);

  let created;
  try {
    created = await createLeadAtomically({
      intakeSource: INTAKE_SOURCE.CONTACT_FORM,
      netlifyReceiptId: String(receiptId).slice(0, 120),
      campaign,
      consent: true,
      idempotencyKey: idemKey,
      materialHash,
      material,
    });
  } catch (e) {
    if (e instanceof IdempotencyMaterialConflictError || (e && e.code === "IDEMPOTENCY_MATERIAL_CONFLICT")) {
      return json({ error: "IDEMPOTENCY_MATERIAL_CONFLICT" }, 409);
    }
    if (e instanceof IdempotencyInFlightError || (e && e.code === "IDEMPOTENCY_IN_FLIGHT")) {
      return json({ error: PUBLIC_FAILURE, code: "IDEMPOTENCY_IN_FLIGHT" }, 503);
    }
    console.error("[contact-submit] Blob create failed", e && e.code);
    return json({ error: PUBLIC_FAILURE }, 500);
  }

  const lead = created.lead;
  let reportToken = created.reportToken;

  if (created.idempotentReplay && !created.needsDelivery) {
    return json({
      ok: true,
      leadId: lead.leadId,
      reportToken: null,
      idempotentReplay: true,
      receivedAt: new Date().toISOString(),
    });
  }

  const trackingMeta = [
    `Lead ID: ${lead.leadId}`,
    `trackingStatus: ${TRACKING_STATUS.PENDING}`,
    `conversionAction: ${CONVERSION_ACTION}`,
    lead.gclid ? `gclid: present` : "gclid: none",
    lead.gbraid ? `gbraid: present` : "gbraid: none",
    lead.wbraid ? `wbraid: present` : "wbraid: none",
  ].join(" · ");

  const subject = `Sparklean inquiry · Contact form · ${cityArea}`.slice(0, 200);
  const text = [
    "SPARKLEAN — CONTACT FORM",
    trackingMeta,
    "",
    `Name: ${fullName}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Property: ${propertyType}`,
    `Service: ${serviceNeeded}`,
    `City / area: ${cityArea}`,
    `Timing: ${preferredTiming}`,
    `Marketing consent: ${consentMarketing ? "yes" : "no"}`,
    "",
    "Message:",
    message || "(none)",
  ].join("\n");

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#f9f7f3;padding:24px;">
<h1 style="color:#b8a47a;font-size:16px;letter-spacing:.12em;text-transform:uppercase;">Contact form</h1>
<p style="font-size:12px;color:rgba(249,247,243,.55);">${escapeHtml(trackingMeta)}</p>
<p><strong>${escapeHtml(fullName)}</strong><br>${escapeHtml(email)}<br>${escapeHtml(phone)}</p>
<p>Property: ${escapeHtml(propertyType)}<br>Service: ${escapeHtml(serviceNeeded)}<br>Area: ${escapeHtml(cityArea)}<br>Timing: ${escapeHtml(preferredTiming)}</p>
<p>${escapeHtml(message || "(no message)")}</p>
</body></html>`;

  const payloadHash = hashToken(`${subject}\n${text}`);
  try {
    await ensureOutboxPending(lead.leadId, { payloadHash, channel: "brevo" });
    const delivery = await deliverOutbox(lead.leadId, async () => {
      await sendBrevo({ subject, html, text });
    });
    if (idemKey) await markClaimComplete(idemKey);
    if (delivery.duplicate && created.idempotentReplay) {
      reportToken = null;
    }
  } catch (e) {
    console.error("[contact-submit] email aborted", e && e.message);
    try {
      const box = await getOutbox(lead.leadId);
      if (!box || box.status !== OUTBOX_STATUS.DELIVERED) {
        await updateLead(lead.leadId, {
          trackingStatus: TRACKING_STATUS.FAILED,
          failureReason: "email_delivery_failed",
        });
      }
    } catch (e2) {
      console.error("[contact-submit] failed to mark FAILED");
    }
    return json({ error: PUBLIC_FAILURE }, 500);
  }

  await notifySlackOptional({ leadId: lead.leadId, serviceNeeded, cityArea });

  return json({
    ok: true,
    leadId: lead.leadId,
    reportToken,
    idempotentReplay: Boolean(created.idempotentReplay),
    receivedAt: new Date().toISOString(),
  });
};
