/**
 * Record before-state of sparklean.co DNS via Netlify API, then apply only
 * Brevo-provided auth records. NEVER modify the existing Google SPF TXT.
 *
 * Exact records from Brevo API (2026-08-14 probe):
 * - TXT @  brevo-code:38d801b5503e3eb1ece3a7870a4ab513
 * - CNAME brevo1._domainkey -> b1.sparklean-co.dkim.brevo.com
 * - CNAME brevo2._domainkey -> b2.sparklean-co.dkim.brevo.com
 * - TXT _dmarc  v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com
 */
import fs from "fs";
import { spawnSync } from "child_process";

const ZONE_ID = "6a0c6abcc2af1a43fa9fc125";
const SITE_ID = "7b32b2d6-9257-4d3c-9236-80ff24a54563";
const APPLY = process.argv.includes("--apply");

const BREVO_RECORDS = [
  {
    type: "TXT",
    hostname: "sparklean.co",
    value: "brevo-code:38d801b5503e3eb1ece3a7870a4ab513",
    ttl: 3600,
    label: "brevo_code",
  },
  {
    type: "CNAME",
    hostname: "brevo1._domainkey.sparklean.co",
    value: "b1.sparklean-co.dkim.brevo.com",
    ttl: 3600,
    label: "dkim1",
  },
  {
    type: "CNAME",
    hostname: "brevo2._domainkey.sparklean.co",
    value: "b2.sparklean-co.dkim.brevo.com",
    ttl: 3600,
    label: "dkim2",
  },
  {
    type: "TXT",
    hostname: "_dmarc.sparklean.co",
    value: "v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com",
    ttl: 3600,
    label: "dmarc",
  },
];

function api(method, dataObj) {
  const data = JSON.stringify(dataObj);
  const cmdline = `npx netlify api ${method} --data "${data.replace(/"/g, '\\"')}"`;
  const r = spawnSync(cmdline, {
    encoding: "utf8",
    shell: "cmd.exe",
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  const out = (r.stdout || "").trim();
  const err = (r.stderr || "").trim();
  if (!out) throw new Error(`${method} empty: ${err.slice(0, 400)}`);
  const startBrace = out.indexOf("{");
  const startBracket = out.indexOf("[");
  let start = -1;
  if (startBrace >= 0 && startBracket >= 0) start = Math.min(startBrace, startBracket);
  else start = Math.max(startBrace, startBracket);
  if (start < 0) throw new Error(`${method} non-json: ${out.slice(0, 300)}`);
  return JSON.parse(out.slice(start));
}

function normalizeHost(h) {
  return String(h || "")
    .toLowerCase()
    .replace(/\.$/, "");
}

function isSpf(value) {
  return /^v=spf1\b/i.test(String(value || "").replace(/^"|"$/g, ""));
}

const records = api("getDnsRecords", { zone_id: ZONE_ID });
const list = Array.isArray(records) ? records : [];

const before = list.map((r) => ({
  id: r.id,
  type: r.type,
  hostname: r.hostname,
  value: r.value,
  ttl: r.ttl,
}));

const spf = before.filter((r) => r.type === "TXT" && isSpf(r.value));
const relevant = before.filter((r) => {
  const h = normalizeHost(r.hostname);
  return (
    h === "sparklean.co" ||
    h === "_dmarc.sparklean.co" ||
    h.includes("_domainkey") ||
    /brevo/i.test(String(r.value || ""))
  );
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = `docs/work-notes/2026-08-14-brevo-domain-auth`;
fs.mkdirSync(outDir, { recursive: true });
const beforePath = `${outDir}/${stamp}-dns-before.json`;
fs.writeFileSync(
  beforePath,
  JSON.stringify(
    {
      zoneId: ZONE_ID,
      siteId: SITE_ID,
      recordedAt: new Date().toISOString(),
      spfRecords: spf,
      relevantRecords: relevant,
      allCount: before.length,
      plannedAdds: BREVO_RECORDS,
      policy: "Do not modify existing SPF; do not add include:spf.brevo.com",
    },
    null,
    2
  )
);

console.log(
  JSON.stringify(
    {
      mode: APPLY ? "apply" : "dry-run",
      beforePath,
      allCount: before.length,
      spfRecords: spf,
      relevantCount: relevant.length,
      plannedAdds: BREVO_RECORDS.map((r) => ({
        label: r.label,
        type: r.type,
        hostname: r.hostname,
        value: r.value,
      })),
    },
    null,
    2
  )
);

if (spf.length !== 1 || !/^v=spf1 include:_spf\.google\.com ~all$/i.test(String(spf[0].value || "").replace(/^"|"$/g, ""))) {
  console.error("ABORT: unexpected SPF state — refusing to mutate DNS");
  process.exit(3);
}

function alreadyPresent(desired) {
  const host = normalizeHost(desired.hostname);
  const val = String(desired.value).replace(/\.$/, "").toLowerCase();
  return before.find((r) => {
    if (String(r.type).toUpperCase() !== desired.type) return false;
    if (normalizeHost(r.hostname) !== host) return false;
    const rv = String(r.value || "")
      .replace(/^"|"$/g, "")
      .replace(/\.$/, "")
      .toLowerCase();
    return rv === val || rv.includes(val);
  });
}

if (!APPLY) {
  console.log(JSON.stringify({ ok: true, note: "re-run with --apply to create missing records" }));
  process.exit(0);
}

const created = [];
const skipped = [];
for (const desired of BREVO_RECORDS) {
  const exist = alreadyPresent(desired);
  if (exist) {
    skipped.push({ label: desired.label, id: exist.id, reason: "already_present" });
    continue;
  }
  // Netlify CLI createDnsRecord expects zone_id + nested body
  const createdRec = api("createDnsRecord", {
    zone_id: ZONE_ID,
    body: {
      type: desired.type,
      hostname: desired.hostname,
      value: desired.value,
      ttl: desired.ttl,
    },
  });
  created.push({
    label: desired.label,
    id: createdRec.id || null,
    type: createdRec.type || desired.type,
    hostname: createdRec.hostname || desired.hostname,
    value: createdRec.value || desired.value,
  });
}

const after = api("getDnsRecords", { zone_id: ZONE_ID });
const afterList = Array.isArray(after) ? after : [];
const afterSpf = afterList.filter((r) => r.type === "TXT" && isSpf(r.value));
const afterPath = `${outDir}/${stamp}-dns-after.json`;
fs.writeFileSync(
  afterPath,
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      created,
      skipped,
      spfRecords: afterSpf,
      spfUnchanged:
        afterSpf.length === 1 &&
        String(afterSpf[0].value || "").replace(/^"|"$/g, "") ===
          String(spf[0].value || "").replace(/^"|"$/g, ""),
    },
    null,
    2
  )
);

if (afterSpf.length !== 1) {
  console.error("CRITICAL: SPF count changed after apply");
  process.exit(4);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      afterPath,
      created,
      skipped,
      spfUnchanged: true,
      spfValue: String(afterSpf[0].value || "").replace(/^"|"$/g, ""),
    },
    null,
    2
  )
);
