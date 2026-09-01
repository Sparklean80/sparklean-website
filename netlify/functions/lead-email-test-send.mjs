/**
 * Preview-only: send one [TEST] fixed lead email to SPARKLEAN_LEAD_TO via Brevo.
 * GET or POST /.netlify/functions/lead-email-test-send?key=SPARKLEAN_RECONCILE_KEY
 */
import { buildQuoteLeadHtmlEmail, quoteLeadEmailFixture } from "./lib/lead-email-html.mjs";

function parseSender(fromRaw) {
  const s = String(fromRaw || "").trim();
  const br = s.match(/^(.+?)\s*<([^>]+)>$/);
  if (br) return { name: br[1].replace(/^["']|["']$/g, "").trim(), email: br[2].trim() };
  return { name: "Sparklean Cleaning", email: s || "info@sparklean.co" };
}

export async function handler(event) {
  const ctx = process.env.CONTEXT || "";
  if (ctx === "production") {
    return { statusCode: 403, body: "Disabled on production — use preview deploy only." };
  }

  const secret = process.env.SPARKLEAN_RECONCILE_KEY || "";
  const key = event.queryStringParameters?.key || "";
  const previewOk = process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL === "1";
  const authorized = previewOk || (secret && key === secret);
  if (!authorized) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  if (!apiKey || apiKey.includes("*")) {
    return { statusCode: 500, body: "BREVO_API_KEY unavailable on this deploy." };
  }

  const fromRaw = process.env.SPARKLEAN_FROM_EMAIL || "info@sparklean.co";
  const toEmail = process.env.SPARKLEAN_LEAD_TO || "info@sparklean.co";
  const html = buildQuoteLeadHtmlEmail(quoteLeadEmailFixture());
  const subject = `[TEST] Fixed lead email preview · ${new Date().toISOString().slice(0, 19)}Z`;
  const text = "Sparklean fixed lead email preview — verify readable text in Gmail normal + dark mode.";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: parseSender(fromRaw),
      to: [{ email: toEmail }],
      subject,
      htmlContent: html,
      textContent: text,
      tags: ["lead-email-regression-probe"],
    }),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    return { statusCode: 502, body: `Brevo failed ${res.status}: ${bodyText.slice(0, 300)}` };
  }

  let messageId = null;
  try {
    messageId = JSON.parse(bodyText).messageId || null;
  } catch {
    /* ignore */
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, to: toEmail, subject, brevoMessageId: messageId }),
  };
}
