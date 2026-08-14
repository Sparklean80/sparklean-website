/**
 * Fetch exact Brevo DNS auth records for sparklean.co (no secrets printed).
 * Env: BREVO_API_KEY
 */
const key = process.env.BREVO_API_KEY || "";
if (key.length < 16) {
  console.log(JSON.stringify({ ok: false, error: "missing_or_short_key", keyLen: key.length }));
  process.exit(2);
}

async function get(path) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    headers: { accept: "application/json", "api-key": key },
  });
  const text = await res.text();
  let j = {};
  try {
    j = text ? JSON.parse(text) : {};
  } catch {
    j = { rawLen: text.length };
  }
  return { status: res.status, ok: res.ok, j };
}

const list = await get("/senders/domains");
const domains = Array.isArray(list.j.domains) ? list.j.domains : [];
const names = domains.map((d) => d.domain_name);
const spark =
  domains.find((d) => String(d.domain_name || "").toLowerCase() === "sparklean.co") ||
  domains.find((d) => /sparklean\.co/i.test(d.domain_name || ""));

console.log(
  JSON.stringify(
    {
      listOk: list.ok,
      listStatus: list.status,
      domainNames: names,
      sparkleanSummary: spark
        ? {
            domain_name: spark.domain_name,
            authenticated: spark.authenticated,
            verified: spark.verified,
            provider: spark.provider || null,
          }
        : null,
    },
    null,
    2
  )
);

if (!spark) process.exit(0);

const cfg = await get(`/senders/domains/${encodeURIComponent(spark.domain_name)}`);
const dns = cfg.j.dns_records || {};
const pick = (rec) =>
  rec
    ? {
        host_name: rec.host_name,
        type: rec.type,
        value: rec.value,
        status: rec.status,
      }
    : null;

console.log(
  JSON.stringify(
    {
      configOk: cfg.ok,
      configStatus: cfg.status,
      domain: cfg.j.domain || spark.domain_name,
      verified: cfg.j.verified,
      authenticated: cfg.j.authenticated,
      dns_records: {
        brevo_code: pick(dns.brevo_code),
        dkim_record: pick(dns.dkim_record),
        dkim1_record: pick(dns.dkim1_record || dns.dkim_record_1),
        dkim2_record: pick(dns.dkim2_record || dns.dkim_record_2),
        dmarc_record: pick(dns.dmarc_record),
        // keep unknown keys' host/type only if present
        otherKeys: Object.keys(dns),
      },
      rawDnsKeys: Object.keys(dns),
    },
    null,
    2
  )
);
