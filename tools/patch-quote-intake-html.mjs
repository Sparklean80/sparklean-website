/**
 * One-time / idempotent: wire quote-intake.css + serviceFlows + quote-intake + skip on "View All Services".
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const htmlFiles = [
  path.join(root, "index.html"),
  ...fs
    .readdirSync(path.join(root, "pages"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.join(root, "pages", f)),
];

const QUOTE_LINK = '<link rel="stylesheet" href="/css/quote-intake.css">';
const SCRIPTS_BEFORE_MCTA = `<script src="/js/serviceFlows.js"></script>\n<script src="/js/quote-intake.js" defer></script>\n`;

function patchFile(abs) {
  let s = fs.readFileSync(abs, "utf8");
  const rel = path.relative(root, abs);
  if (s.includes("quote-intake.css")) {
    console.log("skip (already patched):", rel);
    return;
  }

  if (s.includes('href="/css/sparklean-mobile-first.css"')) {
    s = s.replace(
      '<link rel="stylesheet" href="/css/sparklean-mobile-first.css">',
      '<link rel="stylesheet" href="/css/sparklean-mobile-first.css">\n' + QUOTE_LINK
    );
  } else if (/<\/head>/i.test(s)) {
    s = s.replace("</head>", `  ${QUOTE_LINK}\n</head>`);
  } else {
    console.warn("no head hook:", rel);
  }

  if (s.includes("sparklean-mobile-sticky-cta.js")) {
    s = s.replace(
      '<script src="/js/sparklean-mobile-sticky-cta.js" defer></script>',
      SCRIPTS_BEFORE_MCTA + '<script src="/js/sparklean-mobile-sticky-cta.js" defer></script>'
    );
  } else {
    const mcta =
      '<script src="/js/sparklean-mobile-sticky-cta.js" defer></script>\n';
    s = s.replace("</body>", `  ${SCRIPTS_BEFORE_MCTA}${mcta}</body>`);
  }

  if (rel === "index.html") {
    s = s.replace(
      '<a href="#quote" class="btn-gold">View All Services →</a>',
      '<a href="#quote" class="btn-gold" data-sparklean-intake-skip>View All Services →</a>'
    );
  }

  fs.writeFileSync(abs, s);
  console.log("patched:", rel);
}

for (const f of htmlFiles) {
  if (fs.existsSync(f)) patchFile(f);
}
