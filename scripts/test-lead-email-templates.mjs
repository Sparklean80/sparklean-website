/**
 * Pre-deploy lead email gate: unit tests, esbuild bundle scan, visual evidence HTML.
 * Run: node scripts/test-lead-email-templates.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import {
  buildContactLeadHtmlEmail,
  buildQuoteLeadHtmlEmail,
  contactLeadEmailFixture,
  quoteLeadEmailFixture,
} from "../netlify/functions/lib/lead-email-html.mjs";
import { validateLeadEmailCss } from "../netlify/functions/lib/lead-email-css-guard.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = join(root, "evidence", "lead-email-regression-2026-09-01");
const bundleDir = join(root, ".tmp", "lead-email-bundles");

/** Corruption in rendered email HTML — not guard regex literals bundled alongside. */
function scanBundleForRenderedEmailCorruption(bundle, label) {
  const hits = [];
  if (/style="[^"]*rgba\s*\(\s*,\s*,\s*,/.test(bundle)) hits.push("style attr rgba(,,,.)");
  if (/color:rgba\s*\(\s*,\s*,\s*,/.test(bundle)) hits.push("color:rgba(,,,.)");
  if (/background:rgba\s*\(\s*,\s*,\s*,/.test(bundle)) hits.push("background:rgba(,,,.)");
  if (hits.length) {
    throw new Error(`${label} bundle rendered-email corruption: ${hits.join(", ")}`);
  }
}

function runUnitTests() {
  execFileSync(process.execPath, ["--test", "netlify/functions/lib/lead-email-templates.test.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, NODE_OPTIONS: "" },
  });
}

function bundleFile(entry, outName) {
  mkdirSync(bundleDir, { recursive: true });
  const outfile = join(bundleDir, outName);
  execFileSync(
    "npx",
    ["--yes", "esbuild", entry, "--bundle", "--platform=node", "--format=esm", `--outfile=${outfile}`],
    { cwd: root, stdio: "pipe", shell: true },
  );
  const bundle = readFileSync(outfile, "utf8");
  return { outfile, bytes: bundle.length, bundle };
}

async function validateBundledLeadEmailModule() {
  const { outfile, bundle } = bundleFile(
    "netlify/functions/lib/lead-email-html.mjs",
    "lead-email-html.bundle.mjs",
  );
  scanBundleForRenderedEmailCorruption(bundle, "lead-email-html");

  const mod = await import(pathToFileURL(outfile).href);
  for (const [name, fn, fixture] of [
    ["quote", mod.buildQuoteLeadHtmlEmail, mod.quoteLeadEmailFixture()],
    ["contact", mod.buildContactLeadHtmlEmail, mod.contactLeadEmailFixture()],
  ]) {
    const html = fn(fixture);
    const check = validateLeadEmailCss(html);
    if (!check.ok) {
      throw new Error(`bundled ${name} HTML invalid: ${check.errors.join("; ")}`);
    }
  }
  return outfile;
}

function validateFunctionBundles() {
  const quote = bundleFile("netlify/functions/quote-submit.mjs", "quote-submit.bundle.mjs");
  const contact = bundleFile("netlify/functions/contact-submit.mjs", "contact-submit.bundle.mjs");
  scanBundleForRenderedEmailCorruption(quote.bundle, "quote-submit");
  scanBundleForRenderedEmailCorruption(contact.bundle, "contact-submit");
  return { quote: quote.bytes, contact: contact.bytes };
}

function wrapEvidenceHtml(title, innerHtml, widthPx) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=${widthPx},initial-scale=1">
<title>${title} · ${widthPx}px</title>
<style>
  html,body{margin:0;padding:0;background:#1a1a1a;}
  .frame{width:${widthPx}px;margin:0 auto;background:#111;min-height:100vh;}
  .label{font:12px/1.4 monospace;color:#888;padding:8px 12px;border-bottom:1px solid #333;}
</style></head>
<body>
<div class="frame">
<div class="label">${title} · ${widthPx}px viewport evidence</div>
${innerHtml.replace(/^[\s\S]*<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "")}
</div>
</body></html>`;
}

function writeVisualEvidence() {
  mkdirSync(evidenceDir, { recursive: true });
  const quote = buildQuoteLeadHtmlEmail(quoteLeadEmailFixture());
  const contact = buildContactLeadHtmlEmail(contactLeadEmailFixture());

  const files = [
    ["quote-desktop-600.html", wrapEvidenceHtml("Quote lead email", quote, 600)],
    ["quote-mobile-390.html", wrapEvidenceHtml("Quote lead email", quote, 390)],
    ["contact-desktop-600.html", wrapEvidenceHtml("Contact lead email", contact, 600)],
    ["contact-mobile-390.html", wrapEvidenceHtml("Contact lead email", contact, 390)],
    ["quote-raw.html", quote],
    ["contact-raw.html", contact],
  ];

  for (const [name, html] of files) {
    writeFileSync(join(evidenceDir, name), html, "utf8");
  }

  writeFileSync(
    join(evidenceDir, "REPORT.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cause: "Invalid rgba(,,,.) in quote-submit.mjs luxury HTML email (commit 020eac3 mass reformat)",
        affectedCommit: "020eac3b330cc01e31eb08d246c91ea15f87be90",
        fix: "Centralized hex tokens in lead-email-tokens.mjs; templates in lead-email-html.mjs",
        evidenceFiles: files.map(([n]) => n),
        screenshots: [
          "quote-desktop-600.png",
          "quote-mobile-390.png",
          "contact-desktop-600.png",
          "contact-mobile-390.png",
        ],
        tests: "netlify/functions/lib/lead-email-templates.test.mjs (12 cases + snapshots)",
        preDeployGate: "npm run test:lead-emails (wired into netlify.toml build command)",
        brevoProbe: "node scripts/probe-lead-email-brevo.mjs (requires BREVO_API_KEY — not run in agent env)",
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`OK visual evidence → ${evidenceDir}`);
}

function main() {
  console.log("lead-email gate: unit tests…");
  runUnitTests();

  console.log("lead-email gate: esbuild bundle scan (Netlify-style)…");
  return validateBundledLeadEmailModule().then((htmlBundlePath) => {
    const sizes = validateFunctionBundles();
    console.log(
      `OK bundles: quote=${sizes.quote}B contact=${sizes.contact}B html=${readFileSync(htmlBundlePath).length}B (compiled render validated)`,
    );
    writeVisualEvidence();
    console.log("OK lead-email pre-deploy gate passed");
  });
}

try {
  await main();
} catch (e) {
  console.error("FAIL lead-email pre-deploy gate:", e.message || e);
  process.exit(1);
} finally {
  try {
    rmSync(bundleDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
