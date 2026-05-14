/**
 * Sparklean — POST /.netlify/functions/quote-submit
 * Outbound only: Netlify function → Brevo transactional API → your inbox (e.g. info@sparklean.co).
 * Structured lead body is authoritative; optional OpenAI summary never blocks email.
 */

const MAX_BODY = 120_000;

/** Returned to the browser on any email send failure — no env names or provider bodies. */
const PUBLIC_EMAIL_FAILURE =
  "Unable to send request at the moment. Please call Sparklean directly at (239) 888-3588.";

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
      console.error("[quote-submit] OpenAI summary skipped (non-OK)", res.status, t);
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
    console.error("[quote-submit] OpenAI summary skipped (fetch error)", e);
    return null;
  } finally {
    clearTimeout(tid);
  }
}

function parseBrevoFailureText(text) {
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

/** Parse SPARKLEAN_FROM_EMAIL into Brevo sender { name, email }. */
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

function buildBrevoPayload({ sender, toEmail, subject, html, text, replyTo, attachment }) {
  const payload = {
    sender,
    to: [{ email: toEmail }],
    subject,
    htmlContent: html,
    textContent: text,
  };
  if (replyTo && typeof replyTo === "string" && replyTo.includes("@")) {
    payload.replyTo = { email: replyTo.trim() };
  }
  if (attachment) {
    payload.attachment = [attachment];
  }
  return payload;
}

async function brevoPost(apiKey, payload) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });
  const responseText = await res.text();
  return { ok: res.ok, status: res.status, text: responseText };
}

async function sendBrevoTransactionalEmail({ subject, html, text, attachmentJson, replyTo }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromRaw = (process.env.SPARKLEAN_FROM_EMAIL && process.env.SPARKLEAN_FROM_EMAIL.trim()) || "info@sparklean.co";
  const toEmail = (process.env.SPARKLEAN_LEAD_TO && process.env.SPARKLEAN_LEAD_TO.trim()) || "info@sparklean.co";
  const sender = parseSender(fromRaw);

  if (!apiKey) {
    console.error("[quote-submit] missing outbound config", {
      hasBrevoApiKey: false,
      senderEmail: sender.email,
      leadTo: toEmail,
    });
    throw new Error("MISSING_EMAIL_CONFIG");
  }

  const basePayload = buildBrevoPayload({
    sender,
    toEmail,
    subject,
    html,
    text,
    replyTo,
    attachment: null,
  });

  const withAttachmentPayload =
    attachmentJson &&
    buildBrevoPayload({
      sender,
      toEmail,
      subject,
      html,
      text,
      replyTo,
      attachment: {
        name: "lead-intake.json",
        content: Buffer.from(attachmentJson, "utf8").toString("base64"),
      },
    });

  let attempt = withAttachmentPayload
    ? await brevoPost(apiKey, withAttachmentPayload)
    : await brevoPost(apiKey, basePayload);

  if (!attempt.ok && withAttachmentPayload) {
    console.warn("[quote-submit] Brevo failed with attachment; retrying without.", attempt.status, attempt.text);
    attempt = await brevoPost(apiKey, basePayload);
  }

  if (!attempt.ok) {
    const detail = parseBrevoFailureText(attempt.text);
    console.error("[quote-submit] Brevo outbound failed", {
      httpStatus: attempt.status,
      parsedMessage: detail,
      attemptedWithAttachmentFirst: Boolean(withAttachmentPayload),
    });
    console.error("[quote-submit] Brevo raw response (for support):", attempt.text);
    const err = new Error("BREVO_FAILED");
    err.brevoStatus = attempt.status;
    err.brevoDetail = detail;
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

  try {
    await sendBrevoTransactionalEmail({
      subject,
      html,
      text,
      attachmentJson,
      replyTo: answers.email,
    });
  } catch (e) {
    console.error("[quote-submit] email path aborted — see logs above for Brevo / config", {
      code: e && e.message,
      brevoStatus: e && e.brevoStatus,
      brevoDetail: e && e.brevoDetail,
    });
    return json({ error: PUBLIC_EMAIL_FAILURE }, 500);
  }

  return json({ ok: true, receivedAt: new Date().toISOString() });
};
