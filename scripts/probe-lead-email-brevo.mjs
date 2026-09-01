/**
 * Send one [TEST] lead email through Brevo to verify Gmail rendering.
 * Requires BREVO_API_KEY + SPARKLEAN_FROM_EMAIL in env. Does not deploy.
 * Run: node scripts/probe-lead-email-brevo.mjs
 */
import { buildQuoteLeadHtmlEmail, quoteLeadEmailFixture } from "../netlify/functions/lib/lead-email-html.mjs";

const apiKey = String(process.env.BREVO_API_KEY || "").trim();
const fromRaw = process.env.SPARKLEAN_FROM_EMAIL || "info@sparklean.co";
const toEmail = process.env.SPARKLEAN_LEAD_TO || "info@sparklean.co";

function parseSender(from) {
  const s = String(from).trim();
  const br = s.match(/^(.+?)\s*<([^>]+)>$/);
  if (br) return { name: br[1].replace(/^["']|["']$/g, "").trim(), email: br[2].trim() };
  return { name: "Sparklean Cleaning", email: s };
}

async function main() {
  if (!apiKey) {
    console.error("SKIP: BREVO_API_KEY not set — cannot send live Brevo probe");
    process.exit(2);
  }
  if (apiKey.includes("*")) {
    console.error("SKIP: BREVO_API_KEY looks masked — use: npx netlify dev:exec --context production node scripts/probe-lead-email-brevo.mjs");
    process.exit(2);
  }

  const html = buildQuoteLeadHtmlEmail(quoteLeadEmailFixture());
  const subject = `[TEST] Lead email regression probe · ${new Date().toISOString().slice(0, 19)}Z`;
  const text =
    "Sparklean lead email regression probe. Verify cream text on dark background in normal + dark mode Gmail.";

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
  let body = {};
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { raw: bodyText };
  }

  if (!res.ok) {
    console.error("FAIL Brevo probe", res.status, bodyText.slice(0, 500));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        brevoMessageId: body.messageId || body.messageIds?.[0] || null,
        to: toEmail,
        subject,
        note: "Check Gmail normal + dark mode before production deploy",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
