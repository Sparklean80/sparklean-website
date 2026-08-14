/**
 * Inspect BREVO_API_KEY env var metadata only (never print value).
 */
import { spawnSync } from "child_process";

const SITE_ID = "7b32b2d6-9257-4d3c-9236-80ff24a54563";

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
  const startBrace = out.indexOf("{");
  const startBracket = out.indexOf("[");
  let start = -1;
  if (startBrace >= 0 && startBracket >= 0) start = Math.min(startBrace, startBracket);
  else start = Math.max(startBrace, startBracket);
  if (start < 0) throw new Error((r.stderr || out || "empty").slice(0, 400));
  return JSON.parse(out.slice(start));
}

const site = api("getSite", { site_id: SITE_ID });
const account_id = site.account_id || site.accountId;
const vars = api("getEnvVars", { account_id, site_id: SITE_ID });
const hit = (Array.isArray(vars) ? vars : []).find((x) => x.key === "BREVO_API_KEY");
const prod = (hit?.values || []).find((v) => v.context === "production") || {};
const v = String(prod.value || "");
const chars = [...v].reduce((acc, ch) => {
  const k = ch === "*" ? "star" : ch === "•" ? "bullet" : /\w/.test(ch) ? "word" : "other";
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});

console.log(
  JSON.stringify(
    {
      is_secret: hit?.is_secret,
      scopes: hit?.scopes,
      prodValueLen: v.length,
      charClasses: chars,
      startsWithXkey: v.startsWith("xkeysib-"),
      allSameChar: v.length > 0 && [...v].every((c) => c === v[0]),
      role: prod.role || null,
    },
    null,
    2
  )
);
