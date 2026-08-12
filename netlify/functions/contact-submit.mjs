/**
 * Sparklean — POST /.netlify/functions/contact-submit
 * Server-accepted contact lead: Blob PENDING + Brevo (+ optional Slack) → { ok, leadId, reportToken }.
 */

import {
  CONVERSION_ACTION,
  INTAKE_SOURCE,
  TRACKING_STATUS,
  createLead,
  updateLead,
} from "./lib/leads-store.mjs";

const MAX_BODY = 80_000;
const PUBLIC_FAILURE =
  "We're having trouble submitting your request right now. Please call Sparklean directly at (239) 888-3588.";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function cors204() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
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

function clip(v, n) {
  return typeof v === "string" ? v.trim().slice(0, n) : "";
}

function parseFormBody(raw, contentType) {
  if (contentType.includes("application/json")) {
    return JSON.parse(raw);
  }
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
    const t = await res.text();
    console.error("[contact-submit] Brevo failed", res.status, t);
    throw new Error("BREVO_FAILED");
  }
}

async function notifySlackOptional({ leadId, fullName, serviceNeeded, cityArea }) {
  const url = process.env.SPARKLEAN_SLACK_WEBHOOK_URL;
  if (!url) return;
  const text = [
    `*Sparklean contact form*`,
    `ID: \`${leadId}\``,
    fullName ? `Name: ${fullName}` : "",
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

  // Honeypot
  if (body["bot-field"] || body.botField) {
    return json({ ok: true, leadId: "ignored", reportToken: "ignored" }, 200);
  }

  const fullName = clip(body.fullName, 120);
  const phone = clip(body.phone, 32);
  const email = clip(body.email, 160);
  const propertyType = clip(body.propertyType, 80);
  const serviceNeeded = clip(body.serviceNeeded, 200);
  const cityArea = clip(body.cityArea, 120);
  const preferredTiming = clip(body.preferredTiming, 80);
  const message = clip(body.message, 4000);
  const consentContact = body.consentContact === "yes" || body.consentContact === true || body.consentContact === "on";
  const consentMarketing =
    body.consentMarketing === "yes" || body.consentMarketing === true || body.consentMarketing === "on";

  if (!fullName || !phone || !email || !propertyType || !serviceNeeded || !cityArea || !preferredTiming) {
    return json({ error: "Missing required fields" }, 400);
  }
  if (!email.includes("@")) return json({ error: "Invalid email" }, 400);
  if (!consentContact) return json({ error: "Consent required" }, 400);

  let campaign = null;
  if (body.campaign && typeof body.campaign === "object") {
    campaign = body.campaign;
  } else {
    campaign = {
      gclid: clip(body.gclid, 200) || null,
      gbraid: clip(body.gbraid, 200) || null,
      wbraid: clip(body.wbraid, 200) || null,
    };
  }

  const receiptId =
    (context && context.requestId) ||
    request.headers.get("x-nf-request-id") ||
    `contact_${Date.now()}`;

  let lead;
  try {
    lead = await createLead({
      intakeSource: INTAKE_SOURCE.CONTACT_FORM,
      netlifyReceiptId: String(receiptId),
      campaign,
      consent: true,
    });
  } catch (e) {
    console.error("[contact-submit] Blob create failed", e);
    return json({ error: PUBLIC_FAILURE }, 500);
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

  try {
    await sendBrevo({ subject, html, text });
  } catch (e) {
    console.error("[contact-submit] email aborted", e && e.message);
    try {
      await updateLead(lead.leadId, {
        trackingStatus: TRACKING_STATUS.FAILED,
        failureReason: "email_delivery_failed",
      });
    } catch (e2) {
      console.error("[contact-submit] failed to mark FAILED", e2);
    }
    return json({ error: PUBLIC_FAILURE }, 500);
  }

  await notifySlackOptional({ leadId: lead.leadId, fullName, serviceNeeded, cityArea });

  return json({
    ok: true,
    leadId: lead.leadId,
    reportToken: lead.reportToken,
    receivedAt: new Date().toISOString(),
  });
};
