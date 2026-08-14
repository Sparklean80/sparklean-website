import fs from "fs";
import path from "path";

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== ".git") walk(p, acc);
    else if (e.isFile() && e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

const needle = '<script src="/js/sparklean-ads.js"></script>';
const insert =
  '<script src="/js/sparklean-attribution.js"></script>\n<script src="/js/sparklean-ads.js"></script>';

let n = 0;
for (const f of walk(".")) {
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("sparklean-ads.js")) continue;
  if (s.includes("sparklean-attribution.js")) continue;
  if (!s.includes(needle)) continue;
  fs.writeFileSync(f, s.split(needle).join(insert));
  n += 1;
  console.log("patched", f);
}
console.log("patched_count", n);
