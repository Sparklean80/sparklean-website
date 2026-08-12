/**
 * Conversion-gap alerts (Slack webhook + Brevo ops email).
 * Allowlisted retry payload only — no Ads Offline Import API yet.
 * Never include reportToken, customer PII, or credentials.
 */

import {
  buildRetryPayload,
  findSensitiveLeak,
  isGoogleAttributed,
  RETRY_PAYLOAD_KEYS,
} from "./leads-store.mjs";

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

/**
 * Build alert body from allowlisted retry fields only.
 * Rejects accidental PII / token leakage before send.
 */
export function buildConversionGapAlertText(lead) {
  const retry = buildRetryPayload(lead);
  for (const k of Object.keys(retry)) {
    if (!RETRY_PAYLOAD_KEYS.includes(k)) delete retry[k];
  }
  // Strip any accidental reportToken if a caller mutated lead
  delete retry.reportToken;

  const title = "Sparklean conversion gap";
  const text = [
    title,
    `leadId: ${lead.leadId}`,
    `source: ${lead.intakeSource}`,
    `status: ${lead.trackingStatus}`,
    `failureReason: ${lead.failureReason || "n/a"}`,
    "",
    "Retry payload (Ads Offline Import later — allowlisted fields only):",
    JSON.stringify(retry, null, 2),
  ].join("\n");

  const leaks = findSensitiveLeak(text);
  if (leaks.length) {
    console.error("[conversion-alert] blocked sensitive leak", leaks);
    throw new Error("ALERT_SENSITIVE_LEAK");
  }
  return { title, text, retry };
}

async function brevoOpsEmail({ subject, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[conversion-alert] missing BREVO_API_KEY");
    return;
  }
  const fromRaw =
    (process.env.SPARKLEAN_FROM_EMAIL && process.env.SPARKLEAN_FROM_EMAIL.trim()) || "info@sparklean.co";
  const toEmail =
    (process.env.SPARKLEAN_OPS_EMAIL && process.env.SPARKLEAN_OPS_EMAIL.trim()) ||
    (process.env.SPARKLEAN_LEAD_TO && process.env.SPARKLEAN_LEAD_TO.trim()) ||
    "info@sparklean.co";
  const sender = parseSender(fromRaw);
  try {
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
        subject,
        textContent: text,
        htmlContent: `<pre style="font-family:monospace;white-space:pre-wrap;">${String(text)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")}</pre>`,
      }),
    });
    if (!res.ok) {
      console.error("[conversion-alert] Brevo ops email failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("[conversion-alert] Brevo ops email error", e);
  }
}

async function slackAlert(text) {
  const url = process.env.SPARKLEAN_SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) console.error("[conversion-alert] Slack non-OK", r.status, await r.text());
  } catch (e) {
    console.error("[conversion-alert] Slack failed", e);
  }
}

/**
 * Fire conversion-gap alert for Google-attributed leads on OFFLINE_QUEUED / FAILED.
 */
export async function alertConversionGap(lead) {
  if (!lead || !isGoogleAttributed(lead)) return;
  if (lead.trackingStatus !== "OFFLINE_QUEUED" && lead.trackingStatus !== "FAILED") return;

  let built;
  try {
    built = buildConversionGapAlertText(lead);
  } catch (e) {
    console.error("[conversion-alert] refused to send", e && e.message);
    return;
  }

  await slackAlert(`*${built.title}*\n\`\`\`\n${built.text}\n\`\`\``);
  await brevoOpsEmail({
    subject: `${built.title} · ${lead.leadId}`,
    text: built.text,
  });
}
