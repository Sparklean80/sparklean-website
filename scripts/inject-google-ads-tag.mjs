/**
 * Inject Google Ads base tag + sparklean-ads.js once into public HTML <head>.
 * Skips Signal House (private). Idempotent.
 *
 * Usage: node scripts/inject-google-ads-tag.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17027441328"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'AW-17027441328');
</script>
<script src="/js/sparklean-ads.js"></script>
`;

const MARKER = "AW-17027441328";

function listHtmlFiles() {
  const tracked = execSync('git ls-files "*.html" "pages/**/*.html"', {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((f) => !f.includes("pages/signalhouse/"));
  return tracked;
}

let updated = 0;
let skipped = 0;
for (const rel of listHtmlFiles()) {
  const full = path.join(root, rel);
  let html = fs.readFileSync(full, "utf8");
  if (html.includes(MARKER)) {
    skipped += 1;
    continue;
  }
  if (!/<\/head>/i.test(html)) {
    console.warn("No </head> in", rel);
    continue;
  }
  html = html.replace(/<\/head>/i, SNIPPET + "</head>");
  fs.writeFileSync(full, html);
  updated += 1;
  console.log("injected", rel);
}
console.log(`Done. updated=${updated} already_present=${skipped}`);
