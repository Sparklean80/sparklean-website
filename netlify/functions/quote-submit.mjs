/**
 * Sparklean — POST /.netlify/functions/quote-submit
 * Validates structured intake, optional brief model summary (capped latency), emails via Resend.
 * The lead record is the source of truth; summary is secondary.
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

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 2200);

  const payload = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 120,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You output ONLY valid JSON: {"summary":"..."}.
The summary must be exactly 2 short sentences (under 320 characters total), calm and professional, like an internal hotel handoff note — no emojis, no exclamation marks, no sales language.
Use ONLY facts implied by the provided fields. Do not invent services, policies, availability, or scope. Do not address the client directly ("you").
NEVER mention prices, rates, estimates, costs, dollars, or "quotes" as numbers.`,
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

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
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
  } catch (e) {
    if (e && e.name === "AbortError") return null;
    console.error("OpenAI fetch failed", e);
    return null;
  } finally {
    clearTimeout(tid);
  }
}

function parseResendFailureText(text) {
  if (!text || typeof text !== "string") return "Unknown error from email provider.";
  try {
    const j = JSON.parse(text);
    if (typeof j.message === "string") return j.message;
    if (Array.isArray(j.message)) return j.message.map(String).join("; ");
    if (j.message && typeof j.message === "object") return JSON.stringify(j.message);
  } catch {
    /* ignore */
  }
  return text.slice(0, 500);
}

async function resendPost(apiKey, body) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function sendResendEmail({ subject, html, text, attachmentJson, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SPARKLEAN_FROM_EMAIL;
  const to = process.env.SPARKLEAN_LEAD_TO || "info@sparklean.co";
  if (!apiKey || !from) {
    throw new Error("Email is not configured (RESEND_API_KEY / SPARKLEAN_FROM_EMAIL).");
  }

  const base = {
    from,
    to: [to],
    subject,
    html,
    text,
  };
  if (replyTo && typeof replyTo === "string" && replyTo.includes("@")) {
    base.reply_to = replyTo;
  }

  const withAttachment =
    attachmentJson &&
    ({
      ...base,
      attachments: [
        {
          filename: "lead-intake.json",
          content: Buffer.from(attachmentJson, "utf8").toString("base64"),
        },
      ],
    });

  let attempt = withAttachment ? await resendPost(apiKey, withAttachment) : await resendPost(apiKey, base);

  if (!attempt.ok && withAttachment) {
    console.warn("Resend failed with attachment; retrying without.", attempt.status, attempt.text);
    attempt = await resendPost(apiKey, base);
  }

  if (!attempt.ok) {
    const detail = parseResendFailureText(attempt.text);
    console.error("Resend error", attempt.status, attempt.text);
    const err = new Error("Unable to deliver email.");
    err.resendStatus = attempt.status;
    err.resendDetail = detail;
    throw err;
  }

  try {
    return attempt.text ? JSON.parse(attempt.text) : {};
  } catch {
    return {};
  }
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
      "Structured responses appear below; a coordinator will review and respond.";
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
    "BRIEF INTERNAL SUMMARY",
    summary,
    "",
    "Structured JSON is attached for your future dashboard (lead-intake.json).",
  ].join("\n");

  const html = `<pre style="font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.45;color:#111;background:#faf9f6;padding:16px;border-radius:8px;white-space:pre-wrap">${escapeHtml(
    text
  )}</pre>`;

  const verbose =
    process.env.SPARKLEAN_QUOTE_VERBOSE_ERRORS === "1" ||
    process.env.CONTEXT === "deploy-preview";

  try {
    await sendResendEmail({
      subject,
      html,
      text,
      attachmentJson,
      replyTo: answers.email,
    });
  } catch (e) {
    const hint =
      verbose && e.resendDetail
        ? e.resendDetail
        : "Confirm in Netlify: RESEND_API_KEY, SPARKLEAN_FROM_EMAIL (must be a domain verified in Resend), and SPARKLEAN_LEAD_TO. Check the function log for the full Resend response.";
    return json(
      {
        error: e.message || "Send failed",
        hint,
      },
      500
    );
  }

  return json({ ok: true, receivedAt: new Date().toISOString() });
};
