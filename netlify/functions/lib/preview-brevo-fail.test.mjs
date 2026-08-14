/**
 * Unit checks for preview-only Brevo fail-closed gate.
 * Run: node --test netlify/functions/lib/preview-brevo-fail.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { shouldForceBrevoFail } from "./preview-brevo-fail.mjs";

function req(host) {
  return {
    headers: {
      get(name) {
        if (String(name).toLowerCase() === "host") return host;
        if (String(name).toLowerCase() === "x-forwarded-host") return host;
        return null;
      },
    },
  };
}

test("fail-closed without env flags", () => {
  delete process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL;
  delete process.env.SPARKLEAN_FORCE_BREVO_FAIL;
  assert.equal(shouldForceBrevoFail(req("conversion-x--sparklean-website.netlify.app")), false);
});

test("fail-closed on production host even with flags", () => {
  process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL = "1";
  process.env.SPARKLEAN_FORCE_BREVO_FAIL = "1";
  assert.equal(shouldForceBrevoFail(req("www.sparklean.co")), false);
  assert.equal(shouldForceBrevoFail(req("sparklean.co")), false);
});

test("allows only netlify preview hosts when both flags set", () => {
  process.env.SPARKLEAN_ALLOW_PREVIEW_BREVO_FAIL = "1";
  process.env.SPARKLEAN_FORCE_BREVO_FAIL = "1";
  assert.equal(shouldForceBrevoFail(req("conversion-abc--sparklean-website.netlify.app")), true);
  assert.equal(shouldForceBrevoFail(req("evil.example.com")), false);
  delete process.env.SPARKLEAN_FORCE_BREVO_FAIL;
  assert.equal(shouldForceBrevoFail(req("conversion-abc--sparklean-website.netlify.app")), false);
});
