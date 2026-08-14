/**
 * Unit checks for preview-only Brevo fail-closed gate.
 * Run: node --test netlify/functions/lib/preview-brevo-fail.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { shouldForceBrevoFail, resolvePreviewHost } from "./preview-brevo-fail.mjs";

function req(host, url) {
  return {
    url: url || (host ? `https://${host}/.netlify/functions/contact-submit` : ""),
    headers: {
      get(name) {
        if (String(name).toLowerCase() === "host") return host || null;
        if (String(name).toLowerCase() === "x-forwarded-host") return host || null;
        return null;
      },
    },
  };
}

test("fail-closed without env flags", () => {
  delete process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL;
  delete process.env.SPARKLEAN_FORCE_BREVO_FAIL;
  delete process.env.DEPLOY_URL;
  assert.equal(shouldForceBrevoFail(req("conversion-x--sparklean-website.netlify.app")), false);
});

test("fail-closed on production host even with flags", () => {
  process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL = "1";
  process.env.SPARKLEAN_FORCE_BREVO_FAIL = "1";
  process.env.DEPLOY_URL = "https://www.sparklean.co";
  assert.equal(shouldForceBrevoFail(req("www.sparklean.co")), false);
  assert.equal(shouldForceBrevoFail(req("sparklean.co")), false);
});

test("allows netlify preview hosts when both flags set", () => {
  process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL = "1";
  process.env.SPARKLEAN_FORCE_BREVO_FAIL = "1";
  delete process.env.DEPLOY_URL;
  assert.equal(shouldForceBrevoFail(req("conversion-abc--sparklean-website.netlify.app")), true);
  assert.equal(shouldForceBrevoFail(req("evil.example.com")), false);
  delete process.env.SPARKLEAN_FORCE_BREVO_FAIL;
  assert.equal(shouldForceBrevoFail(req("conversion-abc--sparklean-website.netlify.app")), false);
});

test("falls back to DEPLOY_URL when request host empty", () => {
  process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL = "1";
  process.env.SPARKLEAN_FORCE_BREVO_FAIL = "1";
  process.env.DEPLOY_URL = "https://conversion-abc--sparklean-website.netlify.app";
  assert.equal(resolvePreviewHost(req("")), "conversion-abc--sparklean-website.netlify.app");
  assert.equal(shouldForceBrevoFail(req("")), true);
  process.env.DEPLOY_URL = "https://www.sparklean.co";
  assert.equal(shouldForceBrevoFail(req("")), false);
});
