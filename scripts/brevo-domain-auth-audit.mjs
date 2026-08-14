/**
 * Query Brevo domain auth status without printing secrets.
 * Uses BREVO_API_KEY from env (set by caller from Netlify, never logged).
 */
const key = process.env.BREVO_API_KEY || "";
if (!key || key.length < 8) {
  console.log(JSON.stringify({ ok: false, error: "missing_key" }));
  process.exit(2);
}

const res = await fetch("https://api.brevo.com/v3/senders/domains", {
  headers: { accept: "application/json", "api-key": key },
});
const text = await res.text();
let j = {};
try {
  j = text ? JSON.parse(text) : {};
} catch {
  j = {};
}

const domains = Array.isArray(j.domains)
  ? j.domains.map((d) => ({
      domain_name: d.domain_name,
      authenticated: d.authenticated === true,
      verified: d.verified === true,
      provider: d.provider || null,
      hasDedicatedIp: Boolean(d.ip),
    }))
  : [];

console.log(
  JSON.stringify(
    {
      ok: res.ok,
      status: res.status,
      count: domains.length,
      domains,
      sparklean: domains.find((d) => /sparklean\.co/i.test(d.domain_name)) || null,
    },
    null,
    2
  )
);

// Also try domain config endpoint if sparklean id known
const sk = domains.find((d) => /sparklean\.co$/i.test(d.domain_name));
if (sk && sk.domain_name) {
  // Some accounts expose DNS config via GET /v3/senders/domains/{domain}
  const r2 = await fetch(`https://api.brevo.com/v3/senders/domains/${encodeURIComponent(sk.domain_name)}`, {
    headers: { accept: "application/json", "api-key": key },
  });
  const t2 = await r2.text();
  let j2 = {};
  try {
    j2 = t2 ? JSON.parse(t2) : {};
  } catch {
    j2 = {};
  }
  // Redact any long opaque codes but keep record hostnames/types
  const redact = (v) => {
    if (typeof v !== "string") return v;
    if (/brevo-code:/i.test(v)) return "brevo-code:[redacted-from-dashboard]";
    if (v.length > 80 && /\.dkim\.brevo\.com/i.test(v)) return v; // CNAME target ok
    if (v.length > 120) return `[redacted-len-${v.length}]`;
    return v;
  };
  const walk = (o) => {
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === "object") {
      const out = {};
      for (const [k, val] of Object.entries(o)) {
        if (/key|token|secret|code/i.test(k) && typeof val === "string" && !/\.dkim\.brevo\.com/i.test(val)) {
          out[k] = redact(val);
        } else out[k] = walk(val);
      }
      return out;
    }
    return typeof o === "string" ? redact(o) : o;
  };
  console.log(JSON.stringify({ domainDetailStatus: r2.status, detail: walk(j2) }, null, 2));
}
