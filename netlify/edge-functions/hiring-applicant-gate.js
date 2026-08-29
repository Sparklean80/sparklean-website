const API = "https://api.sparklean.co";
const ROBOTS = "noindex, nofollow";
const TOKEN_RE = /^[a-f0-9]{64}$/i;

function denyHeaders() {
  return {
    "content-type": "text/html; charset=utf-8",
    "X-Robots-Tag": ROBOTS,
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  };
}

function denyPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link not valid | Sparklean Cleaning</title>
<style>
body{margin:0;background:#0E0E0E;color:#F9F7F3;font-family:Montserrat,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px}
section{max-width:28rem;width:100%;background:#161616;border:1px solid rgba(184,164,122,.2);padding:28px 24px}
p{color:rgba(249,247,243,.7);line-height:1.5;font-size:.92rem}
h1{font-family:Georgia,serif;font-weight:400;font-size:1.6rem}
a{color:#D4BF96}
</style>
</head>
<body>
<section>
<h1>This link is not valid</h1>
<p>Offer and document pages are only available with a personal applicant link. They are not public career listings.</p>
<p><a href="/careers" rel="noreferrer">Back to careers</a></p>
</section>
</body>
</html>`;
}

function deny(status) {
  return new Response(denyPage(), { status, headers: denyHeaders() });
}

function applicantToken(url) {
  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const kindIdx = parts.findIndex((p) => p === "offer" || p === "documents");
  if (kindIdx >= 0 && parts[kindIdx + 1] && !parts[kindIdx + 1].startsWith("careers-")) {
    return decodeURIComponent(parts[kindIdx + 1]);
  }
  return url.searchParams.get("token") || url.searchParams.get("resume") || "";
}

function tokenKind(url) {
  const path = url.pathname;
  if (path.includes("/careers/offer") || path.includes("careers-offer")) return "offer";
  if (path.includes("/careers/documents") || path.includes("careers-documents")) return "documents";
  return "";
}

async function tokenIsValid(kind, token) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res =
      kind === "offer"
        ? await fetch(`${API}/api/hiring/offers/${encodeURIComponent(token)}`, {
            method: "GET",
            redirect: "manual",
            signal: ctrl.signal,
            headers: { accept: "application/json" },
          })
        : await fetch(`${API}/api/hiring/documents/status`, {
            method: "GET",
            redirect: "manual",
            signal: ctrl.signal,
            headers: { accept: "application/json", "x-hiring-resume": token },
          });
    await res.arrayBuffer();
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export default async (request, context) => {
  const url = new URL(request.url);
  const token = applicantToken(url);
  const kind = tokenKind(url);
  if (!token) return deny(401);
  if (!TOKEN_RE.test(token) || (kind !== "offer" && kind !== "documents")) return deny(404);
  const ok = await tokenIsValid(kind, token);
  if (!ok) return deny(404);

  const response = await context.next();
  response.headers.set("X-Robots-Tag", ROBOTS);
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
};

export const config = {
  path: [
    "/careers/offer",
    "/careers/offer/",
    "/careers/offer/*",
    "/careers/documents",
    "/careers/documents/",
    "/careers/documents/*",
    "/pages/careers-offer.html",
    "/pages/careers-documents.html",
  ],
};
