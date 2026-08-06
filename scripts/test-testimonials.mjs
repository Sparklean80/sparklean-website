/**
 * Regression: unverified attributed testimonials must not return.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  APPROVED_CLIENT_TESTIMONIALS,
  GOOGLE_RATING_DISPLAY,
  UNVERIFIED_TESTIMONIAL_ATTRIBUTIONS,
  UNVERIFIED_TESTIMONIAL_QUOTE_FRAGMENTS,
} from "../data/sparklean-testimonials.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (cond) console.log("OK  ", msg);
  else {
    console.error("FAIL", msg);
    failed += 1;
  }
}

function listPublicHtml(dir = root, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "signalhouse") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) listPublicHtml(p, acc);
    else if (name.endsWith(".html")) acc.push(path.relative(root, p).replace(/\\/g, "/"));
  }
  return acc;
}

assert(
  Array.isArray(APPROVED_CLIENT_TESTIMONIALS),
  "approved testimonials is an array"
);
assert(
  APPROVED_CLIENT_TESTIMONIALS.length === 0,
  "no approved client testimonials until founder documents sources"
);

const pages = listPublicHtml();
for (const rel of pages) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  for (const name of UNVERIFIED_TESTIMONIAL_ATTRIBUTIONS) {
    assert(!html.includes(name), `${rel} has no unverified attribution ${name}`);
  }
  for (const frag of UNVERIFIED_TESTIMONIAL_QUOTE_FRAGMENTS) {
    assert(!html.includes(frag), `${rel} has no unverified quote fragment`);
  }
  if (html.includes('class="reviews"') || html.includes("id=\"reviews\"")) {
    assert(
      !/Verified on Google/i.test(html),
      `${rel} does not use “Verified on Google” framing`
    );
    assert(
      !/<div class="rev-feat">/.test(html) && !/<div class="rev-grid">/.test(html),
      `${rel} reviews section has no quote cards without approved sources`
    );
    assert(
      !/>\s*96\+?\s*</.test(html) && !/Google<br>\s*Reviews/.test(html),
      `${rel} does not hard-code a Google review count chip`
    );
    assert(
      html.includes(`rev-stat-n">${GOOGLE_RATING_DISPLAY}<`) ||
        html.includes(`rev-stat-n">${GOOGLE_RATING_DISPLAY}</`),
      `${rel} keeps visible ${GOOGLE_RATING_DISPLAY} Google rating card`
    );
    assert(
      /Read live Google reviews/i.test(html),
      `${rel} links readers to live Google reviews`
    );
  }
}

assert(!failed, "zero testimonial regressions");
if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll testimonial tests passed.");
