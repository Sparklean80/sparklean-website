const COOKIE = "sk_hiring_review";
const ROBOTS = "noindex, nofollow";

function safeEq(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left.length !== right.length) return false;
  let out = 0;
  for (let i = 0; i < left.length; i++) out |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return out === 0;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function gatePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Founder review access | Sparklean Cleaning</title>
<style>
body{margin:0;background:#0E0E0E;color:#F9F7F3;font-family:Montserrat,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}
form{max-width:28rem;width:100%;background:#161616;border:1px solid rgba(184,164,122,.2);padding:28px 24px}
label{display:grid;gap:8px;font-size:.8rem;letter-spacing:.04em}
input{background:#101010;border:1px solid rgba(249,247,243,.14);color:#F9F7F3;padding:12px}
button{margin-top:16px;background:#B8A47A;border:0;color:#0E0E0E;font-weight:600;letter-spacing:.16em;text-transform:uppercase;padding:14px 20px;width:100%;cursor:pointer}
p{color:rgba(249,247,243,.7);line-height:1.5;font-size:.92rem}
h1{font-family:Georgia,serif;font-weight:400;font-size:1.6rem}
</style>
</head>
<body>
<form method="get">
<h1>Founder review</h1>
<p>This hiring funnel is a private review. It is not a public application, does not send offers, and does not collect I-9 or driver’s-license images.</p>
<label>Access token <input type="password" name="access" autocomplete="off" required></label>
<button type="submit">Enter</button>
</form>
</body>
</html>`;
}

export default async (request, context) => {
  const url = new URL(request.url);
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    const local = await context.next();
    local.headers.set("X-Robots-Tag", ROBOTS);
    return local;
  }

  const secret =
    (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get("HIRING_REVIEW_TOKEN")) ||
    Deno.env.get("HIRING_REVIEW_TOKEN") ||
    "";
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "X-Robots-Tag": ROBOTS,
    "cache-control": "no-store",
  };
  if (!secret) {
    return new Response("Hiring founder review is not enabled.", { status: 503, headers });
  }

  const expected = await sha256Hex("hiring-review:" + secret);
  const access = url.searchParams.get("access") || "";
  const cookie = context.cookies.get(COOKIE) || "";
  const fromQuery = access ? await sha256Hex("hiring-review:" + access) : "";
  const allowed = (fromQuery && safeEq(fromQuery, expected)) || (cookie && safeEq(cookie, expected));

  if (!allowed) {
    return new Response(gatePage(), { status: 401, headers });
  }

  if (fromQuery && safeEq(fromQuery, expected)) {
    url.searchParams.delete("access");
    context.cookies.set({
      name: COOKIE,
      value: expected,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 60 * 60 * 24 * 7,
    });
    return Response.redirect(url.toString(), 302);
  }

  const response = await context.next();
  response.headers.set("X-Robots-Tag", ROBOTS);
  response.headers.set("cache-control", "no-store");
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  const html = await response.text();
  const marked = html.replace(/class="careers-page([^"]*)"/, 'class="careers-page$1 founder-demo"');
  return new Response(marked, { status: response.status, headers: response.headers });
};

export const config = {
  path: [
    "/careers",
    "/careers/",
    "/careers/*",
    "/pages/careers.html",
    "/pages/careers-apply.html",
    "/pages/careers-offer.html",
    "/pages/careers-documents.html",
  ],
};
