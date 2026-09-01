/**
 * Lead email template tests — snapshots, CSS guard, contrast, hex-only tokens.
 * Run: node --test netlify/functions/lib/lead-email-templates.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEAD_EMAIL_CONTRAST_PAIRS,
  LEAD_EMAIL_TOKENS,
} from "./lead-email-tokens.mjs";
import {
  contrastRatio,
  validateLeadEmailContrast,
  validateLeadEmailCss,
} from "./lead-email-css-guard.mjs";
import {
  buildContactLeadHtmlEmail,
  buildQuoteLeadHtmlEmail,
  contactLeadEmailFixture,
  quoteLeadEmailFixture,
} from "./lead-email-html.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");

function marketingEmailSources() {
  const files = [
    join(repoRoot, "netlify/functions/quote-submit.mjs"),
    join(repoRoot, "netlify/functions/contact-submit.mjs"),
    join(repoRoot, "netlify/functions/lib/lead-email-html.mjs"),
    join(repoRoot, "netlify/functions/lib/conversion-alerts.mjs"),
  ];
  return files.filter((f) => {
    try {
      readFileSync(f);
      return true;
    } catch {
      return false;
    }
  });
}

test("token object uses solid hex only", () => {
  for (const [key, value] of Object.entries(LEAD_EMAIL_TOKENS)) {
    assert.match(value, /^#[0-9A-Fa-f]{6}$/, `${key} must be #RRGGBB hex, got ${value}`);
  }
});

test("quote lead email renders valid CSS", () => {
  const html = buildQuoteLeadHtmlEmail(quoteLeadEmailFixture());
  const check = validateLeadEmailCss(html);
  assert.equal(check.ok, true, check.ok ? "" : check.errors.join("; "));
  assert.match(html, /Jane Sample/);
  assert.match(html, /Contact information/);
  assert.doesNotMatch(html, /rgba\s*\(/i, "quote email should not use rgba()");
});

test("contact lead email renders valid CSS", () => {
  const html = buildContactLeadHtmlEmail(contactLeadEmailFixture());
  const check = validateLeadEmailCss(html);
  assert.equal(check.ok, true, check.ok ? "" : check.errors.join("; "));
  assert.match(html, /Alex Contact/);
  assert.doesNotMatch(html, /rgba\s*\(/i, "contact email should not use rgba()");
});

test("snapshot — quote lead email HTML", (t) => {
  const html = buildQuoteLeadHtmlEmail(quoteLeadEmailFixture());
  t.assert.snapshot(html);
});

test("snapshot — contact lead email HTML", (t) => {
  const html = buildContactLeadHtmlEmail(contactLeadEmailFixture());
  t.assert.snapshot(html);
});

test("contrast pairs meet WCAG AA (4.5:1)", () => {
  const check = validateLeadEmailContrast(LEAD_EMAIL_CONTRAST_PAIRS, 4.5);
  assert.equal(check.ok, true, check.ok ? "" : check.errors.join("; "));
});

test("required contact fields stay high-contrast on card background", () => {
  const html = buildQuoteLeadHtmlEmail(quoteLeadEmailFixture());
  assert.match(html, new RegExp(`color:${LEAD_EMAIL_TOKENS.textPrimary}`, "i"));
  assert.match(html, new RegExp(`color:${LEAD_EMAIL_TOKENS.textSecondary}`, "i"));
  const primaryOnCard = contrastRatio(LEAD_EMAIL_TOKENS.textPrimary, LEAD_EMAIL_TOKENS.cardBg);
  assert.ok(primaryOnCard >= 7, `primary on card ${primaryOnCard}`);
});

test("CSS guard rejects malformed rgba(,,,.)", () => {
  const bad = '<p style="color:rgba(,,,.);">x</p>';
  const check = validateLeadEmailCss(bad);
  assert.equal(check.ok, false);
  assert.match(check.errors.join(" "), /rgba/i);
});

test("CSS guard rejects undefined and null color values", () => {
  for (const sample of [
    '<span style="color:undefined">a</span>',
    '<span style="color:null">a</span>',
    '<span style="background:null">a</span>',
  ]) {
    const check = validateLeadEmailCss(sample);
    assert.equal(check.ok, false, sample);
  }
});

test("marketing email sources have no rgba(,,,.) corruption", () => {
  const errors = [];
  for (const file of marketingEmailSources()) {
    const text = readFileSync(file, "utf8");
    if (/rgba\s*\(\s*,\s*,\s*,/.test(text)) {
      errors.push(`${file}: rgba(,,,.) corruption`);
    }
  }
  assert.deepEqual(errors, []);
});

test("lead-email-html.mjs has no hand-written hex outside token imports", () => {
  const src = readFileSync(join(here, "lead-email-html.mjs"), "utf8");
  const withoutTokensImport = src.replace(/from "\.\/lead-email-tokens\.mjs";[\s\S]*?;/, "");
  const hexMatches = withoutTokensImport.match(/#[0-9A-Fa-f]{3,8}/g) || [];
  assert.deepEqual(hexMatches, [], `unexpected raw hex in template: ${hexMatches.join(", ")}`);
});

test("repo lead email production sources have no rgba(,,,.) corruption", () => {
  const targets = [
    join(repoRoot, "netlify/functions/quote-submit.mjs"),
    join(repoRoot, "netlify/functions/contact-submit.mjs"),
    join(repoRoot, "netlify/functions/lib/lead-email-html.mjs"),
    join(repoRoot, "netlify/functions/lib/conversion-alerts.mjs"),
  ];
  const bad = [];
  for (const file of targets) {
    const text = readFileSync(file, "utf8");
    if (/rgba\s*\(\s*,\s*,\s*,/.test(text)) bad.push(file);
  }
  assert.deepEqual(bad, []);
});
