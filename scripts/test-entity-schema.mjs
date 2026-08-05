/**
 * Regression tests for Sparklean canonical entity / JSON-LD.
 * Run: node scripts/test-entity-schema.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import {
  CITY_PAGES,
  getCanonicalOrganization,
  LOCKED_DESCRIPTION,
  ORG_ID,
  PHONE_E164,
  SERVICE_AREA_NAMES,
} from "../data/sparklean-entity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  ", msg);
  }
}

function listPublicHtml() {
  return execSync('git ls-files "*.html" "pages/**/*.html"', {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(
      (f) =>
        !f.includes("pages/signalhouse/") && f !== "googleb2e0bc4648b22d1e.html"
    );
}

function extractJsonLd(html) {
  const blocks = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    try {
      blocks.push(JSON.parse(raw));
    } catch (e) {
      blocks.push({ __parseError: String(e.message || e), __raw: raw.slice(0, 120) });
    }
  }
  return blocks;
}

function walk(obj, fn) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach((v) => walk(v, fn));
    return;
  }
  fn(obj);
  for (const v of Object.values(obj)) walk(v, fn);
}

function collectOrgNodes(blocks) {
  const nodes = [];
  for (const b of blocks) {
    walk(b, (o) => {
      const id = o["@id"];
      const types = [].concat(o["@type"] || []);
      if (
        id === ORG_ID ||
        types.includes("Organization") ||
        types.includes("LocalBusiness") ||
        types.includes("ProfessionalService")
      ) {
        if (o.name || id === ORG_ID) nodes.push(o);
      }
    });
  }
  return nodes;
}

// --- Module invariants ---
const org = getCanonicalOrganization();
assert(org["@id"] === ORG_ID, "canonical @id is stable");
assert(org.legalName === "Sparklean Cleaning LLC", "legalName is LLC");
assert(org.description === LOCKED_DESCRIPTION, "locked description exact");
assert(org.telephone === PHONE_E164, "phone E.164");
assert(!String(org.legalName).toLowerCase().includes("corporation"), "legalName not corporation");
assert(!JSON.stringify(org).toLowerCase().includes("corporation"), "org JSON has no corporation");
assert(!org.sameAs || !org.sameAs.some((u) => String(u).includes("maps/search")), "no maps/search sameAs");
assert(!org.streetAddress && !org.address?.streetAddress, "no street address published");
assert(!org.aggregateRating, "no aggregateRating until founder verifies count");
for (const city of SERVICE_AREA_NAMES) {
  assert(
    JSON.stringify(org.areaServed).includes(city),
    `areaServed includes ${city}`
  );
}
assert(SERVICE_AREA_NAMES.length === 6, "six service areas");
assert(
  [].concat(org["@type"]).includes("ProfessionalService"),
  "ProfessionalService included as accurate type"
);

const keyPages = [
  "index.html",
  "pages/about.html",
  "pages/contact.html",
  "pages/residential-cleaning.html",
  "pages/commercial-cleaning.html",
  "pages/post-construction-cleaning.html",
  "pages/specialized-cleaning.html",
  ...Object.values(CITY_PAGES).map((c) => `pages/${c.slug}.html`),
];

const phones = new Set();
const names = new Set();
const orgIds = new Set();
let parseErrors = 0;
let mapsInSameAs = 0;
let localBusinessIds = 0;
let corporationHits = 0;

for (const rel of keyPages) {
  const abs = path.join(root, rel);
  assert(fs.existsSync(abs), `${rel} exists`);
  const html = fs.readFileSync(abs, "utf8");
  const blocks = extractJsonLd(html);
  assert(blocks.length >= 1, `${rel} has JSON-LD`);
  for (const b of blocks) {
    if (b.__parseError) {
      parseErrors += 1;
      console.error("PARSE", rel, b.__parseError);
    }
  }
  assert(blocks.every((b) => !b.__parseError), `${rel} JSON-LD parses`);

  const orgs = collectOrgNodes(blocks);
  const canonical = orgs.filter((o) => o["@id"] === ORG_ID);
  assert(canonical.length >= 1, `${rel} references ${ORG_ID}`);
  for (const o of canonical) {
    if (o.legalName) assert(o.legalName === "Sparklean Cleaning LLC", `${rel} legalName`);
    if (o.description) assert(o.description === LOCKED_DESCRIPTION, `${rel} locked description`);
    if (o.telephone) phones.add(o.telephone);
    if (o.name) names.add(o.name);
    orgIds.add(o["@id"]);
    if (Array.isArray(o.sameAs)) {
      for (const u of o.sameAs) {
        if (String(u).includes("maps/search")) mapsInSameAs += 1;
      }
    }
  }

  // Competing LocalBusiness @id must not exist
  walk(blocks, (o) => {
    if (o["@id"] === "https://www.sparklean.co/#localbusiness") localBusinessIds += 1;
  });

  if (/corporation/i.test(html) && /application\/ld\+json/i.test(html)) {
    const ldOnly = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
    );
    if (ldOnly && /corporation/i.test(ldOnly.join("\n"))) corporationHits += 1;
  }

  // Visible locked sentence on homepage + about
  if (rel === "index.html" || rel === "pages/about.html") {
    assert(html.includes(LOCKED_DESCRIPTION), `${rel} visible locked sentence`);
  }

  // Marco Island in territory lists on homepage
  if (rel === "index.html") {
    assert(html.includes("Marco Island"), "homepage mentions Marco Island");
  }
}

assert(parseErrors === 0, "zero JSON-LD parse errors on key pages");
assert(mapsInSameAs === 0, "no Google Maps search URLs in sameAs");
assert(localBusinessIds === 0, "no competing #localbusiness @id");
assert(corporationHits === 0, "no corporation in JSON-LD");
assert([...phones].length === 1 && phones.has(PHONE_E164), "single phone across org nodes");
assert([...names].every((n) => n === "Sparklean Cleaning" || n === "Sparklean"), "consistent business names");
assert([...orgIds].length === 1 && orgIds.has(ORG_ID), "single org @id");

// City pages: Service.provider -> canonical org
for (const cfg of Object.values(CITY_PAGES)) {
  const rel = `pages/${cfg.slug}.html`;
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  const blocks = extractJsonLd(html);
  let foundProvider = false;
  walk(blocks, (o) => {
    if (
      o["@type"] === "Service" &&
      o.provider &&
      o.provider["@id"] === ORG_ID
    ) {
      foundProvider = true;
    }
  });
  assert(foundProvider, `${rel} Service.provider -> ${ORG_ID}`);
  assert(!/Branch|franchise location/i.test(html.slice(0, 5000)), `${rel} not framed as branch`);
}

// Broader scan: all public HTML JSON-LD parses + no #localbusiness + no maps sameAs on org
for (const rel of listPublicHtml()) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  const blocks = extractJsonLd(html);
  for (const b of blocks) {
    assert(!b.__parseError, `${rel} JSON-LD parses (${b.__parseError || "ok"})`);
  }
  walk(blocks, (o) => {
    if (o["@id"] === "https://www.sparklean.co/#localbusiness") {
      assert(false, `${rel} still has #localbusiness`);
    }
    if (Array.isArray(o.sameAs)) {
      for (const u of o.sameAs) {
        assert(
          !String(u).includes("maps/search"),
          `${rel} sameAs must not use maps/search (${u})`
        );
      }
    }
  });
}

// Data module and HTML stay in sync for canonical fields on homepage
const home = extractJsonLd(fs.readFileSync(path.join(root, "index.html"), "utf8"));
let homeOrg = null;
walk(home, (o) => {
  if (o["@id"] === ORG_ID && o.legalName) homeOrg = o;
});
assert(homeOrg, "homepage embeds full canonical org");
assert(homeOrg.legalName === org.legalName, "homepage legalName matches module");
assert(homeOrg.description === org.description, "homepage description matches module");

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll entity schema tests passed.");
