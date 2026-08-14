/**
 * Preview-only Brevo failure injection. Fail-closed on production hosts.
 * Requires BOTH env flags; never enabled by Host www.sparklean.co / sparklean.co.
 */
export function shouldForceBrevoFail(request) {
  const allow = process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL === "1";
  const force = process.env.SPARKLEAN_FORCE_BREVO_FAIL === "1";
  if (!allow || !force) return false;

  const host = String(
    (request && request.headers && (request.headers.get("x-forwarded-host") || request.headers.get("host"))) ||
      ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");

  if (!host) return false;
  if (host === "www.sparklean.co" || host === "sparklean.co") return false;
  // Only netlify draft/branch/preview hosts
  if (!host.endsWith(".netlify.app") && !host.endsWith(".netlify.com")) return false;
  return true;
}
