/**
 * Preview-only Brevo failure injection. Fail-closed on production hosts.
 * Requires BOTH env flags; never enabled on www.sparklean.co / sparklean.co.
 * Uses request Host / URL, then DEPLOY_URL / DEPLOY_PRIME_URL (Netlify injects these).
 */
function hostnameFrom(value) {
  const raw = String(value || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  if (!raw) return "";
  if (raw.includes("://")) {
    try {
      return new URL(raw).hostname.toLowerCase();
    } catch {
      return "";
    }
  }
  return raw;
}

function isProductionSparkleanHost(host) {
  return host === "www.sparklean.co" || host === "sparklean.co";
}

function isNetlifyPreviewHost(host) {
  return Boolean(host) && (host.endsWith(".netlify.app") || host.endsWith(".netlify.com"));
}

export function resolvePreviewHost(request) {
  const headers = (request && request.headers) || null;
  const fromHeader = headers
    ? hostnameFrom(headers.get("x-forwarded-host") || headers.get("host") || "")
    : "";
  if (fromHeader) return fromHeader;
  if (request && request.url) {
    const fromUrl = hostnameFrom(request.url);
    if (fromUrl) return fromUrl;
  }
  const fromDeploy = hostnameFrom(
    process.env.DEPLOY_URL || process.env.DEPLOY_PRIME_URL || process.env.URL || ""
  );
  return fromDeploy;
}

export function shouldForceBrevoFail(request) {
  const allow = process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL === "1";
  const force = process.env.SPARKLEAN_FORCE_BREVO_FAIL === "1";
  if (!allow || !force) return false;

  const host = resolvePreviewHost(request);
  if (isProductionSparkleanHost(host)) return false;
  if (isNetlifyPreviewHost(host)) return true;
  return false;
}
