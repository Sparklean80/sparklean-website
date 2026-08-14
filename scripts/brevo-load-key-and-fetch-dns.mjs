/**
 * Load BREVO_API_KEY from Netlify API getEnvVars via cmd.exe (avoids PowerShell
 * quote-stripping), write .brevo-key.local, fetch exact Brevo DNS for sparklean.co.
 * Never prints the key.
 */
import fs from "fs";
import { spawnSync } from "child_process";

const SITE_ID = "7b32b2d6-9257-4d3c-9236-80ff24a54563";

function runNetlifyApi(method, dataObj) {
  const data = JSON.stringify(dataObj || {});
  // cmd.exe: --data "{""site_id"":""...""}"  OR use escaped quotes
  const cmdline = `npx netlify api ${method} --data "${data.replace(/"/g, '\\"')}"`;
  const r = spawnSync(cmdline, {
    encoding: "utf8",
    shell: "cmd.exe",
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  const out = (r.stdout || "").trim();
  const err = (r.stderr || "").trim();
  if (!out) {
    throw new Error(
      `netlify api ${method} empty (status ${r.status}): ${err.slice(0, 500)}`
    );
  }
  const startBrace = out.indexOf("{");
  const startBracket = out.indexOf("[");
  let start = -1;
  if (startBrace >= 0 && startBracket >= 0) start = Math.min(startBrace, startBracket);
  else start = Math.max(startBrace, startBracket);
  if (start < 0) throw new Error(`netlify api ${method} non-json: ${out.slice(0, 300)}`);
  return JSON.parse(out.slice(start));
}

function extractBrevoKey(envVars) {
  const arr = Array.isArray(envVars) ? envVars : [];
  const hit = arr.find((x) => x.key === "BREVO_API_KEY" || x.name === "BREVO_API_KEY");
  if (!hit) return { key: null, hitShape: null };
  const values = hit.values;
  let key = null;
  if (typeof values === "string") key = values;
  else if (Array.isArray(values)) {
    const prod =
      values.find((v) => v.context === "production" || v.context === "all") ||
      values.find((v) => Array.isArray(v.context) && v.context.includes("production")) ||
      values.find((v) => v.context === "dev" || v.context === "branch-deploy" || v.context === "deploy-preview") ||
      values[0];
    key = prod && (prod.value || prod.secret_value || null);
    return {
      key,
      hitShape: {
        valueKeys: prod ? Object.keys(prod) : [],
        contexts: values.map((v) => v.context),
        valueLens: values.map((v) => String(v.value || v.secret_value || "").length),
      },
    };
  } else if (values && typeof values === "object") {
    key = values.production || values.all || values.value || null;
  }
  return { key, hitShape: { topKeys: Object.keys(hit) } };
}

const site = runNetlifyApi("getSite", { site_id: SITE_ID });
const accountId =
  site.account_id ||
  site.accountId ||
  (site.account_slug ? null : null) ||
  site.user_id;
console.log(
  JSON.stringify({
    siteName: site.name || null,
    hasAccountId: Boolean(site.account_id || site.accountId),
    accountSlug: site.account_slug || null,
    siteTopKeys: Object.keys(site || {}).slice(0, 40),
  })
);
if (!site.account_id && !site.accountId) {
  // Fall back: parse account from admin_url / site_id path patterns if present
  console.log(JSON.stringify({ error: "missing_account_id_on_site" }));
  process.exit(2);
}
const envVars = runNetlifyApi("getEnvVars", {
  account_id: site.account_id || site.accountId,
  site_id: SITE_ID,
});
const { key, hitShape } = extractBrevoKey(envVars);
console.log(
  JSON.stringify({
    envVarCount: Array.isArray(envVars) ? envVars.length : -1,
    keyFound: Boolean(key),
    keyLen: key ? String(key).length : 0,
    hitShape,
  })
);

if (!key || String(key).length < 30) {
  const names = (Array.isArray(envVars) ? envVars : []).map((x) => x.key || x.name);
  console.log(
    JSON.stringify({
      brevoish: names.filter((n) => /BREVO|SPARKLEAN|SEND/i.test(n || "")),
      sample: Array.isArray(envVars) && envVars[0] ? envVars[0] : null,
    })
  );
  process.exit(2);
}

fs.writeFileSync(".brevo-key.local", String(key).trim(), { encoding: "utf8" });
const gi = fs.readFileSync(".gitignore", "utf8");
if (!gi.includes(".brevo-key.local")) {
  fs.appendFileSync(".gitignore", "\n.brevo-key.local\n");
}

const fetchDns = spawnSync(process.execPath, ["scripts/brevo-fetch-exact-dns.mjs"], {
  encoding: "utf8",
  env: { ...process.env, BREVO_API_KEY: String(key).trim() },
  shell: false,
  maxBuffer: 5 * 1024 * 1024,
  windowsHide: true,
});
console.log(fetchDns.stdout || "");
if (fetchDns.stderr) {
  console.error(String(fetchDns.stderr).replace(/xkeysib-[^\s]+/gi, "[redacted]").slice(0, 400));
}
process.exit(fetchDns.status || 0);
