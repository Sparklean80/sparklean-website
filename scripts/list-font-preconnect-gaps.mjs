/**
 * List HTML pages that load Google Fonts without preconnect hints.
 */
import fs from "fs";
import path from "path";

function walk(d, acc = []) {
  for (const n of fs.readdirSync(d)) {
    if (n === ".git" || n === "node_modules" || n === ".netlify") continue;
    const p = path.join(d, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (n.endsWith(".html")) acc.push(p);
  }
  return acc;
}

const files = walk(".");
const missing = [];
const have = [];
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  if (!t.includes("fonts.googleapis.com")) continue;
  const preG = t.includes('rel="preconnect" href="https://fonts.googleapis.com"');
  const preS = t.includes('rel="preconnect" href="https://fonts.gstatic.com"');
  const rel = f.replace(/\\/g, "/");
  if (preG && preS) have.push(rel);
  else missing.push(rel);
}
console.log(JSON.stringify({ have: have.length, missingCount: missing.length, missing }, null, 2));
