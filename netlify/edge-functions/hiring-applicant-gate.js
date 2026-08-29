const ROBOTS = "noindex, nofollow";

function denyPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex, nofollow">
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
<p><a href="/careers">Back to careers</a></p>
</section>
</body>
</html>`;
}

function applicantToken(url) {
  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const kindIdx = parts.findIndex((p) => p === "offer" || p === "documents");
  if (kindIdx >= 0 && parts[kindIdx + 1]) return decodeURIComponent(parts[kindIdx + 1]);
  return url.searchParams.get("token") || url.searchParams.get("resume") || "";
}

export default async (request, context) => {
  const url = new URL(request.url);
  const token = applicantToken(url);
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "X-Robots-Tag": ROBOTS,
    "cache-control": "no-store",
  };
  if (!token) {
    return new Response(denyPage(), { status: 401, headers });
  }
  const response = await context.next();
  response.headers.set("X-Robots-Tag", ROBOTS);
  response.headers.set("cache-control", "no-store");
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
