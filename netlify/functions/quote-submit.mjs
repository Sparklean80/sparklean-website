/**
 * Sparklean — POST /.netlify/functions/quote-submit
 * Validates intake payload, requests a short OpenAI summary (no pricing), emails info@sparklean.co via Resend.
 */

const MAX_BODY = 120_000;

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

function formatAnswerLines(answers) {
  if (!answers || typeof answers !== "object") return "";
  return Object.entries(answers)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
}

async function summarizeLead({ serviceLabel, answers, sourceUrl, submittedAt }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const payload = {
    model: "gpt-4o-mini",
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a discreet intake coordinator for Sparklean Cleaning, a luxury property services company in Southwest Florida.
Return a single JSON object with key "summary" (string, 2–4 sentences, professional and calm).
Rules:
- Describe what the client appears to need and context only. No emojis.
- NEVER mention prices, rates, estimates, dollar amounts, or "quote" as a number. Do not imply cost.
- If information is thin, note what is clear and what may need clarification.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          serviceLabel,
          sourceUrl,
          submittedAt,
          answers,
        }),
      },
    ],
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("OpenAI error", res.status, t);
    return null;
  }
  const data = await res.json();
  const txt = data?.choices?.[0]?.message?.content;
  if (!txt) return null;
  try {
    const parsed = JSON.parse(txt);
    return typeof parsed.summary === "string" ? parsed.summary.trim() : null;
  } catch {
    return null;
  }
}

async function sendResendEmail({ subject, html, text, attachmentJson }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SPARKLEAN_FROM_EMAIL;
  const to = process.env.SPARKLEAN_LEAD_TO || "info@sparklean.co";
  if (!apiKey || !from) {
    throw new Error("Email is not configured (RESEND_API_KEY / SPARKLEAN_FROM_EMAIL).");
  }
  const body = {
    from,
    to: [to],
    subject,
    html,
    text,
  };
  if (attachmentJson) {
    body.attachments = [
      {
        filename: "lead-intake.json",
        content: Buffer.from(attachmentJson, "utf8").toString("base64"),
      },
    ];
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("Resend error", res.status, t);
    throw new Error("Unable to deliver email.");
  }
  return res.json();
}

export default async (request) => {
  if (request.method === "OPTIONS") return cors204();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json({ error: "Invalid body" }, 400);
  }
  if (raw.length > MAX_BODY) return json({ error: "Payload too large" }, 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const answers = body.answers;
  if (!answers || typeof answers !== "object") return json({ error: "Missing answers" }, 400);
  const required = ["fullName", "phone", "email", "location", "serviceCategory"];
  for (const k of required) {
    if (typeof answers[k] !== "string" || !answers[k].trim()) {
      return json({ error: `Missing or invalid: ${k}` }, 400);
    }
  }

  const submittedAt = typeof body.submittedAt === "string" ? body.submittedAt : new Date().toISOString();
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.slice(0, 2000) : "";
  const serviceLabel =
    typeof body.serviceLabel === "string" && body.serviceLabel.trim()
      ? body.serviceLabel.trim()
      : answers.serviceCategory;

  const dashboardRecord = {
    event: "quote_intake_completed",
    version: 1,
    submittedAt,
    sourceUrl,
    serviceCategory: answers.serviceCategory,
    serviceLabel,
    answers: { ...answers },
    summary: null,
  };

  let summary = await summarizeLead({
    serviceLabel,
    answers,
    sourceUrl,
    submittedAt,
  });
  if (!summary) {
    summary =
      "A coordinator will review the structured responses below. Summary generation was skipped or unavailable.";
  }
  dashboardRecord.summary = summary;

  const attachmentJson = JSON.stringify(dashboardRecord, null, 2);
  const lines = formatAnswerLines(answers);
  const subject = `New lead — ${serviceLabel}`;

  const text = [
    `NEW LEAD — ${serviceLabel.toUpperCase()}`,
    "",
    `Submitted: ${submittedAt}`,
    `Source: ${sourceUrl || "(not provided)"}`,
    "",
    "CONTACT",
    `Name: ${answers.fullName}`,
    `Phone: ${answers.phone}`,
    `Email: ${answers.email}`,
    `Location: ${answers.location}`,
    "",
    "DETAIL",
    lines,
    "",
    "AI SUMMARY",
    summary,
    "",
    "Structured JSON is attached for your future dashboard (lead-intake.json).",
  ].join("\n");

  const html = `<pre style="font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.45;color:#111;background:#faf9f6;padding:16px;border-radius:8px;white-space:pre-wrap">${escapeHtml(
    text
  )}</pre>`;

  try {
    await sendResendEmail({ subject, html, text, attachmentJson });
  } catch (e) {
    return json({ error: e.message || "Send failed" }, 500);
  }

  return json({ ok: true, receivedAt: new Date().toISOString() });
};
