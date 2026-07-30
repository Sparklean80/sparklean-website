/**
 * Generate root `_redirects` with forced 301s for every tracked /pages/*.html file.
 * Netlify serves static files over redirects unless forced (! / force=true).
 * Mid-path splats like /pages/*.html are NOT supported by Netlify.
 *
 * Usage: node scripts/generate-pages-redirects.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const tracked = execSync('git ls-files "pages/**/*.html" "pages/*.html"', {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((f) => f.replace(/^pages\//, "").replace(/\\/g, "/"))
  .sort();

const lines = [
  "# AUTO-GENERATED - do not hand-edit.",
  "# Forced 301s for raw /pages/*.html so Netlify does not serve duplicate HTML.",
  "# Regenerate: node scripts/generate-pages-redirects.mjs",
  "",
];

for (const rel of tracked) {
  let dest;
  if (rel === "signalhouse/index.html") dest = "/signalhouse";
  else if (rel.endsWith("/index.html")) {
    dest = "/" + rel.slice(0, -"/index.html".length);
  } else {
    dest = "/" + rel.replace(/\.html$/i, "");
  }
  const from = "/pages/" + rel;
  lines.push(`${from}  ${dest}  301!`);
  lines.push(`${from}/  ${dest}  301!`);
}

const out = path.join(root, "_redirects");
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log(`Wrote ${tracked.length} pages (${lines.length - 4} redirect lines) → _redirects`);
